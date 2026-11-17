// Cielo Bay - render.js: the world renderer. Height-shaded buildings
// throw long sunset shadows, cars throw headlight cones at dusk,
// the beach water edge animates, and every actor is drawn in world
// space under a camera that follows the player.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;
  var P = CFG.PALETTE;

  function drawGround(ctx, G, cam) {
    // District ground tints.
    CFG.DISTRICTS.forEach(function (d) {
      ctx.fillStyle = d.name === 'DOWNTOWN' ? P.groundDowntown : d.name === 'PORT OF CIELO' ? P.groundPort : P.groundBeach;
      ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
    });
    // Sand and animated water.
    ctx.fillStyle = P.sand;
    ctx.fillRect(-cam.x, CFG.WATER_Y - 130 - cam.y, CFG.WORLD_W, 130);
    ctx.fillStyle = P.water;
    ctx.fillRect(-cam.x, CFG.WATER_Y - cam.y, CFG.WORLD_W, CFG.WORLD_H - CFG.WATER_Y + 200);
    ctx.strokeStyle = P.waterLight; ctx.lineWidth = 3;
    for (var wv = 0; wv < 4; wv++) {
      ctx.beginPath();
      var wy = CFG.WATER_Y + 6 + wv * 26 - cam.y;
      for (var wx = -40; wx <= CFG.WORLD_W + 40; wx += 46) {
        var yy = wy + Math.sin((wx + G.time * 60 * (1 + wv * 0.3)) * 0.02 + wv * 2) * 3;
        if (wx === -40) ctx.moveTo(wx - cam.x, yy); else ctx.lineTo(wx - cam.x, yy);
      }
      ctx.globalAlpha = 0.5 - wv * 0.09;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Foam edge.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var fx = -20; fx <= CFG.WORLD_W + 20; fx += 30) {
      var fy = CFG.WATER_Y - cam.y + Math.sin(fx * 0.03 + G.time * 2.2) * 3.5;
      if (fx === -20) ctx.moveTo(fx - cam.x, fy); else ctx.lineTo(fx - cam.x, fy);
    }
    ctx.stroke();
  }
  function drawRoads(ctx, G, cam) {
    ctx.fillStyle = P.sidewalk;
    CFG.ROADS_X.forEach(function (rx) { ctx.fillRect(rx - CFG.ROAD_W / 2 - 13 - cam.x, -cam.y, CFG.ROAD_W + 26, CFG.WORLD_H); });
    CFG.ROADS_Y.forEach(function (ry) { ctx.fillRect(-cam.x, ry - CFG.ROAD_W / 2 - 13 - cam.y, CFG.WORLD_W, CFG.ROAD_W + 26); });
    ctx.fillRect(-cam.x, CFG.BEACH_ROAD_Y - CFG.ROAD_W / 2 - 13 - cam.y, CFG.WORLD_W, CFG.ROAD_W + 26);
    ctx.fillStyle = P.road;
    CFG.ROADS_X.forEach(function (rx) { ctx.fillRect(rx - CFG.ROAD_W / 2 - cam.x, -cam.y, CFG.ROAD_W, CFG.WORLD_H); });
    CFG.ROADS_Y.forEach(function (ry) { ctx.fillRect(-cam.x, ry - CFG.ROAD_W / 2 - cam.y, CFG.WORLD_W, CFG.ROAD_W); });
    ctx.fillRect(-cam.x, CFG.BEACH_ROAD_Y - CFG.ROAD_W / 2 - cam.y, CFG.WORLD_W, CFG.ROAD_W);
    // Edge lines and dashed centre lines.
    ctx.strokeStyle = P.roadEdge; ctx.lineWidth = 2.5;
    CFG.ROADS_X.forEach(function (rx) {
      [-CFG.ROAD_W / 2 + 4, CFG.ROAD_W / 2 - 4].forEach(function (o) {
        ctx.beginPath(); ctx.moveTo(rx + o - cam.x, -cam.y); ctx.lineTo(rx + o - cam.x, CFG.WORLD_H - cam.y); ctx.stroke();
      });
    });
    ctx.strokeStyle = P.lane; ctx.lineWidth = 3; ctx.setLineDash([26, 30]);
    CFG.ROADS_X.forEach(function (rx) { ctx.beginPath(); ctx.moveTo(rx - cam.x, -cam.y); ctx.lineTo(rx - cam.x, CFG.WORLD_H - cam.y); ctx.stroke(); });
    CFG.ROADS_Y.concat([CFG.BEACH_ROAD_Y]).forEach(function (ry) { ctx.beginPath(); ctx.moveTo(-cam.x, ry - cam.y); ctx.lineTo(CFG.WORLD_W - cam.x, ry - cam.y); ctx.stroke(); });
    ctx.setLineDash([]);
    // Street name labels.
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.textAlign = 'center';
    CFG.ROADS_X.forEach(function (rx, i) { ctx.fillText(CFG.STREETS_X[i].toUpperCase(), rx - cam.x, 300 - cam.y); });
    CFG.ROADS_Y.forEach(function (ry, i) {
      ctx.save(); ctx.translate(300 - cam.x, ry - cam.y); ctx.fillText(CFG.STREETS_Y[i].toUpperCase(), 0, -CFG.ROAD_W / 2 - 20); ctx.restore();
    });
  }
  function drawPlazas(ctx, G, cam) {
    (G.city.plazas || []).forEach(function (pz) {
      var x = pz.x - cam.x, y = pz.y - cam.y;
      if (x + pz.w < -40 || y + pz.h < -40 || x > CFG.VIEW_W + 40 || y > CFG.VIEW_H + 40) return;
      ctx.fillStyle = P.grass;
      ctx.fillRect(x, y, pz.w, pz.h);
      ctx.strokeStyle = 'rgba(230,201,138,0.8)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(x, y + pz.h / 2); ctx.lineTo(x + pz.w, y + pz.h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + pz.w / 2, y); ctx.lineTo(x + pz.w / 2, y + pz.h); ctx.stroke();
      // Fountain at the crossing.
      ctx.fillStyle = '#2e86a0';
      ctx.beginPath(); ctx.arc(x + pz.w / 2, y + pz.h / 2, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#bfe6f2';
      ctx.beginPath(); ctx.arc(x + pz.w / 2, y + pz.h / 2, 12 + Math.sin(G.time * 3) * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,240,200,0.65)'; ctx.textAlign = 'center';
      ctx.fillText(pz.name, x + pz.w / 2, y + 26);
    });
  }
  function drawPierAndShop(ctx, G, cam) {
    var pier = CFG.PIER;
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(pier.x - cam.x, pier.y - cam.y, pier.w, pier.h);
    ctx.strokeStyle = '#6e5433'; ctx.lineWidth = 2;
    for (var i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(pier.x - cam.x, pier.y + i * (pier.h / 7) - cam.y); ctx.lineTo(pier.x + pier.w - cam.x, pier.y + i * (pier.h / 7) - cam.y); ctx.stroke(); }
    ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#ffe9b0'; ctx.textAlign = 'center';
    ctx.fillText('CIELO PIER', pier.x + pier.w / 2 - cam.x, pier.y + 24 - cam.y);
    // Chop shop: a fenced lot with a glowing drop-off ring.
    var cs = CFG.CHOP_SHOP;
    ctx.fillStyle = '#3c383e';
    ctx.fillRect(cs.x - 100 - cam.x, cs.y - 100 - cam.y, 200, 200);
    ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 3;
    ctx.strokeRect(cs.x - 100 - cam.x, cs.y - 100 - cam.y, 200, 200);
    var pulse = 26 + Math.sin(G.time * 4) * 5;
    ctx.strokeStyle = 'rgba(255,180,0,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cs.x - cam.x, cs.y - cam.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffb400'; ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('CHOP SHOP', cs.x - cam.x, cs.y - 78 - cam.y);
    ctx.fillStyle = '#57424a';
    ctx.fillRect(cs.x - 60 - cam.x, cs.y - 140 - cam.y, 120, 42);
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(cs.x - 48 - cam.x, cs.y - 128 - cam.y, 20, 14); ctx.fillRect(cs.x + 28 - cam.x, cs.y - 128 - cam.y, 20, 14);
  }
  function drawBuildings(ctx, G, cam) {
    var bs = G.city.buildings;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var x = b.x - cam.x, y = b.y - cam.y;
      if (x + b.w < -80 || y + b.h < -80 || x > CFG.VIEW_W + 120 || y > CFG.VIEW_H + 120) continue;
      var lift = b.height * 26; // pseudo-height: the sunset side wall
      // Long shadow to the south-east.
      ctx.fillStyle = 'rgba(20,10,16,0.34)';
      ctx.fillRect(x + 14 + lift * 0.4, y + 16 + lift * 0.5, b.w, b.h);
      // South wall (in shade) then the roof.
      ctx.fillStyle = P.buildingWall;
      ctx.fillRect(x, y + lift * 0.32, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(x, y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, b.w, b.h);
      if (b.warehouse) {
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        for (var s = 1; s < 4; s++) ctx.fillRect(x + (b.w / 4) * s - 2, y + 6, 4, b.h - 12);
      }
      // Lit windows on the roof face.
      ctx.fillStyle = P.windowLit;
      for (var wI = 0; wI < b.windows.length; wI++) {
        var wn = b.windows[wI];
        if (wn.x > b.w - 10 || wn.y > b.h - 10) continue;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x + wn.x, y + wn.y, 6, 8);
      }
      ctx.globalAlpha = 1;
    }
    // Palms.
    G.city.palms.forEach(function (pm) {
      var x = pm.x - cam.x, y = pm.y - cam.y;
      if (x < -40 || y < -40 || x > CFG.VIEW_W + 40 || y > CFG.VIEW_H + 40) return;
      ctx.fillStyle = 'rgba(20,10,16,0.3)';
      ctx.beginPath(); ctx.ellipse(x + 12, y + 8, 16 * pm.s, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = P.palmTrunk; ctx.lineWidth = 4 * pm.s;
      ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.quadraticCurveTo(x + 3, y - 6, x + 6, y - 14 * pm.s); ctx.stroke();
      ctx.strokeStyle = P.palmLeaf; ctx.lineWidth = 3;
      for (var f = 0; f < 6; f++) {
        var a = (f / 6) * Math.PI * 2 + 0.4;
        ctx.beginPath(); ctx.moveTo(x + 6, y - 14 * pm.s);
        ctx.quadraticCurveTo(x + 6 + Math.cos(a) * 13 * pm.s, y - 14 * pm.s + Math.sin(a) * 8 - 4, x + 6 + Math.cos(a) * 20 * pm.s, y - 14 * pm.s + Math.sin(a) * 12 + 3);
        ctx.stroke();
      }
    });
  }
  function drawCarShape(ctx, car, cam, G) {
    var x = car.x - cam.x, y = car.y - cam.y;
    if (x < -90 || y < -90 || x > CFG.VIEW_W + 90 || y > CFG.VIEW_H + 90) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    // Headlight cone for moving cars (dusk light): a flat translucent
    // wedge - cheap to rasterise, no per-car gradient.
    if (!car.parked && !car.dead && Math.abs(car.speed) > 4) {
      ctx.fillStyle = 'rgba(255,240,180,0.16)';
      ctx.beginPath();
      ctx.moveTo(car.w / 2, -4); ctx.lineTo(car.w / 2 + 110, -30); ctx.lineTo(car.w / 2 + 110, 30); ctx.lineTo(car.w / 2, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,8,12,0.4)';
    CB.roundRect(ctx, -car.w / 2 + 3, -car.h / 2 + 5, car.w, car.h, 6); ctx.fill();
    ctx.fillStyle = car.dead ? '#3a3636' : car.color;
    CB.roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
    // Windshield + rear window.
    ctx.fillStyle = '#bfe6f2';
    ctx.fillRect(car.w * 0.08, -car.h / 2 + 3.5, car.w * 0.2, car.h - 7);
    ctx.fillStyle = '#7fa8b8';
    ctx.fillRect(-car.w * 0.3, -car.h / 2 + 3.5, car.w * 0.16, car.h - 7);
    // Roof.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-car.w * 0.12, -car.h / 2 + 3, car.w * 0.2, car.h - 6);
    // Headlights / tail lights.
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 2.5, 3, 5); ctx.fillRect(car.w / 2 - 3, car.h / 2 - 7.5, 3, 5);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(-car.w / 2, -car.h / 2 + 2.5, 3, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 7.5, 3, 5);
    if (car.kind === 'police') {
      ctx.fillStyle = P.policeTrim;
      ctx.fillRect(-car.w * 0.1, -car.h / 2, car.w * 0.22, car.h);
      var phase = Math.floor(G.time * 5 + (car.sirenPhase || 0)) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2a2a' : '#2a6aff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#101418';
      ctx.font = 'bold 8px system-ui, sans-serif'; ctx.textAlign = 'center';
    }
    if (car.isMarked) {
      ctx.strokeStyle = (Math.floor(G.time * 3) % 2 === 0) ? '#ffffff' : '#ffb400';
      ctx.lineWidth = 2.5;
      CB.roundRect(ctx, -car.w / 2 - 4, -car.h / 2 - 4, car.w + 8, car.h + 8, 8); ctx.stroke();
    }
    if (car.isVan) {
      ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VAULT', 0, 3);
    }
    ctx.restore();
  }
  function drawPerson(ctx, who, cam, G, isPlayer) {
    var x = who.x - cam.x, y = who.y - cam.y;
    if (x < -30 || y < -30 || x > CFG.VIEW_W + 30 || y > CFG.VIEW_H + 30) return;
    ctx.save();
    ctx.translate(x, y);
    if (who.dead) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = who.rival ? P.rival : who.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(15,8,12,0.35)';
    ctx.beginPath(); ctx.ellipse(3, 6, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    var bob = who.moving || who.speed > 4 ? Math.sin((who.walkPhase || 0)) * 1.6 : 0;
    ctx.fillStyle = who.rival ? P.rival : isPlayer ? P.player : who.color;
    ctx.beginPath(); ctx.arc(0, bob * 0.3, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.playerSkin;
    ctx.beginPath(); ctx.arc(0, bob * 0.3, 4.6, 0, Math.PI * 2); ctx.fill();
    if (isPlayer) {
      // Aim arm + pistol.
      ctx.rotate(who.aimAngle || 0);
      ctx.strokeStyle = P.playerSkin; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.fillStyle = '#181818'; ctx.fillRect(11, -1.8, 8, 3.6);
      if (G.muzzleT > 0) {
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath(); ctx.arc(23, 0, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath(); ctx.arc(23, 0, 2.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.rotate(-(who.aimAngle || 0));
      // Player ring.
      ctx.strokeStyle = 'rgba(255,210,62,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, Math.PI * 2); ctx.stroke();
    }
    if (who.rival && who.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-13, -20, 26, 4.5);
      ctx.fillStyle = '#ff4040'; ctx.fillRect(-13, -20, 26 * Math.max(0, who.hp / who.maxHp), 4.5);
    }
    ctx.restore();
  }
  function drawMarkers(ctx, G, cam) {
    var mp = null;
    try { mp = CB.Missions.objectivePos(G); } catch (e) { mp = null; }
    if (mp && G.screen === 'playing') {
      var x = mp.x - cam.x, y = mp.y - cam.y;
      var bobY = Math.sin(G.time * 3.4) * 6;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,84,112,0.85)'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(x, y, 30 + Math.sin(G.time * 4) * 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff5470';
      ctx.beginPath();
      ctx.moveTo(x, y - 58 + bobY); ctx.lineTo(x - 11, y - 78 + bobY); ctx.lineTo(x + 11, y - 78 + bobY);
      ctx.closePath(); ctx.fill();
      // Off-screen direction arrow at the screen edge.
      if (x < 30 || x > CFG.VIEW_W - 30 || y < 30 || y > CFG.VIEW_H - 30) {
        var cx = Math.max(36, Math.min(CFG.VIEW_W - 36, x)), cy = Math.max(36, Math.min(CFG.VIEW_H - 36, y));
        var a = Math.atan2(y - CFG.VIEW_H / 2, x - CFG.VIEW_W / 2);
        ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // Courier checkpoint pillar of light.
    if (G.missionState && G.mission === 1) {
      var cp = CFG.CHECKPOINTS[G.missionState.cpIndex];
      if (cp) {
        var gx = cp.x - cam.x, gy = cp.y - cam.y;
        ctx.fillStyle = 'rgba(80,255,170,0.20)';
        ctx.fillRect(gx - 16, gy - 190, 32, 190);
        ctx.fillStyle = 'rgba(80,255,170,0.35)';
        ctx.fillRect(gx - 16, gy - 26, 32, 26);
      }
    }
  }
  function renderWorld(ctx, G) {
    var cam = G.camera;
    ctx.fillStyle = P.sky;
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    ctx.save();
    if (G.shake > 0.3) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    drawGround(ctx, G, cam);
    drawRoads(ctx, G, cam);
    drawPlazas(ctx, G, cam);
    drawPierAndShop(ctx, G, cam);
    drawBuildings(ctx, G, cam);
    // Roadblock cruisers.
    G.roadblocks.forEach(function (car) { drawCarShape(ctx, car, cam, G); });
    // Parked + traffic + player cars, then police on top.
    G.cars.forEach(function (car) { drawCarShape(ctx, car, cam, G); });
    G.police.forEach(function (c) { drawCarShape(ctx, c.car, cam, G); });
    G.peds.forEach(function (ped) { drawPerson(ctx, ped, cam, G, false); });
    G.rivals.forEach(function (r) { drawPerson(ctx, r, cam, G, false); });
    if (G.player.onFoot) drawPerson(ctx, G.player, cam, G, true);
    // Bullets as bright tracers.
    ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 2.5;
    G.bullets.forEach(function (b) {
      ctx.beginPath();
      ctx.moveTo(b.px - cam.x, b.py - cam.y);
      ctx.lineTo(b.x - cam.x, b.y - cam.y);
      ctx.stroke();
    });
    // Particles.
    G.particles.forEach(function (pt) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x - cam.x, pt.y - cam.y, pt.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawMarkers(ctx, G, cam);
    // Sunset grade: a warm vignette, pre-rendered once into a bitmap
    // and blitted - a fresh full-screen gradient every frame is the
    // single most expensive thing a software rasteriser can be fed.
    if (!CB._vignette) {
      var vc = document.createElement('canvas');
      vc.width = CFG.VIEW_W; vc.height = CFG.VIEW_H;
      var vctx = vc.getContext('2d');
      var vg = vctx.createRadialGradient(CFG.VIEW_W / 2, CFG.VIEW_H / 2, CFG.VIEW_H * 0.42, CFG.VIEW_W / 2, CFG.VIEW_H / 2, CFG.VIEW_H * 0.95);
      vg.addColorStop(0, 'rgba(255,140,60,0.05)');
      vg.addColorStop(1, 'rgba(30,8,24,0.34)');
      vctx.fillStyle = vg;
      vctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      CB._vignette = vc;
    }
    ctx.drawImage(CB._vignette, 0, 0);
    ctx.restore();
    // Hit flash.
    if (G.hitFlashT > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.22, G.hitFlashT * 1.6) + ')';
      ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    }
  }
  CB.renderWorld = renderWorld;
  CB.drawCarShape = drawCarShape;
})();
