/* ========= NEON ARCADE — tiny shared runtime (works over file://) ========= */
(function (g) {
  'use strict';

  var KEY = 'neonArcade.v1';

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function writeAll(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  var store = {
    best: function (id) { return (readAll().best || {})[id] || 0; },
    /* returns true when a new record was set */
    submit: function (id, score) {
      var all = readAll();
      all.best = all.best || {};
      if (score > (all.best[id] || 0)) { all.best[id] = score; writeAll(all); return true; }
      return false;
    },
    favs: function () { return readAll().favs || []; },
    toggleFav: function (id) {
      var all = readAll(), f = all.favs || [], i = f.indexOf(id);
      if (i < 0) f.push(id); else f.splice(i, 1);
      all.favs = f; writeAll(all); return i < 0;
    },
    recent: function () { return readAll().recent || []; },
    touch: function (id) {
      var all = readAll(), r = (all.recent || []).filter(function (x) { return x !== id; });
      r.unshift(id); all.recent = r.slice(0, 8); writeAll(all);
    }
  };

  /* ---- sound: procedural blips, no asset files ---- */
  var ctx = null;
  function audio() {
    if (ctx === null) {
      var AC = g.AudioContext || g.webkitAudioContext;
      ctx = AC ? new AC() : false;
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function beep(freq, dur, type, vol) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), gn = a.createGain(), t = a.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol == null ? 0.11 : vol, t + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
    o.connect(gn); gn.connect(a.destination);
    o.start(t); o.stop(t + (dur || 0.1) + 0.02);
  }
  function slide(f1, f2, dur, type) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), gn = a.createGain(), t = a.currentTime;
    o.type = type || 'sawtooth';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    gn.gain.setValueAtTime(0.12, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  var sfx = {
    on: true,
    pick: function (f) { if (sfx.on) beep(f || 880, 0.07, 'square', 0.08); },
    good: function () { if (sfx.on) { beep(660, 0.08); setTimeout(function () { beep(990, 0.1); }, 70); } },
    hit:  function () { if (sfx.on) beep(180, 0.09, 'sawtooth', 0.1); },
    bad:  function () { if (sfx.on) slide(320, 60, 0.4); },
    win:  function () { if (sfx.on) [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 0.14, 'triangle', 0.1); }, i * 95); }); }
  };

  /* ---- crisp canvas on hi-dpi screens ---- */
  function fit(canvas, w, h) {
    var dpr = Math.min(g.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  }

  /* ---- keep a canvas panel inside small screens ---- */
  function responsive(canvas, w) {
    function apply() {
      var max = Math.min(g.innerWidth - 54, w);
      canvas.style.width = max + 'px';
      canvas.style.height = (canvas.height / canvas.width) * max + 'px';
    }
    apply(); g.addEventListener('resize', apply);
  }

  /* ---- overlay helper ---- */
  function overlay(el) {
    return {
      show: function (title, html) {
        el.innerHTML = '<h2>' + title + '</h2>' + (html || '');
        el.classList.add('show');
      },
      hide: function () { el.classList.remove('show'); }
    };
  }

  g.ARC = { store: store, sfx: sfx, beep: beep, slide: slide, fit: fit, responsive: responsive, overlay: overlay };
})(window);
