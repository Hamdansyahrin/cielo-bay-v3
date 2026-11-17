// Cielo Bay - audio.js: WebAudio synth only. Engine hum, two-tone
// sirens, gunshots, melee thumps, cash pickups, UI clicks. No files.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, sirenT = 0;
  function ac() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function blip(freqA, freqB, dur, type, vol) {
    var c = ac(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freqA, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    } catch (e) { /* audio is decoration */ }
  }
  function noiseBurst(dur, vol, freq) {
    var c = ac(); if (!c) return;
    try {
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource(); src.buffer = buf;
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1800;
      var g = c.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    } catch (e) { /* ignore */ }
  }
  var Snd = {
    unlock: function () { ac(); },
    shot: function () { noiseBurst(0.09, 0.22, 2600); blip(720, 140, 0.08, 'square', 0.10); },
    rivalShot: function () { noiseBurst(0.07, 0.10, 2000); },
    melee: function () { noiseBurst(0.06, 0.18, 700); blip(160, 60, 0.08, 'sine', 0.2); },
    hit: function () { blip(220, 90, 0.09, 'triangle', 0.18); },
    crash: function () { noiseBurst(0.22, 0.3, 900); blip(110, 40, 0.2, 'sawtooth', 0.14); },
    cash: function () { blip(880, 880, 0.07, 'sine', 0.16); setTimeout(function () { blip(1320, 1320, 0.1, 'sine', 0.16); }, 70); },
    checkpoint: function () { blip(660, 990, 0.12, 'sine', 0.16); },
    door: function () { blip(300, 200, 0.08, 'sine', 0.12); },
    busted: function () { blip(520, 130, 0.5, 'sawtooth', 0.14); },
    phone: function () { blip(1040, 1040, 0.06, 'sine', 0.1); setTimeout(function () { blip(1040, 1040, 0.06, 'sine', 0.1); }, 110); },
    update: function (G, dt) {
      var c = ac(); if (!c) return;
      try {
        // Engine: a sawtooth whose pitch follows the driven car's speed.
        var driving = !G.player.onFoot && G.player.car && G.screen === 'playing';
        if (driving) {
          if (!engineOsc) {
            engineOsc = c.createOscillator(); engineGain = c.createGain();
            engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.0;
            engineOsc.connect(engineGain); engineGain.connect(c.destination); engineOsc.start();
          }
          var sp = Math.abs(G.player.car.speed || 0);
          engineOsc.frequency.value = 55 + sp * 0.55;
          engineGain.gain.value = 0.028 + Math.min(0.03, sp * 0.00008);
        } else if (engineGain) { engineGain.gain.value = 0; }
        // Siren: two-tone while any cruiser is near and the heat is on.
        var hot = G.wanted > 0 && G.police.length > 0 && G.screen === 'playing';
        if (hot) {
          if (!sirenOsc) {
            sirenOsc = c.createOscillator(); sirenGain = c.createGain();
            sirenOsc.type = 'triangle'; sirenGain.gain.value = 0.0;
            sirenOsc.connect(sirenGain); sirenGain.connect(c.destination); sirenOsc.start();
          }
          sirenT += dt;
          sirenOsc.frequency.value = (Math.floor(sirenT * 1.6) % 2 === 0) ? 660 : 880;
          sirenGain.gain.value = 0.016;
        } else if (sirenGain) { sirenGain.gain.value = 0; }
      } catch (e) { /* ignore */ }
    },
  };
  CB.Snd = Snd;
})();
