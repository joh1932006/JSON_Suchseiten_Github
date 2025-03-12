@echo off
REM 
cd /d %~dp0

REM 
echo Starte Backend...
cd backend
start cmd /k "node server.js"

REM
cd /d %~dp0

REM 
echo Starte Frontend...
cd frontend\database-query-frontend
start cmd /k "ng serve"

REM 
cd /d %~dp0

REM 
timeout /t 10

REM 
echo Öffne Website im Browser...
start http://localhost:4200/

pause
