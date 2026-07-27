# Windows PowerShell Script to deploy updates to the remote server safely.

$ServerIP = "144.126.201.180"
Write-Host "=== GMIS School CRM Deployer ===" -ForegroundColor Green
Write-Host "This script will copy the updated frontend (dist/) and backend files to the server." -ForegroundColor White
Write-Host "It EXCLUDES config.json, .env, and database.sqlite to avoid overwriting your live settings and database." -ForegroundColor Yellow
Write-Host ""

$RemotePath = Read-Host "Enter the project directory path on the remote server (e.g., /root/school-crm or /root/gmis-crm)"

if (-not $RemotePath) {
    Write-Host "Remote path is required. Deployment cancelled." -ForegroundColor Red
    exit
}

# Create temp directory
$TempDir = "deploy_temp"
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Path $TempDir | Out-Null
New-Item -ItemType Directory -Path "$TempDir/server" | Out-Null

Write-Host "Preparing files to deploy..." -ForegroundColor Cyan

# 1. Copy dist (React built frontend)
if (Test-Path "dist") {
    Copy-Item -Recurse "dist" "$TempDir/dist"
} else {
    Write-Host "Error: dist/ folder not found. Please run 'npm run build' first." -ForegroundColor Red
    Remove-Item -Recurse -Force $TempDir
    exit
}

# 2. Copy server scripts (EXCLUDING database.sqlite, node_modules, config.json, .env)
$ServerFiles = Get-ChildItem "server" -File | Where-Object { 
    $_.Name -notin @("database.sqlite", "config.json", ".env", "package-lock.json") 
}
foreach ($file in $ServerFiles) {
    Copy-Item $file.FullName "$TempDir/server/"
}

# 3. Copy root config files
$RootFiles = @("package.json", "docker-compose.yml", "Dockerfile")
foreach ($file in $RootFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$TempDir/"
    }
}

Write-Host "Uploading files to server root@${ServerIP}:${RemotePath} ..." -ForegroundColor Yellow
Write-Host "You will be prompted to enter the server root password." -ForegroundColor Yellow

# Execute SCP
scp -o StrictHostKeyChecking=no -r "$TempDir/dist" "$TempDir/server" "root@${ServerIP}:${RemotePath}/"

# Clean up
Remove-Item -Recurse -Force $TempDir

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Files uploaded successfully!" -ForegroundColor Green
Write-Host "Now log into the server and restart your service (e.g. pm2 restart all or docker-compose restart)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
