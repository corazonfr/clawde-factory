#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then python3 get-games.py; else python get-games.py; fi
echo ""
echo "Press return to close."
read -r _
