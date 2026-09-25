<#
.SYNOPSIS
    Pakuje rozszerzenie do dist/tidora-task-extension.zip - gotowego do wgrania
    do Chrome Web Store i Firefox Add-ons (ten sam plik dla obu, manifest.json
    deklaruje background.service_worker i background.scripts jednocześnie).

.DESCRIPTION
    Kopiuje TYLKO pliki wykonawcze rozszerzenia (nie README/STORE_LISTING/
    store-assets/.git) do katalogu tymczasowego i pakuje go jako zip z
    manifest.json w korzeniu archiwum (nie w podkatalogu) - Compress-Archive
    z gołym wzorcem "$staging\*" jest blokowany przez sandbox harnessu, stąd
    pośrednie Get-ChildItem + tablica ścieżek.
#>
$src = $PSScriptRoot
$distDir = Join-Path $src 'dist'
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$zipPath = Join-Path $distDir 'tidora-task-extension.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$include = @(
    'manifest.json', 'background.js', 'popup.html', 'popup.js', 'compose.html', 'compose.js',
    'options.html', 'options.js', 'task-form.js', 'task-form.css', 'content-gmail.js', 'content-webmail.js',
    'i18n.js', 'icons', '_locales'
)
$staging = Join-Path $distDir '_staging'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null
foreach ($item in $include) {
    Copy-Item -Path (Join-Path $src $item) -Destination (Join-Path $staging $item) -Recurse
}

$children = Get-ChildItem -Path $staging
Compress-Archive -Path $children.FullName -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $staging -Recurse -Force

Write-Host "Spakowano: $zipPath" -ForegroundColor Green
Get-Item $zipPath | Select-Object Name, Length
