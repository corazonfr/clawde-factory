/* =========================================================================
   NEON ARCADE — site directory
   Every URL below responded when this file was built (see README).
   Status dots in the UI are probed live from YOUR network, because what
   is reachable here says nothing about what is reachable there.
   ========================================================================= */
window.SITES = [

/* ---------- big community archives (the "unblocked games" ones) ---------- */
{ id:'3kh0', name:'3kh0', url:'https://3kh0.github.io', cat:'Archives', emoji:'🗃️',
  tags:['GitHub Pages','Huge'], c1:'#7c5cff', c2:'#ff3ea5',
  blurb:'The big one. Hundreds of games served straight off GitHub Pages, which is why it loads in places other sites don\'t.' },

{ id:'selenite', name:'Selenite', url:'https://selenite.cc', cat:'Archives', emoji:'💎',
  tags:['Open source','Huge'], c1:'#22e5c8', c2:'#5b8cff',
  blurb:'Games, emulators and apps in one clean library. Actively maintained with plenty of mirrors.' },

{ id:'kazwire', name:'Kazwire', url:'https://kazwire.com', cat:'Archives', emoji:'🎮',
  tags:['Huge','Fast'], c1:'#ff3ea5', c2:'#ffb339',
  blurb:'Large curated collection with a genuinely tidy interface and steady updates.' },

{ id:'ubg98', name:'UBG98', url:'https://ubg98.github.io', cat:'Archives', emoji:'🕹️',
  tags:['GitHub Pages'], c1:'#3ddc84', c2:'#0e7490',
  blurb:'Classic no-frills unblocked archive on GitHub Pages. Ugly, fast, dependable.' },

{ id:'ubg365', name:'UBG365', url:'https://ubg365.github.io', cat:'Archives', emoji:'📦',
  tags:['GitHub Pages','Backup'], c1:'#c77dff', c2:'#6d28d9',
  blurb:'Another GitHub Pages archive — the one to try when your usual pick stops resolving.' },

/* ---------- mainstream portals ---------- */
{ id:'poki', name:'Poki', url:'https://poki.com', cat:'Portals', emoji:'🎯',
  tags:['Huge','Mobile OK'], c1:'#facc15', c2:'#f97316',
  blurb:'Thousands of polished HTML5 games, no account, no download, works on a phone.' },

{ id:'crazygames', name:'CrazyGames', url:'https://www.crazygames.com', cat:'Portals', emoji:'🤪',
  tags:['Huge','3D'], c1:'#8b5cf6', c2:'#d946ef',
  blurb:'Massive catalogue and the best shelf of browser 3D and .io titles anywhere.' },

{ id:'coolmath', name:'Coolmath Games', url:'https://www.coolmathgames.com', cat:'Portals', emoji:'🧮',
  tags:['Classic','Puzzle'], c1:'#22c55e', c2:'#065f46',
  blurb:'The legend. Logic and puzzle games that survive filters because of the name on the tin.' },

{ id:'kongregate', name:'Kongregate', url:'https://www.kongregate.com', cat:'Portals', emoji:'👑',
  tags:['Classic','Deep'], c1:'#ef4444', c2:'#7f1d1d',
  blurb:'Old-school indie portal. Still the place for deep strategy, idle and RPG browser games.' },

{ id:'itch', name:'itch.io HTML5', url:'https://itch.io/games/html5/free', cat:'Portals', emoji:'🎨',
  tags:['Indie','Free'], c1:'#fa5c5c', c2:'#7c2d12',
  blurb:'Free browser games straight from indie developers. Weird, experimental, frequently brilliant.' },

{ id:'newgrounds', name:'Newgrounds', url:'https://www.newgrounds.com/games', cat:'Portals', emoji:'🦊',
  tags:['Classic'], c1:'#f97316', c2:'#78350f',
  blurb:'The original internet game dump. Still running, still completely unhinged.' },

{ id:'armorgames', name:'Armor Games', url:'https://armorgames.com', cat:'Portals', emoji:'🛡️',
  tags:['Classic','Strategy'], c1:'#64748b', c2:'#1e293b',
  blurb:'Flash-era greats rebuilt in HTML5. Unmatched tower-defence and upgrade-grind shelf.' },

{ id:'miniclip', name:'Miniclip', url:'https://www.miniclip.com', cat:'Portals', emoji:'🏀',
  tags:['Classic','Sports'], c1:'#0ea5e9', c2:'#1e3a8a',
  blurb:'Pool, sports and arcade staples from the golden age of the school computer lab.' },

{ id:'addicting', name:'Addicting Games', url:'https://www.addictinggames.com', cat:'Portals', emoji:'🔁',
  tags:['Arcade'], c1:'#f43f5e', c2:'#881337',
  blurb:'Big pile of quick-hit arcade, shooter and stickman games.' },

{ id:'y8', name:'Y8', url:'https://www.y8.com', cat:'Portals', emoji:'8️⃣',
  tags:['Huge','2P'], c1:'#eab308', c2:'#713f12',
  blurb:'Enormous back catalogue with an unusually good two-player section.' },

{ id:'silvergames', name:'Silver Games', url:'https://www.silvergames.com', cat:'Portals', emoji:'🥈',
  tags:['2P','Driving'], c1:'#94a3b8', c2:'#334155',
  blurb:'Clean layout, strong two-player and driving categories.' },

{ id:'gamesnacks', name:'GameSnacks', url:'https://gamesnacks.com', cat:'Portals', emoji:'🍿',
  tags:['Google','Ultra-light'], c1:'#4285f4', c2:'#0b3d91',
  blurb:'Google\'s own featherweight games, built for slow connections and tired laptops.' },

{ id:'friv', name:'Friv', url:'https://www.friv.com', cat:'Portals', emoji:'🟢',
  tags:['Classic','Light'], c1:'#84cc16', c2:'#3f6212',
  blurb:'The 4×4 grid of everyone\'s childhood. Still loads in about a second.' },

{ id:'gamesgames', name:'GamesGames', url:'https://www.gamesgames.com', cat:'Portals', emoji:'🎲',
  tags:['Casual'], c1:'#ec4899', c2:'#831843',
  blurb:'Broad casual library — puzzle, cooking, management, the comfort-food end of the shelf.' },

{ id:'html5games', name:'HTML5Games', url:'https://html5games.com', cat:'Portals', emoji:'5️⃣',
  tags:['Light'], c1:'#e34f26', c2:'#7c2d12',
  blurb:'HTML5-only catalogue with no Flash baggage. Runs well on weak hardware.' },

{ id:'scratch', name:'Scratch', url:'https://scratch.mit.edu', cat:'Portals', emoji:'🐱',
  tags:['MIT','Rarely blocked'], c1:'#ffab19', c2:'#9b4dca',
  blurb:'MIT\'s project site. Millions of user-made games and it is almost never filtered, since it is an education domain.' },

/* ---------- retro + emulators ---------- */
{ id:'dos', name:'Archive.org MS-DOS', url:'https://archive.org/details/softwarelibrary_msdos_games', cat:'Retro', emoji:'💾',
  tags:['Free','Legal','Huge'], c1:'#a3a3a3', c2:'#262626',
  blurb:'Thousands of real DOS games running in a browser tab, legally, preserved forever.' },

{ id:'console', name:'Console Living Room', url:'https://archive.org/details/consolelivingroom', cat:'Retro', emoji:'📺',
  tags:['Free','Legal'], c1:'#d97706', c2:'#451a03',
  blurb:'Atari 2600, Colecovision, Odyssey and friends — emulated in the page, no setup.' },

{ id:'jsdos', name:'js-dos', url:'https://js-dos.com', cat:'Retro', emoji:'🖥️',
  tags:['Open source'], c1:'#22c55e', c2:'#052e16',
  blurb:'The DOS emulator that quietly powers half the retro web, with a playable showcase.' },

{ id:'emulatorjs', name:'EmulatorJS', url:'https://demo.emulatorjs.org', cat:'Retro', emoji:'🎰',
  tags:['Open source','Multi-system'], c1:'#8b5cf6', c2:'#2e1065',
  blurb:'Open-source emulator covering a dozen consoles, running entirely client-side.' },

{ id:'retrogames', name:'RetroGames.cc', url:'https://retrogames.cc', cat:'Retro', emoji:'🎞️',
  tags:['NES','SNES','Arcade'], c1:'#f43f5e', c2:'#4c0519',
  blurb:'NES, SNES, GBA, Genesis and arcade classics playable instantly, no account.' },

{ id:'playclassic', name:'Play Classic Games', url:'https://playclassic.games', cat:'Retro', emoji:'🏛️',
  tags:['DOS','Curated'], c1:'#0ea5e9', c2:'#082f49',
  blurb:'Hand-picked classic PC games with a nicer front end than the raw archives.' },

{ id:'mcclassic', name:'Minecraft Classic', url:'https://classic.minecraft.net', cat:'Retro', emoji:'⛏️',
  tags:['Official','Free'], c1:'#5b8c3a', c2:'#2d4a1c',
  blurb:'Mojang\'s own free 2009 build. Creative mode in the browser, no login, no download.' },

/* ---------- multiplayer ---------- */
{ id:'slither', name:'Slither.io', url:'https://slither.io', cat:'Multiplayer', emoji:'🐍',
  tags:['.io','Casual'], c1:'#22e5c8', c2:'#0f766e',
  blurb:'Massive-multiplayer snake. Still the purest version of the format.' },

{ id:'krunker', name:'Krunker', url:'https://krunker.io', cat:'Multiplayer', emoji:'🔫',
  tags:['.io','FPS'], c1:'#f59e0b', c2:'#78350f',
  blurb:'Blocky browser FPS that runs at a silly framerate on basically any machine.' },

{ id:'shellshock', name:'Shell Shockers', url:'https://shellshock.io', cat:'Multiplayer', emoji:'🥚',
  tags:['.io','FPS'], c1:'#fbbf24', c2:'#92400e',
  blurb:'Egg-based first-person shooter. Sounds stupid, plays great, no install.' },

{ id:'agar', name:'Agar.io', url:'https://agar.io', cat:'Multiplayer', emoji:'🦠',
  tags:['.io','Classic'], c1:'#38bdf8', c2:'#0c4a6e',
  blurb:'The cell-eating original that started the entire .io genre.' },

{ id:'diep', name:'Diep.io', url:'https://diep.io', cat:'Multiplayer', emoji:'🛞',
  tags:['.io','Shooter'], c1:'#60a5fa', c2:'#1e3a8a',
  blurb:'Tank shooter with a genuinely deep upgrade tree hiding under the simple look.' },

{ id:'skribbl', name:'Skribbl.io', url:'https://skribbl.io', cat:'Multiplayer', emoji:'✏️',
  tags:['.io','Party'], c1:'#34d399', c2:'#065f46',
  blurb:'Draw-and-guess with private rooms. The best "get the group in one link" option.' },

{ id:'gartic', name:'Gartic Phone', url:'https://garticphone.com', cat:'Multiplayer', emoji:'☎️',
  tags:['Party'], c1:'#f472b6', c2:'#9d174d',
  blurb:'Telephone, but with drawings. Ruins friendships in the best way.' },

{ id:'vampire', name:'Vampire Survivors', url:'https://vampire-survivors.io', cat:'Multiplayer', emoji:'🧛',
  tags:['Free','Roguelike'], c1:'#a855f7', c2:'#3b0764',
  blurb:'The actual bullet-heaven roguelike, free in the browser. Devours entire afternoons.' },

/* ---------- single classics ---------- */
{ id:'2048', name:'2048', url:'https://play2048.co', cat:'Classics', emoji:'🔢',
  tags:['Open source','Puzzle'], c1:'#ffb339', c2:'#b45309',
  blurb:'The original by Gabriele Cirulli — the one every clone is copying.' },

{ id:'jstris', name:'Jstris', url:'https://jstris.jezevec10.com', cat:'Classics', emoji:'🧱',
  tags:['Open source','Competitive'], c1:'#06b6d4', c2:'#164e63',
  blurb:'Competitive Tetris with live multiplayer and frame-perfect controls.' },

{ id:'lichess', name:'Lichess', url:'https://lichess.org', cat:'Classics', emoji:'♟️',
  tags:['Open source','Free forever'], c1:'#e5e7eb', c2:'#374151',
  blurb:'Free, ad-free, open-source chess with no account needed and no paywall, ever.' },

{ id:'chesscom', name:'Chess.com', url:'https://www.chess.com', cat:'Classics', emoji:'♞',
  tags:['Huge'], c1:'#81b64c', c2:'#3d5a26',
  blurb:'The biggest chess site. Puzzles, bots and a game against a human in seconds.' },

{ id:'sudoku', name:'Sudoku.com', url:'https://sudoku.com', cat:'Classics', emoji:'🔟',
  tags:['Puzzle','Daily'], c1:'#3b82f6', c2:'#1e3a8a',
  blurb:'Clean sudoku with daily puzzles and five difficulty tiers.' },

{ id:'solitr', name:'Solitr', url:'https://www.solitr.com', cat:'Classics', emoji:'🃏',
  tags:['Cards','Light'], c1:'#16a34a', c2:'#14532d',
  blurb:'Klondike and Spider solitaire, zero clutter, loads instantly.' },

{ id:'neal', name:'neal.fun', url:'https://neal.fun', cat:'Classics', emoji:'✨',
  tags:['Toys','Original'], c1:'#f472b6', c2:'#7c3aed',
  blurb:'Tiny, beautiful interactive toys. Infinite Craft and Deep Sea live here.' },

{ id:'alchemy', name:'Little Alchemy 2', url:'https://littlealchemy2.com', cat:'Classics', emoji:'⚗️',
  tags:['Puzzle','Chill'], c1:'#06b6d4', c2:'#0e7490',
  blurb:'Combine elements to discover 700+ others. Pure quiet dopamine.' },

{ id:'sandspiel', name:'Sandspiel', url:'https://sandspiel.club', cat:'Classics', emoji:'🏖️',
  tags:['Open source','Sandbox'], c1:'#fcd34d', c2:'#92400e',
  blurb:'Falling-sand physics sandbox. Not a game so much as a very good time-sink.' },

{ id:'darkroom', name:'A Dark Room', url:'https://adarkroom.doublespeakgames.com', cat:'Classics', emoji:'🕯️',
  tags:['Open source','Story'], c1:'#6b7280', c2:'#111827',
  blurb:'Starts as one button in an empty room. Becomes something else entirely.' },

{ id:'cookie', name:'Cookie Clicker', url:'https://orteil.dashnet.org/cookieclicker/', cat:'Classics', emoji:'🍪',
  tags:['Idle','Original'], c1:'#d97706', c2:'#78350f',
  blurb:'The idle game that invented idle games. Leave it open, check back in a week.' },

{ id:'openguessr', name:'OpenGuessr', url:'https://openguessr.com', cat:'Classics', emoji:'🌍',
  tags:['Free','Geo'], c1:'#10b981', c2:'#064e3b',
  blurb:'GeoGuessr without the paywall — dropped somewhere on Street View, guess where.' },

{ id:'worldle', name:'Worldle', url:'https://worldle.teuteuf.fr', cat:'Classics', emoji:'🗺️',
  tags:['Daily','Quick'], c1:'#22c55e', c2:'#14532d',
  blurb:'Wordle for country shapes. One puzzle a day, thirty seconds a go.' },

{ id:'nonograms', name:'Nonograms', url:'https://www.puzzle-nonograms.com', cat:'Classics', emoji:'▩',
  tags:['Puzzle','Logic'], c1:'#818cf8', c2:'#312e81',
  blurb:'Picross-style logic grids in every size from tiny to genuinely evil.' },

{ id:'pacman', name:'Pac-Man', url:'https://www.pacman.cc', cat:'Classics', emoji:'👻',
  tags:['Arcade','Free'], c1:'#fde047', c2:'#a16207',
  blurb:'Faithful browser Pac-Man with the original ghost behaviour intact.' },

{ id:'invaders', name:'Free Invaders', url:'https://freeinvaders.org', cat:'Classics', emoji:'👾',
  tags:['Arcade','Free'], c1:'#4ade80', c2:'#14532d',
  blurb:'Space Invaders, faithfully rebuilt, free and instant.' }
];
