param([int]$Port = 8765)
$projectPath = Split-Path -Parent $PSScriptRoot
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
$runtimePython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if ($pythonCommand) { $pythonPath = $pythonCommand.Source }
elseif (Test-Path -LiteralPath $runtimePython) { $pythonPath = $runtimePython }
else { throw 'Python não encontrado. Instale Python 3 ou utilize outro servidor HTTP para esta pasta.' }
Write-Host "Site ARCOR: http://127.0.0.1:$Port/"
Write-Host "Visualizador isolado: http://127.0.0.1:$Port/tests/model-viewer.html"
& $pythonPath -m http.server $Port --bind 127.0.0.1 --directory $projectPath
