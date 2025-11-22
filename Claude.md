# Heimdell CLI - Claude.md

## Project Overview

**Heimdell CLI** is a command-line tool for managing over-the-air (OTA) updates for React Native applications. It works in tandem with:
- [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update) - Runtime OTA update handler
- [Heimdell Server](https://github.com/ShindouMihou/heimdell) - Backend for storing and serving bundles

**Core Purpose**: Bundle React Native apps using Bun and push updates to a Heimdell server for runtime distribution.

**Runtime**: Bun (>=1.2.5) - This CLI is Bun-specific and uses Bun APIs extensively.

## Architecture

### Tech Stack
- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Bun (>=1.2.5)
- **UI Framework**: React 18.3.1 + Ink 5.2.1 (React renderer for CLIs)
- **CLI Framework**: yargs 18.0.0
- **HTTP Client**: @client.ts/core (type-safe REST client)
- **Validation**: valibot 1.1.0
- **Encryption**: Node.js crypto (AES-256-GCM)

### Project Structure

```
src/
├── index.ts                    # Main entry point (yargs CLI setup)
├── api/                        # Server communication layer
│   ├── client.ts              # HTTP client factory
│   ├── resources/v1/          # Versioned API endpoints
│   │   ├── cli.ts            # Bundle management (push, list, rollback)
│   │   ├── updates.ts        # Update retrieval
│   │   └── upload.ts         # File upload endpoints
│   └── types/                 # API response types
├── commands/                   # CLI commands (8 total)
│   ├── login.tsx              # Authentication setup
│   ├── push-update.tsx        # Main bundling & upload workflow
│   ├── list-bundles.tsx       # List deployed bundles
│   ├── rollback.tsx           # Rollback to previous versions
│   ├── env.tsx                # Environment switching
│   ├── encrypt-credentials.tsx # Encrypt stored credentials
│   ├── hash.ts                # Utility command
│   ├── ruleset-create.ts      # Create deployment validation rules
│   └── pages/                 # Multi-step command UI components
├── credentials/
│   └── autoload.ts            # Auto-load & decrypt credentials
├── rulesets/                  # Deployment rule validation system
│   ├── parser.ts              # Parse ruleset.json
│   ├── executable.ts          # Execute validation rules
│   ├── globalRules.ts         # Built-in rule definitions
│   └── valibot.ts             # Schema validation
├── scripts/                   # React Native bundling scripts
│   ├── hermes.ts              # Android & iOS bundling via Hermes/Metro
│   ├── package-manager.ts     # Package installation
│   └── runtime.ts             # Script execution abstraction
├── utils/                     # Shared utilities
│   ├── encryption.ts          # AES-256-GCM encryption/decryption
│   ├── session.ts             # Session state management
│   ├── environment.ts         # Environment name validation
│   ├── protectedCommand.tsx   # Auth guard wrapper
│   └── sentry.ts              # Error reporting
├── components/                # Reusable React/Ink components
│   ├── Border.tsx
│   ├── UnauthenticatedAlert.tsx
│   └── EncryptionKeyPrompt.tsx
├── hooks/
│   └── useRuntime.ts          # Hook for script execution
└── types/
    └── command.ts             # Global type definitions
```

## Key Concepts

### 1. Commands (CLI Entry Points)

All 8 commands follow this pattern:
- Export a `use<CommandName>Command(yargs: Argv)` function
- Register with yargs in `src/index.ts`
- Protected commands use `executeProtectedCommand()` wrapper

**Available Commands**:
```bash
heimdell login                  # Authenticate & store credentials
heimdell push-update <version>  # Bundle & upload (main workflow)
heimdell list-bundles           # View deployed bundles
heimdell rollback               # Revert to previous bundle
heimdell env <environment>      # Switch environments
heimdell encrypt-credentials    # Encrypt stored credentials
heimdell hash                   # Utility command
heimdell ruleset-create         # Create deployment validation rules
```

### 2. Credentials & Authentication

**Storage Location**: `.heimdell/credentials.json` (per-project)

**Structure**:
```json
{
  "environment-name": {
    "username": "string",
    "password": "string",
    "baseUrl": "https://heimdell-server.com",
    "tag": "project-tag",
    "platforms": ["android", "ios"]
  }
}
```

**Encryption**:
- Optional AES-256-GCM encryption with PBKDF2 key derivation
- Encryption key stored in terminal session (not on disk)
- Session management via `SessionManager` singleton (src/utils/session.ts)
- Protected commands automatically prompt for key when needed

**Important Files**:
- `src/credentials/autoload.ts` - Credential loading & decryption
- `src/utils/encryption.ts` - AES-256-GCM implementation
- `src/utils/session.ts` - Session-based key storage
- `src/utils/protectedCommand.tsx` - Auth wrapper for commands

### 3. Rulesets (Deployment Validation)

**Purpose**: Prevent accidental deployments to wrong environments

**Storage**: `.heimdell/ruleset.json`

**Rule Types**:
- `eq` / `!eq` - Equality checks
- `contains` / `!contains` - Substring checks
- `matches` / `!matches` - Regex pattern matching

**Supported Properties**:
- `project.env.<VARIABLE_NAME>` - Environment variables from .env
- `project.tag` - Project tag from credentials
- `project.environment` - Environment name
- `project.platforms` - Target platforms
- `project.username` - Heimdell username
- `project.baseUrl` - Heimdell server URL

**Validation Flow**:
1. Ruleset loaded in `src/rulesets/parser.ts`
2. Executed in `src/rulesets/executable.ts`
3. Checked before push in `src/commands/pages/push-update/PushUpdateCheckups.tsx`

**Important Files**:
- `src/rulesets/parser.ts:1` - Rule parsing
- `src/rulesets/executable.ts:1` - Rule execution
- `src/rulesets/valibot.ts:1` - JSON schema validation

### 4. React Native Bundling

**Bundle Process** (src/scripts/hermes.ts):
1. Run Metro bundler for Android/iOS
2. Compile JS to Hermes bytecode
3. Package assets into platform-specific folders
4. Create archive for upload

**Platform-Specific Commands**:
- **Android**: `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/index.android.bundle --assets-dest android`
- **iOS**: `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios`

**Important Files**:
- `src/scripts/hermes.ts:1` - Platform bundling logic
- `src/scripts/package-manager.ts:1` - Package installation
- `src/scripts/runtime.ts:1` - Script execution abstraction

### 5. Multi-Page Command Flows

Commands use React state to navigate between pages (wizard pattern).

**Example**: `push-update` workflow (src/commands/push-update.tsx):
1. **Page 0**: Warning confirmation
2. **Page 1**: Preview tasks (if not `--yes`)
3. **Page 2**: Execute bundling commands
4. **Page 3**: Run ruleset validation
5. **Page 4**: Upload to server

**Pattern**:
```tsx
const [page, setPage] = useState(0);

return (
  <>
    {page === 0 && <WarningPage onConfirm={() => setPage(1)} />}
    {page === 1 && <PreviewPage onConfirm={() => setPage(2)} />}
    {/* ... */}
  </>
);
```

### 6. API Client Architecture

Built with `@client.ts/core` for type-safe REST calls.

**Client Creation** (src/api/client.ts):
```typescript
export const createClient = (
  serverUrl: string,
  username: string,
  password: string
) => {
  return createClientDefinition(serverUrl, {
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`
    }
  });
};
```

**Resource Definitions** (src/api/resources/v1/):
- `cli.ts` - Bundle operations (reserve, push, list, rollback)
- `updates.ts` - Retrieve updates
- `upload.ts` - File upload endpoints

**Usage Pattern**:
```typescript
const client = createClient(baseUrl, username, password);
const response = await client.resources.v1.cli.reserveBundleId({ tag, targetVersion });
```

## Code Conventions

### TypeScript
- **Strict mode enabled** (tsconfig.json:18)
- **No unchecked indexed access** (tsconfig.json:21)
- **ESNext target** with bundler module resolution
- **React JSX transform** (`jsx: "react-jsx"`)

### File Naming
- **Commands**: lowercase with dash (e.g., `push-update.tsx`)
- **Components**: PascalCase (e.g., `Border.tsx`)
- **Utilities**: camelCase (e.g., `protectedCommand.tsx`)
- **Tests**: `*.test.ts` suffix

### Component Patterns

**Ink Components** use React hooks:
```tsx
import {Text, Box} from "ink";
import {useState} from "react";

