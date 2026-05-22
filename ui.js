/**
 * FieldNotes — IT Support Field Notes UI
 */
(function (global) {
  const Fmt = global.FieldNotesFormat;
  const CONTEXTS = global.FieldNotesData.CONTEXTS;

  const PRIVACY_WARNING =
    "Do not store passwords, student names, client-sensitive information, medical information, or private credentials.";

  function shell(content) {
    return `
      <div class="app">
        <header class="header">
          <div class="brand">
            <span class="brand-icon" aria-hidden="true">🛠️</span>
            <div>
              <h1>IT Support Field Notes</h1>
              <p class="subtitle">Record troubleshooting, outcomes, and follow-ups</p>
            </div>
          </div>
        </header>
        <main class="main">${content}</main>
        <footer class="footer">
          <p>Stored locally in your browser. Not for passwords or sensitive personal data.</p>
        </footer>
      </div>
    `;
  }

  function privacyBanner() {
    return `<div class="privacy-banner" role="note"><strong>Privacy:</strong> ${Fmt.escapeHtml(PRIVACY_WARNING)}</div>`;
  }

  function contextOptions(selected) {
    return CONTEXTS.map(
      (c) =>
        `<option value="${Fmt.escapeHtml(c)}"${c === selected ? " selected" : ""}>${Fmt.escapeHtml(c)}</option>`
    ).join("");
  }

  function dictateBtn(fieldName, speechAvailable) {
    if (!speechAvailable) {
      return `<button type="button" class="btn-dictate btn-dictate-off" disabled title="Voice input not supported in this browser">Dictate</button>`;
    }
    return `<button type="button" class="btn-dictate" data-action="dictate" data-field="${Fmt.escapeHtml(fieldName)}" title="Dictate into this field">Dictate</button>`;
  }

  function textareaField(label, name, value, placeholder, speechAvailable) {
    return `
      <div class="field field-textarea">
        <div class="field-label-row">
          <span>${Fmt.escapeHtml(label)}</span>
          ${dictateBtn(name, speechAvailable)}
        </div>
        <textarea name="${name}" class="input textarea textarea-lg" rows="6" placeholder="${Fmt.escapeHtml(placeholder)}">${Fmt.escapeHtml(value || "")}</textarea>
      </div>
    `;
  }

  function emptyNote() {
    return {
      summary: "",
      context: "Other",
      issue: "",
      checked: "",
      changed: "",
      result: "",
      followUp: "",
      reference: "",
      tags: "",
    };
  }

  function listView(notes, searchQuery) {
    const listItems =
      notes.length === 0
        ? `<li class="empty-state">
            <p>${searchQuery ? "No incidents match your search." : "No incidents yet. Log your first IT support note."}</p>
          </li>`
        : notes
            .map((n) => {
              const resultPreview = Fmt.excerpt(n.result, 100);
              return `
          <li class="note-card">
            <a href="#" class="note-card-link" data-action="open" data-id="${Fmt.escapeHtml(n.id)}">
              <div class="card-top">
                <h3>${Fmt.escapeHtml(n.summary)}</h3>
                ${Fmt.contextBadge(n.context)}
              </div>
              <p class="note-excerpt">${resultPreview ? Fmt.escapeHtml(resultPreview) : '<em class="muted">No result recorded yet</em>'}</p>
              <div class="note-meta">
                <span class="meta-item">Updated ${Fmt.escapeHtml(Fmt.formatDate(n.updatedAt))}</span>
              </div>
              ${n.tags ? `<div class="tags">${Fmt.tagHtml(n.tags)}</div>` : ""}
            </a>
          </li>
        `;
            })
            .join("");

    return shell(`
      <section class="toolbar">
        <div class="search-wrap">
          <label for="search" class="sr-only">Search incidents</label>
          <input type="search" id="search" class="input" placeholder="Search summary, context, issue, tags…" value="${Fmt.escapeHtml(searchQuery || "")}" autocomplete="off">
        </div>
        <button type="button" class="btn btn-primary" data-action="new">+ New incident</button>
      </section>
      <ul class="note-list" role="list">${listItems}</ul>
    `);
  }

  function formView(note, mode, speechAvailable) {
    const isEdit = mode === "edit";
    const heading = isEdit ? "Edit incident" : "New incident";
    const n = note || emptyNote();
    const summaryVal =
      n.summary === "Untitled incident" && !isEdit ? "" : n.summary || "";

    return shell(`
      <section class="form-panel">
        <div class="form-header">
          <button type="button" class="btn btn-ghost" data-action="back">← Back</button>
          <h2>${heading}</h2>
        </div>
        ${privacyBanner()}
        <p class="voice-hint">Voice input depends on browser support. Use Dictate beside each section when available.</p>
        <form class="note-form" data-mode="${mode}" ${isEdit ? `data-id="${Fmt.escapeHtml(n.id)}"` : ""}>
          <label class="field">
            <span>Summary</span>
            <input type="text" name="summary" class="input" required maxlength="200" value="${Fmt.escapeHtml(summaryVal)}" placeholder="Short title, e.g. Laptop won't join Wi‑Fi">
          </label>
          <label class="field">
            <span>Context</span>
            <select name="context" class="input">${contextOptions(n.context)}</select>
          </label>
          <label class="field">
            <span>Reference <span class="field-hint">(ticket #, device name — no sensitive data)</span></span>
            <input type="text" name="reference" class="input" maxlength="200" value="${Fmt.escapeHtml(n.reference)}" placeholder="e.g. INC-1042, LAB-PC-03">
          </label>
          ${textareaField("Issue / Request", "issue", n.issue, "What was reported or what you were asked to fix?", speechAvailable)}
          ${textareaField("Checked", "checked", n.checked, "Diagnostics, logs, tests, questions asked…", speechAvailable)}
          ${textareaField("Changed", "changed", n.changed, "Config changes, installs, reboots, account fixes…", speechAvailable)}
          ${textareaField("Result", "result", n.result, "Current status — resolved, pending, escalated…", speechAvailable)}
          ${textareaField("Follow-up", "followUp", n.followUp, "Next steps, owner, scheduled work…", speechAvailable)}
          <label class="field">
            <span>Tags</span>
            <input type="text" name="tags" class="input" maxlength="200" value="${Fmt.escapeHtml(n.tags)}" placeholder="Comma-separated, e.g. network, printer, ad">
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Save incident"}</button>
            ${isEdit ? `<button type="button" class="btn btn-danger" data-action="delete" data-id="${Fmt.escapeHtml(n.id)}">Delete</button>` : ""}
          </div>
        </form>
      </section>
    `);
  }

  function detailView(note) {
    return shell(`
      <section class="detail-panel">
        <div class="form-header detail-actions">
          <button type="button" class="btn btn-ghost" data-action="back">← All incidents</button>
          <div class="detail-btn-group">
            <button type="button" class="btn btn-secondary" data-action="copy-ticket" data-id="${Fmt.escapeHtml(note.id)}">Copy ticket note</button>
            <button type="button" class="btn btn-secondary" data-action="export-txt" data-id="${Fmt.escapeHtml(note.id)}">Export .txt</button>
            <button type="button" class="btn btn-secondary" data-action="edit" data-id="${Fmt.escapeHtml(note.id)}">Edit</button>
          </div>
        </div>
        <article class="note-detail">
          <div class="detail-title-row">
            <h2>${Fmt.escapeHtml(note.summary)}</h2>
            ${Fmt.contextBadge(note.context)}
          </div>
          <div class="note-detail-meta">
            <span>Created ${Fmt.escapeHtml(Fmt.formatDate(note.createdAt))}</span>
            <span>Updated ${Fmt.escapeHtml(Fmt.formatDate(note.updatedAt))}</span>
          </div>
          ${note.tags ? `<div class="tags">${Fmt.tagHtml(note.tags)}</div>` : ""}
          <div class="detail-sections">
            ${Fmt.fieldBlock("Reference", note.reference)}
            ${Fmt.fieldBlock("Issue / Request", note.issue)}
            ${Fmt.fieldBlock("Checked", note.checked)}
            ${Fmt.fieldBlock("Changed", note.changed)}
            ${Fmt.fieldBlock("Result", note.result)}
            ${Fmt.fieldBlock("Follow-up", note.followUp)}
          </div>
        </article>
      </section>
    `);
  }

  function copyFallbackModal(text) {
    const existing = document.getElementById("copy-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "copy-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-labelledby="copy-modal-title">
        <h2 id="copy-modal-title">Copy ticket note</h2>
        <p class="muted">Clipboard access failed. Select all and copy manually (Ctrl+C).</p>
        <textarea class="input copy-fallback-text" readonly rows="16">${Fmt.escapeHtml(text)}</textarea>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" data-action="close-modal">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const ta = modal.querySelector(".copy-fallback-text");
    if (ta) {
      ta.focus();
      ta.select();
    }
  }

  global.FieldNotesUI = {
    PRIVACY_WARNING,

    renderList(notes, searchQuery) {
      document.getElementById("app").innerHTML = listView(notes, searchQuery);
    },

    renderForm(note, mode, speechAvailable) {
      document.getElementById("app").innerHTML = formView(note, mode, speechAvailable);
    },

    renderDetail(note) {
      document.getElementById("app").innerHTML = detailView(note);
    },

    showCopyFallback(text) {
      copyFallbackModal(text);
    },

    closeCopyModal() {
      const modal = document.getElementById("copy-modal");
      if (modal) modal.remove();
    },
  };
})(window);
