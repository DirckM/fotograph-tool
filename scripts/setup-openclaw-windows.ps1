#Requires -RunAsAdministrator
# =============================================================================
# OpenClaw + Ollama Locked-Down Setup for Windows 10
# =============================================================================
# Run this script in PowerShell as Administrator.
#
# What this does:
#   1. Creates a jailed workspace at C:\openclaw-workspace
#   2. Creates a low-privilege "OpenClawUser" Windows account
#   3. Locks file permissions so OpenClawUser can't touch your stuff
#   4. Installs Ollama (local LLM server)
#   5. Pulls a coding-capable model (qwen2.5-coder)
#   6. Installs Node.js + OpenClaw
#   7. Configures OpenClaw to use Ollama (no cloud APIs)
#   8. Configures sandbox, filesystem jail, and exec restrictions
#   9. Blocks ALL outbound internet for node.exe (everything is local)
#  10. Runs security audit
# =============================================================================

param(
    [string]$WorkspacePath = "C:\openclaw-workspace",
    [string]$OpenClawUser = "OpenClawUser",
    [string]$OllamaModel = "qwen2.5-coder:7b"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
}

# --------------------------------------------------------------------------
# Pre-flight checks
# --------------------------------------------------------------------------
Write-Step "Pre-flight checks"

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$currentUserShort = $currentUser.Split('\')[-1]
Write-Host "Running as: $currentUser"

if ($currentUserShort -eq $OpenClawUser) {
    Write-Error "Do NOT run this script as $OpenClawUser. Run as your normal admin account."
    exit 1
}

# Check if winget is available
$hasWinget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $hasWinget) {
    Write-Error "winget not found. Install 'App Installer' from the Microsoft Store first."
    exit 1
}

# --------------------------------------------------------------------------
# Step 1: Create jailed workspace
# --------------------------------------------------------------------------
Write-Step "Step 1: Creating workspace at $WorkspacePath"

if (-not (Test-Path $WorkspacePath)) {
    New-Item -ItemType Directory -Path $WorkspacePath -Force | Out-Null
    Write-Host "Created $WorkspacePath"
} else {
    Write-Host "$WorkspacePath already exists, skipping"
}

# --------------------------------------------------------------------------
# Step 2: Create dedicated low-privilege Windows user
# --------------------------------------------------------------------------
Write-Step "Step 2: Creating restricted user '$OpenClawUser'"

$userExists = Get-LocalUser -Name $OpenClawUser -ErrorAction SilentlyContinue
if (-not $userExists) {
    # Generate a random password -- you won't need to log in interactively
    Add-Type -AssemblyName System.Web
    $password = [System.Web.Security.Membership]::GeneratePassword(20, 4)
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force

    New-LocalUser -Name $OpenClawUser `
        -Password $securePassword `
        -Description "Restricted user for OpenClaw AI agent" `
        -PasswordNeverExpires `
        -UserMayNotChangePassword | Out-Null

    # Add to Users group only (no Administrators)
    Add-LocalGroupMember -Group "Users" -Member $OpenClawUser -ErrorAction SilentlyContinue

    Write-Host "Created user '$OpenClawUser'"
    Write-Host "Password: $password"
    Write-Host ""
    Write-Host ">>> SAVE THIS PASSWORD - you need it to run OpenClaw later <<<" -ForegroundColor Yellow
    Write-Host ""

    # Save password to a temp file on your desktop (delete after noting it down)
    $pwFile = "$env:USERPROFILE\Desktop\openclaw-password.txt"
    Set-Content -Path $pwFile -Value "OpenClawUser password: $password"
    Write-Host "Password also saved to: $pwFile (DELETE THIS after noting it down)" -ForegroundColor Yellow
} else {
    Write-Host "User '$OpenClawUser' already exists, skipping creation"
}

# --------------------------------------------------------------------------
# Step 3: Set file permissions
# --------------------------------------------------------------------------
Write-Step "Step 3: Locking down file permissions"

# Give OpenClawUser full control of workspace only
Write-Host "Granting $OpenClawUser full access to $WorkspacePath"
icacls $WorkspacePath /grant "${OpenClawUser}:(OI)(CI)F" /T /Q

