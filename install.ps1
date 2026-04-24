#Requires -Version 5.1

<#
.SYNOPSIS
  Heimdell CLI installer for Windows.

.DESCRIPTION
  Clones heimdell-cli, ensures Bun is installed, builds a self-contained
  heimdell.exe via 'bun build --compile', installs it under
  %USERPROFILE%\.heimdell\bin, and adds that directory to the user PATH.

.PARAMETER Yes
  Skip all interactive confirmations (equivalent to HEIMDELL_YES=1).

.PARAMETER Help
  Show help and exit.

.PARAMETER Version
  Show installer version and exit.

.EXAMPLE
  irm https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.ps1 | iex

.EXAMPLE
  .\install.ps1 -Yes
#>

param(
    [switch]$Yes,
    [switch]$Help,
    [switch]$Version
)

$ErrorActionPreference = 'Stop'

$script:InstallerVersion = '0.1.0'
$script:DefaultRepo      = 'https://github.com/ShindouMihou/heimdell-cli.git'
$script:MinBunVersion    = [version]'1.2.5'
$script:TotalSteps       = 8

$script:InstallRoot = if ($env:HEIMDELL_INSTALL) { $env:HEIMDELL_INSTALL } else { Join-Path $env:USERPROFILE '.heimdell' }
$script:Ref         = if ($env:HEIMDELL_REF)     { $env:HEIMDELL_REF }     else { 'master' }
$script:Repo        = if ($env:HEIMDELL_REPO)    { $env:HEIMDELL_REPO }    else { $script:DefaultRepo }
$script:AssumeYes   = $Yes.IsPresent -or ($env:HEIMDELL_YES -eq '1')

$script:Step      = 0
$script:InstallOk = $false
$script:TmpLog    = Join-Path ([System.IO.Path]::GetTempPath()) ("heimdell-install-{0}.log" -f [Guid]::NewGuid().ToString('N'))

function Write-Info { param([string]$Message) Write-Host "info  $Message" -ForegroundColor Cyan }
function Write-Warn { param([string]$Message) Write-Host "warn  $Message" -ForegroundColor Yellow }
function Write-Err  { param([string]$Message) Write-Host "error $Message" -ForegroundColor Red }

function Write-Step {
    param([string]$Message)
    $script:Step++
    Write-Host ("[{0}/{1}] {2}" -f $script:Step, $script:TotalSteps, $Message) -ForegroundColor White
}

function Show-Help {
    @"
heimdell-cli installer v$($script:InstallerVersion)

Usage:
  irm https://raw.githubusercontent.com/ShindouMihou/heimdell-cli/master/install.ps1 | iex
  .\install.ps1 [-Yes] [-Help] [-Version]

Parameters:
  -Yes       Skip all interactive confirmations (equivalent to HEIMDELL_YES=1)
  -Help      Show this help and exit
  -Version   Show installer version and exit

Environment:
  HEIMDELL_INSTALL   Install root (default: %USERPROFILE%\.heimdell)
  HEIMDELL_REF       Git ref to install (default: master)
  HEIMDELL_REPO      Repository URL
  HEIMDELL_YES       If "1", skip all confirmations
"@ | Write-Host
}

if ($Help)    { Show-Help; exit 0 }
if ($Version) { Write-Host $script:InstallerVersion; exit 0 }

function Confirm-Prompt {
    param([string]$Prompt)
    if ($script:AssumeYes) { return $true }
    try {
        $reply = Read-Host "? $Prompt [Y/n]"
    } catch {
        Write-Warn "No interactive input available and HEIMDELL_YES is not set. Assuming no: $Prompt"
        return $false
    }
    if ([string]::IsNullOrWhiteSpace($reply)) { return $true }
    return $reply -match '^[Yy]'
}

function Assert-Command {
    param(
        [string]$Name,
        [string]$Hint
    )
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' is required but not installed. $Hint"
    }
}

function Get-WindowsArch {
    $raw = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' `
            -ErrorAction SilentlyContinue).PROCESSOR_ARCHITECTURE
    if (-not $raw) { $raw = $env:PROCESSOR_ARCHITECTURE }
    return $raw
}

function Test-BunVersion {
    param([string]$VersionString)
    if ([string]::IsNullOrWhiteSpace($VersionString)) { return $false }
    $clean = ($VersionString.Trim() -split '[-+]')[0]
    try {
        $parsed = [version]$clean
        return $parsed -ge $script:MinBunVersion
    } catch {
        return $false
    }
}

function Format-BunVersion {
    param($VersionString)
    if ([string]::IsNullOrWhiteSpace($VersionString)) { return 'unknown' }
    return $VersionString.Trim()
}

function Invoke-BunInstaller {
    $bunScript = Join-Path ([System.IO.Path]::GetTempPath()) ("bun-install-{0}.ps1" -f [Guid]::NewGuid().ToString('N'))
    try {
        Invoke-WebRequest -Uri 'https://bun.sh/install.ps1' -OutFile $bunScript -UseBasicParsing
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $bunScript
        if ($LASTEXITCODE -ne 0) {
            throw "Bun installer exited with code $LASTEXITCODE."
        }
    } finally {
        if (Test-Path $bunScript) {
            Remove-Item -Force -ErrorAction SilentlyContinue $bunScript
        }
    }

    $bunBin = Join-Path $env:USERPROFILE '.bun\bin'
    if (Test-Path $bunBin) {
        $env:Path = "$bunBin;$env:Path"
    }
}

