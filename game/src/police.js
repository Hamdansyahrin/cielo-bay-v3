// Cielo Bay - police.js: the wanted system and pursuit AI.
// Crimes raise the heat only when a pedestrian or a cruiser actually
// witnesses them. Cruisers spawn far away at road edges, chase the
// player's LAST KNOWN position, see through line of sight inside
// ~240px, give up after ~8s unseen, and the heat decays only while
// nobody has eyes on the player. Four-plus stars bring roadblocks.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function setWanted(G, n) {
    G.wanted = Math.max(0, Math.min(5, Math.floor(n)));
    if (G.wanted > 0) G.lastCrimeAt = G.time;
  }
  CB.setWanted = setWanted;
  function addWanted(G, n) { setWanted(G, G.wanted + n); }
  CB.addWanted = addWanted;

  function anyWitness(G, x, y, radius) {
    var r = radius || 230;
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (!ped.dead && Math.hypot(ped.x - x, ped.y - y) < r && CB.hasLOS(G, ped.x, ped.y, x, y)) return true;
    }
    for (var j = 0; j < G.police.length; j++) {
      var c = G.police[j];
      if (Math.hypot(c.x - x, c.y - y) < r + 60 && CB.hasLOS(G, c.x, c.y, x, y)) return true;
    }
    // A crime right under a cruiser's nose is always seen.
    return false;
  }
  // Crime table: kind -> stars added when witnessed (shots are heard
  // in a small radius even without a clean line of sight).
  var CRIME_STARS = { theft: 1, hitandrun: 1, hitcar: 0, assault: 1, shots: 0, shotcop: 1, crash: 0, rivaldown: 0 };
  function witnessCrime(G, kind, x, y, forceStars) {
    G.lastCrimeAt = G.time;
    var stars = typeof forceStars === 'number' ? forceStars : (CRIME_STARS[kind] || 0);
    var witnessed = anyWitness(G, x, y, kind === 'shots' ? 170 : 230) || G.police.length > 0 && anyWitness(G, x, y, 320);
    if (kind === 'shots') witnessed = witnessed || G.police.length > 0;
    if (witnessed) {
      if (stars > 0) addWanted(G, stars);
      else if (G.wanted === 0 && (kind === 'shots' || kind === 'hitcar')) addWanted(G, 1);
      G.lastKnownX = G.player.x; G.lastKnownY = G.player.y; G.lastSeenAt = G.time;
    }
  }
  CB.witnessCrime = witnessCrime;
  function spawnCruiser(G) {
    var p = G.player;
    // Spawn OUTSIDE the seen radius, on a road, 650-1000px away.
    for (var tries = 0; tries < 24; tries++) {
      var vertical = Math.random() < 0.5;
      var x, y;
      if (vertical) { x = CFG.ROADS_X[Math.floor(Math.random() * CFG.ROADS_X.length)]; y = p.y + (Math.random() < 0.5 ? -1 : 1) * CFG.POLICE_SPAWN_MIN + Math.random() * 200; }
      else { y = CFG.ROADS_Y[Math.floor(Math.random() * CFG.ROADS_Y.length)]; x = p.x + (Math.random() < 0.5 ? -1 : 1) * CFG.POLICE_SPAWN_MIN + Math.random() * 200; }
      x = Math.max(50, Math.min(CFG.WORLD_W - 50, x)); y = Math.max(50, Math.min(CFG.WATER_Y - 60, y));
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < CFG.POLICE_SPAWN_MIN - 40 || d > CFG.POLICE_SPAWN_MAX + 160) continue;
      var car = CB.makeCar(x, y, 0, CFG.PALETTE.police, 'police');
      car.driver = 'police'; car.hp = 130; car.maxHp = 130;
      var cruiser = { car: car, x: x, y: y, angle: 0, speed: 0, lastSeenAt: 0, bustT: 0, stuckT: 0, sirenPhase: Math.random() * 2 };
      G.police.push(cruiser);
      return cruiser;
    }
    return null;
  }
  function desiredCruisers(G) { return G.wanted <= 0 ? 0 : Math.min(6, G.wanted + 1); }

  function updatePolice(G, dt) {
    var p = G.player;
    // Spawning: trickle in while the heat is on.
    G.policeSpawnT -= dt;
    if (G.wanted > 0 && G.police.length < desiredCruisers(G) && G.policeSpawnT <= 0) {
      G.policeSpawnT = 2.2;
      spawnCruiser(G);
    }
    var anyoneSees = false;
    for (var i = G.police.length - 1; i >= 0; i--) {
      var c = G.police[i], car = c.car;
      c.x = car.x; c.y = car.y; c.angle = car.angle; c.speed = car.speed;
      if (car.dead) { G.police.splice(i, 1); continue; }
      var distP = Math.hypot(p.x - car.x, p.y - car.y);
      var sees = distP < CFG.SEEN_RADIUS && CB.hasLOS(G, car.x, car.y, p.x, p.y);
      if (sees) {
        anyoneSees = true;
        c.lastSeenAt = G.time;
        G.lastKnownX = p.x; G.lastKnownY = p.y; G.lastSeenAt = G.time;
      }
      var unseenFor = G.time - Math.max(c.lastSeenAt || 0, G.lastSeenAt || 0);
      if (G.wanted === 0 || unseenFor > 26) { // heat gone or lost the trail cold: leave
        car.driver = null; car.parked = true; car.speed *= 0.9;
        if (distP > 700 || G.wanted === 0) G.police.splice(i, 1);
        continue;
      }
      // Steer to the last known position; search there when arrived.
      var tx = G.lastKnownX, ty = G.lastKnownY;
      var distT = Math.hypot(tx - car.x, ty - car.y);
      var wantAngle = Math.atan2(ty - car.y, tx - car.x);
      var diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 3.2 * dt + Math.sign(diff) * 0.4 * dt));
      var topSpeed = sees ? 318 : 285;
      if (distT < 60 && !sees) topSpeed = 60; // creep around the last known spot
      var target = (Math.abs(diff) > 1.9) ? -60 : topSpeed;
      car.speed += Math.max(-320 * dt, Math.min(240 * dt, target - car.speed));
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (CB.circleHitsBuildings(G, car.x, car.y, 19)) {
        car.x -= Math.cos(car.angle) * car.speed * dt * 1.4;
        car.y -= Math.sin(car.angle) * car.speed * dt * 1.4;
        car.speed *= -0.3; car.angle += 0.7 * dt * 8;
      }
      car.x = Math.max(24, Math.min(CFG.WORLD_W - 24, car.x));
      car.y = Math.max(24, Math.min(CFG.WATER_Y - 18, car.y));
      // Ram / block the player's car gently.
      if (!p.onFoot && p.car && Math.hypot(p.car.x - car.x, p.car.y - car.y) < 40 && Math.abs(car.speed) > 60) {
        CB.damageCar(G, p.car, 2.5, p.car.x, p.car.y);
        car.speed *= 0.5;
      }
      // BUSTED: a cruiser holding close to a slow on-foot player.
      if (p.onFoot && distP < 52 && Math.abs(car.speed) < 130) {
        c.bustT += dt;
        if (c.bustT > 1.6 && G.screen === 'playing') {
          G.screen = 'busted';
          CB.Snd.busted();
          G.cash = Math.max(0, G.cash - 200);
        }
      } else c.bustT = Math.max(0, c.bustT - dt * 2);
      c.x = car.x; c.y = car.y;
    }
    // Heat decay: only while unseen, one star per DECAY_SECONDS.
    if (G.wanted > 0) {
      if (anyoneSees) { G.unseenT = 0; }
      else {
        G.unseenT += dt;
        if (G.unseenT >= CFG.DECAY_SECONDS) {
          G.unseenT = 0;
          setWanted(G, G.wanted - 1);
          if (G.wanted === 0) CB.toast(G, 'You lost the heat.');
        }
      }
    } else G.unseenT = 0;
    updateRoadblocks(G, dt);
  }
  function updateRoadblocks(G, dt) {
    var want = G.wanted >= 4 ? 2 : 0;
    if (G.roadblocks.length > want) G.roadblocks.splice(want);
    if (G.roadblocks.length < want && Math.random() < dt * 0.5) {
      var p = G.player;
      var rx = CFG.ROADS_X[Math.floor(Math.random() * CFG.ROADS_X.length)];
      var by = Math.max(80, Math.min(CFG.WATER_Y - 120, p.y + (Math.random() < 0.5 ? -420 : 420)));
      if (!CB.pointInBuilding(G, rx, by)) {
        var c1 = CB.makeCar(rx - 24, by, Math.PI / 2, CFG.PALETTE.police, 'police');
        var c2 = CB.makeCar(rx + 24, by + 8, Math.PI / 2, CFG.PALETTE.police, 'police');
        c1.parked = true; c2.parked = true;
        G.roadblocks.push(c1, c2);
      }
    }
  }
  CB.updatePolice = updatePolice;
  CB.spawnCruiser = spawnCruiser;
})();
