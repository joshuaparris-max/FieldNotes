/**
 * FieldNotes — localStorage data layer
 */
(function (global) {
  const STORAGE_KEY = "fieldnotes_notes_v1";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function newId() {
    return "note_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  global.FieldNotesData = {
    getAll() {
      return load().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    getById(id) {
      return load().find((n) => n.id === id) || null;
    },

    create({ title, body, location, tags }) {
      const now = new Date().toISOString();
      const note = {
        id: newId(),
        title: (title || "").trim() || "Untitled note",
        body: (body || "").trim(),
        location: (location || "").trim(),
        tags: (tags || "").trim(),
        createdAt: now,
        updatedAt: now,
      };
      const notes = load();
      notes.unshift(note);
      save(notes);
      return note;
    },

    update(id, fields) {
      const notes = load();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return null;
      const note = notes[index];
      if (fields.title !== undefined) note.title = (fields.title || "").trim() || "Untitled note";
      if (fields.body !== undefined) note.body = (fields.body || "").trim();
      if (fields.location !== undefined) note.location = (fields.location || "").trim();
      if (fields.tags !== undefined) note.tags = (fields.tags || "").trim();
      note.updatedAt = new Date().toISOString();
      notes[index] = note;
      save(notes);
      return note;
    },

    remove(id) {
      const notes = load().filter((n) => n.id !== id);
      save(notes);
    },

    search(query) {
      const q = (query || "").trim().toLowerCase();
      if (!q) return global.FieldNotesData.getAll();
      return global.FieldNotesData.getAll().filter((n) => {
        const haystack = [n.title, n.body, n.location, n.tags].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    },
  };
})(window);
