' Starts the Agents Ka Ghar demo server hidden (no console window).
' Used by the Startup shortcut and by open-demo.ps1 when the server is down.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\Projects\dunder-mifflin-os"
sh.Run """C:\Program Files\nodejs\node.exe"" bin\dunder-mifflin-os.mjs --demo --port 4318", 0, False
