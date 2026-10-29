@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE=%ROOT%\runtime\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" "%ROOT%\server\entry.cjs" --config "%ROOT%\server.config.json" %*
if errorlevel 1 pause