function MyComponent() {
  const [state, setState] = useState(0);

  return (
    <Box>
      <Text>Hello</Text>
    </Box>
  );
}
```

**Protected Commands** use wrapper:
```tsx
executeProtectedCommand('command-name', async () => {
  // Command logic here
  // globalThis.credentials is available
});
```

### Global State
- **Credentials**: `globalThis.credentials` (set by autoload.ts)
- **Session**: `SessionManager.getInstance()` (singleton)

### Error Handling
- **Sentry integration** for error reporting (src/utils/sentry.ts)
- **Validation errors** from valibot show user-friendly messages
- **Encryption errors** trigger automatic key prompts

## Development Workflows

### Running Locally
```bash
bun install
bun run start <command> [args]
```

### Building Binaries
```bash
bun run build:all              # All platforms
bun run build:darwin-arm64     # macOS ARM64
bun run build:darwin-x64       # macOS Intel
bun run build:linux-x64        # Linux
bun run build:windows-x64      # Windows
```

**Build Configuration**:
- Uses `bun build --compile` for standalone executables
- Sets `process.env.DEV="false"` via `--define` flag
- Output to `dist/heimdell-<platform>`

### Testing
```bash
bun test              # Run all tests
bun test --watch      # Watch mode
```

**Test Files**:
- `src/api/client.test.ts` - API client tests
- `src/commands/hash.test.ts` - Hash command tests
- `src/commands/login.test.ts` - Login flow tests
- `src/utils/environment.test.ts` - Environment validation tests
- `src/index.test.ts` - CLI integration tests

**Test Framework**: Bun's built-in test runner

### Adding a New Command

1. **Create command file**: `src/commands/my-command.tsx`
2. **Export hook**: `export const useMyCommand = (yargs: Argv) => { ... }`
3. **Register in index.ts**: Add to command list
4. **Add to gitignore** if it creates files in `.heimdell/`

**Template**:
```typescript
import type {Argv} from "yargs";
import {render} from "ink";
import {executeProtectedCommand} from "../utils/protectedCommand.tsx";

