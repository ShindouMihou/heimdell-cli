# Heimdell CLI - CI/CD Integration

Heimdell CLI supports fully non-interactive CI/CD execution via the `--use-ci` flag. This mode bypasses all interactive prompts and Ink rendering, outputs structured NDJSON to stdout, and integrates natively with GitHub Actions.

## Quick Start

```bash
heimdell push-update 1.2.3 --note "Bug fixes" --use-ci
```

All configuration is supplied through a single environment variable: `HEIMDELL_CONFIG`.

---

## Configuration

### `HEIMDELL_CONFIG` Environment Variable

A JSON string containing your Heimdell server credentials and project settings:

```json
{
  "baseUrl": "https://your-heimdell-server.com",
  "username": "deploy-user",
  "password": "deploy-password",
  "tag": "my-app",
  "platforms": ["android", "ios"],
  "environment": "production"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | `string` (URL) | Yes | Heimdell server URL |
| `username` | `string` | Yes | Authentication username |
| `password` | `string` | Yes | Authentication password |
| `tag` | `string` | Yes | Project tag for bundle identification |
| `platforms` | `("android" \| "ios")[]` | Yes | Target platforms (at least one) |
| `environment` | `string` | No | Environment name for ruleset validation |

The config is validated at startup using a strict schema. Invalid or missing fields cause an immediate exit with code `1` and a JSON error on stderr.

---

## Commands

### `push-update`

Bundles the React Native app and pushes an OTA update to Heimdell.

```bash
heimdell push-update <version> --note "Release notes" --use-ci
```

**Steps executed:**
1. Ruleset validation (`.heimdell/ruleset.json`)
2. Android bundling (if platform configured)
3. iOS bundling (if platform configured)
4. Checkups (verify bundle artifacts exist)
5. Reserve bundle version via API
6. Upload bundle files
7. Sentry sourcemap upload (if Sentry is configured, non-fatal on failure)

**Arguments:**
| Argument | Required | Description |
|---|---|---|
| `version` | Yes | Semantic version for the bundle (e.g. `1.2.3`) |
| `--note` | No | Release note attached to the bundle |
| `--force-upgrade` / `-fu` | No | Flag this bundle as a **mandatory** upgrade. Users on any older bundle for this version+tag will be forced to update before they can continue using the app. Use only for critical fixes (security, breaking backend changes, severe crashes). |

When `--force-upgrade` is set, a warning is emitted on stderr before the reserve step so the mandate is unmistakable in CI logs.

### `list-bundles`

Lists all deployed bundles for the configured tag.

```bash
heimdell list-bundles --use-ci
```

Returns a JSON array of bundles with a `status` field (`"AVAILABLE"` or `"ROLLED BACK"`).

### `rollback`

Rolls back to the previous bundle version. No confirmation prompt in CI mode.

```bash
heimdell rollback --use-ci
```

Returns the disposed bundle information on success.

### `set-force-upgrade`

Marks an existing bundle as a mandatory force-upgrade (or clears the flag). Useful when a bundle that was already pushed turns out to be critical — no need to re-push.

```bash
# Enable force-upgrade on a bundle
heimdell set-force-upgrade <bundleId> --use-ci

