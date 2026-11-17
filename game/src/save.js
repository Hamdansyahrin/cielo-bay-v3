// Cielo Bay - save.js: localStorage save / continue.
// Stores cash, mission index and player position only.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var KEY = CB.CFG.SAVE_KEY;
  CB.Save = {
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        var d = JSON.parse(raw);
        if (!d || typeof d.cash !== 'number' || typeof d.mission !== 'number') return null;
        return d;
      } catch (e) { return null; }
    },
    store: function (G) {
      try {
        var p = G.player;
        window.localStorage.setItem(KEY, JSON.stringify({
          cash: Math.floor(G.cash), mission: G.mission,
          x: Math.round(p.x), y: Math.round(p.y),
        }));
      } catch (e) { /* storage may be unavailable */ }
    },
    clear: function () { try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };
})();
