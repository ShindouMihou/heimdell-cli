# Heimdell CLI

**Heimdell CLI** is the companion command-line tool for Heimdell, enabling fast over-the-air (OTA) updates for React Native apps via [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update).

## ⚙️ How It Works

Heimdell operates as a two-component system:

1. CLI Tool (this repo): bundles your React Native app and uploads the output to a Heimdell server.
2. Heimdell Server: stores and serves updates that your app downloads at runtime via [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update).

Your app checks for updates; the server returns metadata and assets prepared by this CLI.

## 🚧 Project Status

> Heimdell is currently under development.

Known limitations being worked on:

- Image and asset references may not be fully resolved in the current bundling flow.
- Incomplete support for apps using the new React Native architecture.

## 🔧 Setup

> This CLI uses Bun as its runtime. Install Bun from https://bun.sh.

### Option A: Download a Binary

- Grab a prebuilt executable from GitHub Releases (tags starting with `v*`).
- Place it on your PATH. On macOS/Linux, ensure it’s executable.
- (LINUX/MAC) You may use the command `cp <downloaded-file> /usr/local/bin/heimdell` to copy it to a common location.

### Option B: Build from Source

```bash
bun install
bun run build:all
```

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

# List bundles on the server
heimdell list-bundles

# Roll back to a previous bundle
heimdell rollback
```

All the commands will execute for the specific project in the current working directory, 
and will run different commands, highlighted during execution, to bundle the app and upload it to the server.

Notes:
- This CLI is Bun-specific and uses Bun APIs.
- Ensure your React Native project is set up correctly for bundling.

## 📚 Resources

- [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update) – OTA runtime update handler for React Native
- [`heimdell` backend server](https://github.com/ShindouMihou/heimdell) – stores and serves bundles prepared by this CLI
