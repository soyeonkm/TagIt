# TagIt - Photo Management Application

A Tauri-based desktop application for managing and organizing photo collections with support for RAW file formats.

## Features

- Photo organization and management
- RAW file support (CR3, NEF, ARW, DNG, etc.)
- Thumbnail generation and caching
- XMP metadata support
- Cross-platform compatibility

## Prerequisites

- **Node.js** (for frontend development)
- **Rust** (for backend/Tauri)
- **Git** (for cloning vcpkg)
- **Visual Studio Build Tools** or **Visual Studio Community** (Windows)

## Quick Start

### 1. Setup VCPKG and LibRaw

The project uses VCPKG to manage the LibRaw dependency. Run the setup script:

```powershell
# From the src-tauri directory
.\setup_vcpkg.ps1
```

Or manually:

```bash
# Clone vcpkg
git clone https://github.com/Microsoft/vcpkg.git C:\vcpkg

# Bootstrap vcpkg
cd C:\vcpkg
.\bootstrap-vcpkg.bat

# Install LibRaw
.\vcpkg install libraw:x64-windows

# Optional: Integrate with Visual Studio
.\vcpkg integrate install
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend/TagIt
npm install
```

### 3. Run the Application

```bash
# Start the development server
npm run tauri dev
```

## Build

```bash
# Build for development
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
TagIt/
├── frontend/          # React frontend
├── backend/
│   └── TagIt/        # Tauri backend
│       ├── src-tauri/ # Rust source
│       └── src/       # Frontend source
└── projects_table.sql # Database schema
```

## Dependencies

- **Frontend**: React, Vite
- **Backend**: Tauri, Rust
- **Image Processing**: LibRaw (via VCPKG), image-rs
- **Database**: Supabase

## Troubleshooting

### LibRaw Linking Issues

If you encounter linking errors:

1. Ensure VCPKG is installed in `C:\vcpkg`
2. Verify LibRaw is installed: `C:\vcpkg\vcpkg list | findstr libraw`
3. Check the library path in `src-tauri/Cargo.toml`

### Build Errors

- Ensure all prerequisites are installed
- Run `cargo clean` if you encounter stale build artifacts
- Check that the VCPKG path in `Cargo.toml` matches your installation

## Development

- **Frontend**: Located in `frontend/src/`
- **Backend**: Located in `backend/TagIt/src-tauri/src/`
- **Tauri Config**: `backend/TagIt/src-tauri/tauri.conf.json`

## License

[Add your license here]
