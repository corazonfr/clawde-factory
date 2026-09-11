@echo off
cd /d "%~dp0"
title Neon Arcade - downloading games
where py >nul 2>nul && (py -3 get-games.py & pause & goto :eof)
where python >nul 2>nul && (python get-games.py & pause & goto :eof)
echo Python not found. Install it from https://python.org ^(tick "Add to PATH"^).
pause
