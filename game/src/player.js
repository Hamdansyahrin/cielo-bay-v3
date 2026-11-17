// Cielo Bay - player.js: the player on foot (WASD/arrows, Shift run,
// mouse aim), pistol and melee combat with segment-based bullet hit
// tests, and entering / exiting any car in the city.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function nearestCar(G, x, y, maxD) {
    var best = null, bd = maxD;
    for (var i = 0; i < G.cars.length; i++) {
      var c = G.cars[i];
      var d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  CB.nearestCar = nearestCar;

  function enterCar(G, car) {
    var p = G.player;
    var wasParkedCivilian = !car.isMarked && !car.isVan && car.driver !== 'police';
    if (car.driver === 'traffic') { car.driver = null; } // driver bails out
    car.driver = 'player'; car.parked = false;
    p.car = car; p.onFoot = false;
    CB.Snd.door();
    if (car.isMarked) {
      CB.toast(G, 'Got the marked car. Take it to the CHOP SHOP.');
    } else if (car.isVan) {
      CB.toast(G, 'Armored van taken! The heat is coming - deliver it!');
      if (G.wanted < 4) CB.setWanted(G, 4);
      G.lastKnownX = p.x; G.lastKnownY = p.y; G.lastSeenAt = G.time;
    } else if (wasParkedCivilian) {
      CB.witnessCrime(G, 'theft', p.x, p.y, 1);
    }
    if (CB.Missions.onEnterCar) CB.Missions.onEnterCar(G, car);
  }
  function exitCar(G) {
    var p = G.player, car = p.car;
    if (!car) return;
    car.driver = null; car.parked = true; car.speed = 0;
    p.car = null; p.onFoot = true;
    // Step out on the left side of the car.
    var sx = car.x + Math.cos(car.angle - Math.PI / 2) * 36;
    var sy = car.y + Math.sin(car.angle - Math.PI / 2) * 36;
    if (!CB.circleHitsBuildings(G, sx, sy, 11)) { p.x = sx; p.y = sy; }
    else { p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36; }
    CB.Snd.door();
  }
  CB.enterCar = enterCar;
  CB.exitCar = exitCar;

  function tryInteract(G) {
    var p = G.player;
    if (!p.onFoot) { exitCar(G); return; }
    var car = nearestCar(G, p.x, p.y, 58);
    if (car) enterCar(G, car);
  }
  CB.tryInteract = tryInteract;
  // Bullets travel ~950 px/s and a headless frame can span 50+ px of
  // bullet travel, so hit tests sweep the whole segment, never a point.
  function fireBullet(G, shooter, angle, from) {
    var bx = shooter.x + Math.cos(angle) * 18, by = shooter.y + Math.sin(angle) * 18;
    G.bullets.push({
      x: bx, y: by, px: bx, py: by,
      vx: Math.cos(angle) * CFG.BULLET_SPEED, vy: Math.sin(angle) * CFG.BULLET_SPEED,
      from: from, life: 1.1,
    });
    if (from === 'player') {
      G.muzzleT = 0.05;
      CB.addParticle(G, bx, by, Math.cos(angle) * 40, Math.sin(angle) * 40, 0.07, '#ffd23e', 5);
    }
  }
  CB.fireBullet = fireBullet;

  function segmentCircle(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
    var nx = x1 + dx * t, ny = y1 + dy * t;
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
  }
  function updateBullets(G, dt) {
    var p = G.player;
    for (var i = G.bullets.length - 1; i >= 0; i--) {
      var b = G.bullets[i];
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      var dead = b.life <= 0;
      if (!dead && CB.pointInBuilding(G, b.x, b.y)) { CB.burst(G, b.x, b.y, 3, '#d8c9a0', 70, 0.25, 2); dead = true; }
      if (!dead && b.from === 'player') {
        var targets = G.rivals.concat(G.peds);
        for (var j = 0; j < targets.length; j++) {
          var t = targets[j];
          if (t.dead) continue;
          if (segmentCircle(b.px, b.py, b.x, b.y, t.x, t.y, 13)) {
            t.hp -= CFG.BULLET_DAMAGE;
            CB.burst(G, t.x, t.y, 5, '#c9403d', 90, 0.35, 3);
            CB.Snd.hit();
            G.hitFlashT = 0.09;
            if (t.hp <= 0 && !t.dead) {
              t.dead = true; t.downT = 0;
              CB.burst(G, t.x, t.y, 12, '#8a2030', 110, 0.6, 3);
              if (t.rival) { CB.witnessCrime(G, 'rivaldown', p.x, p.y, 0); if (CB.Missions.onRivalDown) CB.Missions.onRivalDown(G); }
              else CB.witnessCrime(G, 'assault', p.x, p.y, 1);
            }
            dead = true; break;
          }
        }
        if (!dead) { // shots can disable cars and cruisers
          for (var k = 0; k < G.cars.length + G.police.length; k++) {
            var car = k < G.cars.length ? G.cars[k] : G.police[k - G.cars.length].car;
            if (!car || car.dead || car === p.car) continue;
            if (segmentCircle(b.px, b.py, b.x, b.y, car.x, car.y, car.w / 2)) {
              CB.damageCar(G, car, 7, b.x, b.y);
              if (car.kind === 'police') CB.witnessCrime(G, 'shotcop', p.x, p.y, 1);
              dead = true; break;
            }
          }
        }
      }
      if (!dead && b.from === 'rival') {
        if (p.onFoot && segmentCircle(b.px, b.py, b.x, b.y, p.x, p.y, 12)) { CB.hurtPlayer(G, 7); dead = true; }
        else if (!p.onFoot && p.car && segmentCircle(b.px, b.py, b.x, b.y, p.car.x, p.car.y, p.car.w / 2)) { CB.damageCar(G, p.car, 4, b.x, b.y); CB.hurtPlayer(G, 2); dead = true; }
      }
      if (dead) G.bullets.splice(i, 1);
    }
  }
  CB.updateBullets = updateBullets;

  function hurtPlayer(G, amount) {
    var p = G.player;
    p.hp -= amount; p.lastHurtAt = G.time; G.hitFlashT = 0.12;
    if (p.hp <= 0 && G.screen === 'playing') {
      p.hp = 0; G.screen = 'wasted';
      CB.Snd.busted();
      G.cash = Math.max(0, G.cash - 150);
    }
  }
  CB.hurtPlayer = hurtPlayer;

  function meleeSwing(G) {
    var p = G.player;
    if (G.time - (p.lastMeleeAt || 0) < 0.32) return;
    p.lastMeleeAt = G.time;
    CB.Snd.melee();
    CB.addParticle(G, p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20, Math.cos(p.aimAngle) * 60, Math.sin(p.aimAngle) * 60, 0.12, '#ffffff', 4);
    var targets = G.rivals.concat(G.peds);
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead) continue;
      if (Math.hypot(t.x - p.x, t.y - p.y) < 40) {
        t.hp -= 16; CB.Snd.hit();
        CB.burst(G, t.x, t.y, 5, '#e8e0c8', 80, 0.3, 3);
        if (t.hp <= 0) { t.dead = true; t.downT = 0; if (t.rival && CB.Missions.onRivalDown) CB.Missions.onRivalDown(G); }
        else CB.witnessCrime(G, 'assault', p.x, p.y, 1);
      }
    }
  }
  CB.meleeSwing = meleeSwing;
  function updatePlayerFoot(G, dt, input) {
    var p = G.player;
    var run = input.run ? 1.55 : 1;
    var spd = 148 * run;
    var mx = 0, my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    p.moving = (mx !== 0 || my !== 0);
    if (p.moving) {
      var len = Math.hypot(mx, my) || 1;
      var nx = p.x + (mx / len) * spd * dt, ny = p.y + (my / len) * spd * dt;
      if (!CB.circleHitsBuildings(G, nx, p.y, 11)) p.x = nx;
      if (!CB.circleHitsBuildings(G, p.x, ny, 11)) p.y = ny;
      p.x = Math.max(14, Math.min(CFG.WORLD_W - 14, p.x));
      p.y = Math.max(14, Math.min(CFG.WATER_Y - 10, p.y));
      p.walkPhase += dt * (input.run ? 13 : 9);
    }
    // Aim follows the mouse; movement faces the aim while shooting.
    p.aimAngle = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
    p.angle = p.moving && G.mouse.down ? p.aimAngle : (p.moving ? Math.atan2(my, mx) : p.angle);
    if (typeof p.angle !== 'number') p.angle = 0;
    if (p.moving) p.angle = (mx !== 0 || my !== 0) && !G.mouse.down ? Math.atan2(my, mx) : p.angle;
    // Pistol: fires on mousedown at once, then at cooldown pace.
    p.fireCd -= dt;
    if (G.mouse.down && p.fireCd <= 0) {
      p.fireCd = CFG.PISTOL_COOLDOWN;
      fireBullet(G, p, p.aimAngle, 'player');
      CB.Snd.shot();
      CB.witnessCrime(G, 'shots', p.x, p.y, 0);
    }
    if (G.muzzleT > 0) G.muzzleT -= dt;
    // Slow health regen after 6 quiet seconds.
    if (p.hp > 0 && p.hp < CFG.PLAYER_HP && G.time - p.lastHurtAt > 6) p.hp = Math.min(CFG.PLAYER_HP, p.hp + 5 * dt);
  }
  CB.updatePlayerFoot = updatePlayerFoot;
})();
