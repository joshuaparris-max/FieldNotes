/**
 * FieldNotes — IT incident notes (localStorage, schema v4)
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
      pinned: !!raw.pinned,
      archived: !!raw.archived,
      templateUsed: (raw.templateUsed || "").trim(),
      schemaVersion: C.SCHEMA_VERSION,
    };
  }

  function noteNeedsUpgrade(raw) {
    if (!raw || !raw.id) return false;
    if (isLegacyNote(raw)) return true;
    if (!raw.schemaVersion || raw.schemaVersion < C.SCHEMA_VERSION) return true;
    if (!inList(raw.status, C.STATUSES)) return true;
    if (!inList(raw.priority, C.PRIORITIES)) return true;
    if (!inList(raw.category, C.CATEGORIES)) return true;
    if (!Object.prototype.hasOwnProperty.call(raw, "resolutionSummary")) return true;
    if (!Object.prototype.hasOwnProperty.call(raw, "timeSpent")) return true;
    if (!Object.prototype.hasOwnProperty.call(raw, "escalatedTo")) return true;
    if (!Object.prototype.hasOwnProperty.call(raw, "pinned")) return true;
    if (!Object.prototype.hasOwnProperty.call(raw, "archived")) return true;
    return false;
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
      if (migrated.length > 0) localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
    } catch {
      /* v1 preserved */
    }
  }

  function upgradeStoredNotesIfNeeded(parsed, upgraded) {
    if (parsed.some(noteNeedsUpgrade)) save(upgraded);
    return upgraded;
  }

  function loadRaw() {
    migrateFromV1();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const upgraded = parsed.map(normalizeNote).filter(Boolean);
      return upgradeStoredNotesIfNeeded(parsed, upgraded);
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
      note.templateUsed,
    ]
      .join(" ")
      .toLowerCase();
  }

  function compareNotes(a, b, sortKey) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    switch (sortKey) {
      case "updatedAsc":
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      case "priority":
        return (C.PRIORITY_ORDER[a.priority] ?? 9) - (C.PRIORITY_ORDER[b.priority] ?? 9);
      case "status":
        return a.status.localeCompare(b.status);
      case "category":
        return a.category.localeCompare(b.category);
      case "context":
        return a.context.localeCompare(b.context);
      case "summaryAsc":
        return a.summary.localeCompare(b.summary);
      case "updatedDesc":
      default:
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  }

  function applyFilters(notes, filters) {
    let list = notes;
    if (!filters.showArchived) list = list.filter((n) => !n.archived);
    if (filters.pinnedOnly) list = list.filter((n) => n.pinned);
    if (filters.context) list = list.filter((n) => n.context === filters.context);
    if (filters.status) list = list.filter((n) => n.status === filters.status);
    if (filters.priority) list = list.filter((n) => n.priority === filters.priority);
    if (filters.category) list = list.filter((n) => n.category === filters.category);
    return list;
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
      templateUsed: fields.templateUsed,
    };
  }

  function applyPayload(note, fields, preserveMeta) {
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
    if (p.templateUsed) note.templateUsed = p.templateUsed;
    if (!preserveMeta) {
      note.pinned = !!note.pinned;
      note.archived = !!note.archived;
    }
    note.schemaVersion = C.SCHEMA_VERSION;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  function parseImportNotes(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.notes)) return data.notes;
    return null;
  }

  function mergeImportedNotes(existing, imported) {
    const byId = new Map(existing.map((n) => [n.id, n]));
    imported.forEach((raw) => {
      const norm = normalizeNote(raw);
      if (!norm) return;
      const prev = byId.get(norm.id);
      if (!prev) {
        byId.set(norm.id, norm);
        return;
      }
      const prevTime = new Date(prev.updatedAt).getTime();
      const newTime = new Date(norm.updatedAt).getTime();
      if (newTime >= prevTime) byId.set(norm.id, norm);
      else {
        norm.id = newId();
        byId.set(norm.id, norm);
      }
    });
    return Array.from(byId.values());
  }

  global.FieldNotesData = {
    STORAGE_KEY_V2,
    CONTEXTS: C.CONTEXTS,
    STATUSES: C.STATUSES,
    PRIORITIES: C.PRIORITIES,
    CATEGORIES: C.CATEGORIES,
    SORT_OPTIONS: C.SORT_OPTIONS,

    getAll() {
      return loadRaw();
    },

    getById(id) {
      return loadRaw().find((n) => n.id === id) || null;
    },

    query(searchQuery, filters, sortKey) {
      const q = (searchQuery || "").trim().toLowerCase();
      let notes = loadRaw();
      if (q) notes = notes.filter((n) => searchFields(n).includes(q));
      notes = applyFilters(notes, filters || {});
      notes.sort((a, b) => compareNotes(a, b, sortKey || "updatedDesc"));
      return notes;
    },

    create(fields) {
      const now = new Date().toISOString();
      const note = applyPayload(
        {
          id: newId(),
          pinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
        fields,
        true
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
      const note = applyPayload(notes[index], fields, true);
      notes[index] = note;
      save(notes);
      return note;
    },

    remove(id) {
      save(loadRaw().filter((n) => n.id !== id));
    },

    setPinned(id, pinned) {
      const notes = loadRaw();
      const note = notes.find((n) => n.id === id);
      if (!note) return null;
      note.pinned = !!pinned;
      note.updatedAt = new Date().toISOString();
      save(notes);
      return note;
    },

    setArchived(id, archived) {
      const notes = loadRaw();
      const note = notes.find((n) => n.id === id);
      if (!note) return null;
      note.archived = !!archived;
      note.updatedAt = new Date().toISOString();
      save(notes);
      return note;
    },

    exportAllJson() {
      return {
        app: "IT Support Field Notes",
        schemaVersion: C.SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        notes: loadRaw(),
      };
    },

    importNotes(rawPayload, mode) {
      const rawList = parseImportNotes(rawPayload);
      if (!rawList) return { ok: false, error: "Invalid backup format. Expected { notes: [...] } or an array." };
      const imported = rawList.map(normalizeNote).filter(Boolean);
      if (imported.length === 0 && rawList.length > 0) {
        return { ok: false, error: "No valid notes found in file." };
      }
      if (mode === "replace") {
        save(imported);
        return { ok: true, count: imported.length, mode: "replace" };
      }
      const merged = mergeImportedNotes(loadRaw(), imported);
      save(merged);
      return { ok: true, count: imported.length, mode: "merge", total: merged.length };
    },

    clearAllLocalData() {
      localStorage.removeItem(STORAGE_KEY_V2);
    },
  };
})(window);
