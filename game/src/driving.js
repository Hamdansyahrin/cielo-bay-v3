// Cielo Bay - driving.js: car physics for the player (acceleration,
// speed-sensitive steering, Space-handbrake drift, collisions that
// damage and eventually wreck cars) and the road-grid traffic driver.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function carRadius(car) { return car.w / 2; }

  function damageCar(G, car, amount, x, y) {
    if (car.dead) return;
    car.hp -= amount;
    CB.burst(G, x, y, 6, '#ffb35e', 130, 0.4, 3);
    if (car.hp <= 0) {
      car.hp = 0; car.dead = true; car.speed = 0;
      CB.burst(G, x, y, 22, '#55504e', 90, 1.1, 6);
      CB.burst(G, x, y, 10, '#ff7a3c', 120, 0.5, 4);
      if (G.player.car === car) CB.toast(G, 'WRECKED! Get out and find another ride.');
    }
  }
  CB.damageCar = damageCar;

  function collideCarWorld(G, car, dt) {
    // Buildings: circle vs rect, push out along the smallest penetration.
    var b = CB.circleHitsBuildings(G, car.x, car.y, carRadius(car) * 0.82);
    if (b) {
      var nx = Math.max(b.x, Math.min(car.x, b.x + b.w));
      var ny = Math.max(b.y, Math.min(car.y, b.y + b.h));
      var dx = car.x - nx, dy = car.y - ny;
      var d = Math.hypot(dx, dy) || 1;
      var push = carRadius(car) * 0.82 - d;
      if (push > 0) { car.x += (dx / d) * push; car.y += (dy / d) * push; }
      var impact = Math.abs(car.speed);
      if (impact > 90) {
        damageCar(G, car, impact * 0.06, nx, ny);
        if (car === G.player.car) { G.shake = Math.min(14, impact * 0.03); CB.Snd.crash(); CB.witnessCrime(G, 'crash', car.x, car.y, 0); }
      }
      car.speed *= -0.25;
    }
    car.x = Math.max(26, Math.min(CFG.WORLD_W - 26, car.x));
    car.y = Math.max(26, Math.min(CFG.WATER_Y - 20, car.y));
    // Other cars.
    for (var i = 0; i < G.cars.length; i++) {
      var o = G.cars[i];
      if (o === car || o.dead) continue;
      var ox = car.x - o.x, oy = car.y - o.y;
      var od = Math.hypot(ox, oy), minD = carRadius(car) + carRadius(o) - 8;
      if (od > 0 && od < minD) {
        car.x += (ox / od) * (minD - od) * 0.6; car.y += (oy / od) * (minD - od) * 0.6;
        var rel = Math.abs(car.speed - (o.speed || 0));
        if (rel > 80) {
          damageCar(G, o, rel * 0.05, o.x, o.y);
          if (car === G.player.car) {
            G.shake = Math.min(12, rel * 0.03); CB.Snd.crash();
            CB.witnessCrime(G, 'hitcar', car.x, car.y, 1);
            if (o.driver === 'traffic') { o.driver = null; o.parked = true; o.speed = 0; }
          }
        }
        car.speed *= 0.55;
      }
    }
    // Pedestrians: running one down is a witnessed crime.
    var victims = G.peds.concat(G.rivals);
    for (var j = 0; j < victims.length; j++) {
      var ped = victims[j];
      if (ped.dead) continue;
      if (Math.abs(car.speed) > 60 && Math.hypot(ped.x - car.x, ped.y - car.y) < carRadius(car) + 8) {
        ped.hp -= 34; ped.dead = ped.hp <= 0; ped.downT = 0;
        CB.burst(G, ped.x, ped.y, 10, '#c9403d', 110, 0.6, 3);
        if (car === G.player.car) {
          G.shake = Math.min(10, G.shake + 5); CB.Snd.hit();
          CB.witnessCrime(G, 'hitandrun', car.x, car.y, 1);
          damageCar(G, car, 3, car.x, car.y);
        }
        car.speed *= 0.7;
      }
    }
  }
  function updatePlayerCar(G, dt, input) {
    var car = G.player.car;
    if (!car) return;
    var maxSpeed = car.isVan ? 330 : 430;
    var accel = car.isVan ? 210 : 275;
    if (car.dead) { car.speed = 0; syncPlayerToCar(G); return; }
    if (input.up) car.speed += accel * dt;
    else if (input.down) car.speed -= (car.speed > 10 ? 340 : 150) * dt;
    else car.speed -= car.speed * 0.7 * dt; // rolling drag
    var handbrake = input.handbrake;
    if (handbrake) car.speed -= car.speed * 1.6 * dt;
    car.speed = Math.max(-130, Math.min(maxSpeed, car.speed));
    var steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    var speedFactor = Math.min(1, Math.abs(car.speed) / 130);
    var grip = handbrake ? 1.9 : 1.15;
    car.angle += steer * grip * speedFactor * dt * (car.speed < 0 ? -1 : 1) * 1.55;
    car.steerVis = steer;
    var vx = Math.cos(car.angle) * car.speed, vy = Math.sin(car.angle) * car.speed;
    car.x += vx * dt; car.y += vy * dt;
    // Drift smoke and rolling tire smoke.
    if ((handbrake && Math.abs(car.speed) > 120 && steer !== 0) || Math.abs(car.speed) > 330) {
      if (Math.random() < 0.55) CB.addParticle(G, car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, 0, 0, 0.7, 'rgba(220,220,220,0.5)', 6);
    }
    // Damage smoke, heavier as the car dies.
    if (car.hp < 55) {
      car.smokeT -= dt;
      if (car.smokeT <= 0) {
        car.smokeT = car.hp < 25 ? 0.06 : 0.16;
        CB.addParticle(G, car.x + Math.cos(car.angle) * 16, car.y + Math.sin(car.angle) * 16, 0, -22, 0.9, 'rgba(60,58,58,0.65)', 7);
      }
    }
    collideCarWorld(G, car, dt);
    syncPlayerToCar(G);
  }
  function syncPlayerToCar(G) {
    var car = G.player.car;
    if (car) { G.player.x = car.x; G.player.y = car.y; G.player.angle = car.angle; }
  }
  CB.syncPlayerToCar = syncPlayerToCar;

  // Traffic: follow the lane, brake for the car ahead, turn at some
  // intersections, wrap around the city edge back into the flow.
  function updateTrafficCar(G, car, dt) {
    if (car.dead || car.parked || car.driver !== 'traffic') return;
    var want = car.targetSpeed;
    for (var i = 0; i < G.cars.length; i++) {
      var o = G.cars[i];
      if (o === car || o.dead) continue;
      var ahead = car.axis === 'x' ? (o.x - car.x) * car.dir : (o.y - car.y) * car.dir;
      var side = car.axis === 'x' ? Math.abs(o.y - car.y) : Math.abs(o.x - car.x);
      if (ahead > 0 && ahead < 74 && side < 24) want = Math.min(want, Math.max(0, (o.speed || 0) - 8));
    }
    car.speed += Math.max(-260 * dt, Math.min(190 * dt, want - car.speed));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Occasionally turn at an intersection onto the crossing road.
    var roads = car.axis === 'x' ? CFG.ROADS_X : CFG.ROADS_Y;
    for (var r = 0; r < roads.length; r++) {
      var at = car.axis === 'x' ? car.x : car.y;
      if (Math.abs(at - roads[r]) < 4 && Math.random() < 0.0035) {
        var turnDir = Math.random() < 0.5 ? 1 : -1;
        if (car.axis === 'x') {
          // Settle onto the vertical road's lane, keeping our y.
          car.axis = 'y'; car.dir = turnDir;
          car.angle = turnDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.x = roads[r] + turnDir * 26;
          car.lane = car.x;
        } else {
          var rows = CFG.ROADS_Y.concat([CFG.BEACH_ROAD_Y]);
          var rowPick = rows[Math.floor(Math.random() * rows.length)];
          car.axis = 'x'; car.dir = turnDir;
          car.angle = turnDir > 0 ? 0 : Math.PI;
          car.y = rowPick + turnDir * 26;
          car.lane = car.y;
        }
        break;
      }
    }
    // Wrap at the world edge.
    if (car.x < -60) car.x = CFG.WORLD_W + 40; if (car.x > CFG.WORLD_W + 60) car.x = -40;
    if (car.y < -60) car.y = CFG.WATER_Y - 40; if (car.y > CFG.WATER_Y) car.y = 40;
    if (CB.circleHitsBuildings(G, car.x, car.y, 18)) { car.x -= Math.cos(car.angle) * 30; car.y -= Math.sin(car.angle) * 30; car.speed *= 0.4; }
  }
  function updateTraffic(G, dt) {
    for (var i = 0; i < G.cars.length; i++) updateTrafficCar(G, G.cars[i], dt);
  }
  CB.updatePlayerCar = updatePlayerCar;
  CB.updateTraffic = updateTraffic;
})();
