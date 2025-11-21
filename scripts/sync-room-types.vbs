Set fso = CreateObject("Scripting.FileSystemObject")
Set scriptFile = fso.GetFile(WScript.ScriptFullName)
scriptDir = scriptFile.ParentFolder.Path
command = "cmd.exe /c """ & scriptDir & "\sync-room-types.bat""""
CreateObject("Wscript.Shell").Run command, 0, True
