param(
  [Parameter(Mandatory=$true)]
  [string]$KeystorePath
)

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $KeystorePath))
$b64 = [Convert]::ToBase64String($bytes)
Set-Clipboard $b64
Write-Host "Keystore Base64 copied to clipboard. Paste it into GitHub secret ANDROID_KEYSTORE_BASE64."
