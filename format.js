/**
 * FieldNotes — formatting helpers
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

  function excerpt(body, maxLen) {
    const text = (body || "").trim().replace(/\s+/g, " ");
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + "…";
  }

  global.FieldNotesFormat = {
    escapeHtml,
    formatDate,
    formatTags,
    tagHtml,
    excerpt,
  };
})(window);
