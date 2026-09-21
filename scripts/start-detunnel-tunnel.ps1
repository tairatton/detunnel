<#Requires -Version 5.1
.SYNOPSIS
Starts the detunnel Secure MCP Tunnel against the running Desktop loopback HTTP
MCP with long TTL, file logging, and automatic restart when the tunnel drops.

.DESCRIPTION
- Reads the encrypted Runtime API key from %APPDATA%\tunnel-client\detunnel.runtime.secret (DPAPI)
- Runs `tunnel-client doctor` then `tunnel-client run`
- Passes --mcp.connection-max-ttl 168h0m0s so ChatGPT connections do not drop every 10 minutes
- Writes tunnel logs to %APPDATA%\tunnel-client\detunnel-tunnel.log (tailed by the detunnel dashboard)
- Requires the profile to target detunnel Desktop's loopback HTTP MCP
- Starts detunnel Desktop first when it is not already running; Desktop Settings own Active Project, permission profile, and native approvals
- Restarts the tunnel automatically when tunnel-client exits for any reason including TTL (exit 0)
- Opens the detunnel log viewer window after start (use -NoViewer to skip)

.PARAMETER TunnelClientPath
Path to tunnel-client.exe. Defaults to the tunnel-client bundled with the per-user detunnel installation.

.PARAMETER DetunnelPath
Path to detunnel.exe (desktop app / viewer). Defaults to the per-user install location
%LOCALAPPDATA%\Programs\detunnel\detunnel.exe

.PARAMETER NoViewer
Do not open the detunnel log viewer window.

.PARAMETER OpenDashboard
Open the full desktop dashboard instead of the small log viewer window.

.PARAMETER ForceRestart
Retained for compatibility. It cannot bypass the ownership lock and never stops a tunnel owned by another launcher.

.PARAMETER Once
Run tunnel-client once and exit with its code. Default is to keep restarting.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-detunnel-tunnel.ps1"
#>

param(
  [string]$TunnelClientPath,
  [string]$DetunnelPath,
  [switch]$NoViewer,
  [switch]$OpenDashboard,
  [switch]$ForceRestart,
  [switch]$Once
)

# Auto-load .env if available
$repoRoot = Split-Path -Parent $PSScriptRoot
$candidateEnvFiles = @(
  (Join-Path $repoRoot '.env'),
  (Join-Path (Get-Location) '.env')
)
foreach ($envFile in $candidateEnvFiles) {
  if (Test-Path -LiteralPath $envFile) {
    Get-Content $envFile | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
        $envKey = $matches[1].Trim()
        $envVal = $matches[2].Trim().Trim('"').Trim("'")
        if (-not [System.Environment]::GetEnvironmentVariable($envKey)) {
          [System.Environment]::SetEnvironmentVariable($envKey, $envVal, [System.EnvironmentVariableTarget]::Process)
        }
      }
    }
    break
  }
}

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ([string]::IsNullOrWhiteSpace($DetunnelPath)) {
  $DetunnelPath = if ($env:DETUNNEL_PATH) { $env:DETUNNEL_PATH } else { Join-Path $env:LOCALAPPDATA 'Programs\detunnel\detunnel.exe' }
}
if ([string]::IsNullOrWhiteSpace($TunnelClientPath)) {
  $TunnelClientPath = if ($env:DETUNNEL_TUNNEL_CLIENT_PATH) {
    $env:DETUNNEL_TUNNEL_CLIENT_PATH
  } else {
    Join-Path (Split-Path -Parent $DetunnelPath) 'resources\tunnel-client\tunnel-client.exe'
  }
}

$profileName = 'detunnel'
$profileDir = Join-Path $env:APPDATA 'tunnel-client'
$secretPath = Join-Path $profileDir 'detunnel.runtime.secret'
$logPath = Join-Path $profileDir 'detunnel-tunnel.log'
$stopFile = Join-Path $profileDir 'detunnel.tunnel.stop'
$mcpTtl = '168h0m0s'
$maxRapidRestarts = 5
$rapidRestartCount = 0
$rapidRestartWindowStarted = Get-Date

if (-not (Test-Path $TunnelClientPath)) { throw "Missing tunnel-client: $TunnelClientPath" }
if (-not (Test-Path $secretPath)) { throw "Missing encrypted runtime key: $secretPath. Save the key once with: Read-Host 'Tunnel runtime API key' -AsSecureString | ConvertFrom-SecureString | Set-Content '$secretPath'" }

