@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   ChurchFinder Egypt - Kenistak Akrab
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or newer first.
  pause
  exit /b 1
)
if not exist node_modules\react (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
echo Starting the development server...
call npm run dev
pause
