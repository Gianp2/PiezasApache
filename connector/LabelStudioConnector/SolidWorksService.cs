
using System.Runtime.InteropServices;

public sealed class SolidWorksService
{
    public bool IsInstalled()
    {
        if (!OperatingSystem.IsWindows())
            return false;

        try
        {
            return Type.GetTypeFromProgID("SldWorks.Application") != null;
        }
        catch
        {
            return false;
        }
    }

    public string GetStatus()
    {
        return IsInstalled()
            ? "SolidWorks detectado en Windows"
            : "SolidWorks no está instalado o no está registrado";
    }

    public object GetCapabilities()
    {
        return new
        {
            installed = IsInstalled(),
            integration = "COM",
            conversionReady = false,
            supportedInput = new[] { ".SLDPRT" },
            plannedOutput = "SVG",
            extractionMode = "2D silhouette"
        };
    }
}
