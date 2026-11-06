#Requires -Version 5.1
<#
.SYNOPSIS
  Read-only check of the ProzaEdit Word Desktop install (Shared Folder and Developer sideload).

.DESCRIPTION
  Does not modify files or registry. Checks, in order:
    - catalog manifest exists, is valid for desktop Word (resource ids <= 32 chars, https, no localhost)
    - Shared Folder route: network share reachable, TrustedCatalog registry entry is a UNC path
    - Developer sideload route: Wef\Developer entry points at an existing manifest
    - leftovers/blockers: old file:// catalog entry, Group Policy overrides, Windows Server service
  At least one route (Shared Folder or Developer) must pass.

.EXAMPLE
  .\Verify-ProzaEdit-Install.ps1
#>
[CmdletBinding()]
param(
  [string] $CatalogDir = "",
  [string] $ShareName = "ProzaEditCatalog",
  [string] $ExpectedVersion = ""
)

$ErrorActionPreference = "Continue"

$OfficeVer = "16.0"
$AddinId = "d1829e3a-4931-4122-b911-37f22941aa99"
$CatalogGuid = "{f4a7d3c1-8b2e-4c59-9a1d-6e0b3c5d7f21}"
$MaxResourceIdLength = 32
$ExpectedSourceLocation = "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html"

if (-not $CatalogDir) { $CatalogDir = Join-Path $env:USERPROFILE "ProzaEditCatalog" }

# Default expected version = the repo checkout's manifest, so this script never goes stale.
$repoManifest = Join-Path $PSScriptRoot "..\..\manifest.hosted.xml"
if ((-not $ExpectedVersion) -and (Test-Path -LiteralPath $repoManifest)) {
  try { $ExpectedVersion = [string]([xml](Get-Content -Raw -Path $repoManifest)).OfficeApp.Version } catch {}
}

$script:fail = 0
$script:pass = 0
function Write-Check {
  param([bool]$Ok, [string]$Label, [string]$Detail = "")
  $suffix = ""
  if ($Detail) { $suffix = " - $Detail" }
  if ($Ok) { $script:pass++; Write-Host "[PASS] $Label$suffix" -ForegroundColor Green }
  else { $script:fail++; Write-Host "[FAIL] $Label$suffix" -ForegroundColor Red }
}
function Write-Info { param([string]$Text) Write-Host "[INFO] $Text" -ForegroundColor Gray }

Write-Host ""
Write-Host "=== ProzaEdit Word Desktop install verify (read-only) ===" -ForegroundColor Cyan
Write-Host "Catalog folder: $CatalogDir"
Write-Host ""

# --- Manifest ---------------------------------------------------------------
$manifestPath = Join-Path $CatalogDir "manifest.hosted.xml"
$manifestOk = Test-Path -LiteralPath $manifestPath
Write-Check -Ok $manifestOk -Label "Catalog manifest exists" -Detail $manifestPath

if ($manifestOk) {
  $text = Get-Content -Raw -Path $manifestPath
  $xml = $null
  try { $xml = [xml]$text } catch { Write-Check -Ok $false -Label "Manifest is valid XML" -Detail $_.Exception.Message }
  if ($xml) {
    $version = [string]$xml.OfficeApp.Version
    if ($ExpectedVersion) {
      Write-Check -Ok ($version -eq $ExpectedVersion) -Label "Manifest Version matches repo ($ExpectedVersion)" -Detail "found $version"
    } else {
      Write-Info "Manifest Version $version (no repo copy to compare against)"
    }
    $tooLong = @()
    foreach ($m in [regex]::Matches($text, '<bt:(?:Image|Url|String)\s+id="([^"]+)"')) { if ($m.Groups[1].Value.Length -gt $MaxResourceIdLength) { $tooLong += $m.Groups[1].Value } }
    foreach ($m in [regex]::Matches($text, '\sresid="([^"]+)"')) { if ($m.Groups[1].Value.Length -gt $MaxResourceIdLength) { $tooLong += $m.Groups[1].Value } }
    $tooLongDetail = "all <= $MaxResourceIdLength chars"
    if ($tooLong.Count -gt 0) { $tooLongDetail = "too long: " + (($tooLong | Select-Object -Unique) -join ", ") + " (Word Desktop silently skips this manifest; update the repo and re-run the installer)" }
    Write-Check -Ok ($tooLong.Count -eq 0) -Label "Resource ids valid for Word Desktop" -Detail $tooLongDetail
    Write-Check -Ok ($text -notmatch 'localhost') -Label "Manifest is the hosted one (no localhost)"
    $badAppDomain = @()
    foreach ($m in [regex]::Matches($text, '<AppDomain>([^<]+)</AppDomain>')) {
      $ad = $m.Groups[1].Value.Trim().TrimEnd('/')
      if ($ad -notmatch '^https://' -or ($ad -match '^https://[^/]+/.+')) { $badAppDomain += $ad }
    }
    $adDetail = "site roots only (Word web upload rejects a path)"
    if ($badAppDomain.Count -gt 0) { $adDetail = "invalid: " + ($badAppDomain -join "; ") }
    Write-Check -Ok ($badAppDomain.Count -eq 0) -Label "AppDomain entries valid for Word web upload" -Detail $adDetail
    $src = [string]$xml.OfficeApp.DefaultSettings.SourceLocation.DefaultValue
    Write-Check -Ok ($src -eq $ExpectedSourceLocation) -Label "SourceLocation is the GitHub Pages task pane" -Detail $src
    Write-Check -Ok ([string]$xml.OfficeApp.Id -eq $AddinId) -Label "Add-in Id" -Detail ([string]$xml.OfficeApp.Id)
  }
}

