# Sentry Source Map Integration Guide

## Overview

Heimdell CLI automatically uploads source maps to Sentry when deploying OTA updates, enabling proper stack trace symbolication for errors that occur in Hermes bytecode bundles. This guide explains how to configure and use this feature.

## Features

✅ **Automatic Detection**: Detects Sentry configuration and uploads source maps automatically  
✅ **Hermes Support**: Properly composes Metro and Hermes bytecode source maps  
✅ **Zero Configuration**: Works out-of-the-box if Sentry is already configured in your React Native project  
✅ **Graceful Fallback**: Skips upload silently if Sentry is not configured  
✅ **Multi-Platform**: Supports both Android and iOS source map uploads  

## Prerequisites

Before source maps can be uploaded to Sentry, your React Native project must have:

1. **Sentry React Native SDK** installed:
   ```bash
   npm install --save @sentry/react-native
   # or
   yarn add @sentry/react-native
   ```

2. **Sentry CLI** installed:
   ```bash
   npm install --save-dev @sentry/cli
   # or
   yarn add --dev @sentry/cli
   ```

3. **Sentry Configuration** - at least one of the following:
   - Environment variables: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
   - Root-level `sentry.properties` file
   - Platform-specific config: `android/sentry.properties` or `ios/sentry.properties`
   - `.sentryclirc` file in project root

## Configuration Methods

### Method 1: Environment Variables (Recommended)

Set these environment variables before running `heimdell push-update`:

```bash
export SENTRY_ORG="your-org-slug"
export SENTRY_PROJECT="your-project-slug"
export SENTRY_AUTH_TOKEN="your-auth-token"

heimdell push-update 1.0.0
```

**Pros**: Easy to use in CI/CD pipelines, no files to manage  
**Cons**: Must be set in every terminal session

### Method 2: sentry.properties File

Create a `sentry.properties` file in your project root:

```properties
defaults.org=your-org-slug
defaults.project=your-project-slug
auth.token=your-auth-token
```

**Important**: Add `sentry.properties` to your `.gitignore` to avoid committing secrets!

```bash
echo "sentry.properties" >> .gitignore
```

**Pros**: Persistent configuration, works automatically  
**Cons**: Risk of committing secrets if not gitignored

### Method 3: Platform-Specific Configuration

Create separate configuration files for each platform:

**android/sentry.properties**:
```properties
defaults.org=your-org-slug
defaults.project=your-android-project
auth.token=your-auth-token
```

**ios/sentry.properties**:
```properties
defaults.org=your-org-slug
defaults.project=your-ios-project
auth.token=your-auth-token
```

**Pros**: Different projects for each platform, more granular control  
**Cons**: More files to manage

### Method 4: .sentryclirc File

Create a `.sentryclirc` file in your project root:

```ini
[defaults]
org=your-org-slug
project=your-project-slug

[auth]
token=your-auth-token
```

**Important**: Add `.sentryclirc` to your `.gitignore`!

**Pros**: Shared with other Sentry CLI tools, standardized format  
**Cons**: Risk of committing secrets if not gitignored

## Getting Your Sentry Auth Token

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Give it a name (e.g., "Heimdell CLI")
4. Select these scopes:
   - `project:read`
   - `project:releases`
   - `project:write`
