using System.Runtime.InteropServices;

// Automatización COM: SolidWorks necesita estar instalado y licenciado en esta misma PC.
// La conversión se ejecuta en un hilo STA (no en el thread pool de ASP.NET).
public sealed class SolidWorksService
{
    public bool IsInstalled()
    {
        if (!OperatingSystem.IsWindows()) return false;
        try { return Type.GetTypeFromProgID("SldWorks.Application") != null; }
        catch { return false; }
    }

    public object GetCapabilities() => new {
        installed = IsInstalled(), integration = "COM local (STA)",
        conversionReady = IsInstalled(), supportedInput = new[] { ".SLDPRT" },
        output = "PNG de vista isométrica real de SolidWorks",
        note = "La exportación depende de SolidWorks y debe validarse en la PC de la fábrica."
    };

    public string GetStatus() => IsInstalled() ? "SolidWorks registrado en Windows" : "SolidWorks no disponible";

    public Task<(byte[]? Png, string? Error)> ExportIsometricAsync(byte[] fileBytes, string filename)
    {
        var completion = new TaskCompletionSource<(byte[]?, string?)>(TaskCreationOptions.RunContinuationsAsynchronously);
        var thread = new Thread(() => {
            string tempDir = Path.Combine(Path.GetTempPath(), "LabelStudio-" + Guid.NewGuid().ToString("N"));
            object? swApp = null, model = null;
            try
            {
                Directory.CreateDirectory(tempDir);
                string partPath = Path.Combine(tempDir, "pieza.sldprt");
                string imagePath = Path.Combine(tempDir, "vista.png");
                File.WriteAllBytes(partPath, fileBytes);
                var progId = Type.GetTypeFromProgID("SldWorks.Application");
                if (progId is null) throw new InvalidOperationException("SolidWorks no está instalado o registrado en esta computadora.");
                swApp = Activator.CreateInstance(progId);
                if (swApp is null) throw new InvalidOperationException("No se pudo iniciar SolidWorks.");
                dynamic sw = swApp;
                // swDocPART = 1, swOpenDocOptions_Silent = 1
                int errors = 0, warnings = 0;
                model = sw.OpenDoc6(partPath, 1, 1, "", ref errors, ref warnings);
                if (model is null) throw new InvalidOperationException($"SolidWorks no pudo abrir la pieza (código {errors}).");
                dynamic doc = model;
                // *Isometric, swIsometricView = 7
                doc.ShowNamedView2("*Isometric", 7);
                doc.ViewZoomtofit2();
                // swSaveAsCurrentVersion = 0, swSaveAsOptions_Silent = 1
                int saveErrors = 0, saveWarnings = 0;
                bool saved = doc.Extension.SaveAs(imagePath, 0, 1, null, ref saveErrors, ref saveWarnings);
                if (!saved || !File.Exists(imagePath))
                    throw new InvalidOperationException($"SolidWorks no pudo exportar la vista PNG (código {saveErrors}). Revisar compatibilidad de versión y permisos.");
                var bytes = File.ReadAllBytes(imagePath);
                if (bytes.Length < 100) throw new InvalidOperationException("La vista exportada está vacía.");
                completion.TrySetResult((bytes, null));
            }
            catch (Exception ex) { completion.TrySetResult((null, ex.Message)); }
            finally
            {
                try {
                    if (swApp is not null && model is not null) {
                        dynamic sw = swApp;
                        dynamic doc = model;
                        sw.CloseDoc((string)doc.GetTitle());
                    }
                } catch { /* best effort */ }
                if (model is not null && Marshal.IsComObject(model)) Marshal.FinalReleaseComObject(model);
                if (swApp is not null && Marshal.IsComObject(swApp)) Marshal.FinalReleaseComObject(swApp);
                try { Directory.Delete(tempDir, true); } catch { /* best effort */ }
            }
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        return completion.Task;
    }
}
