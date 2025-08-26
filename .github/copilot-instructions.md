# Heimdell CLI

Heimdell CLI is a Bun-based command-line tool for React Native over-the-air (OTA) updates via the Heimdell server system. It bundles React Native apps and uploads them to a Heimdell server for distribution.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- Install Bun runtime: `curl -fsSL https://bun.sh/install | bash && source ~/.bashrc`
- Verify Bun installation: `bun --version` -- should show version 1.2.5 or higher (tested with 1.2.21)
- Install dependencies: `bun install` -- **CRITICAL WARNING**: Often fails with 403 errors from npm registry in restricted environments. Document exact error messages if this occurs.
- **Known dependency issue**: If `bun install` fails, you cannot build or run the CLI. The build will fail with "Cannot resolve" errors for missing packages like `@client.ts/react`, `string-width`, etc.

### Build the CLI
- **PREREQUISITE**: Must successfully run `bun install` first, or all builds will fail
- Build all platform targets: `bun run build:all` -- takes 2-5 minutes when dependencies are available. NEVER CANCEL. Set timeout to 10+ minutes.
- Build individual platforms (each takes 30-60 seconds when working):
  - macOS ARM64: `bun run build:darwin-arm64`
  - macOS x64: `bun run build:darwin-x64` 
  - Linux x64: `bun run build:linux-x64`
  - Windows x64: `bun run build:windows-x64`
- Output binaries are created in `dist/` directory
- **Build failure indicator**: "Cannot resolve" errors mean dependency installation failed

### Run the CLI
- Development mode: `bun run src/index.ts [command]`
- Production binary: `./dist/heimdell-[platform] [command]`
- **IMPORTANT**: CLI must be run from within a React Native project directory
- **IMPORTANT**: CLI requires network access to Heimdell server

### Build Timing Expectations
- `bun install`: 30-120 seconds when working, immediate failure (0.03s) when registry blocked
- `bun run build:all`: 2-5 minutes for all platforms when dependencies available. NEVER CANCEL.
- Individual platform builds: 30-60 seconds each when working, immediate failure when dependencies missing. NEVER CANCEL.
- React Native bundling during push-update: 5-15 minutes depending on project size. NEVER CANCEL.
- **Network dependency**: All build operations require successful `bun install` completion first

## Core Commands and Usage

### Available Commands
- `heimdell login`: Authenticate with Heimdell server and store credentials
- `heimdell login -e <environment>`: Login to specific environment (staging, production, etc.)
- `heimdell env <environment>`: Switch between configured environments
- `heimdell push-update <version>`: Bundle and upload React Native app update
- `heimdell list-bundles`: List available bundles on server
- `heimdell rollback`: Roll back to previous bundle version

### Command Execution Flow
1. **Always run in React Native project root directory**
2. **Login first**: `heimdell login` creates `.heimdell/credentials.json`
3. **Never commit `.heimdell/` folder** to version control
4. **Push updates**: `heimdell push-update 1.0.0` bundles and uploads

### Critical Timing and Timeout Information
- **NEVER CANCEL long-running operations**
- Push-update process timeout: 10 minutes (hard-coded in PushUpdatePreTask.tsx)
- React Native bundling: 5-15 minutes depending on project size
- Hermes compilation: 2-5 minutes for each platform
- **Always set timeouts to 20+ minutes** for push-update operations

## Validation Scenarios

### Manual Testing Requirements
After making any changes to the CLI, ALWAYS test these complete scenarios:

1. **Basic CLI functionality**:
   - Run `heimdell --help` and verify command listing
   - Ensure all 5 commands are available: login, env, push-update, list-bundles, rollback

2. **Build validation**:
   - **PREREQUISITE**: Ensure `bun install` completed successfully first
   - Run `bun run build:all` and verify all 4 platform binaries are created in `dist/`
   - Test at least one binary: `./dist/heimdall-linux-x64 --help`
   - **Expected failure mode**: If dependencies failed to install, document the "Cannot resolve" errors

