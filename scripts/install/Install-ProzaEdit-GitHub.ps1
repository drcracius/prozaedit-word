#Requires -Version 5.1
<#
.SYNOPSIS
  Download ProzaEdit hosted manifest from GitHub and prepare desktop sideload paths.

.DESCRIPTION
  Default: saves manifest.hosted.xml under Documents\ProzaEdit\catalog and prints
  Word on the web upload steps. Optional -RegisterLocalCatalog adds a WEF TrustedCatalog
  entry for that folder (Shared Folder tab in Word desktop — PE-2 validation on your PC).

  UI loads from GitHub Pages; this script does not bundle the task pane.

.PARAMETER ManifestUrl
  Raw GitHub URL for manifest.hosted.xml

.PARAMETER CatalogDir
  Local folder that will contain manifest.hosted.xml

.PARAMETER RegisterLocalCatalog
  Add HKCU TrustedCatalogs entry pointing at CatalogDir (file URI). Requires Word restart.

.EXAMPLE
  .\Install-ProzaEdit-GitHub.ps1
  .\Install-ProzaEdit-GitHub.ps1 -RegisterLocalCatalog
#>
[CmdletBinding()]
param(
  [string] $ManifestUrl = "https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml",
  [string] $CatalogDir = "",
  [switch] $RegisterLocalCatalog
)

$ErrorActionPreference = "Stop"

if (-not $CatalogDir) {
  $CatalogDir = Join-Path $env:USERPROFILE "Documents\ProzaEdit\catalog"
}

function Write-Step([string]$Message) {
  Write-Host ("[ProzaEdit] " + $Message)
}

function Get-OfficeWefVersion {
  $roots = @(
    "HKCU:\Software\Microsoft\Office\16.0\WEF",
    "HKCU:\Software\Microsoft\Office\15.0\WEF"
  )
  foreach ($root in $roots) {
    if (Test-Path $root) {
      if ($root -match "16\.0") { return "16.0" }
      if ($root -match "15\.0") { return "15.0" }
    }
  }
  return "16.0"
}

function Register-TrustedCatalogFolder {
  param([string]$FolderPath, [string]$OfficeVersion)

  $folderPath = $FolderPath.TrimEnd('\')
  if (-not (Test-Path $folderPath)) {
    throw "Catalog folder not found: $folderPath"
  }
  $uri = ([System.Uri]($folderPath + "\")).AbsoluteUri
  $catalogId = "{d1829e3a-4931-4122-b911-37f22941aa99}"
  $regPath = "HKCU:\Software\Microsoft\Office\$OfficeVersion\WEF\TrustedCatalogs\$catalogId"
  New-Item -Path $regPath -Force | Out-Null
  Set-ItemProperty -Path $regPath -Name "Id" -Value $catalogId -Type String
  Set-ItemProperty -Path $regPath -Name "Url" -Value $uri -Type String
  Set-ItemProperty -Path $regPath -Name "Flags" -Value 1 -Type DWord
  Write-Step "Registered TrustedCatalog: $uri"
}

try {
  New-Item -ItemType Directory -Path $CatalogDir -Force | Out-Null
  $manifestPath = Join-Path $CatalogDir "manifest.hosted.xml"

  Write-Step "Downloading manifest from GitHub..."
  Invoke-WebRequest -Uri $ManifestUrl -OutFile $manifestPath -UseBasicParsing

  $version = "unknown"
  if (Test-Path $manifestPath) {
    $xml = [xml](Get-Content -Raw -Path $manifestPath)
    $version = $xml.OfficeApp.Version
  }

  Write-Step "Saved: $manifestPath (Version $version)"
  Write-Host ""
  Write-Host "=== Recommended (consumer M365) ===" -ForegroundColor Cyan
  Write-Host "1. Open https://office.com -> Word -> blank document"
  Write-Host "2. Insert -> Add-ins -> My Add-ins -> Upload My Add-in"
  Write-Host "3. Choose: $manifestPath"
  Write-Host "4. Home -> ProzaEdit"
  Write-Host ""
  Write-Host "Raw manifest (same file on GitHub): $ManifestUrl"
  Write-Host ""

  if ($RegisterLocalCatalog) {
    $officeVer = Get-OfficeWefVersion
    Register-TrustedCatalogFolder -FolderPath $CatalogDir -OfficeVersion $officeVer
    Write-Host "=== Shared Folder (desktop) ===" -ForegroundColor Cyan
    Write-Host "Close Word completely, reopen, then Insert -> Add-ins -> SHARED FOLDER tab."
    Write-Host "If the tab is empty, run Fix-ProzaEdit-SharedFolder.bat or use web upload above."
    Write-Host "PE-2: validate on your Windows build; SMB examples (e.g. machine OTHP15) are documented only in scripts/install/README.md — not hardcoded here."
  } else {
    Write-Host "Tip: run with -RegisterLocalCatalog for optional desktop Shared Folder catalog (advanced)."
  }

  exit 0
} catch {
  Write-Error $_
  exit 1
}
