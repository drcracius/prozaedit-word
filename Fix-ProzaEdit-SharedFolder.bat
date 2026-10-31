@echo off
setlocal
title ProzaEdit - refresh manifest and Shared Folder catalog
cd /d "%~dp0"

echo.
echo ProzaEdit - re-download manifest and register local TrustedCatalog
echo (Shared Folder tab on Word desktop - validate on your PC, PE-2)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1" -RegisterLocalCatalog
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo Fix script failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

echo If SHARED FOLDER is still empty, use Word on the web Upload My Add-in instead.
echo LAN share examples (e.g. OTHP15) are documented in scripts\install\README.md only.
pause
exit /b 0
