#!/usr/bin/env bash
#
# Heimdell CLI installer (macOS and Linux).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.sh | bash
#   bash install.sh [--yes]
#
# Environment:
#   HEIMDELL_INSTALL   Install root (default: $HOME/.heimdell)
#   HEIMDELL_REF       Git ref to install (default: master)
#   HEIMDELL_REPO      Repository URL (default: official GitHub repo)
#   HEIMDELL_YES       If "1", skip all interactive confirmations
#   NO_COLOR           Disable colored output

set -euo pipefail

readonly INSTALLER_VERSION="0.1.0"
readonly DEFAULT_REPO="https://github.com/ShindouMihou/heimdell-cli.git"
readonly PS1_URL="https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.ps1"
readonly MIN_BUN_VERSION="1.2.5"
readonly PATH_MARKER_START="# >>> heimdell-cli installer >>>"
readonly PATH_MARKER_END="# <<< heimdell-cli installer <<<"
readonly TOTAL_STEPS=8

HEIMDELL_INSTALL="${HEIMDELL_INSTALL:-$HOME/.heimdell}"
HEIMDELL_REF="${HEIMDELL_REF:-master}"
HEIMDELL_REPO="${HEIMDELL_REPO:-$DEFAULT_REPO}"
HEIMDELL_YES="${HEIMDELL_YES:-0}"

TARGET=""
TMP_LOG=""
INSTALL_OK=0
STEP=0

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    C_RESET=$'\033[0m'
    C_BOLD=$'\033[1m'
    C_DIM=$'\033[2m'
    C_RED=$'\033[31m'
    C_GREEN=$'\033[32m'
    C_YELLOW=$'\033[33m'
    C_BLUE=$'\033[34m'
else
    C_RESET=''
    C_BOLD=''
    C_DIM=''
    C_RED=''
    C_GREEN=''
    C_YELLOW=''
    C_BLUE=''
fi

info() { printf '%b\n' "${C_BLUE}info${C_RESET}  $*" >&2; }
warn() { printf '%b\n' "${C_YELLOW}warn${C_RESET}  $*" >&2; }
err()  { printf '%b\n' "${C_RED}error${C_RESET} $*" >&2; }
die()  { err "$*"; exit 1; }
step() {
    STEP=$((STEP + 1))
    printf '%b\n' "${C_BOLD}[${STEP}/${TOTAL_STEPS}]${C_RESET} $*" >&2
}

usage() {
    cat >&2 <<EOF
heimdell-cli installer v${INSTALLER_VERSION}

Usage:
  curl -fsSL https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.sh | bash
  bash install.sh [--yes] [--help] [--version]

Flags:
  --yes       Skip all interactive confirmations (equivalent to HEIMDELL_YES=1)
  --help      Show this help and exit
  --version   Show installer version and exit

Environment:
  HEIMDELL_INSTALL   Install root (default: \$HOME/.heimdell)
  HEIMDELL_REF       Git ref to install (default: master)
  HEIMDELL_REPO      Repository URL (default: ${DEFAULT_REPO})
  HEIMDELL_YES       If "1", skip all confirmations
  NO_COLOR           Disable colored output
EOF
}

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --yes|-y) HEIMDELL_YES=1 ;;
            --help|-h) usage; exit 0 ;;
            --version|-V) printf '%s\n' "$INSTALLER_VERSION"; exit 0 ;;
            *) die "Unknown argument: $arg (use --help)" ;;
        esac
    done
}

check_windows() {
    if [ "${OS:-}" = "Windows_NT" ]; then
        info "Windows detected — delegating to the PowerShell installer."
        if command -v powershell >/dev/null 2>&1; then
            exec powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${PS1_URL} | iex"
        fi
        die "PowerShell not found on PATH. Run this instead: irm ${PS1_URL} | iex"
    fi
}

confirm() {
    local prompt="$1"
    if [ "$HEIMDELL_YES" = "1" ]; then
        return 0
    fi
    if [ ! -r /dev/tty ]; then
        warn "No interactive terminal and HEIMDELL_YES is not set. Assuming no: $prompt"
        return 1
    fi
    local reply
    printf '%b ' "${C_BOLD}?${C_RESET} ${prompt} [Y/n]" > /dev/tty
    if ! read -r reply < /dev/tty; then
        return 1
    fi
    case "$reply" in
        ""|[Yy]|[Yy][Ee][Ss]) return 0 ;;
        *) return 1 ;;
    esac
}

