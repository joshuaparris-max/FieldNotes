/**
 * FieldNotes — formatting, ticket export, filenames
 */
(function (global) {
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateFile(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  }

  function formatTags(tags) {
    if (!tags) return [];
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function tagHtml(tags) {
    return formatTags(tags)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  function excerpt(text, maxLen) {
    const t = (text || "").trim().replace(/\s+/g, " ");
    if (!t) return "";
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen).trimEnd() + "…";
  }

  function contextBadge(context) {
    const label = escapeHtml(context || "Other");
    const slug = (context || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `<span class="context-badge context-${slug}">${label}</span>`;
  }

  function formatTicketText(note) {
    if (!note) return "";
    const lines = [
      ["Summary", note.summary],
      ["Context", note.context],
      ["Reference", note.reference],
      ["Issue / Request", note.issue],
      ["Checked", note.checked],
      ["Changed", note.changed],
      ["Result", note.result],
      ["Follow-up", note.followUp],
      ["Tags", note.tags],
      ["Updated", formatDate(note.updatedAt)],
      ["Created", formatDate(note.createdAt)],
    ];
    return lines.map(([label, value]) => `${label}:\n${value || ""}`).join("\n\n");
  }

  function safeExportFilename(note) {
    const slug = (note.summary || "fieldnote")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "fieldnote";
    const date = formatDateFile(note.updatedAt);
    return `fieldnote-${slug}-${date}.txt`;
  }

  function fieldBlock(label, value) {
    const v = (value || "").trim();
    if (!v) {
      return `<div class="detail-field"><h3 class="detail-label">${escapeHtml(label)}</h3><p class="muted"><em>—</em></p></div>`;
    }
    return `<div class="detail-field"><h3 class="detail-label">${escapeHtml(label)}</h3><div class="detail-value">${escapeHtml(v).replace(/\n/g, "<br>")}</div></div>`;
  }

  global.FieldNotesFormat = {
    escapeHtml,
    formatDate,
    formatDateFile,
    formatTags,
    tagHtml,
    excerpt,
    contextBadge,
    formatTicketText,
    safeExportFilename,
    fieldBlock,
  };
})(window);
