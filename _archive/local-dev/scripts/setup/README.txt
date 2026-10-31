PowerShell helpers (called from ProzaEdit.bat menu or scripts\shortcuts).

  create-hosted-manifest.ps1   Build manifest.hosted.xml for GitHub/hosting
  Export-OfficeDevCa.ps1       Copy dev CA to certs\ for another PC
  Install-TrustedCert-SecondPC.ps1   Trust exported CA
  Update-ManifestHost.ps1      Point manifest.xml at LAN IP (advanced)
  Install-ProzaEditDevCert.ps1 Fallback cert if npm cert:install unavailable
  Install-WordAddin.ps1          Word Shared Folder catalog (Register-In-Word.bat)
  Register-TrustedCatalog.ps1    Alias for Install-WordAddin.ps1

Normal use: ProzaEdit.bat in project root — not these files directly.
Word install: Install-In-Word.bat (UAC once via Enable-CatalogShare if needed).
