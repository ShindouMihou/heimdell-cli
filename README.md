# Heimdell CLI

**Heimdell CLI** is the companion command-line tool for Heimdell, enabling fast over-the-air (OTA) updates for React Native apps via [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update).

## 🚀 Features
- **Fast Bundling**: Utilizes Bun for rapid JavaScript bundling.
- **Easy Integration**: Seamlessly works with `react-native-ota-hot-update` for runtime updates.
- **Multi-Environment Support**: Manage different environments (e.g., staging, production) with ease.
- **Rulesets**: Define rules to prevent accidental deployments to the wrong environment.
- **Version Control**: Push, list, and roll back to previous bundles effortlessly.
- **Cross-Platform**: Works on macOS, Linux, and Windows.
- **Secure**: Credentials are stored locally and is encrypted.
- **Interactive CLI**: User-friendly prompts guide you through the update process.
- **Audit Logging**: Keep track of all updates and changes by sending logs to a Slack channel, or your designated reporting method. [`view more`](https://github.com/ShindouMihou/heimdell).

## ⚙️ How It Works

Heimdell operates as a two-component system:

1. CLI Tool (this repo): bundles your React Native app and uploads the output to a Heimdell server.
2. Heimdell Server: stores and serves updates that your app downloads at runtime via [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update).

Your app checks for updates; the server returns metadata and assets prepared by this CLI.

## 🚧 Project Status

> Heimdell is currently under development.
> These issues or limitations are only on Windows due to the different mechanism of their
> ZIP command.

Known limitations (for Windows) being worked on:

- Image and asset references may not be fully resolved in the current bundling flow.
- Incomplete support for apps using the new React Native architecture.

## 🔧 Installation

### Quick Install

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.ps1 | iex
```

The installer will:

- Check for [Bun](https://bun.sh) and offer to install it if missing.
- Clone this repository into `~/.heimdell/src` and build a self-contained `heimdell` binary for your platform via `bun build --compile`.
- Install the binary to `~/.heimdell/bin/heimdell` (or `%USERPROFILE%\.heimdell\bin\heimdell.exe` on Windows).
- Add that directory to your shell `PATH`.

After install, open a new terminal (or `source ~/.zshrc`) and run `heimdell login` to get started.

**Configuration:**

| Variable | Default | Purpose |
| --- | --- | --- |
| `HEIMDELL_INSTALL` | `$HOME/.heimdell` | Install root |
| `HEIMDELL_REF` | `master` | Git ref to install |
| `HEIMDELL_REPO` | official GitHub URL | Override for forks or mirrors |
| `HEIMDELL_YES` | unset | If `1`, skip all confirmations |

Pass `--yes` / `-Yes` to the script for the same effect as `HEIMDELL_YES=1`.

### Advanced / Manual Install

<details>
<summary>Download a prebuilt binary</summary>

- Grab a prebuilt executable from GitHub Releases (tags starting with `v*`).
- Place it on your `PATH`. On macOS/Linux, ensure it's executable.
- (Linux/macOS) You may use the command `cp <downloaded-file> /usr/local/bin/heimdell` to copy it to a common location.

</details>

<details>
<summary>Build from source</summary>

```bash
bun install
bun run build:all
```

Output binaries land in `dist/`.

</details>

## ▶️ Usage

Open the folder of the React Native project you want to bundle, 
then run the command:
```bash
heimdell login
```

It should create a `.heimdell/credentials.json` file in the current directory. 
Never **EVER** commit this folder to version control.

> Generally, you'd have multiple Heimdell instances for different environments (e.g., staging, production).
> You can add those environments by running:
> ```bash
> heimdell login -e <environment-name>
>```
> 
> Once added, you can switch between them using:
> ```bash
>heimdell env <environment-name>
> ```
> By default, the environment is set to `default`.

Then you can use the following commands:
```bash
# Preview checks and push a new update bundle
heimdell push-update <version>

# If you trust us to run the commands (except pushing the update to Heimdell)
# automatically without your confirmation, use:
heimdell push-update <version> --yes

# List bundles on the server
heimdell list-bundles

# Roll back to a previous bundle
heimdell rollback
```

All the commands will execute for the specific project in the current working directory, 
and will run different commands, highlighted during execution, to bundle the app and upload it to the server.

### 💂‍♂️ Preventive Deployments

To prevent accidental wrong deployments, such as having staging environment variables pushed into production, we have a feature called **Rulesets** where 
you can define rules for each environment that needs to be fulfilled before pushing an update.

To get started, run the command:
```bash
heimdell ruleset-create
```

This will create a `ruleset.json` file in the `.heimdell` folder of your project. To understand the structure of the 
ruleset file, you can refer to the structure below:
```json5
{
  // This will be automatically generated by the command and is used for IDE validation and autocomplete.
  "$schema": "...",
  // The environment name this ruleset applies to, you can have multiple environments if you need.
  "environment-name": {
    // OPTIONAL, The .env file to check for the variables, relative to the project root.
    // It will load the environment variables from this file and check for the rules below.
    "$uses": ".env",
    "ensure": {
      // Define the property to validate, the available properties are:
      // - project.env.<VARIABLE_NAME>: checks if the environment variable is set in the .env file.
      // - project.tag - The tag defined for the project during `heimdell login`.
      // - project.environment - The environment defined for the project during `heimdell login`.
      // - project.platforms - The platforms defined for the project during `heimdell login`.
      // - project.username - The username defined for the project during `heimdell login`.
      // - project.baseUrl - The baseUrl to Heimdell defined for the project during `heimdell login`.
      "project.env.BASE_URL": {
        // You can define multiple rules for each property, the available rules are:
        // - eq: Checks if the property is equal to the value, this can be an array of strings or just a string.
        "eq": "https://api.yourdomain.com",
        "eq": ["https://api.yourdomain.com", "https://api-staging.yourdomain.com"],
        // - !eq: Checks if the property is not equal to the value, this can be an array of strings or just a string.
        "!eq": "https://api-wrong.yourdomain.com",
        "!eq": ["https://api-wrong.yourdomain.com", "https://api-wrong2.yourdomain.com"],
        // - contains: Checks if the property contains the value, this can be an array of strings or just a string.
        "contains": "yourdomain.com",
        "contains": ["yourdomain.com", "yourdomain2.com"],
        // - !contains: Checks if the property does not contain the value, this can be an array of strings or just a string.
        "!contains": "wrong.com",
        "!contains": ["wrong.com", "wrong2.com"],
        // - matches: Checks if the property matches the regex pattern, this must be a string.
        "matches": "^https://api\\.yourdomain\\.com$",
        // - !matches: Checks if the property does not match the regex pattern, this must be a string.
        "!matches": "^https://api\\.wrong\\.com$"
      }
    },
    // OPTIONAL, Define a custom error message to show when the rules are not fulfilled.
    "error": {
      "message": "You cannot push to production with the current BASE_URL.",
    }
  },
  "second-environment-name": {
  }
}
```

You can then save the file and Heimdell will automatically check for the ruleset file when you run the `push-update` command.

Notes:
- This CLI is Bun-specific and uses Bun APIs.
- Ensure your React Native project is set up correctly for bundling.

## 📚 Resources

- [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update) – OTA runtime update handler for React Native
- [`heimdell` backend server](https://github.com/ShindouMihou/heimdell) – stores and serves bundles prepared by this CLI