# --- Shared Folder route ----------------------------------------------------
Write-Host ""
Write-Host "-- Shared Folder route --" -ForegroundColor Cyan
$uncUrl = "\\$env:COMPUTERNAME\$ShareName"
$catKey = "HKCU:\Software\Microsoft\Office\$OfficeVer\WEF\TrustedCatalogs\$CatalogGuid"
$sharedRoute = $false

$server = Get-Service -Name LanmanServer -ErrorAction SilentlyContinue
if ($server) { Write-Info "Windows 'Server' (file sharing) service: $($server.Status)" }

if (Test-Path -LiteralPath $catKey) {
  $regUrl = (Get-ItemProperty -LiteralPath $catKey -Name Url -ErrorAction SilentlyContinue).Url
  $regFlags = (Get-ItemProperty -LiteralPath $catKey -Name Flags -ErrorAction SilentlyContinue).Flags
  $isUnc = ($regUrl -and $regUrl.StartsWith("\\"))
  Write-Check -Ok $isUnc -Label "TrustedCatalog Url is a network (UNC) path" -Detail "Url=$regUrl"
  Write-Check -Ok ($regFlags -eq 1) -Label "TrustedCatalog Flags = 1" -Detail "Flags=$regFlags"
  $reach = $false
  if ($regUrl) { $reach = Test-Path -LiteralPath (Join-Path $regUrl "manifest.hosted.xml") }
  Write-Check -Ok $reach -Label "Manifest reachable through the share" -Detail $regUrl
  $sharedRoute = ($isUnc -and $reach -and ($regFlags -eq 1))
} else {
  Write-Info "No Shared Folder catalog registered (fine if you use the Developer sideload)."
}

$legacy = "HKCU:\Software\Microsoft\Office\$OfficeVer\WEF\TrustedCatalogs\{$AddinId}"
if (Test-Path -LiteralPath $legacy) {
  $legacyUrl = (Get-ItemProperty -LiteralPath $legacy -Name Url -ErrorAction SilentlyContinue).Url
  Write-Check -Ok ($legacyUrl -and $legacyUrl.StartsWith("\\")) -Label "Old catalog entry is not a file:// URI" -Detail "Url=$legacyUrl (run Fix-ProzaEdit-SharedFolder.bat to replace it)"
}

$policy = "HKCU:\Software\Policies\Microsoft\Office\$OfficeVer\WEF"
if (Test-Path -LiteralPath $policy) {
  $pol = Get-ItemProperty -LiteralPath $policy -ErrorAction SilentlyContinue
  Write-Check -Ok ($pol.DisableAllCatalogs -ne 1) -Label "Policy does not block Shared Folder add-ins" -Detail "DisableAllCatalogs=$($pol.DisableAllCatalogs)"
  $polCat = Join-Path $policy "TrustedCatalogs"
  $polHasCatalogs = (Test-Path -LiteralPath $polCat) -and [bool](Get-ChildItem -LiteralPath $polCat -ErrorAction SilentlyContinue)
  Write-Check -Ok (-not $polHasCatalogs) -Label "No Group Policy Trusted Catalogs overriding this user" -Detail $polCat
}

# --- Developer sideload route ----------------------------------------------
Write-Host ""
Write-Host "-- Developer sideload route --" -ForegroundColor Cyan
$devKey = "HKCU:\Software\Microsoft\Office\$OfficeVer\Wef\Developer"
$devRoute = $false
$devPath = $null
if (Test-Path -LiteralPath $devKey) { $devPath = (Get-ItemProperty -LiteralPath $devKey -Name $AddinId -ErrorAction SilentlyContinue).$AddinId }
if ($devPath) {
  $devExists = Test-Path -LiteralPath $devPath
  Write-Check -Ok $devExists -Label "Developer entry points at an existing manifest" -Detail $devPath
  $devRoute = $devExists
} else {
  Write-Info "No Developer sideload registered (fine if you use the Shared Folder)."
}

# --- Result -----------------------------------------------------------------
Write-Host ""
Write-Check -Ok ($manifestOk -and ($sharedRoute -or $devRoute)) -Label "At least one working route (Shared Folder or Developer)"
Write-Host ""
$color = "Yellow"
if ($script:fail -eq 0) { $color = "Green" }
Write-Host "Summary: $($script:pass) passed, $($script:fail) failed" -ForegroundColor $color
Write-Host "Still manual: restart Word, open the SHARED FOLDER tab (Home - Add-ins - Advanced), run a test audit."
Write-Host "See docs/pe-2-shared-folder-checklist.md"
Write-Host ""

if ($script:fail -gt 0) { exit 1 }
exit 0
