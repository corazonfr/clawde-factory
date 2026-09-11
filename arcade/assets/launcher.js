/* ========= NEON ARCADE — launcher logic ========= */
(function () {
  'use strict';
  var grid = document.getElementById('grid');
  var recentSec = document.getElementById('recentSec');
  var recentGrid = document.getElementById('recentGrid');
  var search = document.getElementById('search');
  var chips = document.querySelectorAll('.chip[data-cat]');
  var count = document.getElementById('count');
  var filter = 'All', query = '';
  var STATUS = {};   /* id -> 'up' | 'down' | 'slow' | 'checking' */

  document.getElementById('nSites').textContent = SITES.length;

  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  function mesh(s) {
    return 'background:' +
      'radial-gradient(120% 120% at 18% 12%,' + s.c1 + ' 0%,transparent 58%),' +
      'radial-gradient(120% 120% at 86% 92%,' + s.c2 + ' 0%,transparent 62%),' +
      'linear-gradient(140deg,' + s.c2 + '55,' + s.c1 + '2e)';
  }

  var DOT_TITLE = {
    up: 'Reachable from this network',
    down: 'Did not respond — blocked here, or the site moved',
    slow: 'Very slow to respond',
    checking: 'Checking…'
  };

  function card(s, i) {
    var fav = ARC.store.favs().indexOf(s.id) >= 0;
    var st = STATUS[s.id] || '';
    var a = document.createElement('a');
    a.className = 'card';
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.id = s.id;
    a.style.animationDelay = Math.min(i * 26, 520) + 'ms';
    a.innerHTML =
      '<div class="thumb"><div class="mesh" style="' + mesh(s) + '"></div>' +
        '<div class="emo">' + s.emoji + '</div><div class="shine"></div></div>' +
      '<button class="fav' + (fav ? ' on' : '') + '" title="Pin to the top">' + (fav ? '♥' : '♡') + '</button>' +
      '<div class="play">↗</div>' +
      '<div class="meta">' +
        '<h3><span class="dot ' + st + '" title="' + (DOT_TITLE[st] || 'Not checked yet') + '"></span>' + s.name + '</h3>' +
        '<div class="host">' + host(s.url) + '</div>' +
        '<p>' + s.blurb + '</p>' +
        '<div class="tags"><span class="tag lead">' + s.cat + '</span>' +
          s.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') +
        '</div>' +
      '</div>';

    a.addEventListener('click', function (e) {
      if (e.target.closest('.fav')) {
        e.preventDefault();
        var now = ARC.store.toggleFav(s.id);
        e.target.classList.toggle('on', now);
        e.target.textContent = now ? '♥' : '♡';
        render();
        return;
      }
      ARC.store.touch(s.id);
      setTimeout(render, 60);
    });
    return a;
  }

  function render() {
    var favs = ARC.store.favs();
    var list = SITES.filter(function (s) {
      var okCat = filter === 'All' ? true
        : filter === '♥ Pinned' ? favs.indexOf(s.id) >= 0
        : s.cat === filter;
      var hay = (s.name + ' ' + s.blurb + ' ' + s.cat + ' ' + s.tags.join(' ') + ' ' + host(s.url)).toLowerCase();
      return okCat && hay.indexOf(query) >= 0;
    });
    list.sort(function (a, b) { return (favs.indexOf(b.id) >= 0) - (favs.indexOf(a.id) >= 0); });

    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>🫥</div>Nothing matches that. Try another word.</div>';
    } else {
      list.forEach(function (s, i) { grid.appendChild(card(s, i)); });
    }
    count.textContent = list.length + ' / ' + SITES.length + ' sites';

    var rec = ARC.store.recent()
      .map(function (id) { return SITES.filter(function (s) { return s.id === id; })[0]; })
      .filter(Boolean).slice(0, 4);
    recentSec.style.display = rec.length ? '' : 'none';
    recentGrid.innerHTML = '';
    rec.forEach(function (s, i) { recentGrid.appendChild(card(s, i)); });
  }

  /* ----- live reachability probe, run from the visitor's own network -----
     A no-cors fetch gives an opaque result: we learn that the request
     completed, never what came back. That is exactly what we want here —
     "did this host answer me" and nothing more.                          */
  function probe(url, ms) {
    return new Promise(function (resolve) {
      var settled = false, ctrl = null;
      try { ctrl = new AbortController(); } catch (e) {}
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (ctrl) try { ctrl.abort(); } catch (e) {}
        resolve('slow');
      }, ms || 5000);
      var opts = { mode: 'no-cors', cache: 'no-store', redirect: 'follow' };
      if (ctrl) opts.signal = ctrl.signal;
      fetch(url, opts).then(function () {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve('up');
      }).catch(function () {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve('down');
      });
    });
  }

  function paintDot(id) {
    [].forEach.call(document.querySelectorAll('.card[data-id="' + id + '"] .dot'), function (d) {
      d.className = 'dot ' + (STATUS[id] || '');
      d.title = DOT_TITLE[STATUS[id]] || 'Not checked yet';
    });
  }

  var checking = false;
  function checkAll() {
    if (checking) return;
    checking = true;
    var btn = document.getElementById('checkBtn');
    var queue = SITES.slice(), done = 0, LANES = 8;
    SITES.forEach(function (s) { STATUS[s.id] = 'checking'; paintDot(s.id); });
    btn.textContent = 'Checking… 0/' + SITES.length;

    function lane() {
      var s = queue.shift();
      if (!s) return Promise.resolve();
      return probe(s.url).then(function (r) {
        STATUS[s.id] = r; paintDot(s.id);
        done++;
        btn.textContent = 'Checking… ' + done + '/' + SITES.length;
        return lane();
      });
    }
    var lanes = [];
    for (var i = 0; i < LANES; i++) lanes.push(lane());
    Promise.all(lanes).then(function () {
      checking = false;
      var up = SITES.filter(function (s) { return STATUS[s.id] === 'up'; }).length;
      btn.textContent = '🔄 Re-check  (' + up + '/' + SITES.length + ' answered)';
      document.getElementById('checkNote').style.display = '';
    });
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      filter = c.dataset.cat;
      render();
    });
  });
  search.addEventListener('input', function () { query = search.value.trim().toLowerCase(); render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { search.value = ''; query = ''; search.blur(); render(); }
  });

  document.getElementById('clearRecent').addEventListener('click', function () {
    try {
      var all = JSON.parse(localStorage.getItem('neonArcade.v1') || '{}');
      all.recent = [];
      localStorage.setItem('neonArcade.v1', JSON.stringify(all));
    } catch (e) {}
    render();
  });
  document.getElementById('lucky').addEventListener('click', function () {
    var s = SITES[Math.floor(Math.random() * SITES.length)];
    ARC.store.touch(s.id);
    render();
    window.open(s.url, '_blank', 'noopener');
  });
  document.getElementById('checkBtn').addEventListener('click', checkAll);

  render();
})();
