@echo off
cd /d "%~dp0"
echo ========================================
echo    GytFoot - Paris Sportifs Football
echo ========================================
echo.
echo Demarrage du backend (port 3001)...
start "GytFoot Backend" cmd /c "cd backend && node node_modules\tsx\dist\cli.mjs watch src/index.ts"
timeout /t 5 /nobreak >nul
echo.
echo Demarrage du frontend (port 5173)...
start "GytFoot Frontend" cmd /c "cd frontend && node node_modules\vite\bin\vite.js"
timeout /t 3 /nobreak >nul
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause
