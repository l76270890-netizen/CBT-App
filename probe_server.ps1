Write-Host "=== GET / (root) ==="
try { (Invoke-WebRequest -Uri "http://127.0.0.1:5000/" -UseBasicParsing).Content } catch { $_.Exception.Message }

Write-Host "`n=== GET /nonexistent-page (expect JSON 404) ==="
try { (Invoke-WebRequest -Uri "http://127.0.0.1:5000/nonexistent-page" -UseBasicParsing).Content } catch {
  $s = $_.Exception.Response
  if ($s) { $r = New-Object IO.StreamReader($s.GetResponseStream()); "STATUS: $([int]$s.StatusCode)"; $r.ReadToEnd() } else { $_.Exception.Message }
}

Write-Host "`n=== POST /api/login (expect JSON error, NOT HTML) ==="
try {
  $b = '{"email":"probe@test.com","password":"probe123"}'
  (Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/login" -Method Post -Body $b -ContentType "application/json" -UseBasicParsing).Content
} catch {
  $s = $_.Exception.Response
  if ($s) { $r = New-Object IO.StreamReader($s.GetResponseStream()); "STATUS: $([int]$s.StatusCode)"; $r.ReadToEnd() } else { $_.Exception.Message }
}

Write-Host "`n=== POST /login (wrong path, expect JSON 404 from Flask) ==="
try {
  $b = '{"email":"probe@test.com","password":"probe123"}'
  (Invoke-WebRequest -Uri "http://127.0.0.1:5000/login" -Method Post -Body $b -ContentType "application/json" -UseBasicParsing).Content
} catch {
  $s = $_.Exception.Response
  if ($s) { $r = New-Object IO.StreamReader($s.GetResponseStream()); "STATUS: $([int]$s.StatusCode)"; $r.ReadToEnd() } else { $_.Exception.Message }
}