version_ge() {
    [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

validate_inputs() {
    if [ -z "$HEIMDELL_INSTALL" ]; then
        die "HEIMDELL_INSTALL cannot be empty."
    fi
    if [ "$HEIMDELL_INSTALL" = "/" ]; then
        die "HEIMDELL_INSTALL cannot be '/'."
    fi
    case "$HEIMDELL_INSTALL" in
        *[\"\\\`\$\;\|\&\<\>\(\)]*)
            die "HEIMDELL_INSTALL contains disallowed shell metacharacters."
            ;;
    esac
    if printf '%s' "$HEIMDELL_INSTALL" | LC_ALL=C grep -q '[[:cntrl:]]'; then
        die "HEIMDELL_INSTALL contains control characters."
    fi

    if [ -z "$HEIMDELL_REPO" ]; then
        die "HEIMDELL_REPO cannot be empty."
    fi
    case "$HEIMDELL_REPO" in
        -*) die "HEIMDELL_REPO must not start with '-'." ;;
    esac
    case "$HEIMDELL_REPO" in
        https://*|/*) : ;;
        *) die "HEIMDELL_REPO must be an https:// URL or an absolute path." ;;
    esac

    if [ -z "$HEIMDELL_REF" ]; then
        die "HEIMDELL_REF cannot be empty."
    fi
    case "$HEIMDELL_REF" in
        -*) die "HEIMDELL_REF must not start with '-'." ;;
        *[!A-Za-z0-9._/-]*) die "HEIMDELL_REF contains invalid characters." ;;
    esac
}

cleanup() {
    local ec=$?
    trap - EXIT INT TERM
    if [ "$INSTALL_OK" -ne 1 ] && [ -n "$TMP_LOG" ] && [ -f "$TMP_LOG" ]; then
        if mkdir -p "$HEIMDELL_INSTALL" 2>/dev/null && cp "$TMP_LOG" "$HEIMDELL_INSTALL/install.log" 2>/dev/null; then
            warn "Install failed. Full log: $HEIMDELL_INSTALL/install.log"
        fi
    fi
    [ -n "$TMP_LOG" ] && rm -f "$TMP_LOG"
    exit "$ec"
}

detect_platform() {
    step "Detecting platform"
    local platform
    platform="$(uname -ms)"
    case "$platform" in
        "Darwin arm64")
            TARGET="darwin-arm64"
            ;;
        "Darwin x86_64")
            if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
                warn "Rosetta 2 translation detected. Installing the native arm64 binary instead."
                TARGET="darwin-arm64"
            else
                TARGET="darwin-x64"
            fi
            ;;
        "Linux x86_64")
            if [ -f /etc/alpine-release ]; then
                die "Alpine Linux is not supported (no musl build target yet). Please build manually from source."
            fi
            if ldd --version 2>&1 | grep -qi musl; then
                die "musl libc is not supported yet. Please build manually from source."
            fi
            TARGET="linux-x64"
            ;;
        "Linux aarch64"|"Linux arm64")
            die "linux-arm64 is not yet supported. Please build manually from source."
            ;;
        *)
            die "Unsupported platform: ${platform}"
            ;;
    esac
    info "Platform: ${platform} -> target ${TARGET}"
}

preflight() {
    step "Checking prerequisites"
    command -v git  >/dev/null 2>&1 || die "git is required. Install it from https://git-scm.com and re-run."
    command -v curl >/dev/null 2>&1 || die "curl is required. Install it and re-run."
}

ensure_bun() {
    step "Ensuring Bun >= ${MIN_BUN_VERSION}"
    if command -v bun >/dev/null 2>&1; then
        local current
        current="$(bun --version 2>/dev/null | tr -d '[:space:]')"
        if [ -n "$current" ] && version_ge "$current" "$MIN_BUN_VERSION"; then
            info "Found Bun ${current}."
            return 0
        fi
        warn "Found Bun ${current:-unknown}, but >= ${MIN_BUN_VERSION} is required."
        if ! confirm "Run 'bun upgrade' now?"; then
            die "Please upgrade Bun to >= ${MIN_BUN_VERSION} and re-run."
        fi
        bun upgrade
        current="$(bun --version 2>/dev/null | tr -d '[:space:]')"
        version_ge "$current" "$MIN_BUN_VERSION" || die "Bun upgrade did not reach ${MIN_BUN_VERSION} (got ${current:-unknown})."
        return 0
    fi

    warn "Bun is not installed."
    if ! confirm "Install Bun from https://bun.sh now?"; then
        die "Bun is required. Install it from https://bun.sh and re-run this installer."
    fi

    info "Installing Bun via https://bun.sh/install ..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
    export PATH="$BUN_INSTALL/bin:$PATH"

    command -v bun >/dev/null 2>&1 || die "Bun installer finished but 'bun' is not on PATH. Open a new shell and re-run."
    info "Bun $(bun --version) installed."
}

clone_or_update_source() {
    step "Fetching source (${HEIMDELL_REF})"
    local src="$HEIMDELL_INSTALL/src"
    mkdir -p "$HEIMDELL_INSTALL"
    chmod 0700 "$HEIMDELL_INSTALL" 2>/dev/null || true
    if [ -d "$src/.git" ]; then
        info "Updating existing clone at $src."
        git -C "$src" fetch --depth=1 origin "$HEIMDELL_REF"
        git -C "$src" reset --hard FETCH_HEAD
    else
        if [ -e "$src" ]; then
            local backup="${src}.bak.$(date +%s)"
            warn "Non-git path exists at $src; moving aside to $backup."
            mv "$src" "$backup"
        fi
        info "Cloning ${HEIMDELL_REPO} ..."
        git clone --depth=1 --branch "$HEIMDELL_REF" -- "$HEIMDELL_REPO" "$src"
    fi
}