function Test-DetunnelTunnelRunning {
  $probe = Get-CimInstance Win32_Process -Filter "Name = 'tunnel-client.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match '(?i)(--profile\s+detunnel|detunnel\.yaml)' }
  return [bool]$probe
}

function Test-DetunnelTunnelStopRequested {
  if ($env:DETUNNEL_TUNNEL_STOP -eq '1' -or $env:DETUNNEL_TUNNEL_STOP -eq 'true') { return $true }
  return Test-Path -LiteralPath $stopFile
}

function Get-DetunnelTunnelExitHint {
  if (-not (Test-Path -LiteralPath $logPath)) { return '' }
  $tail = @(Get-Content -LiteralPath $logPath -Tail 120 -ErrorAction SilentlyContinue)
  $pattern = 'TTL reached|stdio MCP command exited|MCP server|server_url|requesting tunnel-client shutdown'
  $hit = $tail | Where-Object { $_ -match $pattern } | Select-Object -Last 1
  if ([string]::IsNullOrWhiteSpace($hit)) { return '' }
  $compact = ([regex]::Replace([string]$hit, '\s+', ' ')).Trim()
  if ($compact.Length -gt 180) { $compact = $compact.Substring(0, 177) + "..." }
  return (' -- ' + $compact)
}

# Secure Tunnel forwards to the Desktop HTTP MCP. Desktop Settings, not this
# transport-only launcher process, own Active Project and authorization policy.
# Long connection ceiling so ChatGPT does not drop every 10 minutes (tunnel-client default).
$env:MCP_CONNECTION_MAX_TTL = $mcpTtl
$env:TUNNEL_CLIENT_PROFILE_DIR = $profileDir

