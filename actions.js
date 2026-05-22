/**
 * FieldNotes — actions, copy/export, voice, data tools
 */
(function (global) {
  const Data = global.FieldNotesData;
  const UI = global.FieldNotesUI;
  const Fmt = global.FieldNotesFormat;

  const state = {
    view: "list",
    searchQuery: "",
    activeId: null,
  };

  let activeRecognition = null;
  let speechAvailable = false;

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
    stopDictation();
    UI.renderList(Data.search(state.searchQuery), state.searchQuery);
  }

  function showNew() {
    state.view = "form-new";
    state.activeId = null;
    UI.closeCopyModal();
    UI.closeClearDataModal();
    stopDictation();
    UI.renderForm(null, "new", speechAvailable);
  }

  function showDetail(id) {
    const note = Data.getById(id);
    if (!note) {
      showList();
      return;
    }
    state.view = "detail";
    state.activeId = id;
    stopDictation();
    UI.renderDetail(note);
  }

  function showEdit(id) {
    const note = Data.getById(id);
    if (!note) {
      showList();
      return;
    }
    state.view = "form-edit";
    state.activeId = id;
    stopDictation();
    UI.renderForm(note, "edit", speechAvailable);
  }

  function stopDictation() {
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        /* ignore */
      }
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
    recognition.maxAlternatives = 1;

    activeRecognition = recognition;
    button.classList.add("btn-dictate-active");
    button.textContent = "Listening…";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (!transcript) return;
      const sep = textarea.value && !textarea.value.endsWith(" ") ? " " : "";
      if (event.results[event.results.length - 1].isFinal) {
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

    try {
      recognition.start();
    } catch {
      stopDictation();
    }
  }

  async function copyTicketNote(id) {
    const note = Data.getById(id);
    if (!note) return;
    const text = Fmt.formatTicketText(note);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        UI.showToast("Copied ticket note");
        return;
      }
    } catch {
      /* fallback */
    }

    UI.showCopyFallback(text);
    UI.showToast("Copy manually from dialog");
  }

  function exportTxt(id) {
    const note = Data.getById(id);
    if (!note) return;
    const text = Fmt.formatTicketText(note);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, Fmt.safeExportFilename(note));
    UI.showToast("Exported text file");
  }

  function exportAllJson() {
    const payload = Data.exportAllJson();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, Fmt.backupJsonFilename());
    UI.showToast("Exported JSON backup");
  }

  function clearAllDataFinal() {
    Data.clearAllLocalData();
    UI.closeClearDataModal();
    UI.showToast("All local notes cleared");
    state.searchQuery = "";
    showList();
  }

  function handleClick(e) {
    const clearModal = e.target.closest("#clear-modal [data-action]");
    if (clearModal) {
      e.preventDefault();
      const action = clearModal.getAttribute("data-action");
      if (action === "close-clear-modal") UI.closeClearDataModal();
      if (action === "clear-data-step2") UI.showClearDataModal(2);
      if (action === "clear-data-final") clearAllDataFinal();
      return;
    }

    const copyModalBtn = e.target.closest("#copy-modal [data-action]");
    if (copyModalBtn) {
      e.preventDefault();
      if (copyModalBtn.getAttribute("data-action") === "close-modal") {
        UI.closeCopyModal();
        document.getElementById("app")?.querySelector("[data-action='copy-ticket']")?.focus();
      }
      return;
    }

    const el = e.target.closest("[data-action]");
    if (!el) return;

    const action = el.getAttribute("data-action");
    const id = el.getAttribute("data-id");

    if (action === "dictate") {
      e.preventDefault();
      const field = el.getAttribute("data-field");
      if (field && speechAvailable) startDictation(field, el);
      return;
    }

    if (
      [
        "open",
        "back",
        "new",
        "edit",
        "delete",
        "copy-ticket",
        "export-txt",
        "export-all-json",
        "clear-data-start",
      ].includes(action)
    ) {
      e.preventDefault();
    }

    switch (action) {
      case "new":
        showNew();
        break;
      case "back":
        showList();
        break;
      case "open":
        if (id) showDetail(id);
        break;
      case "edit":
        if (id) showEdit(id);
        break;
      case "delete":
        if (id && confirm("Delete this incident note? This cannot be undone.")) {
          Data.remove(id);
          UI.showToast("Deleted incident");
          showList();
        }
        break;
      case "copy-ticket":
        if (id) copyTicketNote(id);
        break;
      case "export-txt":
        if (id) exportTxt(id);
        break;
      case "export-all-json":
        exportAllJson();
        break;
      case "clear-data-start":
        UI.showClearDataModal(1);
        break;
      default:
        break;
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
    const input = e.target.closest("#search");
    if (!input) return;
    state.searchQuery = input.value;
    UI.renderList(Data.search(state.searchQuery), state.searchQuery);
    const searchEl = document.getElementById("search");
    if (searchEl) {
      searchEl.focus();
      const len = searchEl.value.length;
      searchEl.setSelectionRange(len, len);
    }
  }

  function bind() {
    initSpeech();
    const app = document.getElementById("app");
    app.addEventListener("click", handleClick);
    app.addEventListener("submit", handleSubmit);
    app.addEventListener("input", handleSearch);
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        if (e.target.id === "copy-modal") UI.closeCopyModal();
        if (e.target.id === "clear-modal") UI.closeClearDataModal();
      }
    });
  }

  global.FieldNotesActions = {
    state,
    speechAvailable: () => speechAvailable,
    showList,
    showNew,
    showDetail,
    showEdit,
    bind,
  };
})(window);