function MyCommand() {
  return <Text>My Command</Text>;
}

export const useMyCommand = (yargs: Argv) => {
  yargs.command(
    'my-command',
    'Description',
    (yargs) => yargs,
    async () => {
      await executeProtectedCommand('my-command', async () => {
        render(<MyCommand />);
      });
    }
  );
};
```

## Common Tasks

### Adding a New Ruleset Property

1. **Update globalRules** (src/rulesets/globalRules.ts)
2. **Add to RulesetProperty** type
3. **Implement resolver** in `executeRuleset()` (src/rulesets/executable.ts)

### Modifying Bundle Process

**Files to modify**:
- `src/scripts/hermes.ts` - Add/modify bundling commands
- `src/commands/push-update.tsx` - Update workflow pages
- `src/commands/pages/push-update/*` - Adjust UI components

### Adding a New API Endpoint

1. **Define resource** in `src/api/resources/v1/<resource>.ts`
2. **Add types** in `src/api/types/<resource>.ts`
3. **Use in command** via `createClient().resources.v1.<resource>`

### Changing Encryption Algorithm

**Files to modify**:
- `src/utils/encryption.ts:1` - Encryption implementation
- `src/credentials/autoload.ts:1` - Credential decryption
- Update version in encrypted credential metadata

## Security Considerations

### Credential Storage
- **Never commit** `.heimdell/` directory to version control
- Automatically creates `.heimdell/.gitignore` on first login
- Encryption key stored only in terminal session (not on disk)

### Environment Variables
- Loaded from `.env` files for ruleset validation
- Not exposed in error messages
- Validated before upload via rulesets

### API Authentication
- Basic auth over HTTPS (base64 encoded username:password)
- Credentials encrypted at rest (optional)
- Session-based key management prevents key leakage

### Input Validation
- **Semantic versioning** enforced for bundle versions (regex in push-update.tsx:98)
- **Environment names** validated (src/utils/environment.ts)
- **Ruleset JSON** validated with valibot schemas

## Debugging Tips

### Enable Verbose Logging
- Set `process.env.DEV="true"` in development
- Check Sentry dashboard for production errors

### Common Issues
1. **"Invalid encryption key"**: Run `heimdell encrypt-credentials` to reset
2. **Bundle fails**: Check React Native project structure
3. **Upload fails**: Verify Heimdell server URL and credentials
4. **Ruleset validation fails**: Check `.env` file and ruleset.json syntax

### Useful Debug Commands
```bash
# Check credentials without encryption
cat .heimdell/credentials.json | jq

# Validate ruleset.json
cat .heimdell/ruleset.json | jq

# Test bundle commands manually
npx react-native bundle --platform android --dev false ...
```

## Related Resources

- [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update) - Runtime OTA handler
- [Heimdell Server](https://github.com/ShindouMihou/heimdell) - Backend server
- [Bun Documentation](https://bun.sh/docs) - Runtime & bundler docs
- [Ink Documentation](https://github.com/vadimdemedes/ink) - React for CLIs

## Project Status

Currently under development. Known limitations (Windows only):
- Image and asset references may not be fully resolved
- Incomplete support for new React Native architecture

## Quick Reference

### Important File Locations
- Entry point: `src/index.ts:1`
- Credential loading: `src/credentials/autoload.ts:1`
- Encryption: `src/utils/encryption.ts:1`
- Session management: `src/utils/session.ts:1`
- Protected commands: `src/utils/protectedCommand.tsx:1`
- Main workflow: `src/commands/push-update.tsx:1`
- Ruleset validation: `src/rulesets/executable.ts:1`
- Bundling: `src/scripts/hermes.ts:1`

### Environment Variables
- `process.env.DEV` - Development mode flag (set via build --define)
- Loaded from `.env` files for ruleset validation

### Global Objects
- `globalThis.credentials` - Current environment credentials
- `SessionManager.getInstance()` - Session state singleton