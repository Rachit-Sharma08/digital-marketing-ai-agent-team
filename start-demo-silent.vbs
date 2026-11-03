' Starts the Agents Ka Ghar demo server hidden (no console window).
' Used by the Startup shortcut and by open-demo.ps1 when the server is down.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run """C:\Program Files\nodejs\node.exe"" bin\agents-ka-ghar.mjs --demo --port 4318", 0, False
