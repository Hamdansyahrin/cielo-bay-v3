// Cielo Bay - entities.js: spawns and updates the living city:
// AI traffic cars, parked cars, pedestrians who stroll and flee,
// rival crew members, bullets and particle effects.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function makeCar(x, y, angle, color, kind) {
    return {
      x: x, y: y, angle: angle, speed: 0, w: 46, h: 22,
      color: color, kind: kind || 'civilian', hp: 100, maxHp: 100,
      driver: null, dead: false, smokeT: 0, steerVis: 0,
      lane: 0, axis: 'x', dir: 1, targetSpeed: 170, cruiseSeed: Math.random(),
    };
  }
  CB.makeCar = makeCar;

  function spawnWorldActors(G) {
    var rng = G.rng;
    // Parked cars along the road edges.
    for (var i = 0; i < 26; i++) {
      var vx = rng.pick(CFG.ROADS_X);
      var vy = rng.range(120, CFG.WORLD_H - 200);
      if (CB.pointInBuilding(G, vx + 44, vy)) continue;
      var parked = makeCar(vx + (rng.chance(0.5) ? 44 : -44), vy, Math.PI / 2, rng.pick(CFG.PALETTE.car), 'parked');
      parked.parked = true;
      G.cars.push(parked);
    }
    // Moving traffic on the grid.
    for (var t = 0; t < 15; t++) G.cars.push(spawnTrafficCar(G, null));
    // Pedestrians on the sidewalks.
    for (var p = 0; p < 34; p++) G.peds.push(spawnPed(G, null));
    // The marked car for mission 1 and the armored van for mission 5
    // exist in the world from the start, parked and waiting.
    var marked = makeCar(CFG.MARKED_CAR_POS.x, CFG.MARKED_CAR_POS.y, Math.PI / 2, CFG.PALETTE.marked, 'marked');
    marked.parked = true; marked.isMarked = true;
    G.cars.push(marked); G.markedCar = marked;
    var van = makeCar(CFG.VAN_POS.x, CFG.VAN_POS.y, Math.PI / 2, CFG.PALETTE.van, 'van');
    van.parked = true; van.isVan = true; van.hp = 260; van.maxHp = 260; van.w = 58; van.h = 28;
    G.cars.push(van); G.van = van;
  }
  function spawnTrafficCar(G, nearPos) {
    var rng = G.rng;
    var vertical = rng.chance(0.5);
    var car;
    if (vertical) {
      var rx = rng.pick(CFG.ROADS_X);
      var dir = rng.chance(0.5) ? 1 : -1;
      var y = nearPos ? nearPos.y + rng.range(-900, 900) : rng.range(80, CFG.WORLD_H - 120);
      y = Math.max(60, Math.min(CFG.WORLD_H - 60, y));
      car = makeCar(rx + dir * 26, y, dir > 0 ? Math.PI / 2 : -Math.PI / 2, rng.pick(CFG.PALETTE.car), 'traffic');
      car.axis = 'y'; car.dir = dir; car.lane = rx + dir * 26;
    } else {
      var rows = CFG.ROADS_Y.concat([CFG.BEACH_ROAD_Y]);
      var ry = rng.pick(rows);
      var dir2 = rng.chance(0.5) ? 1 : -1;
      var x = nearPos ? nearPos.x + rng.range(-900, 900) : rng.range(80, CFG.WORLD_W - 120);
      x = Math.max(60, Math.min(CFG.WORLD_W - 60, x));
      car = makeCar(x, ry + dir2 * 26, dir2 > 0 ? 0 : Math.PI, rng.pick(CFG.PALETTE.car), 'traffic');
      car.axis = 'x'; car.dir = dir2; car.lane = ry + dir2 * 26;
    }
    car.driver = 'traffic';
    car.targetSpeed = rng.range(130, 200);
    car.speed = car.targetSpeed * 0.7;
    return car;
  }
  function spawnPed(G, nearPos) {
    var rng = G.rng;
    var vertical = rng.chance(0.5);
    var x, y;
    if (vertical) { x = rng.pick(CFG.ROADS_X) + rng.pick([-76, 76]); y = nearPos ? nearPos.y + rng.range(-500, 500) : rng.range(80, CFG.WORLD_H - 120); }
    else { y = rng.pick(CFG.ROADS_Y.concat([CFG.BEACH_ROAD_Y])) + rng.pick([-76, 76]); x = nearPos ? nearPos.x + rng.range(-500, 500) : rng.range(80, CFG.WORLD_W - 120); }
    x = Math.max(30, Math.min(CFG.WORLD_W - 30, x)); y = Math.max(30, Math.min(CFG.WORLD_H - 30, y));
    return {
      x: x, y: y, angle: rng.range(0, Math.PI * 2), speed: 0, walkT: rng.range(0, 9),
      color: rng.pick(CFG.PALETTE.ped), fleeT: 0, hp: 20, dead: false, downT: 0, rival: false,
    };
  }
  function spawnRivals(G) {
    var spots = [
      { x: 2935, y: 940 }, { x: 3010, y: 1010 }, { x: 2900, y: 1060 },
      { x: 2980, y: 1120 }, { x: 3050, y: 920 },
    ];
    G.rivals = spots.map(function (s) {
      return {
        x: s.x, y: s.y, angle: Math.PI, speed: 0, walkT: 0,
        color: CFG.PALETTE.rival, fleeT: 0, hp: CFG.RIVAL_HP, maxHp: CFG.RIVAL_HP,
        dead: false, downT: 0, rival: true, shootCd: 1 + Math.random() * 0.8,
      };
    });
  }
  function addParticle(G, x, y, vx, vy, life, color, size) {
    G.particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life, color: color, size: size });
    if (G.particles.length > 420) G.particles.splice(0, G.particles.length - 420);
  }
  function burst(G, x, y, n, color, speed, life, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      addParticle(G, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), color, size);
    }
  }
  function updatePeds(G, dt) {
    var p = G.player;
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (ped.dead) { ped.downT += dt; continue; }
      ped.walkT -= dt;
      // Flee from gunfire, crimes and fast cars.
      var threat = null;
      if (G.time - G.lastCrimeAt < 2.5 && Math.hypot(p.x - ped.x, p.y - ped.y) < 320) threat = p;
      if (!threat && p.car && Math.abs(p.car.speed) > 200 && Math.hypot(p.car.x - ped.x, p.car.y - ped.y) < 130) threat = p.car;
      if (threat) ped.fleeT = 1.2;
      var spd = 42;
      if (ped.fleeT > 0) {
        ped.fleeT -= dt; spd = 165;
        ped.angle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
      } else if (ped.walkT <= 0) {
        ped.walkT = 2 + Math.random() * 4;
        ped.angle = Math.floor(Math.random() * 4) * (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
      }
      var nx = ped.x + Math.cos(ped.angle) * spd * dt;
      var ny = ped.y + Math.sin(ped.angle) * spd * dt;
      if (!CB.circleHitsBuildings(G, nx, ny, 10) && nx > 16 && ny > 16 && nx < CFG.WORLD_W - 16 && ny < CFG.WATER_Y - 8) {
        ped.x = nx; ped.y = ny;
      } else if (ped.fleeT <= 0) { ped.angle += Math.PI / 2; }
      ped.speed = spd;
    }
    // Keep the streets populated near the player.
    G.respawnT -= dt;
    if (G.respawnT <= 0) {
      G.respawnT = 2.5;
      var alivePeds = G.peds.filter(function (q) { return !q.dead; }).length;
      if (alivePeds < 26) G.peds.push(spawnPed(G, p));
      var traffic = G.cars.filter(function (c) { return c.kind === 'traffic' && !c.dead; }).length;
      if (traffic < 12) G.cars.push(spawnTrafficCar(G, p));
      // Cull far-away extras.
      G.peds = G.peds.filter(function (q) { return Math.hypot(q.x - p.x, q.y - p.y) < 1500 || q.dead; });
    }
  }
  function updateParticles(G, dt) {
    for (var i = G.particles.length - 1; i >= 0; i--) {
      var pt = G.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { G.particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
  }
  function updateRivals(G, dt) {
    var p = G.player;
    for (var i = 0; i < G.rivals.length; i++) {
      var r = G.rivals[i];
      if (r.dead) { r.downT += dt; continue; }
      var d = Math.hypot(p.x - r.x, p.y - r.y);
      r.angle = Math.atan2(p.y - r.y, p.x - r.x);
      if (d > 130) { // close in, but keep off the player's skin
        var nx = r.x + Math.cos(r.angle) * 62 * dt, ny = r.y + Math.sin(r.angle) * 62 * dt;
        if (!CB.circleHitsBuildings(G, nx, ny, 11)) { r.x = nx; r.y = ny; }
      }
      r.shootCd -= dt;
      if (d < 300 && r.shootCd <= 0 && CB.hasLOS(G, r.x, r.y, p.x, p.y)) {
        r.shootCd = 1.05 + Math.random() * 0.5;
        CB.fireBullet(G, r, r.angle + (Math.random() - 0.5) * 0.16, 'rival');
        CB.Snd.rivalShot();
      }
    }
  }
  CB.spawnWorldActors = spawnWorldActors;
  CB.spawnTrafficCar = spawnTrafficCar;
  CB.spawnPed = spawnPed;
  CB.spawnRivals = spawnRivals;
  CB.addParticle = addParticle;
  CB.burst = burst;
  CB.updatePeds = updatePeds;
  CB.updateParticles = updateParticles;
  CB.updateRivals = updateRivals;
})();
