(function (global) {
  const SYNC_STATE_KEY = "fieldnotes_sync_state_v1";

  function getSyncState() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_STATE_KEY)) || { lastSyncTime: 0, pendingConflicts: [] };
    } catch (e) {
      return { lastSyncTime: 0, pendingConflicts: [] };
    }
  }

  function saveSyncState(state) {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  }
  
  function getNoteMap(notes) {
     return new Map(notes.map(n => [n.id, n]));
  }
  
  function getTombMap(tombs) {
     return new Map(tombs.map(t => [t.id, t]));
  }

  const SyncEngine = {
    getSyncState,
    saveSyncState,

    buildEnvelope(notes, tombstones) {
      return {
        format: "fieldnotes-sync",
        version: 1,
        deviceId: global.FieldNotesData.getDeviceId(),
        updatedAt: new Date().toISOString(),
        notes: notes,
        tombstones: tombstones || []
      };
    },

    isValidEnvelope(data) {
      return data && data.format === "fieldnotes-sync" && data.version >= 1 && Array.isArray(data.notes);
    },

    computeSync(localNotes, localTombstones, remoteNotes, remoteTombstones, lastSyncTime) {
      const localNotesMap = getNoteMap(localNotes);
      const localTombMap = getTombMap(localTombstones);
      const remoteNotesMap = getNoteMap(remoteNotes);
      const remoteTombMap = getTombMap(remoteTombstones || []);
      
      const allIds = new Set([
        ...localNotesMap.keys(), ...localTombMap.keys(),
        ...remoteNotesMap.keys(), ...remoteTombMap.keys()
      ]);
      
      const mergedNotes = new Map();
      const mergedTombstones = new Map();
      const conflicts = [];
      const diffSummary = { shared: 0, localOnly: 0, remoteOnly: 0, conflicts: 0, remoteDeleted: 0, localDeleted: 0 };
      
      const isFirstSync = lastSyncTime === 0;

      for (const id of allIds) {
        const ln = localNotesMap.get(id);
        const lt = localTombMap.get(id);
        const rn = remoteNotesMap.get(id);
        const rt = remoteTombMap.get(id);
        
        // If it's deleted anywhere, and the deletion is newer than the other side's update
        if (lt || rt) {
          const lTombTime = lt ? new Date(lt.deletedAt).getTime() : 0;
          const rTombTime = rt ? new Date(rt.deletedAt).getTime() : 0;
          const lUpTime = ln ? new Date(ln.updatedAt).getTime() : 0;
          const rUpTime = rn ? new Date(rn.updatedAt).getTime() : 0;
          
          if (lTombTime >= rUpTime && lTombTime >= lUpTime) {
             mergedTombstones.set(id, lt);
             if (rn) diffSummary.localDeleted++;
             continue;
          }
          if (rTombTime >= lUpTime && rTombTime >= rUpTime) {
             mergedTombstones.set(id, rt);
             if (ln) diffSummary.remoteDeleted++;
             continue;
          }
        }

        if (ln && !rn) {
            diffSummary.localOnly++;
            mergedNotes.set(id, ln);
        } else if (!ln && rn) {
            diffSummary.remoteOnly++;
            mergedNotes.set(id, rn);
        } else if (ln && rn) {
            // Both exist
            const lUpTime = new Date(ln.updatedAt).getTime();
            const rUpTime = new Date(rn.updatedAt).getTime();
            
            // Check identical content (ignoring updatedAt/createdAt differences for first sync matching)
            const lnContent = JSON.stringify({...ln, updatedAt: "", createdAt: ""});
            const rnContent = JSON.stringify({...rn, updatedAt: "", createdAt: ""});
            
            if (lnContent === rnContent) {
               diffSummary.shared++;
               mergedNotes.set(id, lUpTime > rUpTime ? ln : rn);
            } else {
               if (isFirstSync) {
                   diffSummary.conflicts++;
                   conflicts.push({ local: ln, remote: rn });
               } else {
                   const localChanged = lUpTime > lastSyncTime;
                   const remoteChanged = rUpTime > lastSyncTime;
                   
                   if (localChanged && remoteChanged) {
                       diffSummary.conflicts++;
                       conflicts.push({ local: ln, remote: rn });
                   } else if (remoteChanged) {
                       diffSummary.remoteOnly++;
                       mergedNotes.set(id, rn);
                   } else if (localChanged) {
                       diffSummary.localOnly++;
                       mergedNotes.set(id, ln);
                   } else {
                       diffSummary.shared++;
                       mergedNotes.set(id, lUpTime > rUpTime ? ln : rn);
                   }
               }
            }
        }
      }
      
      return {
        mergedNotes: Array.from(mergedNotes.values()),
        mergedTombstones: Array.from(mergedTombstones.values()),
        conflicts,
        diffSummary
      };
    },

    async performSync(handle, forceFirstSync = false) {
       if (!handle) return { ok: false, error: "No sync file connected" };
       if (!(await global.FieldNotesSyncFile.verifyPermission(handle))) {
          return { ok: false, error: "Permission required", permissionRequired: true };
       }
       
       const remoteData = await global.FieldNotesSyncFile.read(handle);
       const isEmpty = !remoteData;
       
       if (!isEmpty && !this.isValidEnvelope(remoteData)) {
          return { ok: false, error: "Invalid sync file format" };
       }
       
       const state = this.getSyncState();
       if (forceFirstSync) state.lastSyncTime = 0;
       
       const localNotes = global.FieldNotesData.getAll();
       const localTombstones = global.FieldNotesData.getTombstones();
       
       if (isEmpty) {
          // Push local to remote
          const envelope = this.buildEnvelope(localNotes, localTombstones);
          await global.FieldNotesSyncFile.write(handle, envelope);
          state.lastSyncTime = Date.now();
          this.saveSyncState(state);
          return { ok: true, summary: { shared: localNotes.length }, isEmpty: true };
       }
       
       // Detect stale external revision?
       // The versioning in remoteData is sufficient, but since we are doing 3-way/timestamp merge, 
       // any new edits in the file will simply have a newer updatedAt than lastSyncTime. 
       // This natively handles stale external revisions perfectly.
       
       const result = this.computeSync(localNotes, localTombstones, remoteData.notes, remoteData.tombstones, state.lastSyncTime);
       
       if (result.diffSummary.conflicts > 0) {
           // Queue conflicts, do not overwrite yet
           state.pendingConflicts = result.conflicts;
           this.saveSyncState(state);
           return { ok: false, error: "Conflicts detected", conflicts: result.conflicts, summary: result.diffSummary, result };
       }
       
       // Apply
       if (global.FieldNotesBackup) global.FieldNotesBackup.takeSnapshot("Before sync merge");
       global.FieldNotesData.overwriteAll(result.mergedNotes);
       global.FieldNotesData.overwriteTombstones(result.mergedTombstones);
       
       // Write back
       const newEnvelope = this.buildEnvelope(result.mergedNotes, result.mergedTombstones);
       await global.FieldNotesSyncFile.write(handle, newEnvelope);
       
       state.lastSyncTime = Date.now();
       state.pendingConflicts = [];
       this.saveSyncState(state);
       
       return { ok: true, summary: result.diffSummary, result };
    }
  };

  global.FieldNotesSync = SyncEngine;
})(window);
