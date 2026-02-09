$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$log = Join-Path $PSScriptRoot "autopush.log"
"===== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" | Add-Content -Encoding UTF8 $log

try {
  git status | Add-Content -Encoding UTF8 $log

  git add -A | Out-Null
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    "No changes." | Add-Content -Encoding UTF8 $log
    exit 0
  }

  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  git commit -m "auto $ts" | Add-Content -Encoding UTF8 $log
  git push 2>&1 | Add-Content -Encoding UTF8 $log

  "OK" | Add-Content -Encoding UTF8 $log
}
catch {
  ("ERROR: " + $_.Exception.Message) | Add-Content -Encoding UTF8 $log
  exit 1
}
