@echo off
setlocal
title ProzaEdit - copy and check the Word manifest
cd /d "%~dp0"

echo.
echo ProzaEdit Word - download manifest.hosted.xml from GitHub and check it
echo =======================================================================
echo Source: https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml
echo (To load Word Desktop, use Fix-ProzaEdit-SharedFolder.bat or Sideload-ProzaEdit-Desktop.bat.)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" %*
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Install helper failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

echo Done. For Word web upload, run Download-Manifest-From-GitHub.bat or use the file in
echo %%USERPROFILE%%\ProzaEditCatalog\manifest.hosted.xml
echo See docs\DESKTOP-INSTALL.md for Word Desktop steps.
pause
exit /b 0