function Initialize-Bun {
    Write-Step "Ensuring Bun >= $($script:MinBunVersion)"
    $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    if ($bunCmd) {
        $current = (& bun --version 2>$null)
        if (Test-BunVersion $current) {
            Write-Info "Found Bun $(Format-BunVersion $current)."
            return
        }
        Write-Warn "Found Bun $(Format-BunVersion $current), but >= $($script:MinBunVersion) is required."
        if (-not (Confirm-Prompt "Run 'bun upgrade' now?")) {
            throw "Please upgrade Bun to >= $($script:MinBunVersion) and re-run."
        }
        & bun upgrade
        if ($LASTEXITCODE -ne 0) {
            throw "bun upgrade failed (exit $LASTEXITCODE)."
        }
        $current = (& bun --version 2>$null)
        if (-not (Test-BunVersion $current)) {
            throw "Bun upgrade did not reach $($script:MinBunVersion) (got $(Format-BunVersion $current))."
        }
        return
    }

    Write-Warn "Bun is not installed."
    if (-not (Confirm-Prompt "Install Bun from https://bun.sh now?")) {
        throw "Bun is required. Install it from https://bun.sh and re-run this installer."
    }

    Write-Info "Installing Bun via https://bun.sh/install.ps1 ..."
    Invoke-BunInstaller

    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        throw "Bun installer finished but 'bun' is not on PATH. Open a new PowerShell session and re-run."
    }
    Write-Info "Bun $(& bun --version) installed."
}

function Invoke-CloneOrUpdate {
    Write-Step "Fetching source ($($script:Ref))"
    $src = Join-Path $script:InstallRoot 'src'
    New-Item -Force -ItemType Directory -Path $script:InstallRoot | Out-Null

    if (Test-Path (Join-Path $src '.git')) {
        Write-Info "Updating existing clone at $src."
        & git -C $src fetch --depth=1 origin $script:Ref
        if ($LASTEXITCODE -ne 0) { throw "git fetch failed (exit $LASTEXITCODE)." }
        & git -C $src reset --hard FETCH_HEAD
        if ($LASTEXITCODE -ne 0) { throw "git reset failed (exit $LASTEXITCODE)." }
    } else {
        if (Test-Path $src) {
            $backup = "$src.bak.$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
            Write-Warn "Non-git path at $src; moving aside to $backup."
            Move-Item -Force $src $backup
        }
        Write-Info "Cloning $($script:Repo) ..."
        & git clone --depth=1 --branch $script:Ref -- $script:Repo $src
        if ($LASTEXITCODE -ne 0) { throw "git clone failed (exit $LASTEXITCODE)." }
    }
}

function Invoke-Build {
    Write-Step "Building heimdell.exe (windows-x64)"
    $src = Join-Path $script:InstallRoot 'src'
    Push-Location $src
    try {
        Write-Info "Installing dependencies (bun install)..."
        & bun install --frozen-lockfile 2>&1 | Tee-Object -FilePath $script:TmpLog -Append
        if ($LASTEXITCODE -ne 0) { throw "bun install failed (exit $LASTEXITCODE). See $($script:TmpLog)." }

        Write-Info "Compiling binary (bun run build:windows-x64)..."
        & bun run build:windows-x64 2>&1 | Tee-Object -FilePath $script:TmpLog -Append
        if ($LASTEXITCODE -ne 0) { throw "bun build failed (exit $LASTEXITCODE). See $($script:TmpLog)." }
    } finally {
        Pop-Location
    }

    $artifact = Join-Path $src 'dist\heimdell-windows-x64.exe'
    if (-not (Test-Path $artifact)) {
        throw "Build completed but expected artifact not found: $artifact"
    }
}

function Install-Binary {
    Write-Step "Installing heimdell.exe"
    $src      = Join-Path $script:InstallRoot 'src'
    $binDir   = Join-Path $script:InstallRoot 'bin'
    $artifact = Join-Path $src 'dist\heimdell-windows-x64.exe'
    $target   = Join-Path $binDir 'heimdell.exe'
    $tmpDst   = Join-Path $binDir 'heimdell.exe.new'

    New-Item -Force -ItemType Directory -Path $binDir | Out-Null
    Copy-Item -Force $artifact $tmpDst
    Move-Item -Force $tmpDst $target
    Write-Info "Installed to $target"
}

$script:PathBroadcastType = @"
using System;
using System.Runtime.InteropServices;

public static class HeimdellPathBroadcaster {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        UIntPtr wParam,
        string lParam,
        uint fuFlags,
        uint uTimeout,
        out UIntPtr lpdwResult);

    public static void Broadcast() {
        UIntPtr result;
        SendMessageTimeout(
            new IntPtr(0xffff),
            0x001A,
            UIntPtr.Zero,
            "Environment",
            2,
            5000,
            out result);
    }
}
"@

