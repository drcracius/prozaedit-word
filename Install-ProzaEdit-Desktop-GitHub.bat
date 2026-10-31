@echo off
setlocal
title ProzaEdit - GitHub hosted install helper
cd /d "%~dp0"

echo.
echo ProzaEdit Word - download hosted manifest from GitHub
echo =====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" %*
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Install helper failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

echo Done. See docs\WHEN-YOU-RETURN.md for Word upload steps.
pause
exit /b 0
