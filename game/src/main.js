// Cielo Bay - main.js: boot, the game state object, input, the main
// loop (reschedule-first, so one bad frame can never kill the game),
// the title / pause / busted / wasted screens, and the __cielo debug
// handle the playtest tooling drives.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function createGame(seed) {
    var G = {
      screen: 'title',
      time: 0,
      seed: seed,
      rng: new CB.RNG(seed * 31 + 7),
      city: null,
      player: {
        x: CFG.PLAYER_START.x, y: CFG.PLAYER_START.y, angle: -Math.PI / 2,
        aimAngle: -Math.PI / 2, hp: CFG.PLAYER_HP, onFoot: true, car: null,
        moving: false, walkPhase: 0, fireCd: 0, lastHurtAt: -99, lastMeleeAt: -9,
      },
      cars: [], peds: [], rivals: [], police: [], roadblocks: [],
      bullets: [], particles: [],
      markedCar: null, van: null,
      camera: { x: 0, y: 0 },
      mouse: { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 - 100, wx: 0, wy: 0, down: false },
      keys: {},
      cash: 0,
      mission: 0, missionState: null, pendingMission: null, nextMissionAt: 0,
      wanted: 0, lastCrimeAt: -99, lastKnownX: 0, lastKnownY: 0, lastSeenAt: -99,
      unseenT: 0, policeSpawnT: 0, respawnT: 1,
      toasts: [], phone: null,
      shake: 0, muzzleT: 0, hitFlashT: 0,
      saveT: 0, started: false,
    };
    G.city = CB.generateCity(seed);
    return G;
  }
  CB.createGame = createGame;

  function resetActors(G) {
    G.cars = []; G.peds = []; G.rivals = []; G.police = []; G.roadblocks = [];
    G.bullets = []; G.particles = [];
    CB.spawnWorldActors(G);
  }
  function startRun(G, useSave) {
    resetActors(G);
    var p = G.player;
    p.hp = CFG.PLAYER_HP; p.onFoot = true; p.car = null;
    p.x = CFG.PLAYER_START.x; p.y = CFG.PLAYER_START.y;
    G.cash = 0; G.mission = 0; G.missionState = null; G.pendingMission = null;
    G.wanted = 0; G.unseenT = 0;
    if (useSave) {
      var s = CB.Save.load();
      if (s) {
        G.cash = s.cash;
        if (typeof s.x === 'number' && !CB.circleHitsBuildings(G, s.x, s.y, 12)) { p.x = s.x; p.y = s.y; }
        if (s.mission > 0 && s.mission < 5) { G.mission = s.mission; }
        else if (s.mission >= 5) { G.mission = 5; }
      }
    }
    G.screen = 'playing';
    G.started = true;
    if (G.mission < 5) CB.Missions.start(G, G.mission);
    else CB.toast(G, 'Welcome back to Cielo Bay - free roam.');
    updateCamera(G, 1);
  }
  CB.startRun = startRun;

  function updateCamera(G, dt) {
    var p = G.player;
    var tx = p.x - CFG.VIEW_W / 2, ty = p.y - CFG.VIEW_H / 2;
    if (dt >= 1) { G.camera.x = tx; G.camera.y = ty; }
    else {
      var k = Math.min(1, dt * 7);
      G.camera.x += (tx - G.camera.x) * k;
      G.camera.y += (ty - G.camera.y) * k;
    }
    G.camera.x = Math.max(0, Math.min(CFG.WORLD_W - CFG.VIEW_W, G.camera.x));
    G.camera.y = Math.max(0, Math.min(CFG.WORLD_H - CFG.VIEW_H, G.camera.y));
    G.mouse.wx = G.mouse.x + G.camera.x;
    G.mouse.wy = G.mouse.y + G.camera.y;
  }
  CB.updateCamera = updateCamera;
  function readInput(G) {
    var k = G.keys;
    return {
      up: !!(k['KeyW'] || k['ArrowUp']),
      down: !!(k['KeyS'] || k['ArrowDown']),
      left: !!(k['KeyA'] || k['ArrowLeft']),
      right: !!(k['KeyD'] || k['ArrowRight']),
      run: !!(k['ShiftLeft'] || k['ShiftRight']),
      handbrake: !!k['Space'],
    };
  }
  function update(G, dt) {
    G.time += dt;
    if (G.screen === 'title') {
      // The city lives behind the title card.
      CB.updateTraffic(G, dt);
      CB.updatePeds(G, dt);
      CB.updateParticles(G, dt);
      return;
    }
    if (G.screen !== 'playing') return;
    var input = readInput(G);
    if (G.player.onFoot) CB.updatePlayerFoot(G, dt, input);
    else CB.updatePlayerCar(G, dt, input);
    CB.updateTraffic(G, dt);
    CB.updatePeds(G, dt);
    CB.updateRivals(G, dt);
    CB.updateBullets(G, dt);
    CB.updatePolice(G, dt);
    CB.Missions.update(G, dt);
    CB.updateParticles(G, dt);
    CB.Snd.update(G, dt);
    if (G.hitFlashT > 0) G.hitFlashT -= dt;
    for (var i = G.toasts.length - 1; i >= 0; i--) { G.toasts[i].t += dt; if (G.toasts[i].t > G.toasts[i].ttl) G.toasts.splice(i, 1); }
    if (G.phone) { G.phone.t += dt; if (G.phone.t > G.phone.ttl) G.phone = null; }
    G.saveT -= dt;
    if (G.saveT <= 0) { G.saveT = 5; CB.Save.store(G); }
    updateCamera(G, dt);
  }

  // ---------- screens ----------
  function drawTitle(ctx, G) {
    CB.renderWorld(ctx, G);
    ctx.fillStyle = 'rgba(24,10,26,0.62)';
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb400';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('CIELO BAY', CFG.VIEW_W / 2, 158);
    ctx.fillStyle = '#ffd9ec';
    ctx.font = 'italic 21px system-ui, sans-serif';
    ctx.fillText('a sun-soaked city of easy money and hard landings', CFG.VIEW_W / 2, 196);
    // Story card.
    ctx.fillStyle = 'rgba(16,14,22,0.88)';
    CB.roundRect(ctx, CFG.VIEW_W / 2 - 330, 226, 660, 128, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#f2ead8'; ctx.font = '16px system-ui, sans-serif';
    CB.wrapText(ctx, 'You washed up in Cielo Bay with empty pockets and a borrowed name. Fixer MARA VOSS has five jobs, a chop shop by the port, and no patience. Steal cars, run her missions, and learn to lose the heat - the bay rewards the bold and buries the slow.', CFG.VIEW_W / 2 - 300, 258, 600, 22, 5);
    // Controls card.
    ctx.fillStyle = 'rgba(16,14,22,0.88)';
    CB.roundRect(ctx, CFG.VIEW_W / 2 - 330, 372, 660, 148, 14); ctx.fill();
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('CONTROLS', CFG.VIEW_W / 2, 398);
    ctx.fillStyle = '#f2ead8'; ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD / Arrows - move & drive · SHIFT - run · MOUSE - aim · CLICK - pistol', CFG.VIEW_W / 2, 428);
    ctx.fillText('Q / Right-click - melee · E / F - enter & exit cars · SPACE - handbrake drift', CFG.VIEW_W / 2, 454);
    ctx.fillText('P - pause · Wanted stars rise when crimes are witnessed - break line of sight to cool off', CFG.VIEW_W / 2, 480);
    var hasSave = !!CB.Save.load();
    ctx.fillStyle = (Math.floor(G.time * 1.6) % 2 === 0) ? '#ffd23e' : '#fff3b0';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(hasSave ? 'ENTER - CONTINUE · N - NEW GAME' : 'PRESS ENTER TO PLAY', CFG.VIEW_W / 2, 580);
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Downtown towers · Beachfront & pier · Port industrial - one city, five jobs, five stars', CFG.VIEW_W / 2, 626);
    ctx.textAlign = 'left';
  }
  function drawCenterCard(ctx, G, title, color, lines, prompt) {
    CB.renderWorld(ctx, G);
    ctx.fillStyle = 'rgba(16,10,18,0.66)';
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(title, CFG.VIEW_W / 2, 300);
    ctx.fillStyle = '#f2ead8'; ctx.font = '18px system-ui, sans-serif';
    lines.forEach(function (ln, i) { ctx.fillText(ln, CFG.VIEW_W / 2, 348 + i * 28); });
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(prompt, CFG.VIEW_W / 2, 348 + lines.length * 28 + 26);
    ctx.textAlign = 'left';
    if (G.screen === 'playing' || G.screen === 'paused') CB.drawHUD(ctx, G);
  }
  function render(ctx, G) {
    if (G.screen === 'title') { drawTitle(ctx, G); return; }
    if (G.screen === 'paused') { drawCenterCard(ctx, G, 'PAUSED', '#ffd23e', ['The bay waits for no one. Well - just this once.'], 'P or ENTER - resume'); return; }
    if (G.screen === 'busted') { drawCenterCard(ctx, G, 'BUSTED', '#4da3ff', ['The Cielo PD impound your pride and $200.', 'The heat resets. Mara pretends not to know you.'], 'ENTER - back on the street'); return; }
    if (G.screen === 'wasted') { drawCenterCard(ctx, G, 'WASTED', '#ff4040', ['You wake up outside Cielo General, $150 lighter.', 'Your jobs are still waiting.'], 'ENTER - wake up'); return; }
    CB.renderWorld(ctx, G);
    CB.drawHUD(ctx, G);
  }
  // ---------- boot + input wiring + loop ----------
  function boot() {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var params = new URLSearchParams(window.location.search);
    var seed = parseInt(params.get('seed') || '1', 10);
    if (!isFinite(seed) || seed <= 0) seed = 1;
    var G = createGame(seed);
    CB.G = G;
    resetActors(G);
    updateCamera(G, 1);
    // A posed screenshot scene takes over from here when ?shot= is set.
    if (params.get('shot') && CB.poseShot) CB.poseShot(G, params.get('shot'));

    window.addEventListener('keydown', function (ev) {
      G.keys[ev.code] = true;
      CB.Snd.unlock();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(ev.code) >= 0) ev.preventDefault();
      if (ev.repeat) return;
      if (G.screen === 'title') {
        if (ev.code === 'Enter') startRun(G, true);
        else if (ev.code === 'KeyN') { CB.Save.clear(); startRun(G, false); }
        return;
      }
      if (G.screen === 'busted' || G.screen === 'wasted') {
        if (ev.code === 'Enter') {
          var p = G.player;
          G.wanted = 0; G.police = []; p.hp = CFG.PLAYER_HP;
          if (p.car) { p.car = null; p.onFoot = true; }
          p.x = CFG.PLAYER_START.x; p.y = CFG.PLAYER_START.y;
          G.screen = 'playing';
          updateCamera(G, 1);
        }
        return;
      }
      if (ev.code === 'KeyP' || (ev.code === 'Enter' && G.screen === 'paused')) {
        if (G.screen === 'playing') G.screen = 'paused';
        else if (G.screen === 'paused') G.screen = 'playing';
        return;
      }
      if (G.screen !== 'playing') return;
      if (ev.code === 'KeyE' || ev.code === 'KeyF') {
        if (!G.player.onFoot) CB.tryInteract(G); // F exits while driving
        else if (ev.code === 'KeyE') CB.tryInteract(G);
        else CB.meleeSwing(G); // F on foot is the melee swing
      }
      if (ev.code === 'KeyQ' && G.player.onFoot) CB.meleeSwing(G);
    });
    window.addEventListener('keyup', function (ev) { G.keys[ev.code] = false; });
    function mousePos(ev) {
      var r = canvas.getBoundingClientRect();
      G.mouse.x = (ev.clientX - r.left) * (CFG.VIEW_W / r.width);
      G.mouse.y = (ev.clientY - r.top) * (CFG.VIEW_H / r.height);
      G.mouse.wx = G.mouse.x + G.camera.x;
      G.mouse.wy = G.mouse.y + G.camera.y;
    }
    canvas.addEventListener('mousemove', mousePos);
    canvas.addEventListener('mousedown', function (ev) {
      CB.Snd.unlock();
      mousePos(ev);
      if (ev.button === 0) {
        G.mouse.down = true;
        // Fire IMMEDIATELY on mousedown: a press-release can be
        // shorter than one (possibly very slow) frame, and a shot
        // that only happens in the update loop would be lost.
        if (G.screen === 'playing' && G.player.onFoot) {
          var p = G.player;
          p.aimAngle = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
          p.fireCd = CFG.PISTOL_COOLDOWN;
          CB.fireBullet(G, p, p.aimAngle, 'player');
          CB.Snd.shot();
          CB.witnessCrime(G, 'shots', p.x, p.y, 0);
        }
      }
      if (ev.button === 2 && G.player.onFoot && G.screen === 'playing') CB.meleeSwing(G);
    });
    window.addEventListener('mouseup', function (ev) { if (ev.button === 0) G.mouse.down = false; });
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    var last = performance.now();
    var accumulator = 0;
    var STEP = 1 / 30;
    function frame(now) {
      requestAnimationFrame(frame); // reschedule FIRST: one bad frame can't kill the game
      var realDt = Math.min(0.5, Math.max(0.0005, (now - last) / 1000));
      last = now;
      try {
        // Fixed-step simulation: on a slow or throttled renderer the
        // game still advances in real time (up to the step cap), so
        // movement, timers and cooldowns never run in slow motion.
        accumulator += realDt;
        var steps = 0;
        while (accumulator >= STEP && steps < 15) {
          update(G, STEP);
          accumulator -= STEP;
          steps++;
        }
        if (steps === 15) accumulator = 0;
        render(ctx, G);
      } catch (err) {
        if (window.console && console.error) console.error(err);
      }
    }
    requestAnimationFrame(frame);
    installDebug(G);
  }

  function installDebug(G) {
    var api = {
      G: G,
      state: function () {
        var p = G.player;
        return {
          screen: G.screen, x: Math.round(p.x), y: Math.round(p.y),
          onFoot: p.onFoot, hp: Math.round(p.hp),
          mission: G.mission, cash: Math.floor(G.cash), wanted: G.wanted,
          police: G.police.length,
          carX: p.car ? Math.round(p.car.x) : null,
          carY: p.car ? Math.round(p.car.y) : null,
          carSpeed: p.car ? Math.round(p.car.speed) : 0,
          time: Math.round(G.time * 10) / 10,
        };
      },
      missionTarget: function () { var t = CB.Missions.objectivePos(G); return t ? { x: Math.round(t.x), y: Math.round(t.y) } : null; },
      chopShop: function () { return { x: CFG.CHOP_SHOP.x, y: CFG.CHOP_SHOP.y }; },
      teleport: function (x, y) {
        var p = G.player;
        p.x = x; p.y = y;
        if (p.car) { p.car.x = x; p.car.y = y; }
        CB.updateCamera(G, 1);
      },
      teleportCarTo: function (x, y) {
        var p = G.player;
        if (p.car) { p.car.x = x; p.car.y = y; p.car.speed = 0; p.x = x; p.y = y; }
        else { p.x = x; p.y = y; }
        CB.updateCamera(G, 1);
      },
      setMission: function (idx) {
        G.pendingMission = null; G.missionState = null;
        G.rivals = [];
        CB.Missions.start(G, idx);
      },
      missionInfo: function () {
        var ms = G.missionState;
        if (!ms) return { mission: G.mission, phase: 'none' };
        return {
          mission: G.mission, phase: ms.phase, cpIndex: ms.cpIndex || 0,
          timeLeft: Math.round(ms.timeLeft || 0), surviveT: Math.round(ms.surviveT || 0),
          rivalsLeft: ms.rivalsLeft || 0,
        };
      },
      rivals: function () { return G.rivals.map(function (r) { return { x: Math.round(r.x), y: Math.round(r.y), hp: r.hp }; }); },
      checkpoints: function () { return CFG.CHECKPOINTS.map(function (c) { return { x: c.x, y: c.y, name: c.name }; }); },
      vanPos: function () { return G.van ? { x: Math.round(G.van.x), y: Math.round(G.van.y) } : null; },
    };
    window.__cielo = api;
    CB.api = api;
  }
  CB.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
