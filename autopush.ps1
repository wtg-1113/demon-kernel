$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

$log = Join-Path $PSScriptRoot "autopush.log"
"===== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" | Add-Content -Encoding UTF8 $log

# add
git add -A | Out-Null

# no changes -> exit success
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  "No changes." | Add-Content -Encoding UTF8 $log
  exit 0
}

# commit
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "auto $ts" 2>&1 | Add-Content -Encoding UTF8 $log
if ($LASTEXITCODE -ne 0) {
  "COMMIT_FAILED exitcode=$LASTEXITCODE" | Add-Content -Encoding UTF8 $log
  exit $LASTEXITCODE
}

# push (不要用 2>&1 在命令行單獨測；在腳本內用，但以 exit code 判斷)
$pushOut = git push 2>&1
$pushOut | Add-Content -Encoding UTF8 $log

if ($LASTEXITCODE -ne 0) {
  "PUSH_FAILED exitcode=$LASTEXITCODE" | Add-Content -Encoding UTF8 $log
  exit $LASTEXITCODE
}

"OK" | Add-Content -Encoding UTF8 $log
exit 0
