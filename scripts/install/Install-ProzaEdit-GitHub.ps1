#Requires -Version 5.1
<#
.SYNOPSIS
  Install ProzaEdit (hosted manifest) into Word Desktop on Windows.

.DESCRIPTION
  ProzaEdit's task pane loads from GitHub Pages; Word only needs the manifest.
  Modern Word Desktop cannot "Upload My Add-in", so there are two supported desktop routes:

  1) -RegisterLocalCatalog  SHARED FOLDER route (Microsoft-documented).
       Word's Trusted Add-in Catalog must be a NETWORK path (\\PC\Share), not a local
       path or file:// URI. This script puts the manifest in a local folder, shares that
       folder as \\<this PC>\ProzaEditCatalog (one UAC prompt), and registers the UNC path.
  2) -DeveloperSideload     NO-ADMIN, NO-SHARE route (same registry key Microsoft's own
       office-addin-dev-settings tool uses): HKCU\...\Wef\Developer.

  With no switch it only copies/downloads and validates the manifest, then prints the options.
  The manifest is checked for desktop rules first (resource ids max 32 chars, no localhost).

.PARAMETER ManifestUrl
  Raw GitHub URL for manifest.hosted.xml (used with -Download or when no repo copy exists).

.PARAMETER CatalogDir
  Local folder that holds manifest.hosted.xml (default: %USERPROFILE%\ProzaEditCatalog).

.PARAMETER ShareName
  Network share name for -RegisterLocalCatalog (default: ProzaEditCatalog).

.PARAMETER Download
  Fetch the manifest from GitHub even if a repo copy sits next to this script.

.PARAMETER ClearOfficeCache
  Delete %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\ contents (Word must be closed).

.PARAMETER Uninstall
  Remove the catalog registration, Developer sideload entry and network share.

.EXAMPLE
  .\Install-ProzaEdit-GitHub.ps1 -RegisterLocalCatalog -ClearOfficeCache
  .\Install-ProzaEdit-GitHub.ps1 -DeveloperSideload
#>
[CmdletBinding()]
param(
  [string] $ManifestUrl = "https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml",
  [string] $CatalogDir = "",
  [string] $ShareName = "ProzaEditCatalog",
  [switch] $Download,
  [switch] $RegisterLocalCatalog,
  [switch] $DeveloperSideload,
  [switch] $ClearOfficeCache,
  [switch] $Uninstall
)

$ErrorActionPreference = "Stop"

# Office 2016, 2019, 2021 and Microsoft 365 all use the 16.0 registry hive.
$OfficeVer = "16.0"
$AddinId = "d1829e3a-4931-4122-b911-37f22941aa99"
# Stable id for the catalog registry entry (separate from the add-in id).
$CatalogGuid = "{f4a7d3c1-8b2e-4c59-9a1d-6e0b3c5d7f21}"
$MaxResourceIdLength = 32

if (-not $CatalogDir) {
  $CatalogDir = Join-Path $env:USERPROFILE "ProzaEditCatalog"
}

function Write-Step([string]$Message) { Write-Host ("[ProzaEdit] " + $Message) }
function Write-Warn([string]$Message) { Write-Host ("[ProzaEdit] WARNING: " + $Message) -ForegroundColor Yellow }

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-WordRunning {
  return [bool](Get-Process -Name WINWORD -ErrorAction SilentlyContinue)
}

function Quote-Ps([string]$Text) { return $Text.Replace("'", "''") }

# Runs PowerShell text elevated (UAC prompt unless already admin). Returns the exit code.
function Invoke-Elevated([string]$ScriptText) {
  $enc = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($ScriptText))
  $psArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $enc)
  if (Test-IsAdmin) {
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $psArgs -Wait -PassThru -WindowStyle Hidden
  } else {
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $psArgs -Verb RunAs -Wait -PassThru -WindowStyle Hidden
  }
  return $proc.ExitCode
}

