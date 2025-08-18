# VCPKG Setup for TagIt

This project now uses VCPKG to manage the LibRaw dependency instead of building from source with CMake.

## Prerequisites

1. **Git** - Required to clone vcpkg
2. **Visual Studio Build Tools** or **Visual Studio Community** (Windows)
3. **CMake** (usually comes with Visual Studio)

## Installation Steps

### 1. Clone VCPKG

```bash
git clone https://github.com/Microsoft/vcpkg.git C:\vcpkg
```

### 2. Run VCPKG Bootstrap

```bash
cd C:\vcpkg
.\bootstrap-vcpkg.bat
```

### 3. Install LibRaw

```bash
.\vcpkg install libraw:x64-windows
```

### 4. Integrate with Visual Studio (Optional but Recommended)

```bash
.\vcpkg integrate install
```

## Alternative: Use VCPKG as a Git Submodule

If you prefer to keep vcpkg with your project:

```bash
# From your project root
git submodule add https://github.com/Microsoft/vcpkg.git vcpkg
cd vcpkg
.\bootstrap-vcpkg.bat
.\vcpkg install libraw:x64-windows
```

## Building the Project

After installing libraw via vcpkg, you can build your Tauri app normally:

```bash
npm run tauri dev
# or
cargo build
```

## Troubleshooting

### Library Not Found Errors

If you get linking errors, ensure:

1. VCPKG is installed in `C:\vcpkg`
2. LibRaw is installed for the correct architecture (`x64-windows`)
3. The library path in `Cargo.toml` matches your vcpkg installation

### Path Issues

You can customize the vcpkg path by setting the `VCPKG_ROOT` environment variable:

```bash
set VCPKG_ROOT=C:\your\custom\vcpkg\path
```

### Multiple VCPKG Installations

If you have multiple vcpkg installations, ensure you're using the correct one by checking the path in your `Cargo.toml`.

## Benefits of Using VCPKG

- **Automatic dependency management** - No need to manually clone and build LibRaw
- **Cross-platform support** - Works on Windows, Linux, and macOS
- **Version management** - Easy to update to newer versions
- **Integration** - Seamless integration with Visual Studio and other IDEs
- **Pre-built binaries** - Faster builds, no compilation from source needed
