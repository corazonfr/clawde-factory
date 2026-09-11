====================================================
  NEON ARCADE  ·  16 games, one folder, zero internet
====================================================

HOW TO PLAY
-----------
1. Unzip this folder anywhere you like (Desktop, USB stick, wherever).
2. Double-click  index.html
3. That's it. It opens in your browser and everything works.

No installing, no server, no wifi, no accounts. Every game is a plain
HTML file you can open directly — you can even double-click any file
inside /games and play just that one.


WHAT'S INSIDE
-------------
index.html ............ the arcade hub (search, filters, favourites)
assets/ ............... shared stylesheet + tiny shared runtime
games/ ................ one self-contained HTML file per game

  snake.html .......... Neon Snake      grow without biting yourself
  tetra.html .......... Tetra Blocks    falling blocks, hold + ghost piece
  2048.html ........... 2048            slide and merge to 2048
  breakout.html ....... Brick Blaster   paddle, bricks, power-ups
  flappy.html ......... Flap Dash       one button, infinite pipes
  minesweeper.html .... Minesweeper     3 board sizes, first click is safe
  pong.html ........... Pong Duel       1P vs CPU or 2P on one keyboard
  invaders.html ....... Space Invaders  waves, bunkers, bonus saucer
  memory.html ......... Memory Match    3 board sizes, fewest moves wins
  jumper.html ......... Sky Jumper      endless upward platform hopping
  asteroids.html ...... Asteroids       drift physics + hyperspace
  tictactoe.html ...... Tic Tac Toe     unbeatable minimax CPU, or 2P
  connect4.html ....... Connect Four    alpha-beta CPU, 3 difficulties
  reflex.html ......... Reflex Grid     30-second combo chase
  runner.html ......... Dash Runner     jump/duck endless runner
  simon.html .......... Simon Says      growing pattern memory


CONTROLS
--------
Every game lists its own controls under the play area. In general:
  arrows / WASD ... move          Space ... action, jump, fire, drop
  P ............... pause         Enter ... restart after a game over
On phones and tablets, on-screen buttons and swipes appear automatically.


SCORES
------
High scores and favourites are saved in your browser's local storage.
They stay on this machine, are never uploaded anywhere, and only apply
to the browser you played in. Clearing site data resets them.

Tip: if you open the pages from a file:// path, some browsers share one
storage bucket across all local files — that is normal and harmless.


TROUBLESHOOTING
---------------
Nothing loads / no styling
  Keep the folder structure intact. index.html needs assets/ and games/
  sitting next to it. Unzip the whole thing rather than dragging out a
  single file.

No sound
  Browsers block audio until you interact with the page. Click once and
  the blips will start.

Safari and local files
  Safari is strict about file:// storage. Games still play fine, but high
  scores may not persist. Chrome, Edge and Firefox save them fine.
