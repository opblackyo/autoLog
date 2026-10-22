$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'extension'
$outputDirectory = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
Compress-Archive -Path (Join-Path $extensionRoot '*') -DestinationPath (Join-Path $outputDirectory 'autolog-extension.zip') -Force
Write-Output (Join-Path $outputDirectory 'autolog-extension.zip')
