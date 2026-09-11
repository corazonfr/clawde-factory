@echo off
setlocal
cd /d "%~dp0"
title Neon Arcade
echo.
echo   Starting Neon Arcade...
echo.
where py >nul 2>nul && (py -3 serve.py & goto :eof)
where python >nul 2>nul && (python serve.py & goto :eof)
where node >nul 2>nul && (npx --yes http-server -p 8099 -o & goto :eof)
echo   Could not find Python on this PC.
echo.
echo   Install it from https://python.org (tick "Add to PATH"^),
echo   then double-click this file again.
echo.
echo   You can still play the offline games right now:
echo   just open index.html in your browser.
echo.
pause
