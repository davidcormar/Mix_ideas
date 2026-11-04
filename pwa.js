/* Registers the shared service worker (only over http/https, e.g. GitHub Pages) and asks the browser
   to keep this site's data (localStorage) even when space is low. Does nothing when opened with a double click. */
(function () {
  var me = document.currentScript && document.currentScript.src;
  if (!me || !/^https?:/.test(location.protocol)) return;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(new URL("sw.js", me).href, { scope: new URL("./", me).href }).catch(function () {});
    });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
})();
