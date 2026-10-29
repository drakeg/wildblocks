// Compiled by Install-WindowsService.ps1 using the Windows .NET Framework.
using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;

public sealed class WildblocksService : ServiceBase {
    private Process child;
    private readonly object logLock = new object();
    private string logPath;
    private bool stopping;
    public WildblocksService() { ServiceName = "Wildblocks"; CanStop = true; CanShutdown = true; AutoLog = false; }
    private static string Quote(string value) {
        // Paths supplied by the installer; reject quotes rather than interpreting them.
        if (value.Contains("\"")) throw new ArgumentException("Invalid path");
        return "\"" + value + "\"";
    }
    private void Log(object sender, DataReceivedEventArgs e) {
        if (e.Data == null) return;
        lock (logLock) {
            try { File.AppendAllText(logPath, DateTime.UtcNow.ToString("o") + " " + e.Data + Environment.NewLine); }
            catch (IOException) { } // A full log disk must not crash the game process.
            catch (UnauthorizedAccessException) { }
        }
    }
    protected override void OnStart(string[] args) {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string node = File.ReadAllText(Path.Combine(root, "node-path.txt")).Trim();
        string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Wildblocks");
        Directory.CreateDirectory(data);
        logPath = Path.Combine(data, "server.log");
        stopping = false;
        child = new Process();
        child.StartInfo = new ProcessStartInfo {
            FileName = node,
            Arguments = Quote(Path.Combine(root, "server", "entry.cjs")) + " --config " + Quote(Path.Combine(root, "server.config.json")),
            WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
        };
        child.StartInfo.EnvironmentVariables["WILDBLOCKS_DATA"] = data;
        child.OutputDataReceived += Log;
        child.ErrorDataReceived += Log;
        child.EnableRaisingEvents = true;
        child.Exited += delegate { if (!stopping) { ExitCode = 1; Stop(); } };
        child.Start();
        child.BeginOutputReadLine(); child.BeginErrorReadLine();
    }
    protected override void OnStop() { StopChild(true); }
    protected override void OnShutdown() { StopChild(false); }
    private void StopChild(bool requestTime) {
        stopping = true;
        if (child == null) return;
        if (requestTime) RequestAdditionalTime(30000);
        if (!child.HasExited) {
            try { child.StandardInput.WriteLine("stop"); child.StandardInput.Flush(); }
            catch (IOException) { }
            if (!child.WaitForExit(20000)) child.Kill();
        }
        child.Dispose(); child = null;
    }
    public static void Main() { ServiceBase.Run(new WildblocksService()); }
}
