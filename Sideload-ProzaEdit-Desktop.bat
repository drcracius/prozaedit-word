@echo off
setlocal
title ProzaEdit - Word Desktop developer sideload (no admin)
cd /d "%~dp0"

echo.
echo ProzaEdit - load into Word Desktop without a network share or admin rights
echo -------------------------------------------------------------------------
echo Uses the same registry entry Microsoft's own add-in dev tools use.
echo CLOSE WORD COMPLETELY FIRST (check Task Manager for WINWORD.EXE).
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" -DeveloperSideload -ClearOfficeCache
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Setup failed with exit code %ERR%. Read the message above.
  pause
  exit /b %ERR%
)

echo Next: open Word with a blank document, then Home tab - ProzaEdit.
echo To undo later: double-click Uninstall-ProzaEdit.bat in this folder.
pause
exit /b 0
