# heimdell-cli

A command-line interface tool for managing over-the-air (OTA) updates using [Heimdell](https://github.com/ShindouMihou/heimdell) and [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update).

Use this tool to build, push, and manage updates for your React Native applications quickly and reliably.


## 🚀 Features

* 🔐 Login and auto-authenticate with Heimdell servers
* 📦 Push new OTA updates with full bundling support
* 📋 List all deployed bundles
* 🧯 Roll back to the previous stable update


## 📦 Installation

Clone the repository:
```
git clone https://github.com/ShindouMihou/heimdell-cli && cd heimdell-cli
```

Install dependencies:
```
bun install
```

Link the command-line tool:
```
bun link
```

## 🛠 Usage

```bash
heimdell <cmd> [args]
```

### Commands

#### 🔐 `heimdell login`

Logs into Heimdell and saves your credentials for future use within the current project. It also saves project-specific preferences such as 
what platforms to bundle and other details.

```bash
heimdell login
```

#### 📦 `heimdell push-update <targetVersion> [note]`

Bundles your React Native app and pushes the update to the Heimdell server. This will automatically create the bundle script 
for your project depending on your chosen platforms during `login` and also depending on your system (windows-specific, Mac and Linux-specific scripts).

* `targetVersion`: The version number the update is targeting (e.g., `1.0.1`)
* `note` (optional): A short description of what the update includes.

```bash
heimdell push-update 1.0.1 "Fix splash screen bug and update icons"
```

#### 📋 `heimdell list-bundles`

Lists all bundles associated with your project that are registered in Heimdell.

```bash
heimdell list-bundles
```

#### 🧯 `heimdell rollback`

Rolls back your app to the previous bundle version. This invalidates the previous bundle and makes your application 
think that this is a new version, forcing all users to update to the previous bundle version.

```bash
heimdell rollback
```

### Global Options

| Option      | Description                 |
| ----------- | --------------------------- |
| `--version` | Show CLI version            |
| `--help`    | Show CLI usage/help message |

## 🗂 Configuration

When you first run `login`, we store project-specific configuration under the `.heimdell` folder which should not be committed at all. This folder contains your credentials to the Heimdell service and leaking that credentials could lead to vulnerabilities and exploits in your application, such as, malicious actors pushing a bad update to your application, and so forth.

## 📌 Requirements

* A React Native project configured for [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update)
* Heimdell server must be up and running
* [Bun](bun.sh)

## 📚 Related Repos

* [Heimdell Server](https://github.com/ShindouMihou/heimdell)
* [react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update)

## 🧪 Status

This CLI is experimental and in active development. Features may change. Feedback and contributions are welcome.