# Clear the flag
heimdell set-force-upgrade <bundleId> --disable --use-ci
```

**Arguments:**
| Argument | Required | Description |
|---|---|---|
| `bundleId` | Yes | The ID of the bundle to flag (same value returned by `push-update` as `bundle_id`). |
| `--disable` / `-d` | No | Clear the force-upgrade flag instead of enabling it. |

**Semantics:** the flag is **sticky** — once a bundle is marked as force-upgrade, every user on an older bundle for the same version+tag is required to update. This mandate cannot be cleared by a subsequent non-mandatory push; it remains in effect until either (a) the client has upgraded past the flagged bundle, or (b) the flag is explicitly cleared with `--disable`.

The result object includes the updated bundle and a `force_upgrade: boolean` field reflecting the new state.

---

## Flags

The `--use-ci` option accepts an optional comma-separated flag string to control CI behavior:

```bash
heimdell push-update 1.2.3 --use-ci=parallel
```

| Flag | Description |
|---|---|
| `parallel` | Run Android and iOS bundling in parallel via `Promise.all`. Only applies when both platforms are configured. |

Multiple flags can be combined: `--use-ci=parallel,future-flag`.

When no flags are provided, `--use-ci` (or `--use-ci=`) uses default sequential behavior.

---

## Output Format

### NDJSON on stdout

All output is newline-delimited JSON (one JSON object per line). This makes it safe to pipe through `jq`, `tail`, or any line-oriented parser.

```jsonc
{"type":"step_start","timestamp":"2026-04-12T10:00:00.000Z","step":"ruleset_validation"}
{"type":"step_end","timestamp":"2026-04-12T10:00:01.000Z","step":"ruleset_validation","status":"ok"}
{"type":"step_start","timestamp":"2026-04-12T10:00:01.000Z","step":"bundle_android"}
{"type":"progress","timestamp":"2026-04-12T10:00:05.000Z","step":"bundle_android","message":"Compiling Hermes bytecode..."}
{"type":"step_end","timestamp":"2026-04-12T10:00:30.000Z","step":"bundle_android","status":"ok"}
{"type":"result","timestamp":"2026-04-12T10:01:00.000Z","data":{"success":true,"command":"push-update","duration_ms":60000,"bundle":{"id":"abc-123","version":"1.2.3","tag":"my-app"},"platforms":["android","ios"]}}
```

**Event types:**

| Type | Description |
|---|---|
| `step_start` | A named step has begun |
| `step_end` | A named step completed (with `status`: `ok`, `error`, or `skipped`) |
| `progress` | Informational message during a step |
| `warning` | Non-fatal warning |
| `error` | Fatal error with `code` and `message` |
| `result` | Final result object (always the last line) |

### Parsing the result

```bash
# Extract just the final result
heimdell push-update 1.2.3 --use-ci 2>/dev/null | tail -1 | jq '.'

# Get the bundle ID
heimdell push-update 1.2.3 --use-ci 2>/dev/null | tail -1 | jq -r '.data.bundle.id'

# List bundles as a JSON array
heimdell list-bundles --use-ci 2>/dev/null | tail -1 | jq '.data.bundles'
```

### GitHub Actions Annotations on stderr

When `GITHUB_ACTIONS=true` is detected (set automatically by GitHub Actions), the reporter writes annotations to stderr:

- `::group::<step>` / `::endgroup::` for collapsible step groups
- `::error title=<CODE>::<message>` for errors
- `::warning::<message>` for warnings

These render natively in the GitHub Actions log UI without interfering with JSON parsing on stdout.

### `$GITHUB_OUTPUT` Integration

On successful `push-update`, the following outputs are written to `$GITHUB_OUTPUT` for use in downstream steps:

| Output | Description |
|---|---|
| `bundle_id` | The reserved bundle ID |
| `bundle_version` | The deployed version string |
| `bundle_tag` | The project tag |
| `success` | `"true"` or `"false"` |

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Configuration error (missing/invalid `HEIMDELL_CONFIG`, unsupported command, missing required argument) |
| `2` | API error (authentication failure, server unreachable, list/rollback failure) |
| `3` | Build error (bundling failed, Hermes compilation failed) |
| `4` | Validation error (ruleset failed, bundle checkup failed) |
| `5` | Upload error (reserve failed, bundle upload failed) |
| `6` | Force-upgrade error (set-force-upgrade failed; bundle not found or server-side error) |

---

## Sentry Integration (Optional)

If Sentry is configured in your project, sourcemaps are automatically uploaded after a successful bundle. This requires the following environment variables:

| Variable | Description |
|---|---|
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry authentication token |

Sentry upload failure is **non-fatal** -- the deployment succeeds and a warning is emitted.

---

## Installing Heimdell CLI in CI

These workflows run in your **React Native project repository**, not in the heimdell-cli repo. The CLI must be installed as a build step before use.

### Option A: Clone and Link (recommended)

Clones the heimdell-cli repository, installs its dependencies, and links it globally via `bun link` so that `heimdell` is available as a command:

```yaml
      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link
```

After this step, `heimdell` is available globally for the rest of the job.

### Option B: Clone and Build a Standalone Binary

Compiles a self-contained executable with no runtime dependencies (does not require Bun at runtime):

```yaml
      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun run build:linux-x64
          sudo cp /tmp/heimdell-cli/dist/heimdell-linux-x64 /usr/local/bin/heimdell
```

### Option C: Download Pre-built Binary from Releases

If pre-built binaries are published to GitHub Releases:

```yaml
      - name: Install Heimdell CLI
        run: |
          curl -fsSL https://github.com/ShindouMihou/heimdell-cli/releases/latest/download/heimdell-linux-x64 \
            -o /usr/local/bin/heimdell
          chmod +x /usr/local/bin/heimdell
```

### Option D: Pin to a Specific Version

For reproducible builds, pin to a tag or commit:

```yaml
      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 --branch v1.0.0 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link
