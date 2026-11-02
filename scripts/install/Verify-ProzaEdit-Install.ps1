#Requires -Version 5.1
<#
.SYNOPSIS
  Read-only PE-2 install verification for ProzaEdit Shared Folder (Windows).

.DESCRIPTION
  Checks local catalog manifest, Version 2.0.0.16, manifest URL patterns, and
  TrustedCatalog registry keys. Prints PASS/FAIL lines for the PE-2 checklist.
  Does not modify registry or download files.

.EXAMPLE
  .\Verify-ProzaEdit-Install.ps1
#>
[CmdletBinding()]
param(
  [string] $CatalogDir = "",
  [string] $ExpectedVersion = "2.0.0.16"
)

$ErrorActionPreference = "Continue"

if (-not $CatalogDir) {
  $CatalogDir = Join-Path $env:USERPROFILE "Documents\ProzaEdit\catalog"
}

$CatalogId = "{d1829e3a-4931-4122-b911-37f22941aa99}"
$ExpectedSupportUrl = "https://github.com/drcracius/prozaedit-word"
$ExpectedIcon32 = "https://raw.githubusercontent.com/drcracius/prozaedit-word/main/assets/icon-32.png"
$ExpectedIcon64 = "https://raw.githubusercontent.com/drcracius/prozaedit-word/main/assets/icon-64.png"
$ExpectedSourceLocation = "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html"

$failCount = 0
$passCount = 0

function Write-CheckResult {
  param([bool]$Ok, [string]$Label, [string]$Detail = "")
  if ($Ok) {
    $passCount++
    if ($Detail) { Write-Host "[PASS] $Label — $Detail" -ForegroundColor Green }
    else { Write-Host "[PASS] $Label" -ForegroundColor Green }
  } else {
    $failCount++
    if ($Detail) { Write-Host "[FAIL] $Label — $Detail" -ForegroundColor Red }
    else { Write-Host "[FAIL] $Label" -ForegroundColor Red }
  }
}

function Get-OfficeWefVersion {
  foreach ($ver in @("16.0", "15.0")) {
    $root = "HKCU:\Software\Microsoft\Office\$ver\WEF"
    if (Test-Path $root) { return $ver }
  }
  return "16.0"
}

Write-Host ""
Write-Host "=== ProzaEdit install verify (read-only, PE-2) ===" -ForegroundColor Cyan
Write-Host "Catalog folder: $CatalogDir"
Write-Host ""

$manifestPath = Join-Path $CatalogDir "manifest.hosted.xml"
$manifestExists = Test-Path $manifestPath
Write-CheckResult -Ok $manifestExists -Label "Catalog manifest path" -Detail $(if ($manifestExists) { $manifestPath } else { "missing: $manifestPath" })

$xml = $null
$version = ""
$icon32 = ""
$icon64 = ""
$supportUrl = ""
$sourceLocation = ""

if ($manifestExists) {
  try {
    $xml = [xml](Get-Content -Raw -Path $manifestPath)
    $version = [string]$xml.OfficeApp.Version
    $icon32 = [string]$xml.OfficeApp.IconUrl.DefaultValue
    $icon64 = [string]$xml.OfficeApp.HighResolutionIconUrl.DefaultValue
    $supportUrl = [string]$xml.OfficeApp.SupportUrl.DefaultValue
    $sourceLocation = [string]$xml.OfficeApp.DefaultSettings.SourceLocation.DefaultValue
  } catch {
    Write-CheckResult -Ok $false -Label "Manifest XML parse" -Detail $_.Exception.Message
  }
}

if ($xml) {
  Write-CheckResult -Ok ($version -eq $ExpectedVersion) -Label "Manifest Version $ExpectedVersion" -Detail $(if ($version) { "found: $version" } else { "empty" })
  Write-CheckResult -Ok ($supportUrl -eq $ExpectedSupportUrl) -Label "SupportUrl pattern" -Detail $(if ($supportUrl) { $supportUrl } else { "missing" })
  Write-CheckResult -Ok ($icon32 -eq $ExpectedIcon32) -Label "IconUrl (icon-32.png on raw GitHub main)" -Detail $(if ($icon32) { $icon32 } else { "missing" })
  Write-CheckResult -Ok ($icon64 -eq $ExpectedIcon64) -Label "HighResolutionIconUrl (icon-64.png on raw GitHub main)" -Detail $(if ($icon64) { $icon64 } else { "missing" })
  Write-CheckResult -Ok ($sourceLocation -eq $ExpectedSourceLocation) -Label "SourceLocation (GitHub Pages task pane)" -Detail $(if ($sourceLocation) { $sourceLocation } else { "missing" })
}

$officeVer = Get-OfficeWefVersion
$regPath = "HKCU:\Software\Microsoft\Office\$officeVer\WEF\TrustedCatalogs\$CatalogId"
$regExists = Test-Path $regPath
Write-CheckResult -Ok $regExists -Label "TrustedCatalog registry key (Office $officeVer)" -Detail $(if ($regExists) { $regPath } else { "missing: $regPath" })

if ($regExists) {
  $regUrl = (Get-ItemProperty -Path $regPath -Name "Url" -ErrorAction SilentlyContinue).Url
  $regId = (Get-ItemProperty -Path $regPath -Name "Id" -ErrorAction SilentlyContinue).Id
  $catalogUri = $null
  try {
    if (Test-Path $CatalogDir) {
      $catalogUri = ([System.Uri]($CatalogDir.TrimEnd('\') + "\")).AbsoluteUri
    }
  } catch {}

  $urlOk = $false
  if ($regUrl -and $catalogUri) {
    $normReg = $regUrl.TrimEnd('/').ToLowerInvariant()
    $normCat = $catalogUri.TrimEnd('/').ToLowerInvariant()
    $urlOk = ($normReg -eq $normCat) -or ($normReg.StartsWith($normCat))
  }
  Write-CheckResult -Ok ($regId -eq $CatalogId) -Label "TrustedCatalog Id matches add-in" -Detail $(if ($regId) { $regId } else { "missing Id property" })
  Write-CheckResult -Ok $urlOk -Label "TrustedCatalog Url points at catalog folder" -Detail $(if ($regUrl) { "Url=$regUrl" } else { "missing Url property" })
}

Write-Host ""
Write-Host "Summary: $passCount passed, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "Manual steps still required: Word SHARED FOLDER tab, WEF cache clear, task pane smoke audit."
Write-Host "See docs/pe-2-shared-folder-checklist.md"
Write-Host ""

if ($failCount -gt 0) { exit 1 }
exit 0
