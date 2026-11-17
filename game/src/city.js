// Cielo Bay - city.js: generates the city of Cielo Bay from a seed:
// three districts, a road grid with named streets, height-shaded
// buildings with lit windows, palms, the beach and the pier.
// Also owns geometry helpers: building collision and line of sight.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function rectsOverlap(a, b, pad) {
    return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  }
  function nearRoadX(x) { for (var i = 0; i < CFG.ROADS_X.length; i++) if (Math.abs(x - CFG.ROADS_X[i]) < CFG.ROAD_W / 2 + 26) return true; return false; }
  function nearRoadY(y) {
    for (var i = 0; i < CFG.ROADS_Y.length; i++) if (Math.abs(y - CFG.ROADS_Y[i]) < CFG.ROAD_W / 2 + 26) return true;
    if (Math.abs(y - CFG.BEACH_ROAD_Y) < CFG.ROAD_W / 2 + 26) return true;
    return false;
  }

  function generateCity(seed) {
    var rng = new CB.RNG(seed * 7919 + 13);
    var buildings = [];
    var palms = [];
    var plazas = [];
    var reserved = [
      { x: CFG.CHOP_SHOP.x - 110, y: CFG.CHOP_SHOP.y - 110, w: 220, h: 220 },
      { x: CFG.PIER.x - 30, y: CFG.PIER.y - 30, w: CFG.PIER.w + 60, h: CFG.PIER.h + 60 },
      { x: CFG.PLAYER_START.x - 70, y: CFG.PLAYER_START.y - 70, w: 140, h: 140 },
    ];
    // Blocks are the rectangles between neighbouring roads.
    var xs = [0].concat(CFG.ROADS_X.map(function (r) { return r + CFG.ROAD_W / 2; }));
    var xe = CFG.ROADS_X.map(function (r) { return r - CFG.ROAD_W / 2; }).concat([CFG.WORLD_W]);
    var ys = [0].concat(CFG.ROADS_Y.map(function (r) { return r + CFG.ROAD_W / 2; }));
    var ye = CFG.ROADS_Y.map(function (r) { return r - CFG.ROAD_W / 2; }).concat([CFG.BEACH_ROAD_Y - CFG.ROAD_W / 2]);
    for (var bi = 0; bi < xs.length; bi++) {
      for (var bj = 0; bj < ys.length; bj++) {
        // Voss Plaza: the block east of Cielo Boulevard between Coral
        // Avenue and Harbor Line is an open park - no buildings, just
        // grass, palms and sightlines. It is the city's front lawn.
        if (xs[bi] === CFG.ROADS_X[1] + CFG.ROAD_W / 2 && ys[bj] === CFG.ROADS_Y[1] + CFG.ROAD_W / 2) {
          plazas.push({ x: xs[bi] + 10, y: ys[bj] + 10, w: xe[bi] - xs[bi] - 20, h: ye[bj] - ys[bj] - 20, name: 'VOSS PLAZA' });
          for (var pk = 0; pk < 9; pk++) {
            palms.push({ x: xs[bi] + 50 + (pk % 3) * 170 + rng.range(-12, 12), y: ys[bj] + 60 + Math.floor(pk / 3) * 170 + rng.range(-12, 12), s: rng.range(0.9, 1.3) });
          }
          continue;
        }
        var bx = xs[bi] + 16, by = ys[bj] + 16;
        var bw = xe[bi] - xs[bi] - 32, bh = ye[bj] - ys[bj] - 32;
        if (bw < 90 || bh < 90) continue;
        var downtown = (xs[bi] < 1820);
        var port = (xs[bi] >= 1820);
        // Subdivide each block into 1-4 lots.
        var cols = bw > 340 ? 2 : 1, rows = bh > 340 ? 2 : 1;
        for (var cx = 0; cx < cols; cx++) {
          for (var cy = 0; cy < rows; cy++) {
            var lw = bw / cols - 14, lh = bh / rows - 14;
            var lx = bx + cx * (bw / cols) + 7, ly = by + cy * (bh / rows) + 7;
            var rect = { x: lx, y: ly, w: lw, h: lh };
            var blocked = false;
            for (var ri = 0; ri < reserved.length; ri++) if (rectsOverlap(rect, reserved[ri], 4)) { blocked = true; break; }
            if (blocked) continue;
            var height = port ? rng.range(0.25, 0.6) : downtown ? rng.range(0.7, 2.6) : rng.range(0.3, 0.9);
            var wins = [];
            var wcols = Math.max(2, Math.floor(lw / 26)), wrows = Math.max(2, Math.floor(lh / 26));
            for (var wx = 0; wx < wcols; wx++) for (var wy = 0; wy < wrows; wy++) {
              if (rng.chance(0.42)) wins.push({ x: 8 + wx * ((lw - 14) / Math.max(1, wcols - 1 || 1)), y: 8 + wy * ((lh - 14) / Math.max(1, wrows - 1 || 1)) });
            }
            buildings.push({
              x: lx, y: ly, w: lw, h: lh, height: height,
              roof: rng.pick(CFG.PALETTE.buildingRoof),
              windows: wins, warehouse: port && rng.chance(0.6),
            });
          }
        }
      }
    }
    // Palms line the beachfront road and the beach itself.
    for (var px = 60; px < CFG.WORLD_W - 40; px += 92) {
      if (nearRoadX(px)) continue;
      palms.push({ x: px + rng.range(-8, 8), y: CFG.BEACH_ROAD_Y - 92 + rng.range(-6, 6), s: rng.range(0.8, 1.25) });
      if (rng.chance(0.7)) palms.push({ x: px + 30, y: CFG.WATER_Y - 46 + rng.range(-8, 8), s: rng.range(0.8, 1.2) });
    }
    for (var qx = 120; qx < CFG.WORLD_W; qx += 260) {
      if (nearRoadX(qx) || nearRoadY(300)) continue;
      if (rng.chance(0.5)) palms.push({ x: qx, y: 250 + rng.range(-10, 10), s: rng.range(0.7, 1.1) });
    }
    return { buildings: buildings, palms: palms, plazas: plazas, seed: seed };
  }

  // Segment vs rect: does the segment enter the rect at all?
  function segHitsRect(x1, y1, x2, y2, r, pad) {
    var minx = r.x - pad, maxx = r.x + r.w + pad, miny = r.y - pad, maxy = r.y + r.h + pad;
    if (x1 >= minx && x1 <= maxx && y1 >= miny && y1 <= maxy) return true;
    if (x2 >= minx && x2 <= maxx && y2 >= miny && y2 <= maxy) return true;
    var dx = x2 - x1, dy = y2 - y1;
    var tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-9) { if (x1 < minx || x1 > maxx) return false; }
    else {
      var t1 = (minx - x1) / dx, t2 = (maxx - x1) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmin > tmax) return false;
    }
    if (Math.abs(dy) < 1e-9) { if (y1 < miny || y1 > maxy) return false; }
    else {
      var t3 = (miny - y1) / dy, t4 = (maxy - y1) / dy;
      tmin = Math.max(tmin, Math.min(t3, t4)); tmax = Math.min(tmax, Math.max(t3, t4));
      if (tmin > tmax) return false;
    }
    return true;
  }
  function hasLOS(G, x1, y1, x2, y2) {
    var bs = G.city.buildings;
    for (var i = 0; i < bs.length; i++) if (segHitsRect(x1, y1, x2, y2, bs[i], 0)) return false;
    return true;
  }
  function circleHitsBuildings(G, x, y, rad) {
    var bs = G.city.buildings;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var nx = Math.max(b.x, Math.min(x, b.x + b.w));
      var ny = Math.max(b.y, Math.min(y, b.y + b.h));
      var dx = x - nx, dy = y - ny;
      if (dx * dx + dy * dy < rad * rad) return b;
    }
    return null;
  }
  function pointInBuilding(G, x, y) {
    var bs = G.city.buildings;
    for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; }
    return null;
  }
  CB.generateCity = generateCity;
  CB.hasLOS = hasLOS;
  CB.segHitsRect = segHitsRect;
  CB.circleHitsBuildings = circleHitsBuildings;
  CB.pointInBuilding = pointInBuilding;
})();
