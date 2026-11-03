@echo off
REM Adds a "Ballast" shortcut to your Desktop. Run once.
setlocal
set "APP=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w=New-Object -ComObject WScript.Shell;" ^
  "$s=$w.CreateShortcut([IO.Path]::Combine($w.SpecialFolders('Desktop'),'Ballast.lnk'));" ^
  "$s.TargetPath=Join-Path '%APP%' 'Run-Ballast.cmd';" ^
  "$s.WorkingDirectory='%APP%';" ^
  "$s.IconLocation=Join-Path '%APP%' 'src\assets\ballast.ico';" ^
  "$s.Description='Ballast - DBT skills companion';" ^
  "$s.Save()"
echo Done. A "Ballast" icon is now on your Desktop.
pause
endlocal
