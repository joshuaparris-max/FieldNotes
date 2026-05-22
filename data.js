/**
 * FieldNotes — IT incident notes (localStorage)
 */
(function (global) {
  const STORAGE_KEY_V2 = "fieldnotes_incidents_v2";
  const STORAGE_KEY_V1 = "fieldnotes_notes_v1";

  const CONTEXTS = [
    "Avance IT",
    "DCS",
    "Parris Tech Services",
    "Personal Lab",
    "Other",
  ];

  let migrationDone = false;

  function isLegacyNote(raw) {
    return raw && (raw.title !== undefined || raw.body !== undefined) && raw.issue === undefined;
  }

  function normalizeNote(raw) {
    if (!raw || !raw.id) return null;

    if (isLegacyNote(raw)) {
      const body = (raw.body || "").trim();
      const location = (raw.location || "").trim();
      return {
        id: raw.id,
        summary: (raw.title || "").trim() || "Untitled incident",
        context: "Other",
        issue: body,
        checked: location && !body ? location : "",
        changed: "",
        result: "",
        followUp: "",
        reference: location && body ? location : "",
        tags: (raw.tags || "").trim(),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
        schemaVersion: 2,
      };
    }

    return {
      id: raw.id,
      summary: (raw.summary || raw.title || "").trim() || "Untitled incident",
      context: CONTEXTS.includes(raw.context) ? raw.context : "Other",
      issue: (raw.issue || "").trim(),
      checked: (raw.checked || "").trim(),
      changed: (raw.changed || "").trim(),
      result: (raw.result || "").trim(),
      followUp: (raw.followUp || raw.followup || "").trim(),
      reference: (raw.reference || "").trim(),
      tags: (raw.tags || "").trim(),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      schemaVersion: 2,
    };
  }

  function migrateFromV1() {
    if (migrationDone) return;
    migrationDone = true;

    try {
      const v2raw = localStorage.getItem(STORAGE_KEY_V2);
      if (v2raw) {
        const v2 = JSON.parse(v2raw);
        if (Array.isArray(v2) && v2.length > 0) return;
      }

      const v1raw = localStorage.getItem(STORAGE_KEY_V1);
      if (!v1raw) return;

      const v1 = JSON.parse(v1raw);
      if (!Array.isArray(v1) || v1.length === 0) return;

      const migrated = v1.map(normalizeNote).filter(Boolean);
      if (migrated.length > 0) {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
      }
    } catch {
      /* keep v1 intact; app continues with empty or partial v2 */
    }
  }

  function loadRaw() {
    migrateFromV1();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeNote).filter(Boolean);
    } catch {
      return [];
    }
  }

  function save(notes) {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(notes));
  }

  function newId() {
    return "inc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function searchFields(note) {
    return [
      note.summary,
      note.context,
      note.issue,
      note.checked,
      note.changed,
      note.result,
      note.followUp,
      note.reference,
      note.tags,
    ]
      .join(" ")
      .toLowerCase();
  }

  function payloadFromFields(fields) {
    return {
      summary: fields.summary,
      context: fields.context,
      issue: fields.issue,
      checked: fields.checked,
      changed: fields.changed,
      result: fields.result,
      followUp: fields.followUp,
      reference: fields.reference,
      tags: fields.tags,
    };
  }

  global.FieldNotesData = {
    STORAGE_KEY_V2,
    CONTEXTS,

    getAll() {
      return loadRaw().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    getById(id) {
      return loadRaw().find((n) => n.id === id) || null;
    },

    create(fields) {
      const now = new Date().toISOString();
      const p = payloadFromFields(fields);
      const note = {
        id: newId(),
        summary: (p.summary || "").trim() || "Untitled incident",
        context: CONTEXTS.includes(p.context) ? p.context : "Other",
        issue: (p.issue || "").trim(),
        checked: (p.checked || "").trim(),
        changed: (p.changed || "").trim(),
        result: (p.result || "").trim(),
        followUp: (p.followUp || "").trim(),
        reference: (p.reference || "").trim(),
        tags: (p.tags || "").trim(),
        createdAt: now,
        updatedAt: now,
        schemaVersion: 2,
      };
      const notes = loadRaw();
      notes.unshift(note);
      save(notes);
      return note;
    },

    update(id, fields) {
      const notes = loadRaw();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return null;

      const note = notes[index];
      const p = payloadFromFields(fields);

      if (fields.summary !== undefined) {
        note.summary = (p.summary || "").trim() || "Untitled incident";
      }
      if (fields.context !== undefined) {
        note.context = CONTEXTS.includes(p.context) ? p.context : "Other";
      }
      if (fields.issue !== undefined) note.issue = (p.issue || "").trim();
      if (fields.checked !== undefined) note.checked = (p.checked || "").trim();
      if (fields.changed !== undefined) note.changed = (p.changed || "").trim();
      if (fields.result !== undefined) note.result = (p.result || "").trim();
      if (fields.followUp !== undefined) note.followUp = (p.followUp || "").trim();
      if (fields.reference !== undefined) note.reference = (p.reference || "").trim();
      if (fields.tags !== undefined) note.tags = (p.tags || "").trim();

      note.updatedAt = new Date().toISOString();
      note.schemaVersion = 2;
      notes[index] = note;
      save(notes);
      return note;
    },

    remove(id) {
      save(loadRaw().filter((n) => n.id !== id));
    },

    search(query) {
      const q = (query || "").trim().toLowerCase();
      if (!q) return global.FieldNotesData.getAll();
      return global.FieldNotesData.getAll().filter((n) => searchFields(n).includes(q));
    },
  };
})(window);
