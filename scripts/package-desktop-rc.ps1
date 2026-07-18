$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktopRoot = Join-Path $repoRoot 'apps\desktop'
$targetRoot = Join-Path $desktopRoot 'src-tauri\target\release'
$version = (Get-Content -Raw (Join-Path $desktopRoot 'package.json') | ConvertFrom-Json).version
$releaseRoot = Join-Path $repoRoot "release\desktop\v$version-rc"

Push-Location $repoRoot
try {
    & pnpm.cmd --filter '@wboke/desktop' tauri build --bundles msi --no-sign
    if ($LASTEXITCODE -ne 0) { throw "Tauri build failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

$msi = Get-ChildItem (Join-Path $targetRoot 'bundle\msi') -Filter '*.msi' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$exe = Get-ChildItem $targetRoot -Filter '*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $msi) { throw 'MSI artifact was not found.' }
if (-not $exe) { throw 'Portable executable was not found.' }

New-Item -ItemType Directory -Force $releaseRoot | Out-Null
$msiTarget = Join-Path $releaseRoot $msi.Name
$exeTarget = Join-Path $releaseRoot $exe.Name
Copy-Item -LiteralPath $msi.FullName -Destination $msiTarget -Force
Copy-Item -LiteralPath $exe.FullName -Destination $exeTarget -Force

$portableZip = Join-Path $releaseRoot "liumai-api-desktop-$version-windows-portable.zip"
Compress-Archive -LiteralPath $exeTarget -DestinationPath $portableZip -Force

$artifacts = @($msiTarget, $portableZip)
$checksumPath = Join-Path $releaseRoot 'SHA256SUMS.txt'
$checksums = foreach ($artifact in $artifacts) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $artifact).Hash.ToLowerInvariant()
    "$hash  $(Split-Path -Leaf $artifact)"
}
Set-Content -LiteralPath $checksumPath -Value $checksums -Encoding utf8

Write-Host "Release candidate artifacts: $releaseRoot"
$checksums | ForEach-Object { Write-Host $_ }
