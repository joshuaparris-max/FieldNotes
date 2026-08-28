/**
 * FieldNotes — actions, routing, import/export, voice
 */
(function (global) {
  const Data = global.FieldNotesData;
  const UI = global.FieldNotesUI;
  const Fmt = global.FieldNotesFormat;
  const PrefsApi = global.FieldNotesPrefs;
  const Templates = global.FieldNotesTemplates;

  const state = {
    view: "list",
    searchQuery: "",
    activeId: null,
    snippetTarget: "issue",
  };

  let activeRecognition = null;
  let speechAvailable = false;
  let prefs = PrefsApi.load();

  function refreshPrefs() {
    prefs = PrefsApi.load();
    PrefsApi.applyTheme(prefs.theme);
    return prefs;
  }

  function savePrefs() {
    PrefsApi.save(prefs);
  }

  function readFiltersFromDom() {
    const root = document.getElementById("app");
    if (!root) return prefs.filters;
    const f = { ...prefs.filters };
    root.querySelectorAll("[data-filter]").forEach((el) => {
      const key = el.getAttribute("data-filter");
      if (key === "sort") prefs.sort = el.value;
      else if (key === "pinnedOnly" || key === "showArchived") f[key] = el.checked;
      else f[key] = el.value;
    });
    prefs.filters = f;
    savePrefs();
    return f;
  }

  function queryList() {
    return Data.query(state.searchQuery, prefs.filters, prefs.sort);
  }

  function initSpeech() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    speechAvailable = !!SR;
    return SR;
  }

  function formPayload(fd) {
    return {
      summary: fd.get("summary"),
      context: fd.get("context"),
      status: fd.get("status"),
      priority: fd.get("priority"),
      category: fd.get("category"),
      issue: fd.get("issue"),
      checked: fd.get("checked"),
      changed: fd.get("changed"),
      result: fd.get("result"),
      resolutionSummary: fd.get("resolutionSummary"),
      followUp: fd.get("followUp"),
      reference: fd.get("reference"),
      escalatedTo: fd.get("escalatedTo"),
      timeSpent: fd.get("timeSpent"),
      tags: fd.get("tags"),
    };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showList() {
    state.view = "list";
    state.activeId = null;
    UI.closeCopyModal();
    UI.closeClearDataModal();
    UI.closeImportModal();
    stopDictation();
    refreshPrefs();
    UI.renderList(queryList(), state.searchQuery, prefs);
  }

  function showNew() {
    state.view = "form-new";
    state.activeId = null;
    UI.closeCopyModal();
    stopDictation();
    refreshPrefs();
    UI.renderForm(null, "new", speechAvailable);
  }

  function showDetail(id) {
    const note = Data.getById(id);
    if (!note) { showList(); return; }
    state.view = "detail";
    state.activeId = id;
    stopDictation();
    refreshPrefs();
    UI.renderDetail(note);
  }

  function showEdit(id) {
    const note = Data.getById(id);
    if (!note) { showList(); return; }
    state.view = "form-edit";
    state.activeId = id;
    stopDictation();
    refreshPrefs();
    UI.renderForm(note, "edit", speechAvailable);
  }

  function formHasContent(form) {
    const names = ["summary", "issue", "checked", "changed", "result", "resolutionSummary", "followUp", "reference", "tags"];
    return names.some((n) => {
      const el = form.querySelector(`[name="${n}"]`);
      return el && String(el.value || "").trim().length > 0;
    });
  }

  function applyTemplate(templateId) {
    const tpl = Templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const form = document.querySelector(".note-form");
    if (!form) return;
    if (formHasContent(form) && !confirm("Apply template? This may add to or replace field content.")) return;

    const set = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) return;
      if (el.tagName === "SELECT") {
        if (val) el.value = val;
      } else if (!el.value.trim() && val) {
        el.value = val;
      } else if (val && name !== "summary") {
        el.value = (el.value.trim() ? el.value.trim() + "\n" : "") + val;
      }
    };

    set("category", tpl.category);
    set("status", tpl.status);
    set("priority", tpl.priority);
    set("tags", tpl.tags);
    ["issue", "checked", "changed", "result", "followUp"].forEach((f) => set(f, tpl[f]));
    UI.showToast("Template applied");
  }

  function appendSnippet(text) {
    const field = state.snippetTarget || "issue";
    const el = document.querySelector(`textarea[name="${field}"]`);
    if (!el) return;
    const sep = el.value.trim() && !el.value.endsWith("\n") ? "\n" : "";
    el.value = el.value + sep + text + "\n";
    el.focus();
  }

  function stopDictation() {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch { /* */ }
      activeRecognition = null;
    }
    document.querySelectorAll(".btn-dictate-active").forEach((b) => {
      b.classList.remove("btn-dictate-active");
      b.textContent = "Dictate";
    });
  }

  function startDictation(fieldName, button) {
    const SR = initSpeech();
    if (!SR) return;
    const textarea = document.querySelector(`textarea[name="${fieldName}"]`);
    if (!textarea) return;
    stopDictation();
    const recognition = new SR();
    recognition.lang = "en-AU";
    recognition.interimResults = true;
    recognition.continuous = true;
    activeRecognition = recognition;
    button.classList.add("btn-dictate-active");
    button.textContent = "Listening…";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (!transcript) return;
      if (event.results[event.results.length - 1].isFinal) {
        const sep = textarea.value && !textarea.value.endsWith(" ") ? " " : "";
        textarea.value = textarea.value + sep + transcript.trim();
      }
    };
    recognition.onerror = () => stopDictation();
    recognition.onend = () => {
      if (activeRecognition === recognition) {
        button.classList.remove("btn-dictate-active");
        button.textContent = "Dictate";
        activeRecognition = null;
      }
    };
    try { recognition.start(); } catch { stopDictation(); }
  }

  async function copyFormat(id, formatKey, triggerEl) {
    const note = Data.getById(id);
    const def = Fmt.COPY_FORMATS[formatKey];
    if (!note || !def) return;
    const text = def.fn(note);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        UI.showToast(def.toast);
        return;
      }
    } catch { /* */ }
    UI.showCopyFallback(text, triggerEl);
    UI.showToast("Copy manually from dialog");
  }

  function exportTxt(id) {
    const note = Data.getById(id);
    if (!note) return;
    downloadBlob(new Blob([Fmt.formatTicketText(note)], { type: "text/plain;charset=utf-8" }), Fmt.safeExportFilename(note));
    UI.showToast("Exported text file");
  }

  function exportAllJson() {
    const json = JSON.stringify(Data.exportAllJson(), null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), Fmt.backupJsonFilename());
    UI.showToast("Exported JSON backup");
  }

  function exportCsv() {
    const notes = Data.getAll();
    downloadBlob(new Blob([Fmt.notesToCsv(notes)], { type: "text/csv;charset=utf-8" }), Fmt.csvFilename());
    UI.showToast("Exported CSV summary");
  }

  function exportCombinedTxt() {
    const notes = Data.getAll();
    downloadBlob(new Blob([Fmt.notesToCombinedTxt(notes)], { type: "text/plain;charset=utf-8" }), Fmt.combinedTxtFilename());
    UI.showToast("Exported combined TXT");
  }

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawPayload = reader.result;
        const data = JSON.parse(rawPayload);
        
        let notesArray = null;
        if (Array.isArray(data)) notesArray = data;
        else if (data && typeof data === "object" && Array.isArray(data.notes)) notesArray = data.notes;
        
        if (!notesArray) {
          UI.showToast("Invalid backup format. Expected { notes: [...] }");
          return;
        }
        
        // Count vaguely valid notes (has summary or id)
        const count = notesArray.filter(n => n.id || n.summary).length;
        if (count === 0) {
          UI.showToast("No valid notes found in file.");
          return;
        }

        UI.showImportConfirmModal({ count }, rawPayload);
      } catch {
        UI.showToast("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function trySnapshot(reason) {
    if (!global.FieldNotesBackup) return true;
    try {
      global.FieldNotesBackup.takeSnapshot(reason);
      return true;
    } catch (e) {
      if (e.message === "QUOTA_EXCEEDED") {
        return confirm("Could not create recovery point (Storage full). Continue anyway?");
      }
      return confirm("Failed to create safety snapshot. Continue anyway?");
    }
  }

  function confirmImport() {
    const modal = document.getElementById("import-modal");
    if (!modal) return;
    const modeEl = document.getElementById("import-mode");
    const mode = modeEl ? modeEl.value : "merge";
    const rawPayload = modal.dataset.payload;
    if (!rawPayload) return;

    if (!trySnapshot(`Before import (${mode})`)) return;

    try {
      const data = JSON.parse(rawPayload);
      const result = Data.importNotes(data, mode);
      if (!result.ok) {
        UI.showToast(result.error || "Import failed");
        return;
      }
      UI.closeImportModal();
      UI.showToast(
        mode === "replace"
          ? `Imported ${result.count} note(s) (replaced all)`
          : `Merged ${result.count} note(s) — ${result.total} total`
      );
      showList();
    } catch (e) {
      UI.showToast("Error during import.");
    }
  }

  function clearAllDataFinal() {
    if (!trySnapshot("Before clear data")) return;
    Data.clearAllLocalData();
    UI.closeClearDataModal();
    UI.showToast("All local notes cleared");
    state.searchQuery = "";
    showList();
  }

  function clearFilters() {
    prefs.filters = { ...PrefsApi.DEFAULTS.filters };
    prefs.sort = PrefsApi.DEFAULTS.sort;
    savePrefs();
    showList();
    UI.showToast("Filters cleared");
  }

  function handleClick(e) {
    if (e.target.closest("#import-modal")) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.preventDefault();
      if (btn.getAttribute("data-action") === "close-import-modal") UI.closeImportModal();
      if (btn.getAttribute("data-action") === "import-json-confirm") confirmImport();
      if (btn.getAttribute("data-action") === "import-json-pick") {
        document.getElementById("import-json-file")?.click();
      }
      return;
    }

    if (e.target.closest("#clear-modal [data-action]")) {
      e.preventDefault();
      const a = e.target.closest("[data-action]").getAttribute("data-action");
      if (a === "close-clear-modal") UI.closeClearDataModal();
      if (a === "clear-data-step2") UI.showClearDataModal(2);
      if (a === "clear-data-final") clearAllDataFinal();
      return;
    }

    if (e.target.closest("#copy-modal [data-action]")) {
      e.preventDefault();
      UI.closeCopyModal();
      return;
    }

    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.getAttribute("data-action");
    const id = el.getAttribute("data-id");

    if (action === "dictate") {
      e.preventDefault();
      if (speechAvailable) startDictation(el.getAttribute("data-field"), el);
      return;
    }

    if (action === "apply-template") {
      const sel = e.target;
      if (sel.value) {
        applyTemplate(sel.value);
        sel.value = "";
      }
      return;
    }

    if (["open", "back", "new", "edit", "duplicate", "print", "delete", "copy-format", "export-txt", "toggle-pin", "toggle-archive"].includes(action)) {
      e.preventDefault();
    }

    switch (action) {
      case "new": showNew(); break;
      case "back": showList(); break;
      case "open": if (id) showDetail(id); break;
      case "edit": if (id) showEdit(id); break;
      case "duplicate":
        if (id) {
          const note = Data.getById(id);
          if (note) {
            const dupNote = { ...note, id: undefined, createdAt: undefined, updatedAt: undefined, summary: "Copy of " + note.summary };
            state.view = "form-new";
            state.activeId = null;
            UI.closeCopyModal();
            stopDictation();
            refreshPrefs();
            UI.renderForm(dupNote, "new", speechAvailable);
          }
        }
        break;
      case "delete":
        if (id && confirm("Delete this incident? Cannot be undone.")) {
          if (!trySnapshot("Before delete")) return;
          Data.remove(id);
          UI.showToast("Deleted incident");
          showList();
        }
        break;
      case "copy-format":
        if (id) copyFormat(id, el.getAttribute("data-format"), el);
        break;
      case "print":
        window.print();
        break;
      case "export-txt": if (id) exportTxt(id); break;
      case "toggle-pin":
        if (id) {
          const n = Data.getById(id);
          Data.setPinned(id, !n.pinned);
          UI.showToast(n.pinned ? "Unpinned" : "Pinned");
          showDetail(id);
        }
        break;
      case "toggle-archive":
        if (id) {
          const n = Data.getById(id);
          Data.setArchived(id, !n.archived);
          UI.showToast(n.archived ? "Unarchived" : "Archived");
          showDetail(id);
        }
        break;
      case "export-all-json": exportAllJson(); break;
      case "export-csv": exportCsv(); break;
      case "export-combined-txt": exportCombinedTxt(); break;
      case "import-json-start": 
        document.getElementById("import-json-file")?.click(); 
        break;
      case "clear-data-start": UI.showClearDataModal(1); break;
      case "clear-filters": clearFilters(); break;
      case "toggle-privacy":
        prefs.privacyMode = el.checked;
        savePrefs();
        showList();
        break;
      case "set-theme":
        prefs.theme = el.value;
        savePrefs();
        PrefsApi.applyTheme(prefs.theme);
        UI.showToast("Theme updated");
        break;
      case "snippet":
        appendSnippet(el.getAttribute("data-text"));
        break;
      case "restore-snapshot":
        if (confirm("Restore this local snapshot? Your current notes will be overwritten (but snapshotted first).")) {
          const ts = parseInt(el.getAttribute("data-ts"), 10);
          if (global.FieldNotesBackup) {
            const snapData = global.FieldNotesBackup.getSnapshotData(ts);
            if (!snapData) {
              UI.showToast("Failed to restore snapshot (Corrupt or missing)");
              return;
            }
            const dateStr = new Date(ts).toLocaleString();
            if (!trySnapshot(`Before rollback to ${dateStr}`)) return;
            Data.overwriteAll(snapData);
            UI.showToast("Snapshot restored successfully");
            showList();
          }
        }
        break;
        case "sync-connect": syncConnect(); break;
        case "sync-now": syncNow(); break;
        case "sync-disconnect": syncDisconnect(); break;
        case "resolve-conflict": syncResolveConflict(); break;
      case "snippet-target": {
        state.snippetTarget = el.getAttribute("data-field");
        const lbl = document.getElementById("snippet-target-label");
        if (lbl) lbl.textContent = "Target: " + el.getAttribute("data-field").replace(/^\w/, (c) => c.toUpperCase());
        break;
      }
      default:
        break;
    }
  }

  function handleChange(e) {
    if (e.target.closest("[data-filter]")) {
      readFiltersFromDom();
      UI.renderList(queryList(), state.searchQuery, prefs);
      const searchEl = document.getElementById("search");
      if (searchEl) {
        searchEl.focus();
        const len = searchEl.value.length;
        searchEl.setSelectionRange(len, len);
      }
    }
  }

  function handleSubmit(e) {
    const form = e.target.closest(".note-form");
    if (!form) return;
    e.preventDefault();
    stopDictation();
    const fd = new FormData(form);
    const payload = formPayload(fd);
    const mode = form.getAttribute("data-mode");
    if (mode === "edit") {
      const noteId = form.getAttribute("data-id");
      Data.update(noteId, payload);
      UI.showToast("Saved incident");
      showDetail(noteId);
    } else {
      const note = Data.create(payload);
      UI.showToast("Saved incident");
      showDetail(note.id);
    }
  }

  function handleSearch(e) {
    if (!e.target.closest("#search")) return;
    state.searchQuery = e.target.value;
    readFiltersFromDom();
    UI.renderList(queryList(), state.searchQuery, prefs);
    const searchEl = document.getElementById("search");
    if (searchEl) {
      searchEl.focus();
      const len = searchEl.value.length;
      searchEl.setSelectionRange(len, len);
    }
  }

  function bind() {
    initSpeech();
    refreshPrefs();
    const app = document.getElementById("app");
    app.addEventListener("click", handleClick);
    app.addEventListener("change", handleChange);
    app.addEventListener("submit", handleSubmit);
    app.addEventListener("input", handleSearch);
    document.addEventListener("change", (e) => {
      if (e.target.id === "import-json-file" && e.target.files?.[0]) {
        handleImportFile(e.target.files[0]);
        e.target.value = "";
      }
    });
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        if (e.target.id === "copy-modal") UI.closeCopyModal();
        if (e.target.id === "clear-modal") UI.closeClearDataModal();
        if (e.target.id === "import-modal") UI.closeImportModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (document.querySelector(".modal-overlay")) {
          UI.closeCopyModal();
          UI.closeClearDataModal();
          UI.closeImportModal();
        } else if (state.view === "form-new" || state.view === "form-edit" || state.view === "detail") {
          showList();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        showNew();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !e.shiftKey && !e.altKey) {
        if (state.view === "list") {
          const searchEl = document.getElementById("search");
          if (searchEl && document.activeElement !== searchEl) {
            e.preventDefault();
            searchEl.focus();
          }
        }
      }
    });
  }

  // --- Sync UI Logic ---
  
  async function updateSyncUI(statusText, forceRender = false) {
    const textEl = document.getElementById("sync-status-text");
    const connectBtn = document.getElementById("sync-connect-btn");
    const nowBtn = document.getElementById("sync-now-btn");
    const disconnectBtn = document.getElementById("sync-disconnect-btn");
    
    if (!textEl) return; // not rendered

    const handle = await global.FieldNotesSyncFile.getStoredHandle();
    
    if (!handle) {
      textEl.textContent = statusText || "Local only";
      connectBtn.style.display = "inline-block";
      nowBtn.style.display = "none";
      disconnectBtn.style.display = "none";
      return;
    }

    connectBtn.style.display = "none";
    nowBtn.style.display = "inline-block";
    disconnectBtn.style.display = "inline-block";

    const hasPermission = await global.FieldNotesSyncFile.verifyPermission(handle, false);
    if (!hasPermission) {
      textEl.textContent = "Permission required";
      textEl.style.color = "var(--c-danger-text)";
      nowBtn.textContent = "Grant Access";
    } else {
      textEl.style.color = "";
      nowBtn.textContent = "Sync Now";
      if (statusText) {
        textEl.textContent = statusText;
      } else {
        const state = global.FieldNotesSync.getSyncState();
        if (state.pendingConflicts && state.pendingConflicts.length > 0) {
            textEl.textContent = "Conflict detected";
        } else if (state.lastSyncTime > 0) {
            textEl.textContent = `Synced ${new Date(state.lastSyncTime).toLocaleTimeString()}`;
        } else {
            textEl.textContent = "Sync file connected";
        }
      }
    }
    if (forceRender) showList();
  }

  async function syncConnect() {
    console.log("SYNC_CONNECT CALLED");
    if (!global.FieldNotesSyncFile.isSupported()) {
       UI.showToast("Direct sync files are not supported by this browser.");
       return;
    }
    let handle = await global.FieldNotesSyncFile.pickFile();
    if (!handle) handle = await global.FieldNotesSyncFile.createFile();
    if (!handle) return; // cancelled
    
    UI.showToast("Sync file connected");
    await updateSyncUI("Sync file connected", true);
    syncNow(true);
  }
  
  async function syncDisconnect() {
    await global.FieldNotesSyncFile.disconnect();
    const state = global.FieldNotesSync.getSyncState();
    state.lastSyncTime = 0;
    state.pendingConflicts = [];
    global.FieldNotesSync.saveSyncState(state);
    updateSyncUI("Local only", true);
    UI.showToast("Disconnected sync file");
  }

  async function syncNow(isFirstConnection = false) {
    console.log("SYNC_NOW CALLED");
    if (!global.FieldNotesSyncFile.isSupported()) return;
    
    const handle = await global.FieldNotesSyncFile.getStoredHandle();
    if (!handle) return;
    
    updateSyncUI("Syncing...");
    
    // Check permission
    const hasPermission = await global.FieldNotesSyncFile.verifyPermission(handle, true);
    if (!hasPermission) {
       updateSyncUI("Permission required");
       return;
    }
    
    if (isFirstConnection) {
       // Peek at remote data to show summary
       const remoteData = await global.FieldNotesSyncFile.read(handle);
       if (remoteData && global.FieldNotesSync.isValidEnvelope(remoteData)) {
           const localCount = global.FieldNotesData.getAll().length;
           const remoteCount = remoteData.notes.length;
           const msg = `Local: ${localCount} notes\nSync file: ${remoteCount} notes\n\nMerge these datasets?`;
           if (!confirm(msg)) {
              syncDisconnect();
              return;
           }
       }
    }

    try {
      const res = await global.FieldNotesSync.performSync(handle, isFirstConnection);
      if (res.ok) {
         if (res.isEmpty) updateSyncUI("Uploaded local data");
         else updateSyncUI(`Synced just now`);
         showList();
      } else {
         if (res.permissionRequired) updateSyncUI("Permission required");
         else if (res.conflicts) {
            updateSyncUI("Conflict detected", true);
            UI.showToast("Conflicts detected");
         } else {
            updateSyncUI(`Sync error: ${res.error}`);
         }
      }
    } catch(e) {
      updateSyncUI("Sync error \u2014 local data safe");
      console.error("SYNC_ERROR_CAUGHT:", e.stack || e);
    }
  }

  function syncResolveConflict() {
      const state = global.FieldNotesSync.getSyncState();
      if (!state.pendingConflicts || state.pendingConflicts.length === 0) {
         UI.showToast("No conflicts to resolve");
         showList();
         return;
      }
      const conflict = state.pendingConflicts[0]; // resolve one by one
      
      const choice = prompt("Sync conflict for note: '" + (conflict.local.summary || 'Unknown') + "'.\nEnter 1 to Keep Local, 2 to Keep Remote, 3 to Keep Both.");
      if (choice === "1") {
         // Keep local: overwrite remote's change. Update local timestamp to guarantee it wins next sync.
         if (global.FieldNotesBackup) global.FieldNotesBackup.takeSnapshot("Before conflict resolution (Keep Local)");
         const notes = global.FieldNotesData.getAll();
         const idx = notes.findIndex(n => n.id === conflict.local.id);
         if (idx !== -1) {
            notes[idx].updatedAt = new Date().toISOString();
            global.FieldNotesData.overwriteAll(notes);
         }
      } else if (choice === "2") {
         // Keep remote: replace local note with remote
         if (global.FieldNotesBackup) global.FieldNotesBackup.takeSnapshot("Before conflict resolution (Keep Remote)");
         const notes = global.FieldNotesData.getAll();
         const idx = notes.findIndex(n => n.id === conflict.local.id);
         if (idx !== -1) {
            notes[idx] = conflict.remote;
            global.FieldNotesData.overwriteAll(notes);
         }
      } else if (choice === "3") {
         // Keep both: Remote keeps ID, local gets new ID
         if (global.FieldNotesBackup) global.FieldNotesBackup.takeSnapshot("Before conflict resolution (Keep Both)");
         const notes = global.FieldNotesData.getAll();
         const idx = notes.findIndex(n => n.id === conflict.local.id);
         if (idx !== -1) {
            notes[idx] = conflict.remote;
            const cloned = { ...conflict.local, id: "inc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), updatedAt: new Date().toISOString() };
            notes.unshift(cloned);
            global.FieldNotesData.overwriteAll(notes);
         }
      } else {
         return; // cancelled
      }
      
      // Remove this conflict and re-sync
      state.pendingConflicts.shift();
      global.FieldNotesSync.saveSyncState(state);
      syncNow();
  }

  // --- /Sync UI Logic ---

  global.FieldNotesActions = {
    state,
    speechAvailable: () => speechAvailable,
    showList,
    showNew,
    showDetail,
    showEdit,
    bind,
    updateSyncUI,
    syncNow
  };
})(window);
