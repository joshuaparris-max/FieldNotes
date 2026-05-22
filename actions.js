/**
 * FieldNotes — user actions and routing
 */
(function (global) {
  const Data = global.FieldNotesData;
  const UI = global.FieldNotesUI;

  const state = {
    view: "list",
    searchQuery: "",
    activeId: null,
  };

  function showList() {
    state.view = "list";
    state.activeId = null;
    const notes = Data.search(state.searchQuery);
    UI.renderList(notes, state.searchQuery);
  }

  function showNew() {
    state.view = "form-new";
    state.activeId = null;
    UI.renderForm(null, "new");
  }

  function showDetail(id) {
    const note = Data.getById(id);
    if (!note) {
      showList();
      return;
    }
    state.view = "detail";
    state.activeId = id;
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
    UI.renderForm(note, "edit");
  }

  function handleClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    e.preventDefault();

    const action = el.getAttribute("data-action");
    const id = el.getAttribute("data-id");

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
        if (id && confirm("Delete this note? This cannot be undone.")) {
          Data.remove(id);
          showList();
        }
        break;
      default:
        break;
    }
  }

  function handleSubmit(e) {
    const form = e.target.closest(".note-form");
    if (!form) return;
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      title: fd.get("title"),
      body: fd.get("body"),
      location: fd.get("location"),
      tags: fd.get("tags"),
    };

    const mode = form.getAttribute("data-mode");
    if (mode === "edit") {
      const id = form.getAttribute("data-id");
      Data.update(id, payload);
      showDetail(id);
    } else {
      const note = Data.create(payload);
      showDetail(note.id);
    }
  }

  function handleSearch(e) {
    const input = e.target.closest("#search");
    if (!input) return;
    state.searchQuery = input.value;
    const notes = Data.search(state.searchQuery);
    UI.renderList(notes, state.searchQuery);
    const searchEl = document.getElementById("search");
    if (searchEl) {
      searchEl.focus();
      const len = searchEl.value.length;
      searchEl.setSelectionRange(len, len);
    }
  }

  function bind() {
    const app = document.getElementById("app");
    app.addEventListener("click", handleClick);
    app.addEventListener("submit", handleSubmit);
    app.addEventListener("input", handleSearch);
  }

  global.FieldNotesActions = {
    state,
    showList,
    showNew,
    showDetail,
    showEdit,
    bind,
  };
})(window);
