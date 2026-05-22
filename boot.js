/**
 * FieldNotes — startup, theme, service worker
 */
(function () {
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(function () {});
  }

  function init() {
    if (window.FieldNotesPrefs) {
      FieldNotesPrefs.applyTheme(FieldNotesPrefs.load().theme);
    }
    if (!window.FieldNotesData || !window.FieldNotesUI || !window.FieldNotesActions) {
      console.error("FieldNotes: missing scripts. Check index.html load order.");
      document.getElementById("app").innerHTML =
        '<div class="error-banner"><p>App failed to load. Refresh the page.</p></div>';
      return;
    }
    FieldNotesActions.bind();
    FieldNotesActions.showList();
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
