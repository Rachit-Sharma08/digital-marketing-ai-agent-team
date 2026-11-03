# Opens the Agents Ka Ghar demo in the browser, starting the server first if it is down.
$repo = 'D:\Projects\agents-ka-ghar'
$port = 4318
$url = "http://127.0.0.1:$port/"

function Test-OfficeUp {
  [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-OfficeUp)) {
  # A port left in TIME_WAIT just after a restart can kill the first launch; retry a few times.
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Start-Process wscript.exe -ArgumentList "`"$repo\start-demo-silent.vbs`""
    for ($i = 0; $i -lt 20; $i++) {
      Start-Sleep -Milliseconds 500
      if (Test-OfficeUp) { break }
    }
    if (Test-OfficeUp) { break }
    Start-Sleep -Seconds 5
  }
}

Start-Process $url