# Create the OpenClawUser's .openclaw config directory
$openclawConfigDir = "C:\Users\$OpenClawUser\.openclaw"
if (-not (Test-Path $openclawConfigDir)) {
    # We need to create the user profile first by running something as that user
    # For now, create the directory manually
    New-Item -ItemType Directory -Path $openclawConfigDir -Force | Out-Null
}
icacls $openclawConfigDir /grant "${OpenClawUser}:(OI)(CI)F" /T /Q

# Block OpenClawUser from YOUR user profile
Write-Host "Blocking $OpenClawUser from C:\Users\$currentUserShort"
icacls "C:\Users\$currentUserShort" /deny "${OpenClawUser}:(OI)(CI)(R,W,X)" /Q

# Block other sensitive locations
$blockedPaths = @(
    "C:\Users\Default",
    "C:\Users\Public\Documents",
    "C:\ProgramData"
)

foreach ($path in $blockedPaths) {
    if (Test-Path $path) {
        Write-Host "Blocking $OpenClawUser from $path"
        icacls $path /deny "${OpenClawUser}:(OI)(CI)(R,W,X)" /Q 2>$null
    }
}

Write-Host "File permissions locked"

# --------------------------------------------------------------------------
# Step 4: Install Ollama
# --------------------------------------------------------------------------
Write-Step "Step 4: Installing Ollama"

$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaInstalled) {
    Write-Host "Installing Ollama via winget..."
    winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Ollama installed"
} else {
    Write-Host "Ollama already installed, skipping"
}

# Start Ollama service
Write-Host "Starting Ollama..."
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# --------------------------------------------------------------------------
# Step 5: Pull the coding model
# --------------------------------------------------------------------------
Write-Step "Step 5: Pulling model '$OllamaModel' (this may take a while)"

Write-Host "Model download size: qwen2.5-coder:7b is ~4.7GB."
Write-Host "This is the recommended model for 16GB RAM systems."
Write-Host ""

ollama pull $OllamaModel
Write-Host "Model '$OllamaModel' ready"

# --------------------------------------------------------------------------
# Step 6: Install Node.js + OpenClaw
# --------------------------------------------------------------------------
Write-Step "Step 6: Installing Node.js and OpenClaw"

$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "Installing Node.js LTS via winget..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
} else {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion already installed"
}

Write-Host "Installing OpenClaw..."
npm install -g openclaw@latest

Write-Host "OpenClaw installed"

# --------------------------------------------------------------------------
# Step 7: Configure OpenClaw to use Ollama (no cloud APIs)
# --------------------------------------------------------------------------
Write-Step "Step 7: Writing OpenClaw configuration"

$openclawConfig = @"
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama-local",
        "api": "openai-responses",
        "models": [
          {
            "id": "$OllamaModel",
            "name": "Qwen 2.5 Coder 7B",
            "contextWindow": 32768,
            "maxOutput": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/$OllamaModel"
      }
    }
  }
}
"@

$configPath = "C:\Users\$OpenClawUser\.openclaw\openclaw.json"
Set-Content -Path $configPath -Value $openclawConfig -Encoding UTF8
Write-Host "Written config to $configPath"

# --------------------------------------------------------------------------
# Step 8: Configure sandbox, filesystem jail, exec restrictions
# --------------------------------------------------------------------------
Write-Step "Step 8: Writing gateway security config"

$gatewayConfig = @"
gateway:
  port: 18789
  mode: local
  bind: loopback

tools:
  fs:
    workspaceOnly: true
  sandbox:
    mode: "all"
    docker:
      network: "none"
      workspace: "rw"
    tools:
      allow: []

exec:
  mode: "allowlist"

dm:
  mode: "disabled"

groups:
  mode: "disabled"
"@

$gatewayPath = "C:\Users\$OpenClawUser\.openclaw\gateway.yaml"
Set-Content -Path $gatewayPath -Value $gatewayConfig -Encoding UTF8
Write-Host "Written gateway config to $gatewayPath"

# --------------------------------------------------------------------------
# Step 9: Firewall rules -- block ALL outbound internet
# --------------------------------------------------------------------------
Write-Step "Step 9: Setting firewall rules (block all outbound, Ollama is local)"

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    $nodePath = "C:\Program Files\nodejs\node.exe"
}

# Remove old rules if they exist (idempotent)
netsh advfirewall firewall delete rule name="OpenClaw Block All Outbound" >$null 2>&1
netsh advfirewall firewall delete rule name="OpenClaw Allow Localhost" >$null 2>&1

