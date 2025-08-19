# Setup Script for TagIt Automatic Tagging System
# This script helps install required dependencies on Windows

Write-Host "🚀 Setting up TagIt Automatic Tagging System..." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  This script requires administrator privileges to install dependencies." -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Chocolatey is installed
Write-Host "📦 Checking for Chocolatey package manager..." -ForegroundColor Blue
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
}

# Install Visual Studio Build Tools (required for OpenCV)
Write-Host "🔧 Installing Visual Studio Build Tools..." -ForegroundColor Blue
choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" -y

# Install VCPKG
Write-Host "📚 Installing VCPKG..." -ForegroundColor Blue
if (-not (Test-Path "C:\vcpkg")) {
    git clone https://github.com/Microsoft/vcpkg.git C:\vcpkg
    C:\vcpkg\bootstrap-vcpkg.bat
    C:\vcpkg\vcpkg integrate install
} else {
    Write-Host "✅ VCPKG is already installed" -ForegroundColor Green
}

# Install OpenCV
Write-Host "👁️  Installing OpenCV..." -ForegroundColor Blue
C:\vcpkg\vcpkg install opencv4[contrib]:x64-windows

# Install Tesseract
Write-Host "🔤 Installing Tesseract OCR..." -ForegroundColor Blue
choco install tesseract -y

# Install Rust (if not already installed)
Write-Host "🦀 Checking for Rust..." -ForegroundColor Blue
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Rust..." -ForegroundColor Yellow
    choco install rust -y
} else {
    Write-Host "✅ Rust is already installed" -ForegroundColor Green
}

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Blue
$envVars = @{
    "OPENCV_DIR" = "C:\vcpkg\installed\x64-windows"
    "TESSERACT_DIR" = "C:\ProgramData\chocolatey\lib\tesseract\tools"
}

foreach ($var in $envVars.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($var.Key, $var.Value, "Machine")
    Write-Host "   Set $($var.Key) = $($var.Value)" -ForegroundColor Gray
}

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "The following components have been installed:" -ForegroundColor White
Write-Host "✅ Chocolatey package manager" -ForegroundColor Green
Write-Host "✅ Visual Studio Build Tools" -ForegroundColor Green
Write-Host "✅ VCPKG package manager" -ForegroundColor Green
Write-Host "✅ OpenCV 4 (with contrib modules)" -ForegroundColor Green
Write-Host "✅ Tesseract OCR" -ForegroundColor Green
Write-Host "✅ Rust programming language" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Restart your terminal/PowerShell to ensure environment variables are loaded" -ForegroundColor Yellow
Write-Host "2. Navigate to your TagIt project directory" -ForegroundColor Yellow
Write-Host "3. Run: npm run tauri dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: You may need to restart your computer for all changes to take effect." -ForegroundColor Cyan

Read-Host "Press Enter to exit"
