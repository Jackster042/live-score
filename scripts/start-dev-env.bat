@echo off
@echo Starting Live Score Development Environment...

REM Start Docker containers
docker-compose up -d postgres redis

REM Start Redis Monitor in new window
start "REDIS MONITOR" powershell -NoExit -Command "Write-Host '[REDIS MONITOR]' -ForegroundColor Red; docker exec -it live-score-redis redis-cli monitor"

timeout /t 1 /nobreak > nul

REM Start PostgreSQL logs in new window
start "POSTGRES LOGS" powershell -NoExit -Command "Write-Host '[POSTGRES LOGS]' -ForegroundColor Blue; docker logs -f live-score-postgres"

timeout /t 1 /nobreak > nul

REM Start API Server
start "API SERVER" powershell -NoExit -Command "Write-Host '[API SERVER]' -ForegroundColor Green; cd C:\Users\feema\OneDrive\Desktop\live-score; npm run dev:ts"

timeout /t 1 /nobreak > nul

REM Start Worker
start "WORKER" powershell -NoExit -Command "Write-Host '[WORKER]' -ForegroundColor Magenta; cd C:\Users\feema\OneDrive\Desktop\live-score; npm run worker"

timeout /t 1 /nobreak > nul

REM Start Test Terminal
start "TEST COMMANDS" powershell -NoExit -Command "Write-Host '[TEST COMMANDS]' -ForegroundColor Yellow; cd C:\Users\feema\OneDrive\Desktop\live-score; Write-Host 'Ready for testing!' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Try: curl http://localhost:8000/api/matches' -ForegroundColor White"

@echo.
@echo All services started!
@echo Check the opened windows for logs.
pause
