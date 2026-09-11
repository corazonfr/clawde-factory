/* ========= NEON ARCADE — game catalog ========= */
window.GAMES = [
  { id:'snake',      file:'games/snake.html',      title:'Neon Snake',     emoji:'🐍', cat:'Arcade',   tags:['1P','Endless'],  blurb:'Eat, grow, don\'t bite yourself. Gets nasty fast.', c1:'#22e5c8', c2:'#0f7f8f' },
  { id:'tetra',      file:'games/tetra.html',      title:'Tetra Blocks',   emoji:'🧱', cat:'Puzzle',   tags:['1P','Levels'],   blurb:'Stack the falling pieces, clear the lines, chase the combo.', c1:'#7c5cff', c2:'#ff3ea5' },
  { id:'g2048',      file:'games/2048.html',       title:'2048',           emoji:'🔢', cat:'Puzzle',   tags:['1P','Chill'],    blurb:'Slide tiles, merge twins, hunt that golden 2048.', c1:'#ffb339', c2:'#ff6a3d' },
  { id:'breakout',   file:'games/breakout.html',   title:'Brick Blaster',  emoji:'🕹️', cat:'Arcade',   tags:['1P','Levels'],   blurb:'Paddle, ball, bricks, power-ups. A classic done loud.', c1:'#ff3ea5', c2:'#7c5cff' },
  { id:'flappy',     file:'games/flappy.html',     title:'Flap Dash',      emoji:'🐤', cat:'Arcade',   tags:['1P','Rage'],     blurb:'One button. Infinite pipes. Zero mercy.', c1:'#ffd23f', c2:'#f97316' },
  { id:'minesweeper',file:'games/minesweeper.html',title:'Minesweeper',    emoji:'💣', cat:'Puzzle',   tags:['1P','Brainy'],   blurb:'Flag the bombs, clear the board, don\'t guess wrong.', c1:'#64748b', c2:'#1e293b' },
  { id:'pong',       file:'games/pong.html',       title:'Pong Duel',      emoji:'🏓', cat:'Versus',   tags:['1P','2P'],       blurb:'The original. Solo vs the bot or couch-versus a friend.', c1:'#22e5c8', c2:'#7c5cff' },
  { id:'invaders',   file:'games/invaders.html',   title:'Space Invaders', emoji:'👾', cat:'Shooter',  tags:['1P','Waves'],    blurb:'Hold the line as the alien grid marches down.', c1:'#22c55e', c2:'#065f46' },
  { id:'memory',     file:'games/memory.html',     title:'Memory Match',   emoji:'🧠', cat:'Puzzle',   tags:['1P','Chill'],    blurb:'Flip, remember, pair them all before the clock laughs.', c1:'#a855f7', c2:'#ec4899' },
  { id:'jumper',     file:'games/jumper.html',     title:'Sky Jumper',     emoji:'☁️', cat:'Arcade',   tags:['1P','Endless'],  blurb:'Bounce up the endless platforms. Do not look down.', c1:'#38bdf8', c2:'#6366f1' },
  { id:'asteroids',  file:'games/asteroids.html',  title:'Asteroids',      emoji:'🚀', cat:'Shooter',  tags:['1P','Physics'],  blurb:'Drift, spin, shoot rocks into smaller angry rocks.', c1:'#94a3b8', c2:'#334155' },
  { id:'tictactoe',  file:'games/tictactoe.html',  title:'Tic Tac Toe',    emoji:'⭕', cat:'Versus',   tags:['1P','2P'],       blurb:'Three in a row vs an AI that literally cannot lose.', c1:'#f43f5e', c2:'#7c5cff' },
  { id:'connect4',   file:'games/connect4.html',   title:'Connect Four',   emoji:'🔴', cat:'Versus',   tags:['1P','2P'],       blurb:'Drop discs, build four, block the bot\'s plan.', c1:'#facc15', c2:'#ef4444' },
  { id:'reflex',     file:'games/reflex.html',     title:'Reflex Grid',    emoji:'⚡', cat:'Casual',   tags:['1P','Speed'],    blurb:'Smash the lit tiles. 30 seconds of pure twitch.', c1:'#fde047', c2:'#a855f7' },
  { id:'runner',     file:'games/runner.html',     title:'Dash Runner',    emoji:'🦖', cat:'Arcade',   tags:['1P','Endless'],  blurb:'Jump, duck, survive. Speed never stops climbing.', c1:'#fb923c', c2:'#7c2d12' },
  { id:'simon',      file:'games/simon.html',      title:'Simon Says',     emoji:'🎵', cat:'Casual',   tags:['1P','Memory'],   blurb:'Repeat the pattern. It grows until your brain quits.', c1:'#34d399', c2:'#0ea5e9' }
];
