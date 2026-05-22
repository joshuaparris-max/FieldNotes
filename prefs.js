/**
 * FieldNotes — UI preferences (filters, sort, theme, privacy)
 */
(function (global) {
  const C = global.FieldNotesConstants;
  const KEY = C.UI_PREFS_KEY;

  const DEFAULTS = {
    filters: {
      context: "",
      status: "",
      priority: "",
      category: "",
      showArchived: false,
      pinnedOnly: false,
    },
    sort: "updatedDesc",
    privacyMode: false,
    theme: "system",
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const p = JSON.parse(raw);
      return {
        filters: { ...DEFAULTS.filters, ...(p.filters || {}) },
        sort: p.sort || DEFAULTS.sort,
        privacyMode: !!p.privacyMode,
        theme: p.theme || DEFAULTS.theme,
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }

  function applyTheme(themePref) {
    const root = document.documentElement;
    if (themePref === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (themePref === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  global.FieldNotesPrefs = {
    DEFAULTS,
    load,
    save,
    applyTheme,
  };
})(window);