build_binary() {
    step "Building heimdell binary for ${TARGET}"
    local src="$HEIMDELL_INSTALL/src"
    info "Installing dependencies (bun install)..."
    (cd "$src" && bun install --frozen-lockfile) 2>&1 | tee -a "$TMP_LOG"
    info "Compiling binary (bun run build:${TARGET})..."
    (cd "$src" && bun run "build:${TARGET}") 2>&1 | tee -a "$TMP_LOG"

    local artifact="$src/dist/heimdell-${TARGET}"
    [ -f "$artifact" ] || die "Build completed but expected artifact not found: $artifact"
}

install_binary() {
    step "Installing binary to $HEIMDELL_INSTALL/bin/heimdell"
    local src="$HEIMDELL_INSTALL/src"
    local artifact="$src/dist/heimdell-${TARGET}"
    local bin_dir="$HEIMDELL_INSTALL/bin"
    mkdir -p "$bin_dir"
    install -m 0755 "$artifact" "$bin_dir/heimdell.new"
    mv -f "$bin_dir/heimdell.new" "$bin_dir/heimdell"
}

wire_shell_rc() {
    local rc="$1"
    local block="$2"
    [ -f "$rc" ] || return 0
    if grep -qF "$PATH_MARKER_START" "$rc"; then
        info "PATH already configured in $rc."
        return 0
    fi
    printf '\n%s\n' "$block" >> "$rc"
    info "Added PATH block to $rc."
}

wire_path() {
    step "Wiring PATH"
    local bin_dir="$HEIMDELL_INSTALL/bin"
    local sh_block
    sh_block="$(cat <<EOF
$PATH_MARKER_START
export HEIMDELL_INSTALL="$HEIMDELL_INSTALL"
export PATH="\$HEIMDELL_INSTALL/bin:\$PATH"
$PATH_MARKER_END
EOF
)"
    local fish_block
    fish_block="$(cat <<EOF
$PATH_MARKER_START
set -gx HEIMDELL_INSTALL "$HEIMDELL_INSTALL"
fish_add_path -gP "\$HEIMDELL_INSTALL/bin"
$PATH_MARKER_END
EOF
)"

    local wrote_any=0 rc
    for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile"; do
        if [ -f "$rc" ]; then
            wire_shell_rc "$rc" "$sh_block"
            wrote_any=1
        fi
    done

    local fish_rc="$HOME/.config/fish/config.fish"
    if [ -f "$fish_rc" ]; then
        wire_shell_rc "$fish_rc" "$fish_block"
        wrote_any=1
    fi

    if [ "$wrote_any" -eq 0 ]; then
        warn "No supported shell RC file found (~/.zshrc, ~/.bashrc, ~/.bash_profile, ~/.config/fish/config.fish)."
        warn "Add this to your shell config manually:"
        printf '\n%s\n\n' "$sh_block" >&2
    fi

    export PATH="$bin_dir:$PATH"
}

self_verify() {
    step "Verifying installation"
    local bin="$HEIMDELL_INSTALL/bin/heimdell"
    if ! "$bin" --help >/dev/null 2>&1; then
        die "Installed binary at $bin failed to execute. See $HEIMDELL_INSTALL/install.log"
    fi
    info "Binary executes successfully."
}

success_banner() {
    printf '\n'
    printf '%b\n' "${C_GREEN}${C_BOLD}✓ Heimdell CLI installed${C_RESET}"
    printf '%b\n' "  ${C_DIM}binary:${C_RESET}  $HEIMDELL_INSTALL/bin/heimdell"
    printf '%b\n' "  ${C_DIM}source:${C_RESET}  $HEIMDELL_INSTALL/src"
    printf '\n'
    printf '%b\n' "Reload your shell to use the ${C_BOLD}heimdell${C_RESET} command:"
    printf '%b\n' "  ${C_BOLD}source ~/.zshrc${C_RESET}  ${C_DIM}# or open a new terminal${C_RESET}"
    printf '\n'
    printf '%b\n' "Then try:"
    printf '%b\n' "  ${C_BOLD}heimdell login${C_RESET}"
    printf '\n'
}

main() {
    check_windows
    parse_args "$@"
    validate_inputs

    TMP_LOG="$(mktemp "${TMPDIR:-/tmp}/heimdell-install.XXXXXX.log")"
    trap cleanup EXIT INT TERM

    detect_platform
    preflight
    ensure_bun
    clone_or_update_source
    build_binary
    install_binary
    wire_path
    self_verify

    INSTALL_OK=1
    success_banner
}

main "$@"
