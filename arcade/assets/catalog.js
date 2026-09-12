/* =========================================================================
   NEON ARCADE — catalogue
   Every entry is a FILE inside this folder. Nothing here needs a network.
   "origin: original" = real open-source project, bundled with its licence.
   "origin: pack"     = written for this pack.
   ========================================================================= */
window.GAMES = [

/* ---------------- bundled open-source originals ---------------- */
{ id:'c_whg', file:'classics/worldshardest/index.html', title:"World's Hardest Game", emoji:'🟥', cat:'Puzzle',
  origin:'original', by:'Snubby Land', lic:'redistributed archive copy', tags:['Original','Rage','Real unblocked game'],
  blurb:'The genuine article from the unblocked-games archives — and the only one of 40 tested that runs from a plain file. No server needed.',
  c1:'#a5a5f5', c2:'#1a1a4a' },

{ id:'c_hextris', file:'classics/hextris/index.html', title:'Hextris', emoji:'🔷', cat:'Puzzle',
  origin:'original', by:'Garrett Finucane & contributors', lic:'GPL-3.0', tags:['Original','Addictive'],
  blurb:'Tetris on a spinning hexagon. Its own website is dead now — this copy still plays perfectly.',
  c1:'#2c3e50', c2:'#e74c3c' },

{ id:'c_2048', file:'classics/2048/index.html', title:'2048', emoji:'🔢', cat:'Puzzle',
  origin:'original', by:'Gabriele Cirulli', lic:'MIT', tags:['Original','Chill'],
  blurb:'The actual original 2048, not a clone. Slide, merge, chase the golden tile.',
  c1:'#edc22e', c2:'#bbada0' },

{ id:'c_dino', file:'classics/dino/index.html', title:'T-Rex Runner', emoji:'🦖', cat:'Arcade',
  origin:'original', by:'Chrome team · packaged by wayou', lic:'BSD-3-Clause', tags:['Original','Endless'],
  blurb:"Chrome's offline dinosaur, extracted and playable whenever you want — not just when the wifi dies.",
  c1:'#535353', c2:'#f7f7f7' },

{ id:'c_tetris', file:'classics/tetris/index.html', title:'Tetris', emoji:'🧱', cat:'Puzzle',
  origin:'original', by:'Jake Gordon', lic:'MIT', tags:['Original','Classic'],
  blurb:'A faithful, buttery-smooth canvas Tetris from one of the best-written game repos on GitHub.',
  c1:'#7c5cff', c2:'#ff3ea5' },

{ id:'c_racer', file:'classics/racer/v4.final.html', title:'Pseudo-3D Racer', emoji:'🏎️', cat:'Arcade',
  origin:'original', by:'Jake Gordon', lic:'MIT', tags:['Original','OutRun'],
  blurb:'A full OutRun-style racer — hills, curves, traffic, billboards — running at 60fps on a 2D canvas.',
  c1:'#e74c3c', c2:'#27ae60' },

{ id:'c_pong', file:'classics/pong/index.html', title:'Pong', emoji:'🏓', cat:'Versus',
  origin:'original', by:'Jake Gordon', lic:'MIT', tags:['Original','2P'],
  blurb:'The 1972 original, rebuilt properly, with a CPU that actually plays well.',
  c1:'#ffffff', c2:'#444444' },

{ id:'c_darkroom', file:'classics/adarkroom/index.html', title:'A Dark Room', emoji:'🕯️', cat:'Story',
  origin:'original', by:'Doublespeak Games', lic:'MPL-2.0', tags:['Original','Long'],
  blurb:'Starts as one button in an empty room. Becomes something else entirely. Give it twenty minutes.',
  c1:'#8e93b5', c2:'#111827' },

/* ---------------- written for this pack ---------------- */
{ id:'snake',      file:'games/snake.html',      title:'Neon Snake',     emoji:'🐍', cat:'Arcade',  origin:'pack', tags:['1P','Endless'],  blurb:'Eat, grow, don\'t bite yourself. Gets nasty fast.', c1:'#22e5c8', c2:'#0f7f8f' },
{ id:'tetra',      file:'games/tetra.html',      title:'Tetra Blocks',   emoji:'🟪', cat:'Puzzle',  origin:'pack', tags:['1P','Levels'],   blurb:'Falling blocks with hold, ghost piece and a hard drop.', c1:'#7c5cff', c2:'#ff3ea5' },
{ id:'g2048',      file:'games/2048.html',       title:'2048 Neon',      emoji:'🔠', cat:'Puzzle',  origin:'pack', tags:['1P','Undo'],     blurb:'A restyled 2048 with an undo button, for when you misclick.', c1:'#ffb339', c2:'#ff6a3d' },
{ id:'breakout',   file:'games/breakout.html',   title:'Brick Blaster',  emoji:'🕹️', cat:'Arcade',  origin:'pack', tags:['1P','Power-ups'],blurb:'Paddle, ball, bricks and falling power-ups. A classic done loud.', c1:'#ff3ea5', c2:'#7c5cff' },
{ id:'flappy',     file:'games/flappy.html',     title:'Flap Dash',      emoji:'🐤', cat:'Arcade',  origin:'pack', tags:['1P','Rage'],     blurb:'One button. Infinite pipes. Zero mercy.', c1:'#ffd23f', c2:'#f97316' },
{ id:'minesweeper',file:'games/minesweeper.html',title:'Minesweeper',    emoji:'💣', cat:'Puzzle',  origin:'pack', tags:['1P','3 sizes'],  blurb:'Flag the bombs, clear the board, first click is always safe.', c1:'#64748b', c2:'#1e293b' },
{ id:'pong',       file:'games/pong.html',       title:'Pong Duel',      emoji:'🏓', cat:'Versus',  origin:'pack', tags:['1P','2P'],       blurb:'Neon Pong with three CPU difficulties or couch two-player.', c1:'#22e5c8', c2:'#7c5cff' },
{ id:'invaders',   file:'games/invaders.html',   title:'Space Invaders', emoji:'👾', cat:'Shooter', origin:'pack', tags:['1P','Waves'],    blurb:'Hold the line as the alien grid marches down. Bunkers crumble.', c1:'#22c55e', c2:'#065f46' },
{ id:'memory',     file:'games/memory.html',     title:'Memory Match',   emoji:'🧠', cat:'Puzzle',  origin:'pack', tags:['1P','3 sizes'],  blurb:'Flip, remember, pair them all before the clock laughs.', c1:'#a855f7', c2:'#ec4899' },
{ id:'jumper',     file:'games/jumper.html',     title:'Sky Jumper',     emoji:'☁️', cat:'Arcade',  origin:'pack', tags:['1P','Endless'],  blurb:'Bounce up the endless platforms. Do not look down.', c1:'#38bdf8', c2:'#6366f1' },
{ id:'asteroids',  file:'games/asteroids.html',  title:'Asteroids',      emoji:'🚀', cat:'Shooter', origin:'pack', tags:['1P','Physics'],  blurb:'Drift, spin, shoot rocks into smaller angry rocks.', c1:'#94a3b8', c2:'#334155' },
{ id:'tictactoe',  file:'games/tictactoe.html',  title:'Tic Tac Toe',    emoji:'⭕', cat:'Versus',  origin:'pack', tags:['1P','2P'],       blurb:'Three in a row vs a minimax AI that literally cannot lose.', c1:'#f43f5e', c2:'#7c5cff' },
{ id:'connect4',   file:'games/connect4.html',   title:'Connect Four',   emoji:'🔴', cat:'Versus',  origin:'pack', tags:['1P','2P'],       blurb:'Drop discs, build four, block the bot\'s plan.', c1:'#facc15', c2:'#ef4444' },
{ id:'reflex',     file:'games/reflex.html',     title:'Reflex Grid',    emoji:'⚡', cat:'Casual',  origin:'pack', tags:['1P','Speed'],    blurb:'Smash the lit tiles. 30 seconds of pure twitch.', c1:'#fde047', c2:'#a855f7' },
{ id:'runner',     file:'games/runner.html',     title:'Dash Runner',    emoji:'🏃', cat:'Arcade',  origin:'pack', tags:['1P','Endless'],  blurb:'Jump, duck, survive. Speed never stops climbing.', c1:'#fb923c', c2:'#7c2d12' },
{ id:'simon',      file:'games/simon.html',      title:'Simon Says',     emoji:'🎵', cat:'Casual',  origin:'pack', tags:['1P','Memory'],   blurb:'Repeat the pattern. It grows until your brain quits.', c1:'#34d399', c2:'#0ea5e9' }
];
