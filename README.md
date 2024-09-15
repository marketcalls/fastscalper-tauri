# FastScalper

[... Keep the existing content up to the "Building the Application" section ...]

## Building the Application

FastScalper can be built for Windows, macOS, and Linux. Follow these instructions to build for your target platform:

### Prerequisites for Cross-Platform Building

- Ensure you have Rust and Node.js installed on your development machine.
- Install platform-specific dependencies as needed (see below).

### Building for macOS

1. Ensure you're on a macOS machine with Xcode installed.
2. Run the build command:

```bash
npm run tauri build
```

This will produce a `.dmg` file in `src-tauri/target/release/bundle/dmg/`.

### Building for Windows

1. On a Windows machine with Visual Studio build tools installed, run:

```bash
npm run tauri build
```

This will produce a `.msi` installer in `src-tauri/target/release/bundle/msi/`.

To build for Windows on a non-Windows machine, you'll need to set up cross-compilation tools. Refer to the [Tauri documentation](https://tauri.app/v1/guides/building/cross-platform) for detailed instructions.

### Building for Linux

1. On a Linux machine, ensure you have the necessary dependencies installed. For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

2. Run the build command:

```bash
npm run tauri build
```

This will produce an AppImage, a .deb file, and other formats in `src-tauri/target/release/bundle/`.

### Universal Build (All Platforms)

To build for all platforms from a single machine, you'll need to set up cross-compilation environments. This is an advanced topic and requires additional setup. Refer to the [Tauri documentation on Cross-Platform Compilation](https://tauri.app/v1/guides/building/cross-platform) for detailed instructions.

The built applications will be located in the `src-tauri/target/release/bundle` directory, organized by platform.

[... Keep the rest of the existing content ...]
