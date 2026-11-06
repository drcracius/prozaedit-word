@echo off
setlocal
title ProzaEdit - Word Desktop Shared Folder setup
cd /d "%~dp0"

echo.
echo ProzaEdit - set up the Word Desktop SHARED FOLDER catalog
echo ---------------------------------------------------------
echo Downloads manifest.hosted.xml from GitHub, then registers the catalog.
echo   https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml
echo Word needs a network share (\\THIS-PC\ProzaEditCatalog).
echo This creates it (one Windows admin prompt) and registers it.
echo CLOSE WORD COMPLETELY FIRST (check Task Manager for WINWORD.EXE).
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" -RegisterLocalCatalog -ClearOfficeCache
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Setup failed with exit code %ERR%. Read the message above.
  echo No admin rights? Run Sideload-ProzaEdit-Desktop.bat instead.
  pause
  exit /b %ERR%
)

echo Next: open Word, Home - Add-ins - Advanced - SHARED FOLDER tab - ProzaEdit - Add.
echo If SHARED FOLDER is still empty, run Verify-ProzaEdit-Install.bat and send me the output.
pause
exit /b 0
