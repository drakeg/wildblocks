# Run in Windows PowerShell 5.1 as Administrator, after editing server.config.json.
# No firewall rules are created. This installs but does not start the service.
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (Get-Service -Name Wildblocks -ErrorAction SilentlyContinue) { throw 'Wildblocks is already installed. Stop/remove it before reinstalling.' }
$node = Join-Path $root 'runtime/node.exe'
if (-not (Test-Path $node)) { $node = (Get-Command node.exe -ErrorAction Stop).Source }
if (-not (Test-Path (Join-Path $root 'server.config.json'))) { throw 'Edit server.config.json in the server folder first.' }
$exe = Join-Path $root 'WildblocksService.exe'
if (Test-Path $exe) { throw 'WildblocksService.exe already exists. Move it aside before rebuilding.' }
$source = Get-Content -Raw (Join-Path $PSScriptRoot 'WindowsService.cs')
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.ServiceProcess.dll' -OutputAssembly $exe -OutputType WindowsApplication
[IO.File]::WriteAllText((Join-Path $root 'node-path.txt'), $node)
$data = Join-Path $env:ProgramData 'Wildblocks'
New-Item -ItemType Directory -Force -Path $data | Out-Null
# Restrict account/password-hash saves to the service account and administrators.
& icacls.exe $data /inheritance:r /grant:r '*S-1-5-19:(OI)(CI)M' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not secure the server data directory.' }
# Give LocalService read/execute only on the distribution. Keep it in a stable, administrator-controlled folder.
& icacls.exe $root /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not grant service access to the distribution.' }
$credential = New-Object System.Management.Automation.PSCredential ('NT AUTHORITY\LocalService', (New-Object System.Security.SecureString))
New-Service -Name Wildblocks -DisplayName 'Wildblocks Dedicated Server' -BinaryPathName ('"' + $exe + '"') -StartupType Automatic -Credential $credential | Out-Null
Write-Host 'Installed. Start-Service Wildblocks starts it; Stop-Service Wildblocks saves and stops it.'
Write-Host "Data and logs: $data"
