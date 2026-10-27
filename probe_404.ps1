$r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/nonexistent-page" -UseBasicParsing -SkipHttpErrorCheck
"STATUS: $($r.StatusCode)"
"BODY: $($r.Content)"