```

---

## GitHub Actions Examples

All examples below assume your workflow runs in your **React Native project repository**. Each workflow includes the Heimdell CLI installation step, project dependency installation, and the actual command.

### Basic: Push an OTA Update

```yaml
name: OTA Deploy

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Bundle version (semver)"
        required: true
      note:
        description: "Release note"
        required: false
        default: ""

jobs:
  deploy-ota:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link

      - name: Install project dependencies
        run: bun install

      - name: Push OTA Update
        id: ota
        run: |
          heimdell push-update "${{ inputs.version }}" \
            --note "${{ inputs.note }}" \
            --use-ci
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}

      - name: Summary
        if: success()
        run: |
          echo "### OTA Deploy Successful" >> $GITHUB_STEP_SUMMARY
          echo "- **Bundle ID:** ${{ steps.ota.outputs.bundle_id }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Version:** ${{ steps.ota.outputs.bundle_version }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Tag:** ${{ steps.ota.outputs.bundle_tag }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Triggered by:** ${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
```

### With Parallel Bundling

Replace the push step with:

```yaml
      - name: Push OTA Update (parallel)
        id: ota
        run: |
          heimdell push-update "${{ inputs.version }}" \
            --note "${{ inputs.note }}" \
            --use-ci=parallel
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
```

### With Sentry Sourcemaps

Add Sentry environment variables to the push step:

```yaml
      - name: Push OTA Update
        id: ota
        run: |
          heimdell push-update "${{ inputs.version }}" \
            --note "${{ inputs.note }}" \
            --use-ci
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

### Full Deploy with Slack Notification

This workflow notifies a Slack channel on success or failure, including who triggered the deployment.

```yaml
name: OTA Deploy

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Bundle version (semver)"
        required: true
      note:
        description: "Release note"
        required: false
        default: ""

jobs:
  deploy-ota:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link

      - name: Install project dependencies
        run: bun install

      - name: Push OTA Update
        id: ota
        run: |
          heimdell push-update "${{ inputs.version }}" \
            --note "${{ inputs.note }}" \
            --use-ci=parallel
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      - name: Notify Slack (Success)
        if: success()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "OTA Update Deployed"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*Version:*\n${{ inputs.version }}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Bundle ID:*\n${{ steps.ota.outputs.bundle_id }}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Tag:*\n${{ steps.ota.outputs.bundle_tag }}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Triggered by:*\n<https://github.com/${{ github.actor }}|@${{ github.actor }}>"
                    }
                  ]
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Note:* ${{ inputs.note || '_No release note provided_' }}"
                  }
                },
                {
                  "type": "context",
                  "elements": [
                    {
                      "type": "mrkdwn",
                      "text": "<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View workflow run>"
                    }
                  ]
                }
              ]
            }

      - name: Notify Slack (Failure)
        if: failure()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "OTA Update Failed"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*Version:*\n${{ inputs.version }}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Triggered by:*\n<https://github.com/${{ github.actor }}|@${{ github.actor }}>"
                    }
                  ]
                },
                {
                  "type": "context",
                  "elements": [
                    {
                      "type": "mrkdwn",
                      "text": "<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View workflow run>"
                    }
                  ]
                }
              ]
            }
```

### Push a Mandatory (Force-Upgrade) Update

Use this when shipping a critical fix that every user MUST install before they can keep using the app. The mobile client reads `forceUpgrade: true` from the update-check response and is expected to show a non-dismissible upgrade screen.

```yaml
name: OTA Force-Upgrade Deploy

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Bundle version (semver)"
        required: true
      note:
        description: "Why is this upgrade mandatory?"
        required: true

jobs:
  deploy-ota:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link

      - name: Install project dependencies
        run: bun install

      - name: Push Force-Upgrade OTA Update
        id: ota
        run: |
          heimdell push-update "${{ inputs.version }}" \
            --note "${{ inputs.note }}" \
            --force-upgrade \
            --use-ci=parallel
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
```

### Retroactively Flag an Existing Bundle as Force-Upgrade

Use this when you already pushed a bundle and only afterwards realize it is critical.

```yaml
name: OTA Mark Force-Upgrade

on:
  workflow_dispatch:
    inputs:
      bundle_id:
        description: "Bundle ID to flag as force-upgrade"
        required: true

jobs:
  mark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link

      - name: Mark bundle as force-upgrade
        run: heimdell set-force-upgrade "${{ inputs.bundle_id }}" --use-ci
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
```

