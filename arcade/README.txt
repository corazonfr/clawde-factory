==========================================================
  NEON ARCADE
  Two things in one folder, and they start differently.
==========================================================

  1. 23 games that run by DOUBLE-CLICK        -> open index.html
                                                 (works right now, offline)

  2. A full unblocked-games SITE (15 big      -> step one:  GET-GAMES-Windows.bat
     games: Slope, Run 3, Vex 3, Cubefield,      step two:  START-Windows.bat
     Idle Breakout, World's Hardest Game...)     (Mac/Linux: the .command files)


READ THIS FIRST: THE GAMES ARE FETCHED SEPARATELY
-------------------------------------------------
The site's pages are all in this folder, but the 15 games themselves are
about 210 MB of artwork and audio -- too big to attach in chat, which caps
at 30 MB. So they download in one step instead.

  Run GET-GAMES-Windows.bat (or GET-GAMES-Mac-Linux.command) ONCE while
  you have internet. It pulls the 15 games from the same public repos the
  site already points at, into site/g/. Takes a few minutes.

After that you never need a connection again. Re-running it is safe --
anything already downloaded is skipped.

The 23 double-click games in part 1 need none of this. They work the
second you unzip.

Both halves run with no internet once set up. They just start differently,
and the reason is worth thirty seconds of your time:


WHY THE SITE NEEDS A LAUNCHER
-----------------------------
Big HTML5 games don't keep their artwork inside the page. They fetch it
at runtime -- sprite sheets, level data, sound banks -- through the same
mechanism a web page uses to call a server.

Every browser blocks that when a page is opened as a file (a file:// URL).
It's a security rule, it can't be configured away, and it's why these
games show a black screen if you just double-click them. It is not a
problem with the download.

So the folder ships a launcher: a short Python script that serves this
folder to your own machine and opens it. It binds to 127.0.0.1, which
means only this computer can reach it. Nothing is uploaded, nothing is
downloaded, no account, no config.

  Windows ....... double-click START-Windows.bat
  Mac / Linux ... double-click START-Mac-Linux.command
                  (Mac may ask once: right-click > Open)

A black window appears and your browser opens the arcade. Leave the
window open while playing; close it when you're done.

No Python? Windows: python.org, tick "Add to PATH" during install.
Mac: run  xcode-select --install  in Terminal. Linux: your package
manager. Or just use the 23 double-click games, which need none of this.


WHAT'S IN THE FOLDER
--------------------
index.html ............ the arcade: all 23 double-click games
site/ ................. the unblocked-games site + its 15 games
  site/index.html ..... the site's own home page
  site/g/ ............. the game folders themselves
classics/ ............. 7 open-source originals (double-click works)
games/ ................ 16 games written for this pack
sites.html ............ directory of 52 online game sites (needs wifi)
serve.py .............. the launcher
START-*.bat/.command .. one-click wrappers around it
CREDITS.txt ........... who made what, and every change made


THE 15 IN THE SITE
------------------
Slope · Run 3 · Vex 3 · Cubefield · World's Hardest Game · Idle Breakout
Doodle Jump · Drift Boss · Eggy Car · Tiny Fishing · Basket Random
Hanger · Big Tower Tiny Square · Icy Purple Head 2 · Apple Shooter

All fifteen were tested with the network switched off completely. All
fifteen played. Three others were downloaded and dropped because they
did not.


THE 23 THAT NEED NOTHING
------------------------
classics/  Hextris · 2048 · T-Rex Runner · Tetris · Pseudo-3D Racer
           Pong · A Dark Room
games/     snake · tetra blocks · 2048 neon · brick blaster · flap dash
           minesweeper · pong duel · space invaders · memory match
           sky jumper · asteroids · tic tac toe · connect four
           reflex grid · dash runner · simon

Every one of these opens straight from the file. No launcher needed.


ABOUT THE SITE CONTENT
----------------------
site/ is a copy of a public "unblocked games" archive (ubg98) and the
game folders it points at, taken from the public repositories that host
them. Those games are commercial titles that the archive redistributes
without a licence from their makers -- that was true of the site before
this copy and is true of the copy. It is fine for you to play offline;
it is not something to republish or sell.

The material in classics/ is the opposite: properly open-source, with
each project's licence included. CREDITS.txt has the details.
