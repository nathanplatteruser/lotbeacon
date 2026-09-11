/* LotBeacon desk boot — load recorded overlay, then the floor rail. */
(function () {
  function inject(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var core = "./grok-demo-desk.core.js";
  var cdn = "https://cdn.jsdelivr.net/gh/nathanplatteruser/lotbeacon@16f885983d9facb4eacb0fe091678657b77f04da/docs/grok-demo-desk.js";
  inject(cdn)
    .catch(function () { return inject(core); })
    .then(function () { return inject("./desk-floor-rail.js"); })
    .catch(function (err) { console.warn("LotBeacon rail failed to load", err); });
})();
