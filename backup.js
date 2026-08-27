(function (global) {
  const SNAPSHOTS_KEY = "fieldnotes_snapshots_v1";
  const LAST_BACKUP_KEY = "fieldnotes_last_export";
  const MAX_SNAPSHOTS = 5;

  function loadSnapshots() {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function saveSnapshots(snapshots) {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.message.includes('quota')) {
        if (snapshots.length > 1) {
          snapshots.pop();
          try {
            localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
            return;
          } catch (e2) {}
        }
      }
      throw new Error("QUOTA_EXCEEDED");
    }
  }

  global.FieldNotesBackup = {
    takeSnapshot(reason) {
      if (!global.FieldNotesData) return;
      const currentData = global.FieldNotesData.getAll();
      if (!currentData || currentData.length === 0) return;
      
      const snapshots = loadSnapshots();
      // Remove deduplication to ensure safety copies are taken when genuinely needed
      
      snapshots.unshift({
        timestamp: Date.now(),
        reason: reason || "Auto-snapshot",
        count: currentData.length,
        data: currentData
      });

      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots.length = MAX_SNAPSHOTS;
      }

      saveSnapshots(snapshots);
    },

    getSnapshots() {
      return loadSnapshots().map(s => ({
        timestamp: s.timestamp,
        reason: s.reason,
        count: s.count
      }));
    },

    restoreSnapshot(timestamp) {
      const snapshots = loadSnapshots();
      const snap = snapshots.find(s => s.timestamp === timestamp);
      if (!snap) return false;
      
      // We must tell Data to overwrite everything
      global.FieldNotesData.overwriteAll(snap.data);
      return true;
    },

    markExternalBackup() {
      localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
    },

    getLastExternalBackup() {
      const val = localStorage.getItem(LAST_BACKUP_KEY);
      return val ? parseInt(val, 10) : null;
    }
  };
})(window);
