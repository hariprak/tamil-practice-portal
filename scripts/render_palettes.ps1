$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$base = "C:\Users\hariprak\tamil-spelling-portal\scripts"
$html = Join-Path $base "palette_preview.html"
$outDir = Join-Path $base "palettes"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$palettes = @("warm","ocean","mint","lavender","candy","sunrise","neutral")

foreach ($p in $palettes) {
    $out = Join-Path $outDir "$p.png"
    if (Test-Path $out) { Remove-Item $out -Force }
    $udd = Join-Path $env:TEMP "edge_palette_$p"
    $fileUrl = "file:///" + ($html -replace '\\','/') + "?palette=$p"
    Start-Process -FilePath $edge -ArgumentList @(
        "--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--no-first-run","--disable-sync","--disable-extensions",
        "--user-data-dir=$udd","--window-size=1100,760",
        "--screenshot=$out","$fileUrl"
    ) -Wait
    Start-Sleep -Seconds 3
    if (Test-Path $out) {
        $sz = (Get-Item $out).Length
        Write-Output "$p OK $sz bytes -> $out"
    } else {
        Write-Output "$p FAILED (no file)"
    }
}
