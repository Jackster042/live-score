# Docker Stats Monitor for Live Score
# Shows real-time CPU, memory, and network usage for all containers

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

Write-Host "Docker Stats Monitor" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitoring containers:" -ForegroundColor Yellow
Write-Host "  - live-score-postgres (PostgreSQL)" -ForegroundColor White
Write-Host "  - live-score-redis (Redis)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Red
Write-Host ""

# Run docker stats with formatting
docker stats --format "table {{.Name}}	{{.CPUPerc}}	{{.MemUsage}}	{{.NetIO}}	{{.PIDs}}" live-score-postgres live-score-redis
