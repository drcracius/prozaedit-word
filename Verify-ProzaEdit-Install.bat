@echo off
setlocal
title ProzaEdit - verify install (read-only PE-2 checks)
cd /d "%~dp0"

echo.
echo ProzaEdit - read-only install verification (no registry or file changes)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\Verify-ProzaEdit-Install.ps1"
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo One or more checks failed. See docs\pe-2-shared-folder-checklist.md
  pause
  exit /b %ERR%
)

echo All automated checks passed. Complete manual Word steps in the checklist.
pause
exit /b 0
