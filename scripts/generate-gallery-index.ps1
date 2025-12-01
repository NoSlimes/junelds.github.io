# generate-gallery-index.ps1
# Scans media/gallery and writes media/gallery/index.json with an array of objects { file, alt, caption }
# Run from repository root in PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\scripts\generate-gallery-index.ps1

$galleryPath = Join-Path $PSScriptRoot "..\media\gallery"
$indexFile = Join-Path $galleryPath "index.json"

if (-not (Test-Path $galleryPath)) {
    Write-Error "Gallerimappen hittades inte: $galleryPath"
    exit 1
}

# Supported image extensions (case-insensitive)
$exts = @('*.jpg','*.jpeg','*.png','*.gif','*.webp')

# Collect files matching supported extensions
$files = @()
foreach ($e in $exts) {
    $files += Get-ChildItem -Path $galleryPath -Filter $e -File -ErrorAction SilentlyContinue
}

# Deduplicate and sort by name
$files = $files | Sort-Object Name | Select-Object -Unique

$out = @()
foreach ($f in $files) {
    # Build a default caption/alt from filename (replace - and _ with space)
    $nameNoExt = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $caption = ($nameNoExt -replace '[-_]',' ') -replace '\s{2,}', ' '
    $caption = $caption.Trim()
    $obj = [PSCustomObject]@{
        file = $f.Name
        alt = $caption
        caption = $caption
    }
    $out += $obj
}

# Write JSON with pretty formatting
try {
    $json = $out | ConvertTo-Json -Depth 3
    Set-Content -Path $indexFile -Value $json -Encoding UTF8
    Write-Host "Wrote gallery index to: $indexFile"
} catch {
    Write-Error "Kunde inte skriva index.json: $_"
    exit 1
}