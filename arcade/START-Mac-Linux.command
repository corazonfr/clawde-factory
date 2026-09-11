#!/bin/sh
# Neon Arcade launcher (macOS + Linux)
cd "$(dirname "$0")" || exit 1
echo ""
echo "  Starting Neon Arcade..."
echo ""
if command -v python3 >/dev/null 2>&1; then exec python3 serve.py; fi
if command -v python  >/dev/null 2>&1; then exec python  serve.py; fi
if command -v php     >/dev/null 2>&1; then
  echo "  Using PHP's built-in server on http://127.0.0.1:8099"
  exec php -S 127.0.0.1:8099
fi
echo "  Could not find Python on this machine."
echo ""
echo "  macOS: run  xcode-select --install   then try again."
echo "  Linux: install python3 with your package manager."
echo ""
echo "  You can still play the offline games right now:"
echo "  just open index.html in your browser."
echo ""
read -r _ 2>/dev/null
