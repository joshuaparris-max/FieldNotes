/**
 * FieldNotes — actions, copy/export, voice input
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
      issue: fd.get("issue"),
      checked: fd.get("checked"),
      changed: fd.get("changed"),
      result: fd.get("result"),
      followUp: fd.get("followUp"),
      reference: fd.get("reference"),
      tags: fd.get("tags"),
    };
  }

  function showList() {
    state.view = "list";
    state.activeId = null;
    UI.closeCopyModal();
    stopDictation();
    UI.renderList(Data.search(state.searchQuery), state.searchQuery);
  }

  function showNew() {
    state.view = "form-new";
    state.activeId = null;
    UI.closeCopyModal();
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

    recognition.onerror = () => {
      stopDictation();
    };

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
        return;
      }
    } catch {
      /* fallback below */
    }

    UI.showCopyFallback(text);
  }

  function exportTxt(id) {
    const note = Data.getById(id);
    if (!note) return;
    const text = Fmt.formatTicketText(note);
    const filename = Fmt.safeExportFilename(note);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
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

  function handleClick(e) {
    const modalBtn = e.target.closest("#copy-modal [data-action]");
    if (modalBtn) {
      e.preventDefault();
      if (modalBtn.getAttribute("data-action") === "close-modal") UI.closeCopyModal();
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

    if (["open", "back", "new", "edit", "delete"].includes(action)) {
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
          showList();
        }
        break;
      case "copy-ticket":
        if (id) copyTicketNote(id);
        break;
      case "export-txt":
        if (id) exportTxt(id);
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
      showDetail(noteId);
    } else {
      const note = Data.create(payload);
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
      if (e.target.classList.contains("modal-overlay")) UI.closeCopyModal();
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
