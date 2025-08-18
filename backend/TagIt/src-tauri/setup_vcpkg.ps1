# VCPKG Setup Script for TagIt
# This script automates the installation of vcpkg and libraw

Write-Host "Setting up VCPKG for TagIt..." -ForegroundColor Green

# Check if vcpkg already exists
$vcpkgPath = "C:\vcpkg"
if (Test-Path $vcpkgPath) {
    Write-Host "VCPKG already exists at $vcpkgPath" -ForegroundColor Yellow
    Write-Host "Checking if libraw is installed..." -ForegroundColor Yellow
    
    # Check if libraw is installed
    $librawInstalled = & "$vcpkgPath\vcpkg.exe" list | Select-String "libraw"
    if ($librawInstalled) {
        Write-Host "LibRaw is already installed!" -ForegroundColor Green
        Write-Host "You can now build your Tauri app with: npm run tauri dev" -ForegroundColor Green
        exit 0
    }
} else {
    Write-Host "Cloning VCPKG to $vcpkgPath..." -ForegroundColor Blue
    
    # Clone vcpkg
    try {
        git clone https://github.com/Microsoft/vcpkg.git $vcpkgPath
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to clone vcpkg"
        }
    } catch {
        Write-Host "Error cloning vcpkg: $_" -ForegroundColor Red
        Write-Host "Please ensure Git is installed and accessible from PATH" -ForegroundColor Red
        exit 1
    }
}

# Bootstrap vcpkg
Write-Host "Bootstrapping VCPKG..." -ForegroundColor Blue
try {
    Set-Location $vcpkgPath
    & ".\bootstrap-vcpkg.bat"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to bootstrap vcpkg"
    }
} catch {
    Write-Host "Error bootstrapping vcpkg: $_" -ForegroundColor Red
    exit 1
}

# Install libraw
Write-Host "Installing LibRaw..." -ForegroundColor Blue
try {
    & ".\vcpkg.exe" install libraw:x64-windows
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install libraw"
    }
} catch {
    Write-Host "Error installing libraw: $_" -ForegroundColor Red
    exit 1
}

# Optional: Integrate with Visual Studio
Write-Host "Integrating VCPKG with Visual Studio..." -ForegroundColor Blue
try {
    & ".\vcpkg.exe" integrate install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Failed to integrate with Visual Studio (this is optional)" -ForegroundColor Yellow
    } else {
        Write-Host "Successfully integrated with Visual Studio!" -ForegroundColor Green
    }
} catch {
    Write-Host "Warning: Failed to integrate with Visual Studio (this is optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "VCPKG setup completed successfully!" -ForegroundColor Green
Write-Host "LibRaw is now installed and ready to use." -ForegroundColor Green
Write-Host ""
Write-Host "You can now build your Tauri app with:" -ForegroundColor Cyan
Write-Host "  npm run tauri dev" -ForegroundColor White
Write-Host "  or" -ForegroundColor White
Write-Host "  cargo build" -ForegroundColor White
Write-Host ""
Write-Host "Note: If you get linking errors, ensure the vcpkg path in Cargo.toml matches your installation." -ForegroundColor Yellow

# Return to original directory
Set-Location $PSScriptRoot
