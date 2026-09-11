/* ========= NEON ARCADE — hub logic ========= */
(function () {
  'use strict';
  var grid = document.getElementById('grid');
  var recentSec = document.getElementById('recentSec');
  var recentGrid = document.getElementById('recentGrid');
  var search = document.getElementById('search');
  var chips = document.querySelectorAll('.chip');
  var count = document.getElementById('count');
  var filter = 'All', query = '';

  document.getElementById('nGames').textContent = GAMES.length;

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
    a.className = 'card';
    a.href = g.file;
    a.style.animationDelay = (i * 34) + 'ms';
    a.innerHTML =
      '<div class="thumb"><div class="mesh" style="' + mesh(g) + '"></div>' +
        '<div class="emo">' + g.emoji + '</div><div class="shine"></div></div>' +
      '<button class="fav' + (fav ? ' on' : '') + '" title="Favourite">' + (fav ? '♥' : '♡') + '</button>' +
      '<div class="play">▶</div>' +
      '<div class="meta"><h3>' + g.title + '</h3><p>' + g.blurb + '</p>' +
        '<div class="tags"><span class="tag">' + g.cat + '</span>' +
        g.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') +
        (best ? '<span class="hs">★ ' + best + '</span>' : '') +
      '</div></div>';

    a.addEventListener('click', function (e) {
      if (e.target.closest('.fav')) {
        e.preventDefault();
        var now = ARC.store.toggleFav(g.id);
        e.target.classList.toggle('on', now);
        e.target.textContent = now ? '♥' : '♡';
        if (now) render();
        return;
      }
      ARC.store.touch(g.id);
    });
    return a;
  }

  function render() {
    var favs = ARC.store.favs();
    var list = GAMES.filter(function (g) {
      var okCat = filter === 'All' || (filter === '♥ Favourites' ? favs.indexOf(g.id) >= 0 : g.cat === filter);
      var hay = (g.title + ' ' + g.blurb + ' ' + g.cat + ' ' + g.tags.join(' ')).toLowerCase();
      return okCat && hay.indexOf(query) >= 0;
    });
    /* favourites float to the top */
    list.sort(function (a, b) { return (favs.indexOf(b.id) >= 0) - (favs.indexOf(a.id) >= 0); });

    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>🫥</div>Nothing matches that. Try another word.</div>';
    } else {
      list.forEach(function (g, i) { grid.appendChild(card(g, i)); });
    }
    count.textContent = list.length + ' / ' + GAMES.length + ' games';

    /* recently played rail */
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

  document.getElementById('clearRecent').addEventListener('click', function () {
    try { var all = JSON.parse(localStorage.getItem('neonArcade.v1') || '{}'); all.recent = []; localStorage.setItem('neonArcade.v1', JSON.stringify(all)); } catch (e) {}
    render();
  });

  /* "/" focuses search, Esc clears it */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { search.value = ''; query = ''; search.blur(); render(); }
  });

  /* surprise me */
  document.getElementById('lucky').addEventListener('click', function () {
    var g = GAMES[Math.floor(Math.random() * GAMES.length)];
    ARC.store.touch(g.id);
    location.href = g.file;
  });

  render();
})();