3. **Login flow validation** (requires Heimdell server):
   - Navigate to a React Native project directory
   - Run `heimdell login`
   - Complete the interactive login flow
   - Verify `.heimdell/credentials.json` is created

4. **Environment switching** (requires completed login):
   - Test `heimdell login -e staging`
   - Test `heimdell env staging`
   - Verify environment-specific credentials are managed correctly

5. **Bundle creation** (requires React Native project with proper setup):
   - Run `heimdell push-update 1.0.0`
   - Wait for complete bundle creation (DO NOT CANCEL)
   - Verify zip files are created in `dist/` directory

### CI/CD Validation
- GitHub Actions workflow in `.github/workflows/release.yml` handles automated builds
- Workflow builds for all platforms: macOS (arm64, x64), Linux x64, Windows x64
- Release artifacts are automatically created for tagged versions

## Project Structure and Key Locations

### Important Directories
- `src/commands/`: CLI command implementations (login, push-update, etc.)
- `src/scripts/`: Platform-specific build and bundle scripts
- `src/api/`: Heimdell server API client code
- `src/components/`: Ink-based UI components for CLI interactions
- `dist/`: Output directory for compiled binaries

### Key Files to Monitor
- `package.json`: Scripts, dependencies, and build configuration
- `src/index.ts`: Main CLI entry point and command registration
- `src/scripts/hermes.ts`: React Native bundling and Hermes compilation logic
- `src/scripts/runtime.ts`: Runtime detection (Bun/Node/Yarn) and command adaptation
- `.github/workflows/release.yml`: CI/CD pipeline

### Platform-Specific Behavior
- CLI adapts commands based on detected runtime (Bun preferred, Node.js fallback)
- Bundling scripts are platform-aware (Windows/macOS/Linux)
- Hermes compiler paths differ by platform

## Common Development Tasks

### Adding New Commands
1. Create command file in `src/commands/[command-name].tsx`
2. Implement command using Yargs pattern
3. Add to command list in `src/index.ts`
4. Test with `bun run src/index.ts [new-command]`

### Modifying Build Scripts
- Edit `src/scripts/hermes.ts` for React Native bundling changes
- Update `src/scripts/runtime.ts` for runtime detection changes
- Always test on multiple platforms when possible

### Environment and Network Considerations
- **Network Dependencies**: CLI requires access to npm registry and Heimdell server
- **Registry Failures**: `bun install` may fail in restricted environments - document but continue
- **React Native Requirements**: CLI requires React Native project with proper Hermes setup
- **Bun Specific**: This project uses Bun APIs and cannot run with Node.js directly

### Troubleshooting Common Issues

### Build Failures
- **Dependency install failures**: Registry 403 errors are common in restricted environments
  - Error pattern: `error: GET https://registry.npmjs.org/[package] - 403`
  - Solution: Try `bun install --frozen-lockfile` or work in unrestricted network environment
- **Missing module errors**: Usually indicate dependency installation failure
  - Error pattern: `error: Could not resolve: "[package]". Maybe you need to "bun install"?`
  - Solution: Ensure `bun install` completed successfully first
- **Missing utils/environment.ts**: Create the utility file if missing in repository clone
- **Build timeout**: Increase timeout, never cancel builds

### Runtime Issues
- CLI not found: Ensure binary is executable: `chmod +x dist/heimdell-*`
- Permission denied: Use sudo for global installation: `sudo cp dist/heimdell-* /usr/local/bin/heimdell`
- Module resolution errors: Verify all TypeScript source files are present

### Performance Expectations
- Fast operations (< 1 second): help, version, basic Bun commands
- Medium operations (1-5 minutes): successful build, dependency install
- Long operations (5-15+ minutes): React Native bundling, push-update
- **NEVER CANCEL operations that are still progressing**

### Repository-Specific Issues
- **Missing src/utils/environment.ts**: This file may be missing from some clones and needs to be created
- **Incomplete dependency resolution**: Some packages may not be available in all environments
- **Platform compatibility**: Build targets are configured for macOS, Linux, and Windows x64