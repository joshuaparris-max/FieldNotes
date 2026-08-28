(function (global) {
  const SYNC_STATE_KEY = "fieldnotes_sync_state_v1";
  const SYNC_BASE_KEY = "fieldnotes_sync_base_v1";

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

  function getSyncBase() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_BASE_KEY)) || { notes: [], tombstones: [] };
    } catch (e) {
      return { notes: [], tombstones: [] };
    }
  }

  function saveSyncBase(baseData) {
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(baseData));
  }
  
  function getNoteMap(notes) {
     return new Map(notes.map(n => [n.id, n]));
  }
  
  function getTombMap(tombs) {
     return new Map(tombs.map(t => [t.id, t]));
  }

  function generateRevision() {
     return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 
            'rev_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  function effectiveContent(id, notesMap, tombMap) {
      if (tombMap.has(id)) return { type: 'tombstone', deletedAt: tombMap.get(id).deletedAt };
      if (notesMap.has(id)) {
          const clone = { ...notesMap.get(id) };
          delete clone.updatedAt; 
          return { type: 'note', content: JSON.stringify(clone) };
      }
      return { type: 'none' };
  }

  function isSame(a, b) {
      if (a.type !== b.type) return false;
      if (a.type === 'note') return a.content === b.content;
      return true;
  }

  const SyncEngine = {
    getSyncState,
    saveSyncState,

    buildEnvelope(notes, tombstones, baseRevision = null) {
      return {
        format: "fieldnotes-sync",
        version: 1,
        revision: generateRevision(),
        baseRevision: baseRevision,
        deviceId: global.FieldNotesData.getDeviceId(),
        updatedAt: new Date().toISOString(),
        notes: notes,
        tombstones: tombstones || []
      };
    },

    isValidEnvelope(data) {
      return data && data.format === "fieldnotes-sync" && data.version >= 1 && Array.isArray(data.notes);
    },

    computeSync(localNotes, localTombstones, remoteNotes, remoteTombstones, baseNotes, baseTombstones) {
      const localNotesMap = getNoteMap(localNotes);
      const localTombMap = getTombMap(localTombstones);
      const remoteNotesMap = getNoteMap(remoteNotes);
      const remoteTombMap = getTombMap(remoteTombstones || []);
      const baseNotesMap = getNoteMap(baseNotes || []);
      const baseTombMap = getTombMap(baseTombstones || []);
      
      const allIds = new Set([
        ...localNotesMap.keys(), ...localTombMap.keys(),
        ...remoteNotesMap.keys(), ...remoteTombMap.keys(),
        ...baseNotesMap.keys(), ...baseTombMap.keys()
      ]);
      
      const mergedNotes = new Map();
      const mergedTombstones = new Map();
      const conflicts = [];
      const diffSummary = { shared: 0, localOnly: 0, remoteOnly: 0, conflicts: 0 };

      for (const id of allIds) {
          const l = effectiveContent(id, localNotesMap, localTombMap);
          const r = effectiveContent(id, remoteNotesMap, remoteTombMap);
          const b = effectiveContent(id, baseNotesMap, baseTombMap);

          let lChanged = !isSame(l, b);
          let rChanged = !isSame(r, b);

          if (r.type === 'none' && b.type === 'note') rChanged = false;
          if (l.type === 'none' && b.type === 'note') lChanged = false;

          let decision = null;

          if (!lChanged && !rChanged) {
              if (l.type === 'note' && r.type === 'note') {
                  const lTime = new Date(localNotesMap.get(id).updatedAt).getTime() || 0;
                  const rTime = new Date(remoteNotesMap.get(id).updatedAt).getTime() || 0;
                  decision = lTime > rTime ? 'local' : 'remote';
              } else {
                  decision = 'local';
              }
              if (l.type === 'note' || r.type === 'note') diffSummary.shared++;
          } else if (lChanged && !rChanged) {
              decision = 'local';
              if (l.type === 'note') diffSummary.localOnly++;
          } else if (rChanged && !lChanged) {
              decision = 'remote';
              if (r.type === 'note') diffSummary.remoteOnly++;
          } else if (isSame(l, r)) {
              if (l.type === 'note' && r.type === 'note') {
                  const lTime = new Date(localNotesMap.get(id).updatedAt).getTime() || 0;
                  const rTime = new Date(remoteNotesMap.get(id).updatedAt).getTime() || 0;
                  decision = lTime > rTime ? 'local' : 'remote';
              } else {
                  decision = 'local';
              }
              if (l.type === 'note' || r.type === 'note') diffSummary.shared++;
          } else {
              decision = 'conflict';
              diffSummary.conflicts++;
              conflicts.push({ 
                  local: localNotesMap.get(id) || { id, deleted: true }, 
                  remote: remoteNotesMap.get(id) || { id, deleted: true } 
              });
          }

          if (decision === 'local') {
              if (localNotesMap.has(id)) mergedNotes.set(id, localNotesMap.get(id));
              else if (localTombMap.has(id)) mergedTombstones.set(id, localTombMap.get(id));
          } else if (decision === 'remote') {
              if (remoteNotesMap.has(id)) mergedNotes.set(id, remoteNotesMap.get(id));
              else if (remoteTombMap.has(id)) mergedTombstones.set(id, remoteTombMap.get(id));
          }
      }
      
      return {
        mergedNotes: Array.from(mergedNotes.values()),
        mergedTombstones: Array.from(mergedTombstones.values()),
        conflicts,
        diffSummary
      };
    },

    async performSync(handle, isFirstConnection = false) {
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
       const base = isFirstConnection ? { notes: [], tombstones: [] } : getSyncBase();
       
       const localNotes = global.FieldNotesData.getAll();
       const localTombstones = global.FieldNotesData.getTombstones();
       
       if (isEmpty) {
          const envelope = this.buildEnvelope(localNotes, localTombstones);
          await global.FieldNotesSyncFile.write(handle, envelope);
          state.lastSyncTime = Date.now();
          this.saveSyncState(state);
          saveSyncBase({ notes: localNotes, tombstones: localTombstones });
          return { ok: true, summary: { shared: localNotes.length }, isEmpty: true };
       }
       
       const readRevision = remoteData.revision;
       
       const result = this.computeSync(localNotes, localTombstones, remoteData.notes, remoteData.tombstones, base.notes, base.tombstones);
       
       if (result.diffSummary.conflicts > 0) {
           state.pendingConflicts = result.conflicts;
           this.saveSyncState(state);
           return { ok: false, error: "Conflicts detected", conflicts: result.conflicts, summary: result.diffSummary, result };
       }
       
       if (global.FieldNotesBackup) global.FieldNotesBackup.takeSnapshot("Before sync merge");
       global.FieldNotesData.overwriteAll(result.mergedNotes);
       global.FieldNotesData.overwriteTombstones(result.mergedTombstones);
       
       const newEnvelope = this.buildEnvelope(result.mergedNotes, result.mergedTombstones, readRevision);
       
       // Race condition check: Re-read immediately before write
       const doubleCheckData = await global.FieldNotesSyncFile.read(handle);
       if (doubleCheckData && doubleCheckData.revision !== readRevision) {
           throw new Error("Stale revision: remote file was modified concurrently");
       }
       
       await global.FieldNotesSyncFile.write(handle, newEnvelope);
       
       state.lastSyncTime = Date.now();
       state.pendingConflicts = [];
       this.saveSyncState(state);
       saveSyncBase({ notes: result.mergedNotes, tombstones: result.mergedTombstones });
       
       return { ok: true, summary: result.diffSummary, result };
    }
  };

  global.FieldNotesSync = SyncEngine;
})(window);
