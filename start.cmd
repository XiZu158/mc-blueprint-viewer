@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 20.19+ or 22.12+ first.
  pause
  exit /b 1
)
node scripts\serve.mjs --open
if errorlevel 1 pause
