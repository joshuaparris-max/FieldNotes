/**
 * FieldNotes — DOM rendering
 */
(function (global) {
  const { escapeHtml, formatDate, tagHtml, excerpt } = global.FieldNotesFormat;

  function shell(content) {
    return `
      <div class="app">
        <header class="header">
          <div class="brand">
            <span class="brand-icon" aria-hidden="true">📓</span>
            <div>
              <h1>FieldNotes</h1>
              <p class="subtitle">Capture observations in the field</p>
            </div>
          </div>
        </header>
        <main class="main">${content}</main>
        <footer class="footer">
          <p>Data stays in your browser (localStorage). No account required.</p>
        </footer>
      </div>
    `;
  }

  function listView(notes, searchQuery) {
    const listItems =
      notes.length === 0
        ? `<li class="empty-state">
            <p>${searchQuery ? "No notes match your search." : "No notes yet. Create your first field note."}</p>
          </li>`
        : notes
            .map(
              (n) => `
          <li class="note-card" data-id="${escapeHtml(n.id)}">
            <a href="#" class="note-card-link" data-action="open" data-id="${escapeHtml(n.id)}">
              <h3>${escapeHtml(n.title)}</h3>
              <p class="note-excerpt">${(() => { const t = excerpt(n.body, 120); return t ? escapeHtml(t) : '<em class="muted">No details</em>'; })()}</p>
              <div class="note-meta">
                ${n.location ? `<span class="meta-item">📍 ${escapeHtml(n.location)}</span>` : ""}
                <span class="meta-item">${escapeHtml(formatDate(n.updatedAt))}</span>
              </div>
              ${n.tags ? `<div class="tags">${tagHtml(n.tags)}</div>` : ""}
            </a>
          </li>
        `
            )
            .join("");

    return shell(`
      <section class="toolbar">
        <div class="search-wrap">
          <label for="search" class="sr-only">Search notes</label>
          <input type="search" id="search" class="input" placeholder="Search notes…" value="${escapeHtml(searchQuery || "")}" autocomplete="off">
        </div>
        <button type="button" class="btn btn-primary" data-action="new">+ New note</button>
      </section>
      <ul class="note-list" role="list">${listItems}</ul>
    `);
  }

  function formView(note, mode) {
    const isEdit = mode === "edit";
    const title = isEdit ? "Edit note" : "New note";
    const n = note || { title: "", body: "", location: "", tags: "" };

    return shell(`
      <section class="form-panel">
        <div class="form-header">
          <button type="button" class="btn btn-ghost" data-action="back">← Back</button>
          <h2>${title}</h2>
        </div>
        <form class="note-form" data-mode="${mode}" ${isEdit ? `data-id="${escapeHtml(n.id)}"` : ""}>
          <label class="field">
            <span>Title</span>
            <input type="text" name="title" class="input" required maxlength="200" value="${escapeHtml(n.title === "Untitled note" && !isEdit ? "" : n.title)}" placeholder="e.g. Creek survey — north bank">
          </label>
          <label class="field">
            <span>Details</span>
            <textarea name="body" class="input textarea" rows="8" placeholder="Observations, measurements, species, conditions…">${escapeHtml(n.body)}</textarea>
          </label>
          <label class="field">
            <span>Location</span>
            <input type="text" name="location" class="input" maxlength="200" value="${escapeHtml(n.location)}" placeholder="Site name or coordinates">
          </label>
          <label class="field">
            <span>Tags</span>
            <input type="text" name="tags" class="input" maxlength="200" value="${escapeHtml(n.tags)}" placeholder="Comma-separated, e.g. flora, water-quality">
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Save note"}</button>
            ${isEdit ? `<button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(n.id)}">Delete</button>` : ""}
          </div>
        </form>
      </section>
    `);
  }

  function detailView(note) {
    return shell(`
      <section class="detail-panel">
        <div class="form-header">
          <button type="button" class="btn btn-ghost" data-action="back">← All notes</button>
          <button type="button" class="btn btn-secondary" data-action="edit" data-id="${escapeHtml(note.id)}">Edit</button>
        </div>
        <article class="note-detail">
          <h2>${escapeHtml(note.title)}</h2>
          <div class="note-detail-meta">
            ${note.location ? `<span>📍 ${escapeHtml(note.location)}</span>` : ""}
            <span>Updated ${escapeHtml(formatDate(note.updatedAt))}</span>
          </div>
          ${note.tags ? `<div class="tags">${tagHtml(note.tags)}</div>` : ""}
          <div class="note-body">${note.body ? escapeHtml(note.body).replace(/\n/g, "<br>") : '<p class="muted"><em>No details recorded.</em></p>'}</div>
        </article>
      </section>
    `);
  }

  global.FieldNotesUI = {
    renderList(notes, searchQuery) {
      document.getElementById("app").innerHTML = listView(notes, searchQuery);
    },

    renderForm(note, mode) {
      document.getElementById("app").innerHTML = formView(note, mode);
    },

    renderDetail(note) {
      document.getElementById("app").innerHTML = detailView(note);
    },
  };
})(window);
