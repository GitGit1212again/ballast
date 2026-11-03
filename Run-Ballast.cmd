@echo off
REM Ballast: opens the app in your browser. Close the tab to quit; the server
REM shuts itself down automatically.
cd /d "%~dp0"
python server.py %*
REM 'python' not found (or only the Microsoft Store stub): try the py launcher.
if errorlevel 9009 py -3 server.py %*
if errorlevel 1 pause