# Desktop Word is stricter than Word on the web: it silently ignores an invalid manifest.
function Test-ManifestForDesktop([string]$Path) {
  $problems = New-Object System.Collections.Generic.List[string]
  $version = ""
  $text = ""
  try {
    $text = Get-Content -Raw -Path $Path
    $xml = [xml]$text
    $version = [string]$xml.OfficeApp.Version
    if (-not $xml.OfficeApp.Id) { $problems.Add("Manifest has no <Id>.") }
  } catch {
    $problems.Add("Not valid XML: " + $_.Exception.Message)
    return [pscustomobject]@{ Ok = $false; Version = $version; Problems = $problems }
  }

  foreach ($m in [regex]::Matches($text, '<bt:(?:Image|Url|String)\s+id="([^"]+)"')) {
    $id = $m.Groups[1].Value
    if ($id.Length -gt $MaxResourceIdLength) { $problems.Add("Resource id longer than $MaxResourceIdLength characters ($($id.Length)): $id") }
  }
  foreach ($m in [regex]::Matches($text, '\sresid="([^"]+)"')) {
    $id = $m.Groups[1].Value
    if ($id.Length -gt $MaxResourceIdLength) { $problems.Add("resid longer than $MaxResourceIdLength characters ($($id.Length)): $id") }
  }
  if ($text -match 'localhost') { $problems.Add("Manifest points at localhost. Use manifest.hosted.xml, not manifest.xml.") }
  if ($text -notmatch 'SourceLocation\s+DefaultValue="https://') { $problems.Add("SourceLocation is not an https URL.") }
  foreach ($m in [regex]::Matches($text, '<AppDomain>([^<]+)</AppDomain>')) {
    $ad = $m.Groups[1].Value.Trim().TrimEnd('/')
    if ($ad -notmatch '^https://') { $problems.Add("AppDomain must use https: $ad") }
    elseif ($ad -match '^https://[^/]+/.+') {
      $problems.Add("AppDomain must be the site root only (Word web upload rejects a path): $ad")
    }
  }

  return [pscustomobject]@{ Ok = ($problems.Count -eq 0); Version = $version; Problems = $problems }
}

function Get-ManifestIntoCatalog {
  New-Item -ItemType Directory -Path $CatalogDir -Force | Out-Null
  $dest = Join-Path $CatalogDir "manifest.hosted.xml"
  $repoCopy = Join-Path $PSScriptRoot "..\..\manifest.hosted.xml"

  if ((-not $Download) -and (Test-Path -LiteralPath $repoCopy)) {
    Copy-Item -LiteralPath $repoCopy -Destination $dest -Force
    Write-Step "Copied manifest from this repo checkout."
  } else {
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
    Write-Step "Downloading manifest from GitHub..."
    Invoke-WebRequest -Uri $ManifestUrl -OutFile $dest -UseBasicParsing
  }

  $check = Test-ManifestForDesktop $dest
  Write-Step "Saved: $dest (Version $($check.Version))"
  if (-not $check.Ok) {
    foreach ($p in $check.Problems) { Write-Host ("  - " + $p) -ForegroundColor Red }
    throw "Manifest would not load in Word Desktop. If this came from GitHub, run 'git pull' (or merge the fix to main) and re-run; or omit -Download to use this repo copy."
  }
  Write-Step "Manifest passes the desktop checks."
  return $dest
}

# Old builds registered a file:// URI keyed by the add-in id. Word ignores it; remove it.
function Remove-LegacyCatalogEntry {
  $legacy = "HKCU:\Software\Microsoft\Office\$OfficeVer\WEF\TrustedCatalogs\{$AddinId}"
  if (Test-Path -LiteralPath $legacy) {
    $url = (Get-ItemProperty -LiteralPath $legacy -Name "Url" -ErrorAction SilentlyContinue).Url
    if ($url -and $url -like "file:*") {
      Remove-Item -LiteralPath $legacy -Recurse -Force
      Write-Step "Removed old non-working catalog entry ($url)."
    }
  }
}

function Test-PolicyOverride {
  $policy = "HKCU:\Software\Policies\Microsoft\Office\$OfficeVer\WEF"
  if (Test-Path -LiteralPath $policy) {
    $disable = Get-ItemProperty -LiteralPath $policy -ErrorAction SilentlyContinue
    if ($disable.DisableAllCatalogs -eq 1) { Write-Warn "Policy 'Block Web Add-ins' (DisableAllCatalogs) is on; Word will hide Shared Folder add-ins. Ask your IT admin." }
    $tc = Join-Path $policy "TrustedCatalogs"
    if ((Test-Path -LiteralPath $tc) -and (Get-ChildItem -LiteralPath $tc -ErrorAction SilentlyContinue)) {
      Write-Warn "Group Policy defines Trusted Catalogs under $tc; Microsoft says that overrides the per-user key this script writes."
    }
  }
}

