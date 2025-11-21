@echo off
setlocal enableextensions

rem Move to repository root (script directory is scripts/)
cd /d "%~dp0.."

call android\gradlew.bat :app:assembleDebug
if errorlevel 1 goto :error

call npm run refresh-db-types
if errorlevel 1 goto :error

goto :eof

:error
exit /b %errorlevel%

:eof
exit /b 0
