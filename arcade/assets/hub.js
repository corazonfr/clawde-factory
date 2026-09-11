/* ========= NEON ARCADE — local game hub ========= */
(function () {
  'use strict';
  var grid = document.getElementById('grid');
  var recentSec = document.getElementById('recentSec');
  var recentGrid = document.getElementById('recentGrid');
  var search = document.getElementById('search');
  var chips = document.querySelectorAll('.chip[data-cat]');
  var count = document.getElementById('count');
  var filter = 'All', query = '';

  document.getElementById('nGames').textContent = GAMES.length;
  var origCount = GAMES.filter(function (g) { return g.origin === 'original'; }).length;
  var oEl = document.getElementById('nOriginals');
  if (oEl) oEl.textContent = origCount;

  function mesh(g) {
    return 'background:' +
      'radial-gradient(120% 120% at 20% 10%,' + g.c1 + ' 0%,transparent 55%),' +
      'radial-gradient(120% 120% at 85% 90%,' + g.c2 + ' 0%,transparent 60%),' +
      'linear-gradient(140deg,' + g.c2 + '55,' + g.c1 + '33)';
  }

  function card(g, i) {
    var best = ARC.store.best(g.id);
    var fav = ARC.store.favs().indexOf(g.id) >= 0;
    var a = document.createElement('a');
    a.className = 'card' + (g.origin === 'original' ? ' orig' : '');
    a.href = g.file;
    a.style.animationDelay = Math.min(i * 30, 480) + 'ms';
    a.innerHTML =
      '<div class="thumb"><div class="mesh" style="' + mesh(g) + '"></div>' +
        '<div class="emo">' + g.emoji + '</div><div class="shine"></div>' +
        (g.origin === 'original' ? '<div class="badge">ORIGINAL</div>' : '') +
      '</div>' +
      '<button class="fav' + (fav ? ' on' : '') + '" title="Pin to the top">' + (fav ? '♥' : '♡') + '</button>' +
      '<div class="play">▶</div>' +
      '<div class="meta"><h3>' + g.title + '</h3>' +
        (g.by ? '<div class="host">by ' + g.by + ' · ' + g.lic + '</div>' : '') +
        '<p>' + g.blurb + '</p>' +
        '<div class="tags"><span class="tag lead">' + g.cat + '</span>' +
          g.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') +
          (best ? '<span class="hs">★ ' + best + '</span>' : '') +
        '</div>' +
      '</div>';

    a.addEventListener('click', function (e) {
      if (e.target.closest('.fav')) {
        e.preventDefault();
        var now = ARC.store.toggleFav(g.id);
        e.target.classList.toggle('on', now);
        e.target.textContent = now ? '♥' : '♡';
        render();
        return;
      }
      ARC.store.touch(g.id);
    });
    return a;
  }

  function render() {
    var favs = ARC.store.favs();
    var list = GAMES.filter(function (g) {
      var okCat = filter === 'All' ? true
        : filter === '♥ Pinned' ? favs.indexOf(g.id) >= 0
        : filter === '★ Originals' ? g.origin === 'original'
        : g.cat === filter;
      var hay = (g.title + ' ' + g.blurb + ' ' + g.cat + ' ' + g.tags.join(' ') + ' ' + (g.by || '')).toLowerCase();
      return okCat && hay.indexOf(query) >= 0;
    });
    /* pinned first, then the real originals, then the rest */
    list.sort(function (a, b) {
      var f = (favs.indexOf(b.id) >= 0) - (favs.indexOf(a.id) >= 0);
      if (f) return f;
      return (b.origin === 'original') - (a.origin === 'original');
    });

    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>🫥</div>Nothing matches that. Try another word.</div>';
    } else {
      list.forEach(function (g, i) { grid.appendChild(card(g, i)); });
    }
    count.textContent = list.length + ' / ' + GAMES.length + ' games';

    var rec = ARC.store.recent()
      .map(function (id) { return GAMES.filter(function (g) { return g.id === id; })[0]; })
      .filter(Boolean).slice(0, 4);
    recentSec.style.display = rec.length ? '' : 'none';
    recentGrid.innerHTML = '';
    rec.forEach(function (g, i) { recentGrid.appendChild(card(g, i)); });
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
      all.recent = []; localStorage.setItem('neonArcade.v1', JSON.stringify(all));
    } catch (e) {}
    render();
  });
  document.getElementById('lucky').addEventListener('click', function () {
    var g = GAMES[Math.floor(Math.random() * GAMES.length)];
    ARC.store.touch(g.id);
    location.href = g.file;
  });

  render();
})();
