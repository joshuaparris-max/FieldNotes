/**
 * FieldNotes — IT incident notes (localStorage, schema v3)
 */
(function (global) {
  const C = global.FieldNotesConstants;
  const STORAGE_KEY_V2 = C.STORAGE_KEY_V2;
  const STORAGE_KEY_V1 = C.STORAGE_KEY_V1;

  let migrationDone = false;

  function inList(value, list) {
    return list.includes(value);
  }

  function defaultStatus(result, existing) {
    if (existing && inList(existing, C.STATUSES)) return existing;
    const r = (result || "").toLowerCase();
    if (/\b(resolved|fixed|complete|completed|working ok|working)\b/.test(r)) return "Resolved";
    if (/\bescalat/.test(r)) return "Escalated";
    if (/\b(wait|waiting|pending|on hold)\b/.test(r)) return "Waiting";
    if (/\b(learning|lab|study|practice)\b/.test(r)) return "Learning Note";
    return "Open";
  }

  function isLegacyNote(raw) {
    return raw && (raw.title !== undefined || raw.body !== undefined) && raw.issue === undefined;
  }

  /** Normalize any stored note to schema v3 shape with safe defaults */
  function normalizeNote(raw) {
    if (!raw || !raw.id) return null;

    let base;
    if (isLegacyNote(raw)) {
      const body = (raw.body || "").trim();
      const location = (raw.location || "").trim();
      base = {
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
      };
    } else {
      base = {
        id: raw.id,
        summary: (raw.summary || raw.title || "").trim() || "Untitled incident",
        context: inList(raw.context, C.CONTEXTS) ? raw.context : "Other",
        issue: (raw.issue || "").trim(),
        checked: (raw.checked || "").trim(),
        changed: (raw.changed || "").trim(),
        result: (raw.result || "").trim(),
        followUp: (raw.followUp || raw.followup || "").trim(),
        reference: (raw.reference || "").trim(),
        tags: (raw.tags || "").trim(),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      };
    }

    return {
      ...base,
      status: defaultStatus(base.result, raw.status),
      priority: inList(raw.priority, C.PRIORITIES) ? raw.priority : "Normal",
      category: inList(raw.category, C.CATEGORIES) ? raw.category : "Other",
      resolutionSummary: (raw.resolutionSummary || "").trim(),
      timeSpent: (raw.timeSpent || "").trim(),
      escalatedTo: (raw.escalatedTo || "").trim(),
      schemaVersion: C.SCHEMA_VERSION,
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
      /* v1 preserved */
    }
  }

  /** Re-save all notes with v3 normalization (in-place upgrade) */
  function upgradeStoredNotesIfNeeded(notes) {
    const upgraded = notes.map(normalizeNote).filter(Boolean);
    const needsWrite = notes.some((n, i) => n.schemaVersion !== C.SCHEMA_VERSION || !n.status);
    if (needsWrite) save(upgraded);
    return upgraded;
  }

  function loadRaw() {
    migrateFromV1();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed.map(normalizeNote).filter(Boolean);
      return upgradeStoredNotesIfNeeded(normalized);
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
      note.status,
      note.priority,
      note.category,
      note.issue,
      note.checked,
      note.changed,
      note.result,
      note.resolutionSummary,
      note.followUp,
      note.reference,
      note.escalatedTo,
      note.timeSpent,
      note.tags,
    ]
      .join(" ")
      .toLowerCase();
  }

  function payloadFromFields(fields) {
    return {
      summary: fields.summary,
      context: fields.context,
      status: fields.status,
      priority: fields.priority,
      category: fields.category,
      issue: fields.issue,
      checked: fields.checked,
      changed: fields.changed,
      result: fields.result,
      resolutionSummary: fields.resolutionSummary,
      followUp: fields.followUp,
      reference: fields.reference,
      escalatedTo: fields.escalatedTo,
      timeSpent: fields.timeSpent,
      tags: fields.tags,
    };
  }

  function applyPayload(note, fields) {
    const p = payloadFromFields(fields);
    note.summary = (p.summary || "").trim() || "Untitled incident";
    note.context = inList(p.context, C.CONTEXTS) ? p.context : "Other";
    note.status = inList(p.status, C.STATUSES) ? p.status : defaultStatus(p.result, null);
    note.priority = inList(p.priority, C.PRIORITIES) ? p.priority : "Normal";
    note.category = inList(p.category, C.CATEGORIES) ? p.category : "Other";
    note.issue = (p.issue || "").trim();
    note.checked = (p.checked || "").trim();
    note.changed = (p.changed || "").trim();
    note.result = (p.result || "").trim();
    note.resolutionSummary = (p.resolutionSummary || "").trim();
    note.followUp = (p.followUp || "").trim();
    note.reference = (p.reference || "").trim();
    note.escalatedTo = (p.escalatedTo || "").trim();
    note.timeSpent = (p.timeSpent || "").trim();
    note.tags = (p.tags || "").trim();
    note.schemaVersion = C.SCHEMA_VERSION;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  global.FieldNotesData = {
    STORAGE_KEY_V2,
    CONTEXTS: C.CONTEXTS,
    STATUSES: C.STATUSES,
    PRIORITIES: C.PRIORITIES,
    CATEGORIES: C.CATEGORIES,

    getAll() {
      return loadRaw().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    getById(id) {
      return loadRaw().find((n) => n.id === id) || null;
    },

    create(fields) {
      const now = new Date().toISOString();
      const note = applyPayload(
        {
          id: newId(),
          createdAt: now,
          updatedAt: now,
        },
        fields
      );
      const notes = loadRaw();
      notes.unshift(note);
      save(notes);
      return note;
    },

    update(id, fields) {
      const notes = loadRaw();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return null;
      const note = applyPayload(notes[index], fields);
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

    exportAllJson() {
      return {
        app: "IT Support Field Notes",
        schemaVersion: C.SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        notes: loadRaw(),
      };
    },

    clearAllLocalData() {
      localStorage.removeItem(STORAGE_KEY_V2);
      /* v1 left intact as archive; user may clear browser data manually */
    },
  };
})(window);
