@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"

echo.
echo TalentVee Connector v1 - Clean Install or Update
echo =================================================
echo Installing to the permanent application folder...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%INSTALL-TALENTVEE.ps1"
set "RESULT=%ERRORLEVEL%"

echo.
if not "%RESULT%"=="0" goto :install_failed

echo Installation files are ready.
echo.
echo FIRST INSTALL:
echo 1. Click Load unpacked on chrome://extensions
echo 2. Select the folder opened in File Explorer
echo.
echo FUTURE UPDATE:
echo Run this installer again, then click Reload.
echo.
start "" chrome "chrome://extensions" 2>nul
pause
exit /b 0

:install_failed
echo Installation failed. Please send a screenshot of this window.
pause
exit /b %RESULT%
