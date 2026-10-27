import urllib.request
import urllib.error

for url in ["http://127.0.0.1:5000/nonexistent-page", "http://127.0.0.1:5000/login"]:
    req = urllib.request.Request(url, method="POST", data=b"{}",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            print(url, "->", resp.status, resp.read().decode()[:200])
    except urllib.error.HTTPError as e:
        print(url, "->", e.code, e.read().decode()[:200])
