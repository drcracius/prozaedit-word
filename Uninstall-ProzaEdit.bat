@echo off
setlocal
title ProzaEdit - remove Word Desktop install
cd /d "%~dp0"

echo.
echo ProzaEdit - remove the Word Desktop catalog / developer sideload
echo -----------------------------------------------------------------
echo This does NOT remove ProzaEdit from Word on the web.
echo For the web: Insert - Add-ins - My Add-ins - ... on ProzaEdit - Remove.
echo.
echo CLOSE WORD COMPLETELY FIRST (check Task Manager for WINWORD.EXE).
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" -Uninstall
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Uninstall failed with exit code %ERR%. Read the message above.
  pause
  exit /b %ERR%
)

echo Desktop registration removed. Files in %%USERPROFILE%%\ProzaEditCatalog were left in place.
pause
exit /b 0
