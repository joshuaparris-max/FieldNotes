/**
 * FieldNotes — app startup
 */
(function () {
  function init() {
    if (!window.FieldNotesData || !window.FieldNotesUI || !window.FieldNotesActions) {
      console.error("FieldNotes: missing required scripts. Check script load order in index.html.");
      document.getElementById("app").innerHTML =
        '<div class="error-banner"><p>App failed to load. Please refresh or check the browser console.</p></div>';
      return;
    }
    FieldNotesActions.bind();
    FieldNotesActions.showList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
