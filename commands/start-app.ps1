# Starts the React app's Vite dev server.
# Run from anywhere: powershell -File commands\start-app.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $repoRoot "app"

if (-not (Test-Path (Join-Path $appDir "package.json"))) {
    Write-Error "Could not find app/package.json under $appDir"
    exit 1
}

Push-Location $appDir
try {
    if (-not (Test-Path (Join-Path $appDir "node_modules"))) {
        Write-Host "Installing dependencies..."
        npm install
    }

    npm run dev
}
finally {
    Pop-Location
}