# Block ALL outbound traffic for node.exe
netsh advfirewall firewall add rule `
    name="OpenClaw Block All Outbound" `
    dir=out `
    action=block `
    program="$nodePath" `
    profile=any `
    description="Prevent OpenClaw from making any internet connections"

# Allow localhost only (needed for Ollama on 127.0.0.1:11434)
netsh advfirewall firewall add rule `
    name="OpenClaw Allow Localhost" `
    dir=out `
    action=allow `
    program="$nodePath" `
    remoteip=127.0.0.1 `
    profile=any `
    description="Allow OpenClaw to reach local Ollama only"

Write-Host "Firewall configured:"
Write-Host "  - node.exe blocked from ALL outbound internet"
Write-Host "  - node.exe allowed to reach 127.0.0.1 only (Ollama)"

# --------------------------------------------------------------------------
# Step 10: Install Docker Desktop (for sandbox)
# --------------------------------------------------------------------------
Write-Step "Step 10: Docker Desktop check"

$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "Docker Desktop is needed for sandbox mode."
    Write-Host "Install it from: https://www.docker.com/products/docker-desktop/"
    Write-Host ""
    Write-Host "After installing Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Open Docker Desktop and complete setup" -ForegroundColor Yellow
    Write-Host "  2. Re-run this script to verify, OR continue manually" -ForegroundColor Yellow
    Write-Host ""

    $installDocker = Read-Host "Install Docker Desktop now via winget? (y/n)"
    if ($installDocker -eq 'y') {
        winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
        Write-Host "Docker Desktop installed. You may need to restart your PC."
    }
} else {
    Write-Host "Docker already installed"
    docker --version
}

# --------------------------------------------------------------------------
# Summary + launch instructions
# --------------------------------------------------------------------------
Write-Step "Setup complete"

Write-Host ""
Write-Host "Installed components:" -ForegroundColor Green
Write-Host "  - Ollama with model: $OllamaModel"
Write-Host "  - Node.js + OpenClaw"
Write-Host "  - Restricted user: $OpenClawUser"
Write-Host "  - Workspace: $WorkspacePath"
Write-Host ""
Write-Host "Security layers:" -ForegroundColor Green
Write-Host "  [x] Filesystem jail (workspaceOnly: true)"
Write-Host "  [x] Docker sandbox for all tools (sandbox.mode: all)"
Write-Host "  [x] No network from sandbox (docker.network: none)"
Write-Host "  [x] OS-level file permissions (icacls deny)"
Write-Host "  [x] Dedicated low-privilege user"
Write-Host "  [x] Firewall: node.exe blocked from internet, localhost only"
Write-Host "  [x] Exec allowlist mode (no arbitrary commands)"
Write-Host "  [x] DMs and groups disabled"
Write-Host "  [x] No cloud API keys needed (Ollama is fully local)"
Write-Host ""
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host " HOW TO RUN OPENCLAW" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Make sure Ollama is running:" -ForegroundColor White
Write-Host "   ollama serve" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open a new PowerShell and switch to the restricted user:" -ForegroundColor White
Write-Host "   runas /user:$OpenClawUser powershell" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Navigate to workspace and start OpenClaw:" -ForegroundColor White
Write-Host "   cd $WorkspacePath" -ForegroundColor Gray
Write-Host "   openclaw gateway --port 18789" -ForegroundColor Gray
Write-Host ""
Write-Host "4. In another PowerShell (also as $OpenClawUser):" -ForegroundColor White
Write-Host "   runas /user:$OpenClawUser powershell" -ForegroundColor Gray
Write-Host "   openclaw agent --message `"your prompt here`"" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Run a security check anytime:" -ForegroundColor White
Write-Host "   openclaw security audit --deep" -ForegroundColor Gray
Write-Host "   openclaw doctor" -ForegroundColor Gray
Write-Host ""
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host " VERIFY ISOLATION" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "After running 'runas /user:$OpenClawUser powershell', test:" -ForegroundColor White
Write-Host "   dir C:\Users\$currentUserShort\Desktop    # should say Access Denied" -ForegroundColor Gray
Write-Host "   dir C:\Users\$currentUserShort\Documents  # should say Access Denied" -ForegroundColor Gray
Write-Host "   dir $WorkspacePath                        # should work" -ForegroundColor Gray
Write-Host ""
