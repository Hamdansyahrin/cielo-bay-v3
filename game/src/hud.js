// Cielo Bay - hud.js: everything bolted to the screen edges - cash,
// health, wanted stars, the raised objective banner, the speedometer
// (bottom-left), the minimap (bottom-right: roads, player, police
// blips, mission marker), phone briefings and toasts.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = CB.CFG;

  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  CB.truncate = truncate;
  function toast(G, text) {
    G.toasts.push({ text: truncate(String(text), 92), t: 0, ttl: 3.6 });
    if (G.toasts.length > 3) G.toasts.shift();
  }
  CB.toast = toast;
  function phoneBrief(G, title, body) {
    G.phone = { title: truncate(title, 42), body: truncate(body, 190), t: 0, ttl: 7.5 };
    CB.Snd.phone();
  }
  CB.phoneBrief = phoneBrief;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  CB.roundRect = roundRect;

  function drawStars(ctx, G, x, y) {
    for (var i = 0; i < 5; i++) {
      var sx = x + i * 30, sy = y + 14;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.beginPath();
      for (var k = 0; k < 5; k++) {
        var a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
        var a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
      }
      ctx.closePath();
      var active = i < G.wanted;
      var flash = G.wanted > 0 && G.unseenT > 0.4 && Math.floor(G.time * 3) % 2 === 0;
      ctx.fillStyle = active ? (flash ? '#ffe9a0' : '#ffb400') : 'rgba(255,255,255,0.22)';
      ctx.fill();
      ctx.restore();
    }
  }
  function drawMinimap(ctx, G) {
    var mw = 216, mh = 162, mx = CFG.VIEW_W - mw - 14, my = CFG.VIEW_H - mh - 14;
    ctx.save();
    ctx.fillStyle = 'rgba(16,14,22,0.82)';
    roundRect(ctx, mx, my, mw, mh, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,62,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); roundRect(ctx, mx, my, mw, mh, 10); ctx.clip();
    var sx = mw / CFG.WORLD_W, sy = mh / CFG.WORLD_H;
    // water + sand strip
    ctx.fillStyle = '#1d5f74'; ctx.fillRect(mx, my + CFG.WATER_Y * sy, mw, mh - CFG.WATER_Y * sy);
    ctx.fillStyle = '#e6c98a'; ctx.fillRect(mx, my + (CFG.WATER_Y - 130) * sy, mw, 8);
    // roads
    ctx.strokeStyle = 'rgba(230,220,190,0.55)'; ctx.lineWidth = 2;
    CFG.ROADS_X.forEach(function (rx) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke(); });
    CFG.ROADS_Y.concat([CFG.BEACH_ROAD_Y]).forEach(function (ry) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke(); });
    // chop shop
    ctx.fillStyle = '#ffb400';
    ctx.fillRect(mx + CFG.CHOP_SHOP.x * sx - 3, my + CFG.CHOP_SHOP.y * sy - 3, 6, 6);
    // mission marker
    var mp = CB.Missions.objectivePos(G);
    if (mp && Math.floor(G.time * 2.4) % 2 === 0) {
      ctx.fillStyle = '#ff5470';
      ctx.beginPath(); ctx.arc(mx + mp.x * sx, my + mp.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    // police blips
    ctx.fillStyle = (Math.floor(G.time * 2.4) % 2 === 0) ? '#4da3ff' : '#ff4040';
    G.police.forEach(function (c) { ctx.fillRect(mx + c.car.x * sx - 2.5, my + c.car.y * sy - 2.5, 5, 5); });
    // player arrow
    var px = mx + G.player.x * sx, py = my + G.player.y * sy;
    ctx.translate(px, py); ctx.rotate(G.player.angle + Math.PI / 2);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('CIELO BAY', mx + 8, my + 14);
  }
  function drawHUD(ctx, G) {
    var p = G.player;
    // Cash + health, top-left.
    ctx.save();
    ctx.fillStyle = 'rgba(16,14,22,0.72)';
    roundRect(ctx, 14, 12, 218, 62, 10); ctx.fill();
    ctx.fillStyle = '#7be495'; ctx.font = 'bold 24px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('$' + Math.floor(G.cash).toLocaleString('en-US'), 26, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, 26, 50, 160, 11, 5); ctx.fill();
    ctx.fillStyle = p.hp > 30 ? '#e84a5f' : '#ff2222';
    roundRect(ctx, 26, 50, Math.max(0, 160 * (p.hp / CFG.PLAYER_HP)), 11, 5); ctx.fill();
    // Wanted stars, top-right.
    ctx.fillStyle = 'rgba(16,14,22,0.72)';
    roundRect(ctx, CFG.VIEW_W - 190, 12, 176, 44, 10); ctx.fill();
    drawStars(ctx, G, CFG.VIEW_W - 172, 20);
    // Objective banner: raised to the very top centre so it never
    // covers the player in the middle of the screen.
    var obj = '';
    try { obj = CB.Missions.objectiveText(G); } catch (e) { obj = ''; }
    if (obj && G.screen === 'playing') {
      ctx.font = 'bold 17px system-ui, sans-serif';
      var w = Math.min(560, ctx.measureText(obj).width + 44);
      ctx.fillStyle = 'rgba(16,14,22,0.78)';
      roundRect(ctx, (CFG.VIEW_W - w) / 2, 10, w, 38, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,180,0,0.65)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffd23e'; ctx.textAlign = 'center';
      ctx.fillText(truncate(obj, 64), CFG.VIEW_W / 2, 35);
    }
    // Mission title under the banner.
    var def = null;
    try { def = CB.currentMissionDef(G); } catch (e) { def = null; }
    if (def && G.missionState && G.screen === 'playing') {
      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center';
      ctx.fillText(def.title + '  ·  $' + def.reward, CFG.VIEW_W / 2, 64);
    }
    // Speedometer bottom-left, clear of the minimap (bottom-right).
    if (!p.onFoot && p.car) {
      var mph = Math.round(Math.abs(p.car.speed) * 0.32);
      ctx.fillStyle = 'rgba(16,14,22,0.72)';
      roundRect(ctx, 14, CFG.VIEW_H - 84, 148, 70, 10); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(String(mph), 28, CFG.VIEW_H - 42);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('MPH', 92, CFG.VIEW_H - 42);
      ctx.fillStyle = p.car.hp > 40 ? '#7be495' : '#ff5545';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(p.car.isVan ? 'VAULT VAN' : 'VEHICLE', 28, CFG.VIEW_H - 22);
      roundRect(ctx, 92, CFG.VIEW_H - 30, 56, 7, 3); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      ctx.fillStyle = p.car.hp > 40 ? '#7be495' : '#ff5545';
      roundRect(ctx, 92, CFG.VIEW_H - 30, Math.max(0, 56 * (p.car.hp / p.car.maxHp)), 7, 3); ctx.fill();
    }
    // Interaction hint.
    if (p.onFoot && G.screen === 'playing') {
      var near = CB.nearestCar(G, p.x, p.y, 58);
      if (near) {
        ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(16,14,22,0.75)';
        var label = near.isMarked ? 'E - STEAL THE MARKED CAR' : near.isVan ? 'E - TAKE THE VAULT VAN' : 'E - ENTER CAR';
        var lw = ctx.measureText(label).width + 30;
        roundRect(ctx, (CFG.VIEW_W - lw) / 2, CFG.VIEW_H - 120, lw, 30, 8); ctx.fill();
        ctx.fillStyle = '#ffd23e'; ctx.fillText(label, CFG.VIEW_W / 2, CFG.VIEW_H - 100);
      }
    } else if (!p.onFoot && G.screen === 'playing') {
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText('E - exit car · SPACE - handbrake', 176, CFG.VIEW_H - 24);
    }
    drawMinimap(ctx, G);
    // Phone briefing, right side.
    if (G.phone) {
      var ph = G.phone;
      ctx.fillStyle = 'rgba(20,18,30,0.92)';
      roundRect(ctx, CFG.VIEW_W - 316, 70, 302, 118, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,62,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('📱 ' + ph.title, CFG.VIEW_W - 298, 94);
      ctx.fillStyle = '#f2ead8'; ctx.font = '13px system-ui, sans-serif';
      wrapText(ctx, ph.body, CFG.VIEW_W - 298, 116, 268, 17, 4);
    }
    // Toasts, stacked above the minimap.
    for (var i = 0; i < G.toasts.length; i++) {
      var t = G.toasts[i];
      var alpha = Math.min(1, (t.ttl - t.t) / 0.5);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = 'bold 14px system-ui, sans-serif';
      var tw = Math.min(430, ctx.measureText(t.text).width + 28);
      var tx = CFG.VIEW_W - tw - 14, ty = CFG.VIEW_H - 222 - i * 40;
      ctx.fillStyle = 'rgba(16,14,22,0.85)';
      roundRect(ctx, tx, ty, tw, 32, 8); ctx.fill();
      ctx.fillStyle = '#ffd23e'; ctx.textAlign = 'left';
      ctx.fillText(t.text, tx + 14, ty + 21);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    var words = String(text).split(' ');
    var line = '', lines = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + lines * lineH);
        lines++; if (lines >= maxLines) return;
        line = words[i];
      } else line = test;
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
  }
  CB.drawHUD = drawHUD;
  CB.wrapText = wrapText;
})();