$scriptRootResolved = (Resolve-Path -LiteralPath $PSScriptRoot -ErrorAction Stop).Path.TrimEnd([IO.Path]::DirectorySeparatorChar)
$lockHelperRequested = Join-Path $PSScriptRoot 'lib\\detunnel-tunnel-lock.ps1'
$lockHelperResolved = (Resolve-Path -LiteralPath $lockHelperRequested -ErrorAction Stop).Path
$lockHelperItem = Get-Item -LiteralPath $lockHelperResolved -Force -ErrorAction Stop
$trustedPrefix = $scriptRootResolved + [IO.Path]::DirectorySeparatorChar
if (-not $lockHelperResolved.StartsWith($trustedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Tunnel lock helper resolved outside the trusted script directory.'
}
if ($lockHelperItem.PSIsContainer -or (($lockHelperItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
  throw 'Tunnel lock helper must be a trusted regular file, not a directory or reparse point.'
}
. $lockHelperResolved
$lockOwner = $null
$keyPointer = $null
try {
  $selfProbe = Get-DetunnelTunnelProcessProbe -OwnerPid $PID
  if ($selfProbe.state -ne 'live') { throw "Could not verify launcher process ownership: $($selfProbe.reason)" }
  $lockClaim = Enter-DetunnelTunnelLock -ProfileDir $profileDir -OwnerPid $PID -OwnerStartedAt $selfProbe.processStartedAt -ProcessStartProvider { param($ownerPid) Get-DetunnelTunnelProcessProbe -OwnerPid $ownerPid }
  if (-not $lockClaim.acquired) {
    Write-Host ("detunnel tunnel is already owned by PID {0} (started {1})." -f $lockClaim.owner.pid, $lockClaim.owner.processStartedAt)
    exit 0
  }
  $lockOwner = $lockClaim.owner
  # Only the winning owner may clear a previous session's stop marker.
  if ((Test-DetunnelTunnelLockOwner -Left $lockOwner -Right $lockClaim.owner) -and (Test-Path -LiteralPath $stopFile)) {
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction Stop
  }
  if ($ForceRestart) { Write-Host 'detunnel tunnel: -ForceRestart cannot bypass the ownership lock.' }
  if (Test-DetunnelTunnelRunning) { Write-Host 'detunnel tunnel: existing tunnel-client process detected as status evidence; the lock remains authoritative.' }
  $profilePath = Join-Path $profileDir 'detunnel.yaml'
  if (-not (Test-Path -LiteralPath $profilePath -PathType Leaf)) { throw "Missing tunnel profile: $profilePath. Open detunnel Desktop and run Configure Tunnel first." }
  $profileText = Get-Content -LiteralPath $profilePath -Raw
  if ($profileText -notmatch '(?m)^\s*server_urls:\s*$' -or $profileText -notmatch '(?i)https?://(?:127\.0\.0\.1|localhost|\[?::1\]?):\d+/mcp') {
    throw 'Tunnel profile is not configured for detunnel Desktop HTTP MCP. Open detunnel Desktop and run Configure Tunnel again.'
  }
  if (-not (Test-Path -LiteralPath $DetunnelPath -PathType Leaf)) { throw "Missing detunnel Desktop executable: $DetunnelPath" }
  if ($null -eq (Get-Process -Name 'detunnel' -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    Write-Host 'detunnel tunnel: starting Desktop host required for HTTP MCP and native approvals ...'
    Start-Process -FilePath $DetunnelPath
    Start-Sleep -Seconds 2
  }

  # Decrypt the DPAPI secret into this session only after ownership is secured.
  $encrypted = Get-Content $secretPath -Raw
  $secureKey = ConvertTo-SecureString -String $encrypted
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $env:CONTROL_PLANE_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)

  Write-Host "detunnel tunnel: running doctor ..."
  & $TunnelClientPath doctor --profile $profileName --profile-dir $profileDir --explain
  if ($LASTEXITCODE -ne 0) { throw "tunnel-client doctor failed with exit code $LASTEXITCODE" }

  Write-Host "detunnel tunnel: starting (TTL $mcpTtl, log: $logPath)"
  Write-Host 'detunnel tunnel: MCP target = Desktop loopback HTTP; Desktop Settings own Active Project and approvals.'
  Write-Host 'detunnel tunnel: auto-restart is ON (TTL/exit 0 still restarts). Ctrl+C or DETUNNEL_TUNNEL_STOP=1 to stop.'

  if (-not $NoViewer -and (Test-Path $DetunnelPath)) {
    if ($OpenDashboard) {
      Start-Process -FilePath $DetunnelPath
    } else {
      Start-Process -FilePath $DetunnelPath -ArgumentList @('--log-viewer')
    }
  }

  while ($true) {
    if (Test-DetunnelTunnelStopRequested) {
      Write-Host 'detunnel tunnel: stop requested.'
      exit 0
    }

    & $TunnelClientPath run --profile $profileName --profile-dir $profileDir --log.file $logPath --mcp.connection-max-ttl $mcpTtl
    $exitCode = $LASTEXITCODE
    if ($null -eq $exitCode) { $exitCode = -1 }
    $hint = Get-DetunnelTunnelExitHint

    if ($Once) {
      Write-Host ("detunnel tunnel: tunnel-client exited ({0}){1}" -f $exitCode, $hint)
      exit $exitCode
    }
    if (Test-DetunnelTunnelStopRequested) {
      Write-Host ("detunnel tunnel: stop requested after exit ({0}){1}" -f $exitCode, $hint)
      exit 0
    }

    $elapsed = ((Get-Date) - $rapidRestartWindowStarted).TotalSeconds
    if ($elapsed -gt 30) {
      $rapidRestartCount = 0
      $rapidRestartWindowStarted = Get-Date
    }
    $rapidRestartCount += 1
    if ($rapidRestartCount -gt $maxRapidRestarts) {
      throw ("tunnel-client exited {0} times in a short window; automatic restart paused. Fix the Desktop MCP/profile and start again.{1}" -f $maxRapidRestarts, $hint)
    }
    $delaySeconds = [int][Math]::Min(30, 3 * [Math]::Pow(2, $rapidRestartCount - 1))
    Write-Host ("detunnel tunnel: tunnel-client exited ({0}){1} - restarting in {2} seconds (attempt {3}/{4}) ..." -f $exitCode, $hint, $delaySeconds, $rapidRestartCount, $maxRapidRestarts)
    Start-Sleep -Seconds $delaySeconds
  }
}
finally {
  if ($null -ne $keyPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
  Remove-Item Env:CONTROL_PLANE_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TUNNEL_CLIENT_PROFILE_DIR -ErrorAction SilentlyContinue
  if ($null -ne $lockOwner) {
    $released = Release-DetunnelTunnelLock -ProfileDir $profileDir -Owner $lockOwner
    if (-not $released) { throw 'Tunnel ownership release could not be confirmed; the lock was retained for retry' }
  }
}
