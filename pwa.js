/* Registers the shared service worker (only over http/https, e.g. GitHub Pages) and asks the browser
   to keep this site's data (localStorage) even when space is low. Does nothing when opened with a double click.
   The scope is the repo root, so one worker serves every app, nested ones (15-habitos/app, 25-habilidades/mecanografia) too. */
(function () {
  var me = document.currentScript && document.currentScript.src;
  if (!me || !/^https?:/.test(location.protocol)) return;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(new URL("sw.js", me).href, { scope: new URL("./", me).href }).catch(function () {});
    });
  }
  var st = navigator.storage;
  if (st && st.persist && st.persisted) st.persisted().then(function (yes) { return yes || st.persist(); }).catch(function () {});
})();
