/**
 * FieldNotes — IT Support Field Notes UI
 */
(function (global) {
  const Fmt = global.FieldNotesFormat;
  const C = global.FieldNotesConstants;

  const PRIVACY_WARNING =
    "Do not store passwords, student names, client-sensitive information, medical information, or private credentials.";

  function shell(content, showDataTools) {
    const dataTools = showDataTools ? dataToolsPanel() : "";
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
        ${dataTools}
        <footer class="footer">
          <p>Stored locally in your browser. Not for passwords or sensitive personal data. Offline-capable after first load.</p>
        </footer>
      </div>
    `;
  }

  function dataToolsPanel() {
    return `
      <section class="data-tools" aria-labelledby="data-tools-heading">
        <h2 id="data-tools-heading" class="data-tools-title">Data tools</h2>
        <p class="data-tools-note">Notes exist only in this browser. Export a JSON backup before clearing data or clearing browser storage.</p>
        <div class="data-tools-actions">
          <button type="button" class="btn btn-secondary" data-action="export-all-json">Export all JSON backup</button>
          <button type="button" class="btn btn-danger-outline" data-action="clear-data-start">Clear all local data…</button>
        </div>
      </section>
    `;
  }

  function privacyBanner() {
    return `<div class="privacy-banner" role="note"><strong>Privacy:</strong> ${Fmt.escapeHtml(PRIVACY_WARNING)}</div>`;
  }

  function selectOptions(list, selected) {
    return list
      .map(
        (item) =>
          `<option value="${Fmt.escapeHtml(item)}"${item === selected ? " selected" : ""}>${Fmt.escapeHtml(item)}</option>`
      )
      .join("");
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

  function listView(notes, searchQuery) {
    const listItems =
      notes.length === 0
        ? `<li class="empty-state">
            <p>${searchQuery ? "No incidents match your search." : "No incidents yet. Log your first IT support note."}</p>
            <p class="muted empty-example">Example: Wi‑Fi dropouts — checked AP logs, rebooted AP, resolved.</p>
          </li>`
        : notes
            .map((n) => {
              const preview = Fmt.excerpt(n.resolutionSummary || n.result, 100);
              return `
          <li class="note-card">
            <a href="#" class="note-card-link" data-action="open" data-id="${Fmt.escapeHtml(n.id)}">
              <div class="card-top">
                <h3>${Fmt.escapeHtml(n.summary)}</h3>
              </div>
              <div class="card-badges">${Fmt.statusBadge(n.status)}${Fmt.priorityBadge(n.priority)}${Fmt.categoryBadge(n.category)}${Fmt.contextBadge(n.context)}</div>
              <p class="note-excerpt">${preview ? Fmt.escapeHtml(preview) : '<em class="muted">No result yet</em>'}</p>
              <div class="note-meta">
                <span class="meta-item">Updated ${Fmt.escapeHtml(Fmt.formatDate(n.updatedAt))}</span>
              </div>
              ${n.tags ? `<div class="tags">${Fmt.tagHtml(n.tags)}</div>` : ""}
            </a>
          </li>
        `;
            })
            .join("");

    return shell(
      `
      <section class="toolbar">
        <div class="search-wrap">
          <label for="search" class="sr-only">Search incidents</label>
          <input type="search" id="search" class="input" placeholder="Search summary, status, category, issue, tags…" value="${Fmt.escapeHtml(searchQuery || "")}" autocomplete="off">
        </div>
        <button type="button" class="btn btn-primary" data-action="new">+ New incident</button>
      </section>
      <ul class="note-list" role="list">${listItems}</ul>
    `,
      true
    );
  }

  function formView(note, mode, speechAvailable) {
    const isEdit = mode === "edit";
    const heading = isEdit ? "Edit incident" : "New incident";
    const n = note || emptyNote();
    const summaryVal = n.summary === "Untitled incident" && !isEdit ? "" : n.summary || "";

    return shell(
      `
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
          <div class="field-row">
            <label class="field">
              <span>Context</span>
              <select name="context" class="input">${selectOptions(C.CONTEXTS, n.context)}</select>
            </label>
            <label class="field">
              <span>Status</span>
              <select name="status" class="input">${selectOptions(C.STATUSES, n.status)}</select>
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span>Priority</span>
              <select name="priority" class="input">${selectOptions(C.PRIORITIES, n.priority)}</select>
            </label>
            <label class="field">
              <span>Category</span>
              <select name="category" class="input">${selectOptions(C.CATEGORIES, n.category)}</select>
            </label>
          </div>
          <label class="field">
            <span>Reference <span class="field-hint">(ticket #, device name only)</span></span>
            <input type="text" name="reference" class="input" maxlength="200" value="${Fmt.escapeHtml(n.reference)}" placeholder="e.g. INC-1042, LAB-PC-03" aria-describedby="ref-warning">
            <p id="ref-warning" class="field-warning">Do not enter passwords, student names, or client-sensitive details here.</p>
          </label>
          ${textareaField("Issue / Request", "issue", n.issue, "What was reported or what you were asked to fix?", speechAvailable)}
          ${textareaField("Checked", "checked", n.checked, "Diagnostics, logs, tests, questions asked…", speechAvailable)}
          ${textareaField("Changed", "changed", n.changed, "Config changes, installs, reboots, account fixes…", speechAvailable)}
          ${textareaField("Result", "result", n.result, "Current status — resolved, pending, escalated…", speechAvailable)}
          ${textareaField("Resolution summary", "resolutionSummary", n.resolutionSummary, "Brief closure summary for tickets or handover…", speechAvailable)}
          ${textareaField("Follow-up", "followUp", n.followUp, "Next steps, owner, scheduled work…", speechAvailable)}
          <div class="field-row">
            <label class="field">
              <span>Escalated to</span>
              <input type="text" name="escalatedTo" class="input" maxlength="200" value="${Fmt.escapeHtml(n.escalatedTo)}" placeholder="Team, vendor, or tier (no personal sensitive data)">
            </label>
            <label class="field">
              <span>Time spent</span>
              <input type="text" name="timeSpent" class="input" maxlength="80" value="${Fmt.escapeHtml(n.timeSpent)}" placeholder="e.g. 45 min">
            </label>
          </div>
          <label class="field">
            <span>Tags</span>
            <input type="text" name="tags" class="input" maxlength="200" value="${Fmt.escapeHtml(n.tags)}" placeholder="Comma-separated, e.g. network, printer">
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Save incident"}</button>
            ${isEdit ? `<button type="button" class="btn btn-danger" data-action="delete" data-id="${Fmt.escapeHtml(n.id)}">Delete</button>` : ""}
          </div>
        </form>
      </section>
    `,
      false
    );
  }

  function detailView(note) {
    return shell(
      `
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
          </div>
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
      false
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

  function copyFallbackModal(text) {
    const existing = document.getElementById("copy-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "copy-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="copy-modal-title">
        <h2 id="copy-modal-title">Copy ticket note</h2>
        <p class="muted">Clipboard access failed. Select all and copy manually (Ctrl+C).</p>
        <textarea class="input copy-fallback-text" readonly rows="16" aria-label="Ticket note text">${Fmt.escapeHtml(text)}</textarea>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" data-action="close-modal">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const ta = modal.querySelector(".copy-fallback-text");
    const closeBtn = modal.querySelector("[data-action='close-modal']");
    if (ta) {
      ta.focus();
      ta.select();
    }
    if (closeBtn) closeBtn.focus();
  }

  function clearDataModal(step) {
    const existing = document.getElementById("clear-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "clear-modal";
    modal.className = "modal-overlay";

    if (step === 1) {
      modal.innerHTML = `
        <div class="modal-panel modal-danger" role="dialog" aria-modal="true" aria-labelledby="clear-modal-title">
          <h2 id="clear-modal-title">Clear all local data?</h2>
          <p>This removes <strong>all incident notes</strong> stored in this browser for FieldNotes.</p>
          <ul class="modal-list">
            <li>Data is not recoverable after clearing.</li>
            <li>Export a JSON backup first if you need to keep notes.</li>
            <li>This does not affect other websites or browser data.</li>
          </ul>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-action="close-clear-modal">Cancel</button>
            <button type="button" class="btn btn-danger" data-action="clear-data-step2">I understand — continue</button>
          </div>
        </div>
      `;
    } else {
      modal.innerHTML = `
        <div class="modal-panel modal-danger" role="dialog" aria-modal="true" aria-labelledby="clear-modal-title2">
          <h2 id="clear-modal-title2">Final confirmation</h2>
          <p>Type <strong>DELETE</strong> below to permanently clear all FieldNotes data in this browser.</p>
          <label class="field">
            <span class="sr-only">Confirmation</span>
            <input type="text" id="clear-confirm-input" class="input" autocomplete="off" placeholder="Type DELETE">
          </label>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-action="close-clear-modal">Cancel</button>
            <button type="button" class="btn btn-danger" data-action="clear-data-final" disabled>Delete all local notes</button>
          </div>
        </div>
      `;
    }

    document.body.appendChild(modal);
    if (step === 2) {
      const input = modal.querySelector("#clear-confirm-input");
      const btn = modal.querySelector("[data-action='clear-data-final']");
      if (input && btn) {
        input.focus();
        input.addEventListener("input", () => {
          btn.disabled = input.value.trim() !== "DELETE";
        });
      }
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
    showToast,
    showCopyFallback(text) {
      copyFallbackModal(text);
    },
    closeCopyModal() {
      const modal = document.getElementById("copy-modal");
      if (modal) modal.remove();
    },
    showClearDataModal(step) {
      clearDataModal(step);
    },
    closeClearDataModal() {
      const modal = document.getElementById("clear-modal");
      if (modal) modal.remove();
    },
  };
})(window);
