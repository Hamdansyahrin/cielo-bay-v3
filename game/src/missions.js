// Cielo Bay - missions.js: the five-job chain from fixer Mara Voss.
// Phone-style briefings, minimap markers, cash rewards. Completing a
// job schedules the next one; a job's setup never runs twice.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  var DEFS = [
    {
      title: 'JOB 1 - HOT WHEELS', reward: 500,
      brief: 'Mara Voss: A marked amber coupe is parked on Cielo Boulevard. Lift it and drop it at the CHOP SHOP by the port.',
      objective: 'Steal the marked car',
    },
    {
      title: 'JOB 2 - COURIER RUN', reward: 750,
      brief: 'Mara Voss: Four drops across the bay, against the clock. Hit every glowing checkpoint before time runs out.',
      objective: 'Reach the checkpoint',
    },
    {
      title: 'JOB 3 - HEAT CHECK', reward: 900,
      brief: 'Mara Voss: I need to know you can handle pressure. Draw 3 stars, survive the chase, then lose the heat.',
      objective: 'Survive the chase',
    },
    {
      title: 'JOB 4 - PIER PRESSURE', reward: 1200,
      brief: 'Mara Voss: A rival crew is holding Cielo Pier and taxing my boats. Clear all five of them out.',
      objective: 'Clear the rival crew on the pier',
    },
    {
      title: 'JOB 5 - THE VAULT VAN', reward: 2500,
      brief: 'Mara Voss: Finale. An armored vault van waits at the port. Take it, survive 4 stars, deliver it to the chop shop.',
      objective: 'Take the armored van at the port',
    },
  ];
  CB.MISSION_DEFS = DEFS;

  function currentDef(G) {
    if (!G || typeof G.mission !== 'number') return null;
    return DEFS[G.mission] || null;
  }
  CB.currentMissionDef = currentDef;

  function startMission(G, idx) {
    if (idx < 0 || idx >= DEFS.length) { G.missionState = null; return; }
    if (G.missionState && G.missionState.startedFor === idx && G.mission === idx) return; // never re-run setup
    G.mission = idx;
    var ms = { startedFor: idx, phase: 'main', startedAt: G.time, surviveT: 0, cpIndex: 0, timeLeft: 0, rivalsLeft: 0 };
    G.missionState = ms;
    if (idx === 0) {
      if (G.markedCar) { G.markedCar.dead = false; G.markedCar.hp = 100; }
      ms.phase = 'steal';
    } else if (idx === 1) {
      ms.phase = 'checkpoints'; ms.cpIndex = 0; ms.timeLeft = 150;
    } else if (idx === 2) {
      ms.phase = 'survive'; ms.surviveT = 40;
      CB.setWanted(G, 3); // exactly three stars
      G.lastKnownX = G.player.x; G.lastKnownY = G.player.y; G.lastSeenAt = G.time;
    } else if (idx === 3) {
      ms.phase = 'clear';
      if (!G.rivals || G.rivals.length === 0) CB.spawnRivals(G);
      ms.rivalsLeft = G.rivals.filter(function (r) { return !r.dead; }).length;
    } else if (idx === 4) {
      ms.phase = 'take';
      if (G.van) { G.van.dead = false; G.van.hp = G.van.maxHp; }
    }
    CB.phoneBrief(G, DEFS[idx].title, DEFS[idx].brief);
    CB.Save.store(G);
  }
  function scheduleNext(G) {
    // completeMission has already advanced G.mission to the next job.
    G.nextMissionAt = G.time + 2.5;
    G.pendingMission = G.mission;
  }
  function completeMission(G) {
    var def = currentDef(G);
    if (!def) return;
    G.cash += def.reward;
    CB.Snd.cash();
    CB.toast(G, def.title + ' COMPLETE  +$' + def.reward);
    CB.phoneBrief(G, 'PAYMENT RECEIVED', 'Mara Voss: $' + def.reward + ' wired. ' + (G.mission >= 4 ? 'That was the last job - Cielo Bay is yours now.' : 'Next job coming up.'));
    G.missionState = null;
    G.mission = G.mission + 1;
    if (G.mission < DEFS.length) scheduleNext(G);
    else { G.mission = DEFS.length; CB.toast(G, 'FREE ROAM - all jobs done.'); }
    CB.Save.store(G);
  }
  function objectivePos(G) {
    var ms = G.missionState;
    if (!ms) return null;
    if (G.mission === 0) {
      if (ms.phase === 'steal') return G.markedCar ? { x: G.markedCar.x, y: G.markedCar.y } : null;
      return { x: CFG.CHOP_SHOP.x, y: CFG.CHOP_SHOP.y };
    }
    if (G.mission === 1) { var cp = CFG.CHECKPOINTS[ms.cpIndex]; return cp ? { x: cp.x, y: cp.y } : null; }
    if (G.mission === 2) return null; // survive / lose the heat: no fixed marker
    if (G.mission === 3) return { x: CFG.PIER.x + 90, y: CFG.PIER.y + 130 };
    if (G.mission === 4) {
      if (ms.phase === 'take') return G.van ? { x: G.van.x, y: G.van.y } : null;
      return { x: CFG.CHOP_SHOP.x, y: CFG.CHOP_SHOP.y };
    }
    return null;
  }
  function objectiveText(G) {
    var def = currentDef(G);
    if (!def || !G.missionState) return G.mission >= DEFS.length ? 'FREE ROAM - Cielo Bay is yours' : '';
    var ms = G.missionState;
    if (G.mission === 0) return ms.phase === 'steal' ? 'Steal the marked car' : 'Deliver the car to the CHOP SHOP';
    if (G.mission === 1) return 'Checkpoint ' + (ms.cpIndex + 1) + '/4 - ' + Math.max(0, Math.ceil(ms.timeLeft)) + 's left';
    if (G.mission === 2) return ms.phase === 'survive' ? 'Survive the chase - ' + Math.max(0, Math.ceil(ms.surviveT)) + 's' : 'Lose the heat! Break line of sight';
    if (G.mission === 3) return 'Clear the pier crew - ' + ms.rivalsLeft + ' left';
    if (G.mission === 4) return ms.phase === 'take' ? 'Take the armored van at the port' : 'Deliver the van to the CHOP SHOP';
    return def.objective;
  }

  function updateMissions(G, dt) {
    // Auto-start the next job after a short breather.
    if (G.pendingMission !== null && G.pendingMission !== undefined && G.time >= G.nextMissionAt) {
      var pm = G.pendingMission;
      G.pendingMission = null;
      startMission(G, pm);
    }
    var ms = G.missionState;
    if (!ms) return;
    var p = G.player;
    if (G.mission === 0) {
      if (ms.phase === 'deliver' && p.car === G.markedCar) {
        if (Math.hypot(p.x - CFG.CHOP_SHOP.x, p.y - CFG.CHOP_SHOP.y) < 95) completeMission(G);
      }
    } else if (G.mission === 1) {
      ms.timeLeft -= dt;
      if (ms.timeLeft <= 0) { // ran out of clock: restart the run, keep the chain
        CB.toast(G, 'Out of time! Mara resets the courier run.');
        ms.cpIndex = 0; ms.timeLeft = 150;
      }
      var cp = CFG.CHECKPOINTS[ms.cpIndex];
      if (cp && Math.hypot(p.x - cp.x, p.y - cp.y) < 85) {
        CB.Snd.checkpoint();
        CB.toast(G, 'Checkpoint ' + (ms.cpIndex + 1) + '/4 - ' + cp.name);
        ms.cpIndex++; ms.timeLeft += 20;
        if (ms.cpIndex >= CFG.CHECKPOINTS.length) completeMission(G);
      }
    } else if (G.mission === 2) {
      if (ms.phase === 'survive') {
        if (G.wanted === 0) { /* heat died early: still counts once survived */ }
        ms.surviveT -= dt;
        if (ms.surviveT <= 0) { ms.phase = 'cool'; CB.toast(G, 'You survived. Now LOSE THE HEAT.'); }
      } else if (ms.phase === 'cool') {
        if (G.wanted === 0) completeMission(G);
      }
    } else if (G.mission === 3) {
      ms.rivalsLeft = G.rivals.filter(function (r) { return !r.dead; }).length;
      if (ms.rivalsLeft <= 0) completeMission(G);
    } else if (G.mission === 4) {
      if (ms.phase === 'deliver' && p.car === G.van) {
        if (Math.hypot(p.x - CFG.CHOP_SHOP.x, p.y - CFG.CHOP_SHOP.y) < 100) completeMission(G);
      }
    }
  }
  function onEnterCar(G, car) {
    var ms = G.missionState;
    if (!ms) return;
    if (G.mission === 0 && car === G.markedCar && ms.phase === 'steal') ms.phase = 'deliver';
    if (G.mission === 4 && car === G.van && ms.phase === 'take') ms.phase = 'deliver';
  }
  function onRivalDown(G) {
    var ms = G.missionState;
    if (ms && G.mission === 3) ms.rivalsLeft = G.rivals.filter(function (r) { return !r.dead; }).length;
  }
  CB.Missions = {
    DEFS: DEFS, start: startMission, update: updateMissions,
    complete: completeMission, objectivePos: objectivePos, objectiveText: objectiveText,
    onEnterCar: onEnterCar, onRivalDown: onRivalDown,
  };
})();
