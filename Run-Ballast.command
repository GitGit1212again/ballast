#!/bin/bash
# Ballast launcher for macOS (also fine on Linux).
#   Double-click this file in Finder, or run:  ./Run-Ballast.command
# First time only, make it executable (see README):  chmod +x Run-Ballast.command
# It starts the local server and opens your browser. Close the browser tab and the
# server quits by itself; closing this Terminal window stops it too.
cd "$(dirname "$0")" || exit 1

PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1 &&
     "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then
    PY="$c"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "Ballast needs Python 3.9 or newer, and none was found."
  echo "Install it from https://www.python.org/downloads/ (or: brew install python),"
  echo "then run this file again. Or just open dist/Ballast.html in your browser;"
  echo "that works with no Python at all."
  echo
  read -r -n 1 -s -p "Press any key to close."
  echo
  exit 1
fi

"$PY" server.py "$@"
status=$?
if [ "$status" -ne 0 ]; then
  echo
  echo "Ballast stopped with an error (exit code $status)."
  read -r -n 1 -s -p "Press any key to close."
  echo
fi
exit "$status"
