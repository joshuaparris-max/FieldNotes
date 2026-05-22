/**
 * FieldNotes — formatting, ticket export, filenames, badges
 */
(function (global) {
  const C = global.FieldNotesConstants;

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
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
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

  function slugify(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function pillBadge(label, className) {
    const slug = slugify(label) || "other";
    return `<span class="pill ${className} pill-${slug}">${escapeHtml(label)}</span>`;
  }

  function contextBadge(context) {
    return pillBadge(context || "Other", "pill-context");
  }

  function statusBadge(status) {
    return pillBadge(status || "Open", "pill-status");
  }

  function priorityBadge(priority) {
    return pillBadge(priority || "Normal", "pill-priority");
  }

  function categoryBadge(category) {
    return pillBadge(category || "Other", "pill-category");
  }

  function metaBadges(note) {
    return [statusBadge(note.status), priorityBadge(note.priority), categoryBadge(note.category), contextBadge(note.context)].join("");
  }

  function formatTicketText(note) {
    if (!note) return "";
    const lines = [
      ["Summary", note.summary],
      ["Context", note.context],
      ["Status", note.status],
      ["Priority", note.priority],
      ["Category", note.category],
      ["Reference", note.reference],
      ["Issue / Request", note.issue],
      ["Checked", note.checked],
      ["Changed", note.changed],
      ["Result", note.result],
      ["Resolution Summary", note.resolutionSummary],
      ["Follow-up", note.followUp],
      ["Escalated To", note.escalatedTo],
      ["Time Spent", note.timeSpent],
      ["Tags", note.tags],
      ["Updated", formatDate(note.updatedAt)],
      ["Created", formatDate(note.createdAt)],
    ];
    return lines.map(([label, value]) => `${label}:\n${value || ""}`).join("\n\n");
  }

  function safeExportFilename(note) {
    const slug = slugify(note.summary) || "fieldnote";
    return `fieldnote-${slug}-${formatDateFile(note.updatedAt)}.txt`;
  }

  function backupJsonFilename() {
    return `fieldnotes-backup-${formatDateFile()}.json`;
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
    statusBadge,
    priorityBadge,
    categoryBadge,
    metaBadges,
    formatTicketText,
    safeExportFilename,
    backupJsonFilename,
    fieldBlock,
  };
})(window);