function Update-UserPath {
    Write-Step "Wiring user PATH"
    $binDir = Join-Path $script:InstallRoot 'bin'
    $current = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not $current) { $current = '' }

    $entries = $current -split ';' | Where-Object { $_ -ne '' }
    if ($entries -contains $binDir) {
        Write-Info "PATH already contains $binDir."
    } else {
        $newPath = if ([string]::IsNullOrEmpty($current)) { $binDir } else { "$binDir;$current" }
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Info "Added $binDir to user PATH."

        if (-not ('HeimdellPathBroadcaster' -as [type])) {
            try {
                Add-Type -TypeDefinition $script:PathBroadcastType -ErrorAction Stop
            } catch {
                Write-Warn "Could not load PATH broadcast helper: $($_.Exception.Message)"
            }
        }
        if ('HeimdellPathBroadcaster' -as [type]) {
            try {
                [HeimdellPathBroadcaster]::Broadcast()
            } catch {
                Write-Warn "PATH change broadcast failed; new shells will still pick it up."
            }
        }
    }

    [Environment]::SetEnvironmentVariable('HEIMDELL_INSTALL', $script:InstallRoot, 'User')
    $env:Path = "$binDir;$env:Path"
    $env:HEIMDELL_INSTALL = $script:InstallRoot
}

function Test-Install {
    Write-Step "Verifying installation"
    $exe = Join-Path $script:InstallRoot 'bin\heimdell.exe'
    & $exe --help *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Installed binary failed to execute (exit $LASTEXITCODE). See $($script:TmpLog)."
    }
    Write-Info "Binary executes successfully."
}

function Show-Success {
    Write-Host ''
    Write-Host '✓ Heimdell CLI installed' -ForegroundColor Green
    Write-Host "  binary: $(Join-Path $script:InstallRoot 'bin\heimdell.exe')"
    Write-Host "  source: $(Join-Path $script:InstallRoot 'src')"
    Write-Host ''
    Write-Host 'Open a new PowerShell or Command Prompt to pick up the updated PATH, then run:'
    Write-Host '  heimdell login' -ForegroundColor White
    Write-Host ''
}

function Save-InstallLog {
    if (-not (Test-Path $script:TmpLog)) { return }
    try {
        New-Item -Force -ItemType Directory -Path $script:InstallRoot | Out-Null
        $dst = Join-Path $script:InstallRoot 'install.log'
        Copy-Item -Force $script:TmpLog $dst
        Write-Warn "Install log saved to $dst"
    } catch {
    }
}

function Test-Inputs {
    if ([string]::IsNullOrWhiteSpace($script:InstallRoot)) {
        throw 'HEIMDELL_INSTALL cannot be empty.'
    }
    if ($script:InstallRoot -match '[\r\n]') {
        throw 'HEIMDELL_INSTALL contains newline characters.'
    }
    if ($script:InstallRoot -match '[`$;|&<>()"]') {
        throw 'HEIMDELL_INSTALL contains disallowed shell metacharacters.'
    }

    if ([string]::IsNullOrWhiteSpace($script:Repo)) {
        throw 'HEIMDELL_REPO cannot be empty.'
    }
    if ($script:Repo.StartsWith('-')) {
        throw "HEIMDELL_REPO must not start with '-'."
    }
    if (-not ($script:Repo -match '^(https://|[A-Za-z]:[\\/]|[\\/])')) {
        throw 'HEIMDELL_REPO must be an https:// URL or an absolute path.'
    }

    if ([string]::IsNullOrWhiteSpace($script:Ref)) {
        throw 'HEIMDELL_REF cannot be empty.'
    }
    if ($script:Ref.StartsWith('-')) {
        throw "HEIMDELL_REF must not start with '-'."
    }
    if (-not ($script:Ref -match '^[A-Za-z0-9._/-]+$')) {
        throw 'HEIMDELL_REF contains invalid characters.'
    }
}

function Main {
    Test-Inputs

    try {
        Write-Step 'Detecting platform'
        $arch = Get-WindowsArch
        switch ($arch) {
            'AMD64' { Write-Info "Detected AMD64 (x64)." }
            'ARM64' { Write-Warn "Detected ARM64. The windows-x64 binary will run under emulation." }
            default { throw "Unsupported PROCESSOR_ARCHITECTURE: $arch" }
        }

        Write-Step 'Checking prerequisites'
        Assert-Command 'git' 'Install it from https://git-scm.com/downloads.'

        Initialize-Bun
        Invoke-CloneOrUpdate
        Invoke-Build
        Install-Binary
        Update-UserPath
        Test-Install

        $script:InstallOk = $true
        Show-Success
    } catch {
        Write-Err $_.Exception.Message
        Save-InstallLog
        exit 1
    } finally {
        if (Test-Path $script:TmpLog) {
            Remove-Item -Force -ErrorAction SilentlyContinue $script:TmpLog
        }
    }
}

Main