function Ensure-NetworkShare {
  $uncUrl = "\\$env:COMPUTERNAME\$ShareName"
  if (Test-Path -LiteralPath (Join-Path $uncUrl "manifest.hosted.xml")) {
    Write-Step "Network share already works: $uncUrl"
    return $uncUrl
  }

  $server = Get-Service -Name LanmanServer -ErrorAction SilentlyContinue
  if ($server -and $server.Status -ne "Running") {
    Write-Warn "The Windows 'Server' service (file sharing) is stopped. Starting it needs the elevated step below."
  }

  Write-Step "Creating network share $uncUrl (a Windows admin prompt will appear)..."
  $acct = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $script = @"
`$ErrorActionPreference = 'Stop'
Set-Service -Name LanmanServer -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name LanmanServer -ErrorAction SilentlyContinue
`$s = Get-SmbShare -Name '$(Quote-Ps $ShareName)' -ErrorAction SilentlyContinue
if (`$s -and `$s.Path -ne '$(Quote-Ps $CatalogDir)') { Remove-SmbShare -Name '$(Quote-Ps $ShareName)' -Force; `$s = `$null }
if (-not `$s) { New-SmbShare -Name '$(Quote-Ps $ShareName)' -Path '$(Quote-Ps $CatalogDir)' -FullAccess '$(Quote-Ps $acct)' | Out-Null }
"@
  try {
    $code = Invoke-Elevated $script
  } catch {
    throw "Could not get administrator approval to create the share. Re-run and accept the prompt, or use -DeveloperSideload (no admin needed)."
  }
  if ($code -ne 0) { throw "Creating the network share failed (exit $code). Try -DeveloperSideload instead." }

  if (-not (Test-Path -LiteralPath (Join-Path $uncUrl "manifest.hosted.xml"))) {
    throw "Share was created but $uncUrl is not reachable. Check that 'File and Printer Sharing' is allowed in Windows Firewall, then re-run; or use -DeveloperSideload."
  }
  Write-Step "Network share OK: $uncUrl"
  return $uncUrl
}

function Register-TrustedCatalog([string]$UncUrl) {
  $regPath = "HKCU:\Software\Microsoft\Office\$OfficeVer\WEF\TrustedCatalogs\$CatalogGuid"
  New-Item -Path $regPath -Force | Out-Null
  Set-ItemProperty -LiteralPath $regPath -Name "Id" -Value $CatalogGuid -Type String
  # Microsoft's format: a UNC path such as \\Server\Share (not file:///...).
  Set-ItemProperty -LiteralPath $regPath -Name "Url" -Value $UncUrl -Type String
  Set-ItemProperty -LiteralPath $regPath -Name "Flags" -Value 1 -Type DWord
  Write-Step "Registered Trusted Add-in Catalog: $UncUrl"
}

function Register-DeveloperSideload([string]$ManifestPath) {
  $key = "HKCU:\Software\Microsoft\Office\$OfficeVer\Wef\Developer"
  New-Item -Path $key -Force | Out-Null
  Set-ItemProperty -LiteralPath $key -Name $AddinId -Value $ManifestPath -Type String
  Write-Step "Registered developer sideload: $ManifestPath"
}

function Clear-OfficeWefCache {
  if (Test-WordRunning) { throw "Close Word completely before using -ClearOfficeCache." }
  $wef = Join-Path $env:LOCALAPPDATA "Microsoft\Office\$OfficeVer\Wef"
  if (Test-Path -LiteralPath $wef) {
    Get-ChildItem -LiteralPath $wef -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Step "Cleared Office add-in cache: $wef"
  } else {
    Write-Step "No Office add-in cache folder found (nothing to clear)."
  }
}

try {
  if ($Uninstall) {
    if (Test-WordRunning) { Write-Warn "Word is open; close it so the change takes effect." }
    $cat = "HKCU:\Software\Microsoft\Office\$OfficeVer\WEF\TrustedCatalogs\$CatalogGuid"
    if (Test-Path -LiteralPath $cat) { Remove-Item -LiteralPath $cat -Recurse -Force; Write-Step "Removed catalog registration." }
    Remove-LegacyCatalogEntry
    $dev = "HKCU:\Software\Microsoft\Office\$OfficeVer\Wef\Developer"
    if ((Test-Path -LiteralPath $dev) -and (Get-ItemProperty -LiteralPath $dev -Name $AddinId -ErrorAction SilentlyContinue)) {
      Remove-ItemProperty -LiteralPath $dev -Name $AddinId -Force
      Write-Step "Removed developer sideload."
    }
    try {
      Invoke-Elevated "Remove-SmbShare -Name '$(Quote-Ps $ShareName)' -Force -ErrorAction SilentlyContinue" | Out-Null
      Write-Step "Removed network share (if it existed)."
    } catch { Write-Warn "Share not removed (admin prompt declined)." }
    Write-Step "Done. Files in $CatalogDir were left in place."
    exit 0
  }

  if ($RegisterLocalCatalog -and $DeveloperSideload) {
    throw "Choose one: -RegisterLocalCatalog (Shared Folder) or -DeveloperSideload, not both (the same add-in would appear twice)."
  }

  if ($ClearOfficeCache) { Clear-OfficeWefCache }
  if (Test-WordRunning) { Write-Warn "Word is open. Close it completely (check Task Manager for WINWORD.EXE) so changes load." }

  $manifestPath = Get-ManifestIntoCatalog
  Remove-LegacyCatalogEntry

  if ($RegisterLocalCatalog) {
    Test-PolicyOverride
    $uncUrl = Ensure-NetworkShare
    Register-TrustedCatalog -UncUrl $uncUrl
    Write-Host ""
    Write-Host "=== Next: open ProzaEdit in Word Desktop (Shared Folder) ===" -ForegroundColor Cyan
    Write-Host "1. Close Word completely, then reopen it with a blank document."
    Write-Host "2. Home -> Add-ins -> Advanced (or Insert -> Get Add-ins / My Add-ins)."
    Write-Host "3. Click the SHARED FOLDER tab, select ProzaEdit, click Add."
    Write-Host "4. Home -> ProzaEdit opens the task pane."
    Write-Host "If SHARED FOLDER is empty: re-run with -ClearOfficeCache, then verify with Verify-ProzaEdit-Install.bat."
    Write-Host "Still empty? Use -DeveloperSideload instead."
  } elseif ($DeveloperSideload) {
    Register-DeveloperSideload -ManifestPath $manifestPath
    Write-Host ""
    Write-Host "=== Next: open ProzaEdit in Word Desktop (Developer sideload) ===" -ForegroundColor Cyan
    Write-Host "1. Close Word completely, then reopen it with a blank document."
    Write-Host "2. Home tab -> ProzaEdit button (or Home -> Add-ins -> Advanced -> Developer Add-ins)."
    Write-Host "3. This add-in is not in the Shared Folder list; keep this folder: $CatalogDir"
  } else {
    Write-Host ""
    Write-Host "=== Choose how to load ProzaEdit in Word Desktop ===" -ForegroundColor Cyan
    Write-Host "Shared Folder (Microsoft-documented, one admin prompt):"
    Write-Host "  Fix-ProzaEdit-SharedFolder.bat      (same as -RegisterLocalCatalog -ClearOfficeCache)"
    Write-Host "No admin, no share (developer registry sideload):"
    Write-Host "  Sideload-ProzaEdit-Desktop.bat      (same as -DeveloperSideload)"
    Write-Host "Word on the web (no scripts):  office.com -> Word -> Insert -> Add-ins -> Upload My Add-in -> $manifestPath"
  }

  Write-Host ""
  Write-Host "Task pane loads from GitHub Pages, so Word needs internet. Requires Microsoft 365 / Word 2021+ (WebView2)."
  exit 0
} catch {
  Write-Host ("[ProzaEdit] ERROR: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
