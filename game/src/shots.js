// Cielo Bay - shots.js: deterministic ?shot= scenes for screenshots.
// Poses the real game (same actors, same systems) and raises
// window.__shot = "ready" once the scene is on screen.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function near(G, list, x, y, maxD) {
    var best = null, bd = maxD;
    list.forEach(function (o) { var d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function poseShot(G, name) {
    var p = G.player;
    G.screen = 'playing';
    G.started = true;
    if (name === 'cover') {
      // Downtown on foot: traffic, peds, minimap, objective banner.
      p.x = 920; p.y = 1150; p.onFoot = true; p.car = null;
      CB.Missions.start(G, 0);
      var c1 = near(G, G.cars.filter(function (c) { return c.kind === 'traffic'; }), 920, 1000, 400);
      if (c1) { c1.x = 894; c1.y = 1010; }
      var c2 = near(G, G.cars.filter(function (c) { return c.kind === 'traffic' && c !== c1; }), 920, 1330, 400);
      if (c2) { c2.x = 946; c2.y = 1330; }
    } else if (name === 'drive') {
      // Driving the beachfront road in the marked car.
      p.x = 1250; p.y = CFG.BEACH_ROAD_Y + 26;
      var car = G.markedCar;
      car.x = 1250; car.y = CFG.BEACH_ROAD_Y + 26; car.angle = 0; car.speed = 235;
      CB.enterCar(G, car);
      CB.Missions.start(G, 0);
      if (G.missionState) G.missionState.phase = 'deliver';
      G.cash = 250;
    } else if (name === 'chase') {
      // Police pursuit at exactly 3 stars, downtown.
      p.x = 1520; p.y = 1180;
      var car2 = near(G, G.cars.filter(function (c) { return c.kind === 'parked' || c.kind === 'civilian'; }), 1520, 1180, 300) || G.markedCar;
      car2.x = 1520; car2.y = 1180; car2.angle = Math.PI / 2; car2.speed = 190;
      CB.enterCar(G, car2);
      CB.Missions.start(G, 2);
      CB.setWanted(G, 3);
      G.lastKnownX = p.x; G.lastKnownY = p.y; G.lastSeenAt = G.time;
      for (var i = 0; i < 3; i++) {
        var cruiser = CB.spawnCruiser(G);
        if (cruiser) { cruiser.car.x = 1520 + (i - 1) * 90; cruiser.car.y = 1180 + 190 + i * 60; cruiser.car.angle = -Math.PI / 2; cruiser.car.speed = 170; cruiser.x = cruiser.car.x; cruiser.y = cruiser.car.y; }
      }
    } else if (name === 'mission') {
      // Pier mission moment: the player pushes onto the pier with the
      // crew in sight - posed west of the pier so the camera (clamped
      // at the world edge) frames the player AND the crew together.
      if (!G.rivals || G.rivals.length === 0) CB.spawnRivals(G);
      p.x = 2640; p.y = 1005; p.onFoot = true; p.car = null;
      p.aimAngle = 0.12; p.angle = 0.12;
      G.mouse.wx = p.x + 300; G.mouse.wy = p.y + 36;
      if (G.rivals[0]) { G.rivals[0].x = 2845; G.rivals[0].y = 955; }
      if (G.rivals[1]) { G.rivals[1].x = 2805; G.rivals[1].y = 1065; }
      CB.Missions.start(G, 3);
      G.cash = 2150;
    }
    CB.updateCamera(G, 1);
    // Let a few real frames render, then declare the scene ready.
    var frames = 0;
    var iv = setInterval(function () {
      frames++;
      if (frames >= 6) { clearInterval(iv); window.__shot = 'ready'; }
    }, 90);
  }
  CB.poseShot = poseShot;
})();
