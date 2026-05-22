/**
 * FieldNotes — startup and service worker registration
 */
(function () {
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return;
    }

    navigator.serviceWorker
      .register("./service-worker.js", { scope: "./" })
      .catch(function () {
        /* App works without PWA */
      });
  }

  function init() {
    if (!window.FieldNotesData || !window.FieldNotesUI || !window.FieldNotesActions) {
      console.error("FieldNotes: missing required scripts. Check script load order in index.html.");
      document.getElementById("app").innerHTML =
        '<div class="error-banner"><p>App failed to load. Please refresh or check the browser console.</p></div>';
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
