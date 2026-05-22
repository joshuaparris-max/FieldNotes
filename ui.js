/**
 * FieldNotes — IT Support Field Notes UI
 */
(function (global) {
  const Fmt = global.FieldNotesFormat;
  const C = global.FieldNotesConstants;
  const PrefsApi = global.FieldNotesPrefs;
  const Templates = global.FieldNotesTemplates;

  const PRIVACY_WARNING =
    "Do not store passwords, student names, client-sensitive information, medical information, or private credentials.";

  const SNIPPETS = [
    { label: "Confirmed user impact", text: "Confirmed user impact." },
    { label: "Checked ticket history", text: "Checked ticket history." },
    { label: "Checked device restart status", text: "Checked device restart status." },
    { label: "Restarted device", text: "Restarted device." },
    { label: "Checked network connectivity", text: "Checked network connectivity." },
    { label: "Checked account/licensing", text: "Checked account/licensing." },
    { label: "Checked recent changes", text: "Checked recent changes." },
    { label: "Cleared cache / restarted app", text: "Cleared cache / restarted app." },
    { label: "Escalated for review", text: "Escalated for review." },
    { label: "Waiting on user response", text: "Waiting on user response." },
    { label: "Resolved and confirmed", text: "Resolved and confirmed." },
    { label: "Documented outcome", text: "Documented outcome." },
  ];

  let lastFocusEl = null;

  function shell(content, options) {
    const opts = options || {};
    const prefs = PrefsApi.load();
    const dataTools = opts.dataTools ? dataToolsPanel() : "";
    const topBar = opts.topBar !== false ? globalTopBar(prefs) : "";
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
          ${topBar}
        </header>
        <main class="main">${content}</main>
        ${dataTools}
        <footer class="footer">
          <p>Stored locally in your browser. Export JSON backups regularly.</p>
        </footer>
      </div>
    `;
  }

  function globalTopBar(prefs) {
    return `
      <div class="top-bar" role="toolbar" aria-label="Display options">
        <label class="toggle-chip">
          <input type="checkbox" data-action="toggle-privacy" ${prefs.privacyMode ? "checked" : ""}>
          <span>Privacy mode</span>
        </label>
        <label class="toggle-chip">
          <span class="sr-only">Theme</span>
          <select class="input input-compact" data-action="set-theme" aria-label="Theme">
            <option value="system"${prefs.theme === "system" ? " selected" : ""}>System theme</option>
            <option value="light"${prefs.theme === "light" ? " selected" : ""}>Light</option>
            <option value="dark"${prefs.theme === "dark" ? " selected" : ""}>Dark</option>
          </select>
        </label>
      </div>
    `;
  }

  function dataToolsPanel() {
    return `
      <section class="data-tools" aria-labelledby="data-tools-heading">
        <h2 id="data-tools-heading" class="data-tools-title">Data tools</h2>
        <p class="data-tools-note">Notes exist only in this browser. Export backups before clearing data.</p>
        <div class="data-tools-actions">
          <button type="button" class="btn btn-secondary" data-action="export-all-json">Export all JSON</button>
          <button type="button" class="btn btn-secondary" data-action="export-csv">Export all CSV</button>
          <button type="button" class="btn btn-secondary" data-action="export-combined-txt">Export all TXT</button>
          <button type="button" class="btn btn-secondary" data-action="import-json-start">Restore / import JSON</button>
          <button type="button" class="btn btn-danger-outline" data-action="clear-data-start">Clear all local data…</button>
        </div>
        <input type="file" id="import-json-file" accept=".json,application/json" class="sr-only" aria-hidden="true">
      </section>
    `;
  }

  function privacyBanner() {
    return `<div class="privacy-banner" role="note"><strong>Privacy:</strong> ${Fmt.escapeHtml(PRIVACY_WARNING)}</div>`;
  }

  function selectOptions(list, selected, emptyLabel) {
    const empty = emptyLabel ? `<option value="">${Fmt.escapeHtml(emptyLabel)}</option>` : "";
    return (
      empty +
      list
        .map(
          (item) =>
            `<option value="${Fmt.escapeHtml(item)}"${item === selected ? " selected" : ""}>${Fmt.escapeHtml(item)}</option>`
        )
        .join("")
    );
  }

  function dictateBtn(fieldName, speechAvailable) {
    if (!speechAvailable) {
      return `<button type="button" class="btn-dictate btn-dictate-off" disabled title="Voice not supported">Dictate</button>`;
    }
    return `<button type="button" class="btn-dictate" data-action="dictate" data-field="${Fmt.escapeHtml(fieldName)}">Dictate</button>`;
  }

  function textareaField(label, name, value, placeholder, speechAvailable) {
    return `
      <div class="field field-textarea" data-field-wrap="${name}">
        <div class="field-label-row">
          <span>${Fmt.escapeHtml(label)}</span>
          ${dictateBtn(name, speechAvailable)}
        </div>
        <textarea name="${name}" class="input textarea textarea-lg" rows="5" placeholder="${Fmt.escapeHtml(placeholder)}">${Fmt.escapeHtml(value || "")}</textarea>
      </div>
    `;
  }

  function activeFilterChips(filters) {
    const chips = [];
    if (filters.context) chips.push(`Context: ${filters.context}`);
    if (filters.status) chips.push(`Status: ${filters.status}`);
    if (filters.priority) chips.push(`Priority: ${filters.priority}`);
    if (filters.category) chips.push(`Category: ${filters.category}`);
    if (filters.pinnedOnly) chips.push("Pinned only");
    if (filters.showArchived) chips.push("Including archived");
    if (!chips.length) return "";
    return `<div class="active-filters" aria-label="Active filters">${chips.map((c) => `<span class="filter-chip">${Fmt.escapeHtml(c)}</span>`).join("")}</div>`;
  }

  function filterSortPanel(prefs) {
    const f = prefs.filters;
    const sortOpts = C.SORT_OPTIONS.map(
      (o) => `<option value="${o.id}"${prefs.sort === o.id ? " selected" : ""}>${Fmt.escapeHtml(o.label)}</option>`
    ).join("");
    return `
      <section class="filter-panel" aria-label="Filter and sort">
        <details class="filter-details" open>
          <summary>Filter & sort</summary>
          <div class="filter-grid">
            <label class="field field-compact"><span>Context</span>
              <select class="input" data-filter="context">${selectOptions(C.CONTEXTS, f.context, "All")}</select></label>
            <label class="field field-compact"><span>Status</span>
              <select class="input" data-filter="status">${selectOptions(C.STATUSES, f.status, "All")}</select></label>
            <label class="field field-compact"><span>Priority</span>
              <select class="input" data-filter="priority">${selectOptions(C.PRIORITIES, f.priority, "All")}</select></label>
            <label class="field field-compact"><span>Category</span>
              <select class="input" data-filter="category">${selectOptions(C.CATEGORIES, f.category, "All")}</select></label>
            <label class="field field-compact"><span>Sort</span>
              <select class="input" data-filter="sort">${sortOpts}</select></label>
          </div>
          <div class="filter-toggles">
            <label class="toggle-chip"><input type="checkbox" data-filter="pinnedOnly" ${f.pinnedOnly ? "checked" : ""}><span>Pinned only</span></label>
            <label class="toggle-chip"><input type="checkbox" data-filter="showArchived" ${f.showArchived ? "checked" : ""}><span>Show archived</span></label>
            <button type="button" class="btn btn-ghost btn-sm" data-action="clear-filters">Clear filters</button>
          </div>
          ${activeFilterChips(f)}
        </details>
      </section>
    `;
  }

  function emptyNote() {
    return {
      summary: "",
      context: "Other",
      status: "Open",
      priority: "Normal",
      category: "Other",
      issue: "",
      checked: "",
      changed: "",
      result: "",
      resolutionSummary: "",
      followUp: "",
      reference: "",
      escalatedTo: "",
      timeSpent: "",
      tags: "",
    };
  }

  function emptyState() {
    return `
      <li class="empty-state">
        <h3>IT Support Field Notes</h3>
        <p>Capture issues, checks, changes, and outcomes — then copy into tickets or export backups.</p>
        <p class="privacy-banner-inline"><strong>Safety:</strong> ${Fmt.escapeHtml(PRIVACY_WARNING)}</p>
        <div class="empty-actions">
          <button type="button" class="btn btn-primary" data-action="new">Create first incident</button>
          <button type="button" class="btn btn-secondary" data-action="import-json-start">Import backup</button>
        </div>
        <details class="onboarding">
          <summary>How to use this well</summary>
          <ol>
            <li>Write the issue/request.</li>
            <li>Record what you checked.</li>
            <li>Record what you changed.</li>
            <li>Record the result.</li>
            <li>Copy into your ticket if needed.</li>
            <li>Export JSON backup regularly.</li>
          </ol>
          <p class="muted"><strong>Example (safe):</strong> Summary: Printer offline — Ref: INC-1042 — Checked spooler — Restarted spooler — Result: test page OK.</p>
        </details>
      </li>
    `;
  }

  function listView(notes, searchQuery, prefs) {
    const privacy = prefs.privacyMode;
    const listItems =
      notes.length === 0
        ? searchQuery || hasActiveFilters(prefs.filters)
          ? `<li class="empty-state"><p>No incidents match your search or filters.</p><button type="button" class="btn btn-ghost" data-action="clear-filters">Clear filters</button></li>`
          : emptyState()
        : notes
            .map((n) => {
              const preview = privacy
                ? ""
                : Fmt.excerpt(n.resolutionSummary || n.result, 100);
              const previewHtml = preview
                ? Fmt.escapeHtml(preview)
                : '<em class="muted">No result yet</em>';
              return `
          <li class="note-card${n.archived ? " note-archived" : ""}">
            <a href="#" class="note-card-link" data-action="open" data-id="${Fmt.escapeHtml(n.id)}">
              <div class="card-top">
                <h3>${Fmt.escapeHtml(n.summary)}</h3>
              </div>
              <div class="card-badges">${Fmt.metaBadges(n)}</div>
              ${privacy ? "" : `<p class="note-excerpt">${previewHtml}</p>`}
              <div class="note-meta"><span class="meta-item">Updated ${Fmt.escapeHtml(Fmt.formatDate(n.updatedAt))}</span></div>
              ${n.tags && !privacy ? `<div class="tags">${Fmt.tagHtml(n.tags)}</div>` : ""}
            </a>
          </li>`;
            })
            .join("");

    return shell(
      `
      <section class="toolbar">
        <div class="search-wrap">
          <label for="search" class="sr-only">Search incidents</label>
          <input type="search" id="search" class="input" placeholder="Search all fields…" value="${Fmt.escapeHtml(searchQuery || "")}" autocomplete="off">
        </div>
        <button type="button" class="btn btn-primary" data-action="new">+ New incident</button>
      </section>
      ${filterSortPanel(prefs)}
      <ul class="note-list" role="list">${listItems}</ul>
    `,
      { dataTools: true }
    );
  }

  function hasActiveFilters(f) {
    return !!(f.context || f.status || f.priority || f.category || f.pinnedOnly || f.showArchived);
  }

  function templateSelect() {
    const opts = Templates.map(
      (t) => `<option value="${Fmt.escapeHtml(t.id)}">${Fmt.escapeHtml(t.label)}</option>`
    ).join("");
    return `
      <label class="field">
        <span>Use template</span>
        <select class="input" data-action="apply-template" aria-label="Use template">
          <option value="">— Choose template —</option>
          ${opts}
        </select>
      </label>
    `;
  }

  function quickFillSection() {
    const btns = SNIPPETS.map(
      (s) =>
        `<button type="button" class="btn btn-snippet" data-action="snippet" data-text="${Fmt.escapeHtml(s.text)}">${Fmt.escapeHtml(s.label)}</button>`
    ).join("");
    return `
      <details class="quick-fill">
        <summary>Quick fill snippets</summary>
        <p class="muted">Click a field below, then tap a snippet to append text.</p>
        <div class="snippet-targets">
          <button type="button" class="btn btn-ghost btn-sm" data-action="snippet-target" data-field="issue">Target: Issue</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="snippet-target" data-field="checked">Target: Checked</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="snippet-target" data-field="changed">Target: Changed</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="snippet-target" data-field="result">Target: Result</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="snippet-target" data-field="followUp">Target: Follow-up</button>
          <span class="snippet-target-label muted" id="snippet-target-label">Issue</span>
        </div>
        <div class="snippet-grid">${btns}</div>
      </details>
    `;
  }

  function formView(note, mode, speechAvailable) {
    const isEdit = mode === "edit";
    const n = note || emptyNote();
    const summaryVal = n.summary === "Untitled incident" && !isEdit ? "" : n.summary || "";

    return shell(
      `
      <section class="form-panel">
        <div class="form-header">
          <button type="button" class="btn btn-ghost" data-action="back">← Back</button>
          <h2>${isEdit ? "Edit incident" : "New incident"}</h2>
        </div>
        ${privacyBanner()}
        ${!isEdit ? templateSelect() : ""}
        ${quickFillSection()}
        <form class="note-form" data-mode="${mode}" ${isEdit ? `data-id="${Fmt.escapeHtml(n.id)}"` : ""}>
          <label class="field"><span>Summary</span>
            <input type="text" name="summary" class="input" required maxlength="200" value="${Fmt.escapeHtml(summaryVal)}" placeholder="Short title"></label>
          <div class="field-row">
            <label class="field"><span>Context</span><select name="context" class="input">${selectOptions(C.CONTEXTS, n.context)}</select></label>
            <label class="field"><span>Status</span><select name="status" class="input">${selectOptions(C.STATUSES, n.status)}</select></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Priority</span><select name="priority" class="input">${selectOptions(C.PRIORITIES, n.priority)}</select></label>
            <label class="field"><span>Category</span><select name="category" class="input">${selectOptions(C.CATEGORIES, n.category)}</select></label>
          </div>
          <label class="field"><span>Reference</span>
            <input type="text" name="reference" class="input" maxlength="200" value="${Fmt.escapeHtml(n.reference)}" placeholder="Ticket # or device" aria-describedby="ref-warning">
            <p id="ref-warning" class="field-warning">Do not enter passwords, student names, or client-sensitive details.</p></label>
          ${textareaField("Issue / Request", "issue", n.issue, "What was reported?", speechAvailable)}
          ${textareaField("Checked", "checked", n.checked, "Diagnostics and tests", speechAvailable)}
          ${textareaField("Changed", "changed", n.changed, "Changes made", speechAvailable)}
          ${textareaField("Result", "result", n.result, "Current status", speechAvailable)}
          ${textareaField("Resolution summary", "resolutionSummary", n.resolutionSummary, "Brief closure summary", speechAvailable)}
          ${textareaField("Follow-up", "followUp", n.followUp, "Next steps", speechAvailable)}
          <div class="field-row">
            <label class="field"><span>Escalated to</span><input type="text" name="escalatedTo" class="input" value="${Fmt.escapeHtml(n.escalatedTo)}"></label>
            <label class="field"><span>Time spent</span><input type="text" name="timeSpent" class="input" value="${Fmt.escapeHtml(n.timeSpent)}" placeholder="e.g. 45 min"></label>
          </div>
          <label class="field"><span>Tags</span><input type="text" name="tags" class="input" value="${Fmt.escapeHtml(n.tags)}"></label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Save incident"}</button>
            ${isEdit ? `<button type="button" class="btn btn-danger" data-action="delete" data-id="${Fmt.escapeHtml(n.id)}">Delete</button>` : ""}
          </div>
        </form>
      </section>
    `,
      { dataTools: false, topBar: true }
    );
  }

  function copyMenuButtons(noteId) {
    return Object.entries(Fmt.COPY_FORMATS)
      .map(
        ([key, def]) =>
          `<button type="button" class="btn btn-secondary btn-sm" data-action="copy-format" data-format="${key}" data-id="${Fmt.escapeHtml(noteId)}">${Fmt.escapeHtml(def.label)}</button>`
      )
      .join("");
  }

  function detailView(note) {
    return shell(
      `
      <section class="detail-panel">
        <div class="form-header detail-actions">
          <button type="button" class="btn btn-ghost" data-action="back">← All incidents</button>
          <div class="detail-btn-group">
            <button type="button" class="btn btn-secondary" data-action="export-txt" data-id="${Fmt.escapeHtml(note.id)}">Export .txt</button>
            <button type="button" class="btn btn-secondary" data-action="edit" data-id="${Fmt.escapeHtml(note.id)}">Edit</button>
          </div>
        </div>
        <div class="detail-pin-row">
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-pin" data-id="${Fmt.escapeHtml(note.id)}">${note.pinned ? "Unpin" : "Pin"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-archive" data-id="${Fmt.escapeHtml(note.id)}">${note.archived ? "Unarchive" : "Archive"}</button>
        </div>
        <details class="copy-menu" open>
          <summary>Copy as…</summary>
          <div class="copy-menu-btns">${copyMenuButtons(note.id)}</div>
        </details>
        <article class="note-detail">
          <div class="detail-title-row"><h2>${Fmt.escapeHtml(note.summary)}</h2></div>
          <div class="card-badges detail-badges">${Fmt.metaBadges(note)}</div>
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
            ${Fmt.fieldBlock("Resolution summary", note.resolutionSummary)}
            ${Fmt.fieldBlock("Follow-up", note.followUp)}
            ${Fmt.fieldBlock("Escalated to", note.escalatedTo)}
            ${Fmt.fieldBlock("Time spent", note.timeSpent)}
          </div>
        </article>
      </section>
    `,
      { dataTools: false, topBar: true }
    );
  }

  function ensureToastContainer() {
    let el = document.getElementById("toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-container";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function showCopyFallback(text, returnFocusEl) {
    lastFocusEl = returnFocusEl || document.activeElement;
    const existing = document.getElementById("copy-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "copy-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="copy-modal-title">
        <h2 id="copy-modal-title">Copy text</h2>
        <p class="muted">Select all and copy manually (Ctrl+C).</p>
        <textarea class="input copy-fallback-text" readonly rows="14" aria-label="Copy text">${Fmt.escapeHtml(text)}</textarea>
        <div class="form-actions"><button type="button" class="btn btn-primary" data-action="close-modal">Close</button></div>
      </div>`;
    document.body.appendChild(modal);
    const ta = modal.querySelector(".copy-fallback-text");
    const close = modal.querySelector("[data-action='close-modal']");
    if (ta) { ta.focus(); ta.select(); }
    if (close) close.addEventListener("click", () => restoreFocus());
  }

  function restoreFocus() {
    if (lastFocusEl && typeof lastFocusEl.focus === "function") lastFocusEl.focus();
    lastFocusEl = null;
  }

  function closeCopyModal() {
    const modal = document.getElementById("copy-modal");
    if (modal) modal.remove();
    restoreFocus();
  }

  function clearDataModal(step) {
    const existing = document.getElementById("clear-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "clear-modal";
    modal.className = "modal-overlay";
    if (step === 1) {
      modal.innerHTML = `
        <div class="modal-panel modal-danger" role="dialog" aria-modal="true">
          <h2>Clear all local data?</h2>
          <p>Removes all incidents in this browser. <strong>Export JSON first.</strong></p>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-action="close-clear-modal">Cancel</button>
            <button type="button" class="btn btn-danger" data-action="clear-data-step2">Continue</button>
          </div>
        </div>`;
    } else {
      modal.innerHTML = `
        <div class="modal-panel modal-danger" role="dialog" aria-modal="true">
          <h2>Final confirmation</h2>
          <p>Type <strong>DELETE</strong> to clear all notes.</p>
          <input type="text" id="clear-confirm-input" class="input" autocomplete="off" placeholder="Type DELETE">
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-action="close-clear-modal">Cancel</button>
            <button type="button" class="btn btn-danger" data-action="clear-data-final" disabled>Delete all</button>
          </div>
        </div>`;
    }
    document.body.appendChild(modal);
    modal.querySelector("button, input")?.focus();
    if (step === 2) {
      const input = modal.querySelector("#clear-confirm-input");
      const btn = modal.querySelector("[data-action='clear-data-final']");
      input?.addEventListener("input", () => { btn.disabled = input.value.trim() !== "DELETE"; });
    }
  }

  function importModal() {
    const existing = document.getElementById("import-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "import-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true">
        <h2>Import JSON backup</h2>
        <p>Choose a <code>fieldnotes-backup-*.json</code> file from this app.</p>
        <label class="field"><span>Import mode</span>
          <select id="import-mode" class="input">
            <option value="merge">Merge — keep existing, update duplicates by date</option>
            <option value="replace">Replace all — overwrite current notes</option>
          </select>
        </label>
        <p class="field-warning" id="import-replace-warn" hidden>Replace will remove all current notes after validation.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-action="close-import-modal">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="import-json-pick">Choose file…</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const modeSel = modal.querySelector("#import-mode");
    const warn = modal.querySelector("#import-replace-warn");
    modeSel?.addEventListener("change", () => {
      warn.hidden = modeSel.value !== "replace";
    });
  }

  function closeImportModal() {
    document.getElementById("import-modal")?.remove();
  }

  function closeClearDataModal() {
    document.getElementById("clear-modal")?.remove();
  }

  function syncFilterControls(prefs) {
    const root = document.getElementById("app");
    if (!root) return;
    const f = prefs.filters;
    root.querySelectorAll("[data-filter]").forEach((el) => {
      const key = el.getAttribute("data-filter");
      if (key === "sort") el.value = prefs.sort;
      else if (key === "pinnedOnly" || key === "showArchived") el.checked = !!f[key];
      else if (f[key] !== undefined) el.value = f[key] || "";
    });
  }

  global.FieldNotesUI = {
    PRIVACY_WARNING,
    SNIPPETS,
    getSnippetTarget: () => global.FieldNotesUI._snippetTarget || "issue",
    setSnippetTarget: (f) => { global.FieldNotesUI._snippetTarget = f; },
    renderList(notes, searchQuery, prefs) {
      document.getElementById("app").innerHTML = listView(notes, searchQuery, prefs);
      syncFilterControls(prefs);
    },
    renderForm(note, mode, speechAvailable) {
      document.getElementById("app").innerHTML = formView(note, mode, speechAvailable);
      global.FieldNotesUI.setSnippetTarget("issue");
      const lbl = document.getElementById("snippet-target-label");
      if (lbl) lbl.textContent = "Target: Issue";
    },
    renderDetail(note) {
      document.getElementById("app").innerHTML = detailView(note);
    },
    showToast,
    showCopyFallback,
    closeCopyModal,
    showClearDataModal: clearDataModal,
    closeClearDataModal,
    showImportModal: importModal,
    closeImportModal,
  };
})(window);