To clear the flag later, add `--disable`:

```yaml
      - name: Clear force-upgrade flag
        run: heimdell set-force-upgrade "${{ inputs.bundle_id }}" --disable --use-ci
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}
```

### Rollback with Slack

```yaml
name: OTA Rollback

on:
  workflow_dispatch:

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Heimdell CLI
        run: |
          git clone --depth 1 https://github.com/ShindouMihou/heimdell-cli.git /tmp/heimdell-cli
          cd /tmp/heimdell-cli && bun install && bun link

      - name: Install project dependencies
        run: bun install

      - name: Rollback
        id: rollback
        run: heimdell rollback --use-ci
        env:
          HEIMDELL_CONFIG: ${{ secrets.HEIMDELL_CONFIG }}

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "OTA Rollback ${{ job.status == 'success' && 'Completed' || 'Failed' }}"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*Status:*\n${{ job.status }}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Triggered by:*\n<https://github.com/${{ github.actor }}|@${{ github.actor }}>"
                    }
                  ]
                },
                {
                  "type": "context",
                  "elements": [
                    {
                      "type": "mrkdwn",
                      "text": "<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View workflow run>"
                    }
                  ]
                }
              ]
            }
```

---

## Setting Up Secrets

### `HEIMDELL_CONFIG`

The easiest way to generate this value is the built-in `export:config` command, which decrypts your locally stored credentials and prints a CI-ready JSON payload:

```bash
# Compact JSON (copy directly into a GitHub secret)
heimdell export:config production

# Encrypted credentials: pass the key explicitly
heimdell export:config production --key "$MY_KEY"

# Or via env var (useful for scripts)
HEIMDELL_ENCRYPTION_KEY=mysecret heimdell export:config production

# Pretty-print for inspection
heimdell export:config production --pretty

# Emit a shell export statement (for .env files or direct sourcing)
heimdell export:config production --export >> .env.ci
```

**Exit codes:**
- `0` success
- `1` missing environment, missing fields, or missing key in non-TTY mode
- `2` invalid encryption key

Alternatively, construct the JSON manually:

```bash
echo '{"baseUrl":"https://heimdell.example.com","username":"deploy","password":"secret","tag":"my-app","platforms":["android","ios"]}' | jq .
```

Go to your repository's **Settings > Secrets and variables > Actions** and create a secret named `HEIMDELL_CONFIG` with the JSON value.

### Slack Notifications (Optional)

1. **Create an Incoming Webhook** in your Slack workspace:
   - Go to [Slack API: Incoming Webhooks](https://api.slack.com/messaging/webhooks)
   - Create a new app (or use an existing one)
   - Enable "Incoming Webhooks"
   - Add a webhook to your target channel
   - Copy the webhook URL

2. **Store the webhook URL** as a GitHub Actions secret named `SLACK_WEBHOOK_URL`.

The `${{ github.actor }}` context variable is automatically set by GitHub Actions to the username of the person (or bot) that triggered the workflow. This is included in all Slack notification templates above so your team always knows who initiated the deployment.

---

## Troubleshooting

### `MISSING_CONFIG` (exit code 1)
The `HEIMDELL_CONFIG` environment variable is not set. Ensure it is passed to the step via the `env` block.

### `INVALID_JSON` (exit code 1)
The `HEIMDELL_CONFIG` value is not valid JSON. Verify the secret value is properly escaped and parseable.

### `INVALID_CONFIG` (exit code 1)
The JSON parsed but failed schema validation. Check that all required fields are present and `platforms` contains at least one of `"android"` or `"ios"`.

### `BUNDLE_FAILED` (exit code 3)
Metro/Hermes bundling failed. Check that your React Native project compiles locally first. Ensure all native dependencies are installed.

### `RULESET_FAILED` (exit code 4)
Ruleset validation blocked the deployment. Check your `.heimdell/ruleset.json` rules against the current environment variables and config.

### `RESERVE_FAILED` / `UPLOAD_FAILED` (exit code 5)
Server-side failure during bundle reservation or upload. Verify your Heimdell server is reachable and credentials are valid.

### `SET_FORCE_UPGRADE_FAILED` (exit code 6)
The `set-force-upgrade` command failed. Common causes: the supplied `bundleId` does not exist on the server (verify against `heimdell list-bundles --use-ci`), the server rejected the request (auth failure — check credentials), or a network error. The JSON `error` event on stdout contains the server-side message.

### Timeout
Commands have a 10-minute timeout. If bundling exceeds this, consider splitting platforms or optimizing your Metro configuration.
