/**
 * FieldNotes — formatting, exports, copy variants
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
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
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

  function pillBadge(label, className, extra) {
    const slug = slugify(label) || "other";
    const extraCls = extra ? ` ${extra}` : "";
    return `<span class="pill ${className} pill-${slug}${extraCls}">${escapeHtml(label)}</span>`;
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
    const parts = [
      statusBadge(note.status),
      priorityBadge(note.priority),
      categoryBadge(note.category),
      contextBadge(note.context),
    ];
    if (note.pinned) parts.unshift(pillBadge("Pinned", "pill-pin"));
    if (note.archived) parts.push(pillBadge("Archived", "pill-archived"));
    return parts.join("");
  }

  function blockLines(pairs) {
    return pairs.map(([label, value]) => `${label}:\n${value || ""}`).join("\n\n");
  }

  function formatTicketText(note) {
    if (!note) return "";
    return blockLines([
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
    ]);
  }

  function formatShortTicket(note) {
    return blockLines([
      ["Summary", note.summary],
      ["Status", note.status],
      ["Issue", note.issue],
      ["Checked", note.checked],
      ["Result", note.result],
      ["Follow-up", note.followUp],
    ]);
  }

  function formatEscalationSummary(note) {
    return blockLines([
      ["Summary", note.summary],
      ["Context", note.context],
      ["Priority", note.priority],
      ["Category", note.category],
      ["Issue", note.issue],
      ["Checked", note.checked],
      ["Changed", note.changed],
      ["Current Result", note.result],
      ["Escalated To", note.escalatedTo],
      ["Follow-up", note.followUp],
    ]);
  }

  function formatManagerSafe(note) {
    return (
      blockLines([
        ["Summary", note.summary],
        ["Context", note.context],
        ["Status", note.status],
        ["Category", note.category],
        ["Result", note.result],
        ["Follow-up", note.followUp],
      ]) + "\n\nNote: No passwords, student names, or sensitive details included."
    );
  }

  function formatLearningSummary(note) {
    return blockLines([
      ["What I was trying to solve", note.issue],
      ["What I checked", note.checked],
      ["What I changed", note.changed],
      ["What worked / did not work", note.result],
      ["What I learned", note.resolutionSummary],
      ["What I should remember next time", note.followUp],
    ]);
  }

  const COPY_FORMATS = {
    full: { label: "Full ticket note", fn: formatTicketText, toast: "Copied full ticket note" },
    short: { label: "Short ticket note", fn: formatShortTicket, toast: "Copied short ticket note" },
    escalation: { label: "Escalation summary", fn: formatEscalationSummary, toast: "Copied escalation summary" },
    manager: { label: "Manager-safe summary", fn: formatManagerSafe, toast: "Copied manager-safe summary" },
    learning: { label: "Learning summary", fn: formatLearningSummary, toast: "Copied learning summary" },
  };

  function safeExportFilename(note) {
    return `fieldnote-${slugify(note.summary) || "fieldnote"}-${formatDateFile(note.updatedAt)}.txt`;
  }

  function backupJsonFilename() {
    return `fieldnotes-backup-${formatDateFile()}.json`;
  }

  function csvFilename() {
    return `fieldnotes-summary-${formatDateFile()}.csv`;
  }

  function combinedTxtFilename() {
    return `fieldnotes-all-notes-${formatDateFile()}.txt`;
  }

  function escapeCsvCell(val) {
    const s = String(val == null ? "" : val).replace(/"/g, '""');
    if (/[",\n\r]/.test(s)) return `"${s}"`;
    return s;
  }

  function notesToCsv(notes) {
    const headers = [
      "Summary",
      "Context",
      "Status",
      "Priority",
      "Category",
      "Reference",
      "Result",
      "Resolution Summary",
      "Follow-up",
      "Escalated To",
      "Time Spent",
      "Tags",
      "Updated",
      "Created",
      "Pinned",
      "Archived",
    ];
    const rows = notes.map((n) => [
      n.summary,
      n.context,
      n.status,
      n.priority,
      n.category,
      n.reference,
      n.result,
      n.resolutionSummary,
      n.followUp,
      n.escalatedTo,
      n.timeSpent,
      n.tags,
      formatDate(n.updatedAt),
      formatDate(n.createdAt),
      n.pinned ? "Yes" : "No",
      n.archived ? "Yes" : "No",
    ]);
    return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  }

  function notesToCombinedTxt(notes) {
    return notes
      .map((n, i) => `========== Note ${i + 1} of ${notes.length} ==========\n\n${formatTicketText(n)}`)
      .join("\n\n\n");
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
    formatShortTicket,
    formatEscalationSummary,
    formatManagerSafe,
    formatLearningSummary,
    COPY_FORMATS,
    safeExportFilename,
    backupJsonFilename,
    csvFilename,
    combinedTxtFilename,
    notesToCsv,
    notesToCombinedTxt,
    fieldBlock,
  };
})(window);
