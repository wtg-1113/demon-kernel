$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

git add -A | Out-Null
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { exit 0 }

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "auto $ts" | Out-Null
git push
