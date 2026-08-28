(function (global) {
  const DB_NAME = "FieldNotesSyncDB";
  const STORE_NAME = "handles";
  const KEY_NAME = "syncFileHandle";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function setHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function clearHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  const SyncFile = {
    isSupported() {
      return "showOpenFilePicker" in window;
    },

    async getStoredHandle() {
      try {
        return await getHandle();
      } catch (e) {
        return null;
      }
    },

    async verifyPermission(handle, request = false) {
      if (!handle) return false;
      try {
        const opts = { mode: "readwrite" };
        if ((await handle.queryPermission(opts)) === "granted") return true;
        if (request) {
          if ((await handle.requestPermission(opts)) === "granted") return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },

    async pickFile() {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "FieldNotes Sync", accept: { "application/json": [".fieldnotes-sync"] } }],
        });
        await setHandle(handle);
        return handle;
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
        return null;
      }
    },

    async createFile() {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "data.fieldnotes-sync",
          types: [{ description: "FieldNotes Sync", accept: { "application/json": [".fieldnotes-sync"] } }],
        });
        await setHandle(handle);
        return handle;
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
        return null;
      }
    },

    async disconnect() {
      await clearHandle();
    },

    async read(handle) {
      try {
        const file = await handle.getFile();
        const text = await file.text();
        if (!text.trim()) return null;
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to read sync file", e);
        throw e;
      }
    },

    async write(handle, data) {
      try {
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      } catch (e) {
        console.error("Failed to write sync file", e);
        throw e;
      }
    }
  };

  global.FieldNotesSyncFile = SyncFile;
})(window);
