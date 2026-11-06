@echo off
setlocal
title ProzaEdit - download manifest.hosted.xml from GitHub
cd /d "%~dp0"

set "MANIFEST_URL=https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml"
set "CATALOG=%USERPROFILE%\ProzaEditCatalog"
set "DOWNLOADS=%USERPROFILE%\Downloads\manifest.hosted.xml"

echo.
echo ProzaEdit - get the add-in file from GitHub (the one Word should use)
echo ====================================================================
echo Authoritative copy on GitHub:
echo   %MANIFEST_URL%
echo.
echo This downloads that file, checks it, and saves copies you can upload.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Install-ProzaEdit-GitHub.ps1"
set ERR=%ERRORLEVEL%

if %ERR% NEQ 0 (
  echo.
  echo Download failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

if not exist "%CATALOG%\manifest.hosted.xml" (
  echo ERROR: Expected file missing: %CATALOG%\manifest.hosted.xml
  pause
  exit /b 1
)

copy /Y "%CATALOG%\manifest.hosted.xml" "%DOWNLOADS%" >nul
echo.
echo Saved:
echo   %CATALOG%\manifest.hosted.xml
echo   %DOWNLOADS%
echo.
echo Word on the web: Insert - Add-ins - My Add-ins - Upload My Add-in
echo Pick either file above (same bytes as GitHub).
echo Remove any old ProzaEdit from My Add-ins first if upload fails.
echo.
pause
exit /b 0