5. Click "Create Token"
6. Copy the token immediately (it won't be shown again)

## How It Works

When you run `heimdell push-update <version>`, the CLI automatically:

1. **Detects Sentry availability** by checking:
   - `@sentry/react-native` dependency
   - `@sentry/cli` dependency or installation
   - Sentry configuration files or environment variables

2. **Generates source maps** during bundling:
   - Metro bundler source maps (`.bundle.map`)
   - Hermes bytecode source maps (`.hbc.map`)
   - Stored in `dist/sentry/` directory

3. **Composes source maps** for Hermes:
   - Uses `react-native/scripts/compose-source-maps.js`
   - Combines Metro + Hermes source maps into final map
   - Copies debug IDs using `@sentry/react-native/scripts/copy-debugid.js`

4. **Creates Sentry release and uploads**:
   - Creates a Sentry release: `sentry-cli releases new <version>`
   - Uploads source maps with `@sentry/cli sourcemaps upload`
   - Includes `--release` and `--dist` flags to associate with release
   - Strips project root prefix for cleaner paths
   - Finalizes the release: `sentry-cli releases finalize <version>`

5. **Cleans up temporary files**:
   - Removes `dist/sentry/` directory after upload
   - Keeps only the deployed bundle zips

## Workflow Integration

The source map upload is seamlessly integrated into the `push-update` workflow:

```
1. Warning confirmation
2. Preview tasks (if not --yes)
3. Execute bundling (npm install + bundle Android/iOS)
4. Run ruleset validation
5. Push to Heimdell:
   ├─ Reserve bundle version
   ├─ Upload bundles to Heimdell
   └─ Upload sourcemaps to Sentry (⭐ automatic, only if Sentry detected)
```

### Example Output

```bash
$ heimdell push-update 1.2.3

┌─ PUSHING UPDATE ──────────────────────────────┐
│                                                │
│ • Reserve bundle version: OK                   │
│ • Upload bundles to Heimdell: OK               │
│ • Upload sourcemaps to Sentry: ⏳ Running...   │
│                                                │
│ Parsed config from sentry.properties:          │
│   org=my-org, project=my-app                   │
│                                                │
│ Creating Sentry release: 1.2.3                 │
│ Sentry CLI command:                            │
│   npx @sentry/cli sourcemaps upload            │
│     --release 1.2.3                            │
│     --dist 1.2.3                               │
│     --org my-org                               │
│     --project my-app                           │
│     --strip-prefix /path/to/project            │
│     dist/sentry/index.android.bundle           │
│     dist/sentry/index.android.bundle.composed.map
│ Finalizing Sentry release: 1.2.3              │
│                                                │
│ • Upload sourcemaps to Sentry: ✅ OK           │
│                                                │
└────────────────────────────────────────────────┘

✅ The JavaScript bundles are deployed to Heimdell.
   All users will receive the update on next app open.
```

## Verifying Source Maps in Sentry

After uploading, verify that source maps are working:

1. **Check Releases in Sentry**:
   - Go to your Sentry project
   - Navigate to Releases
   - Find the version you just deployed (e.g., `1.2.3`)
   - Check "Artifacts" tab - you should see source maps listed

2. **Trigger a Test Error**:
   - Add a test error in your React Native app:
     ```javascript
     throw new Error("Test error for Sentry symbolication");
     ```
   - Deploy with OTA update
   - Open app and trigger the error

3. **View in Sentry Dashboard**:
   - Go to Issues in your Sentry project
   - Find the test error
   - Stack trace should show:
     - ✅ Original source file paths (e.g., `src/screens/HomeScreen.tsx`)
     - ✅ Actual line numbers
     - ✅ Readable code context
     - ❌ NOT minified positions like `app:///index.android.hbc.bundle:1:375498`

## Troubleshooting

### Issue: "Failed to upload sourcemaps to Sentry"

**Possible Causes**:
- Missing or invalid Sentry auth token
- Incorrect org or project name
- Network connectivity issues
- `@sentry/cli` not installed

**Solutions**:
1. Verify your auth token is valid and has correct scopes
2. Check org/project names match your Sentry dashboard
3. Ensure `@sentry/cli` is installed: `npm list @sentry/cli`
4. Run manually to see detailed errors:
   ```bash
   npx @sentry/cli sourcemaps upload --help
   ```

### Issue: Source maps not showing in Sentry

**Possible Causes**:
- Source maps uploaded but not associated with correct release
- Debug ID mismatch between bundle and source map
- Bundle/source map paths incorrect

**Solutions**:
1. Check the release name matches the version: `heimdell push-update <version>`
2. Verify debug IDs match:
   ```bash
   npx @sentry/cli sourcemaps explain dist/sentry/index.android.bundle
   ```
3. Re-upload with verbose logging:
   ```bash
   SENTRY_LOG_LEVEL=debug heimdell push-update <version>
   ```

### Issue: Stack traces still showing minified code

**Possible Causes**:
- Source maps not properly composed for Hermes
- Wrong release version in Sentry configuration
- App not sending correct release version to Sentry

**Solutions**:
1. Verify your React Native app is configured to send release version:
   ```javascript
   import * as Sentry from '@sentry/react-native';
   
   Sentry.init({
     dsn: 'your-dsn',
     release: '1.2.3', // Must match heimdell push-update version
   });
   ```

2. Check Hermes is enabled in your app:
   - Android: `android/app/build.gradle` should have `enableHermes: true`
   - iOS: Check Podfile has Hermes enabled

3. Verify source map composition:
   ```bash
   # Check if compose-source-maps.js exists
   ls node_modules/react-native/scripts/compose-source-maps.js
   
   # Check if copy-debugid.js exists
   ls node_modules/@sentry/react-native/scripts/copy-debugid.js
   ```

### Issue: "Sentry not configured, skipping source map upload"

This is **not an error** - it means:
- Heimdell detected that Sentry is not configured in your project
- Source map upload was gracefully skipped
- Your bundle was still successfully uploaded to Heimdell

**To enable Sentry**:
1. Follow the [Prerequisites](#prerequisites) section
2. Add at least one configuration method from [Configuration Methods](#configuration-methods)
3. Run `heimdell push-update` again

### Issue: Platform-specific config not detected

**Problem**: You have `android/sentry.properties` but upload fails

**Solution**: Heimdell automatically creates a symlink/copy to root level. If this fails:
1. Manually copy the file:
   ```bash
   cp android/sentry.properties sentry.properties
   ```
2. Re-run push-update

### Issue: Permission denied when creating symlink

**Problem**: Cannot create symlink on Windows or restricted filesystems

**Solution**: The CLI automatically falls back to copying the file. If this also fails:
1. Manually copy platform-specific config to root:
   ```bash
   # Windows
   copy android\sentry.properties sentry.properties
   
   # Linux/macOS
   cp android/sentry.properties sentry.properties
   ```
2. Add to .gitignore
3. Re-run push-update

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy OTA Update

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: npm install
        
      - name: Deploy to Heimdell
        env:
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        run: |
          heimdell push-update ${{ github.ref_name }} --yes --auto
```

### GitLab CI

```yaml
deploy:
  stage: deploy
  script:
    - npm install
    - export SENTRY_ORG="${SENTRY_ORG}"
    - export SENTRY_PROJECT="${SENTRY_PROJECT}"
    - export SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN}"
    - heimdell push-update ${CI_COMMIT_TAG} --yes --auto
  only:
    - tags
```

## Best Practices

1. **Use Environment Variables in CI/CD**: Store Sentry credentials as secrets in your CI/CD platform

2. **Version Alignment**: Always use the same version for:
   - `heimdell push-update <version>`
   - Sentry release name
   - App's Sentry initialization

3. **Test Before Production**: 
   - Test source map upload in staging environment first
   - Verify symbolication works before deploying to production

4. **Keep Auth Tokens Secure**:
   - Never commit `sentry.properties` or `.sentryclirc`
   - Use `.gitignore` to exclude these files
   - Rotate tokens periodically

5. **Monitor Upload Success**:
   - Check Heimdell CLI output for upload confirmation
   - Verify in Sentry dashboard that artifacts appear
   - Set up Sentry alerts for symbolication issues

6. **Multi-Environment Setup**:
   ```bash
   # Staging with staging Sentry project
   export SENTRY_PROJECT="my-app-staging"
   heimdell login -e staging
   heimdell push-update 1.0.0-beta.1
   
   # Production with production Sentry project
   export SENTRY_PROJECT="my-app-production"
   heimdell login -e production
   heimdell push-update 1.0.0
   ```

## Disable Sentry Upload (Optional)

If you want to temporarily disable Sentry uploads without removing configuration:

**Option 1**: Remove Sentry configuration temporarily:
```bash
mv sentry.properties sentry.properties.bak
heimdell push-update 1.0.0
mv sentry.properties.bak sentry.properties
```

**Option 2**: Remove environment variables:
```bash
unset SENTRY_ORG SENTRY_PROJECT SENTRY_AUTH_TOKEN
heimdell push-update 1.0.0
```

**Note**: There is currently no `--skip-sentry` flag, but this could be added as a future enhancement.

## Advanced: Manual Source Map Upload

If you need to manually upload source maps after deployment:

```bash
# 1. Ensure bundles are built
heimdell push-update 1.0.0 --yes --skip-npm-install

# 2. Manually compose and upload (if needed later)
cd dist/sentry

# Compose Metro + Hermes source maps
node ../../node_modules/react-native/scripts/compose-source-maps.js \
  index.android.bundle.map \
  index.android.bundle.hbc.map \
  -o index.android.bundle.composed.map

# Copy debug ID
node ../../node_modules/@sentry/react-native/scripts/copy-debugid.js \
  index.android.bundle.map \
  index.android.bundle.composed.map

# Upload to Sentry
npx @sentry/cli sourcemaps upload \
  --debug-id-reference \
  --org your-org \
  --project your-project \
  --strip-prefix $(pwd)/../.. \
  index.android.bundle \
  index.android.bundle.composed.map
```

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting) above
- Review Sentry's [React Native documentation](https://docs.sentry.io/platforms/react-native/)
- Open an issue on [Heimdell CLI GitHub](https://github.com/ShindouMihou/heimdell-cli/issues)
- Consult [Sentry CLI documentation](https://docs.sentry.io/product/cli/)

## References

- [Sentry React Native Source Maps](https://docs.sentry.io/platforms/react-native/sourcemaps/)
- [Sentry CLI Releases](https://docs.sentry.io/product/cli/releases/)
- [React Native Bundle Command](https://reactnative.dev/docs/metro)
- [Hermes Bytecode and Source Maps](https://hermesengine.dev/docs/sourcemaps/)
