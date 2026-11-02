@echo off
setlocal
title ProzaEdit - copy and check the Word manifest
cd /d "%~dp0"

echo.
echo ProzaEdit Word - copy the hosted manifest and check it for Word Desktop
echo ======================================================================
echo (To actually load it into Word Desktop, use Fix-ProzaEdit-SharedFolder.bat
echo  or Sideload-ProzaEdit-Desktop.bat.)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" %*
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Install helper failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

echo Done. See docs\DESKTOP-INSTALL.md for the Word Desktop steps.
pause
exit /b 0
