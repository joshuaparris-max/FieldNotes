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
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  }

  global.FieldNotesBackup = {
    takeSnapshot(reason) {
      if (!global.FieldNotesData) return;
      const currentData = global.FieldNotesData.getAll();
      if (!currentData || currentData.length === 0) return; // Don't snapshot empty state normally?
      
      const snapshots = loadSnapshots();
      // Avoid duplicate consecutive snapshots if data is identical
      if (snapshots.length > 0) {
        const lastData = JSON.stringify(snapshots[0].data);
        const newData = JSON.stringify(currentData);
        if (lastData === newData) return; // No changes to snapshot
      }

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
