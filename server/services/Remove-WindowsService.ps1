#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
Stop-Service Wildblocks -ErrorAction Stop
& sc.exe delete Wildblocks
if ($LASTEXITCODE -ne 0) { throw 'Could not remove the service.' }
Write-Host 'Service removed. World, accounts, configuration, and logs are preserved.'
