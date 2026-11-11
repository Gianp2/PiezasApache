var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:5187");
const long maxFileSize = 25 * 1024 * 1024;
var allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
    "http://localhost:3000", "http://127.0.0.1:3000", "https://piezasapache.vercel.app"
};
var configuredOrigins = Environment.GetEnvironmentVariable("LABEL_STUDIO_ALLOWED_ORIGINS");
if (!string.IsNullOrWhiteSpace(configuredOrigins))
    foreach (var origin in configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) && (uri.Scheme == "https" || uri.Host == "localhost"))
            allowedOrigins.Add(origin.TrimEnd('/'));

builder.Services.AddCors(options => options.AddPolicy("LabelStudio", policy =>
    policy.WithOrigins(allowedOrigins.ToArray()).WithMethods("GET", "POST").AllowAnyHeader()));
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxFileSize + 1024 * 1024);
var app = builder.Build();
var solidWorksService = new SolidWorksService();
app.UseCors("LabelStudio");
app.MapGet("/health", () => Results.Ok(new {
    status = "online", service = "Label Studio Industrial Connector", version = "2.0.0",
    solidWorksInstalled = solidWorksService.IsInstalled()
}));
app.MapGet("/solidworks/status", () => Results.Ok(new {
    status = solidWorksService.GetStatus(), capabilities = solidWorksService.GetCapabilities()
}));
app.MapPost("/convert", async (HttpRequest request) => {
    var origin = request.Headers.Origin.ToString().TrimEnd('/');
    if (!allowedOrigins.Contains(origin)) return Results.StatusCode(403);
    if (!request.HasFormContentType) return Results.BadRequest(new { message = "Se esperaba un archivo .SLDPRT." });
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0) return Results.BadRequest(new { message = "No se recibió un archivo." });
    if (file.Length > maxFileSize) return Results.BadRequest(new { message = "El archivo supera 25 MB." });
    if (!Path.GetExtension(file.FileName).Equals(".sldprt", StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new { message = "Solo se admiten archivos .SLDPRT." });
    if (!solidWorksService.IsInstalled()) return Results.Json(new {
        success = false, code = "SOLIDWORKS_NOT_INSTALLED", message = "SolidWorks no está instalado o registrado en esta PC."
    }, statusCode: 503);
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    var (png, error) = await solidWorksService.ExportIsometricAsync(stream.ToArray(), file.FileName);
    if (png is null) return Results.Json(new {
        success = false, code = "SOLIDWORKS_EXPORT_FAILED", message = error ?? "No se pudo generar la vista real."
    }, statusCode: 422);
    return Results.Ok(new {
        success = true, fileName = Path.GetFileName(file.FileName), view = "isometric",
        mimeType = "image/png", imageBase64 = Convert.ToBase64String(png),
        message = "Vista real exportada desde SolidWorks. Verificá la vista previa antes de imprimir."
    });
}).DisableAntiforgery();
// Optional DWG conversion using a locally installed ODA File Converter.
// The conversion is never simulated; failures return an actionable error.
app.MapPost("/convert-dwg", async (HttpRequest request) => {
    var origin = request.Headers.Origin.ToString().TrimEnd('/');
    if (!allowedOrigins.Contains(origin)) return Results.StatusCode(403);
    if (!request.HasFormContentType) return Results.BadRequest(new { message = "Se esperaba un DWG." });
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0 || file.Length > maxFileSize ||
        !Path.GetExtension(file.FileName).Equals(".dwg", StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new { message = "Archivo DWG inválido o mayor a 25 MB." });
    var converter = Environment.GetEnvironmentVariable("ODA_CONVERTER_PATH");
    if (string.IsNullOrWhiteSpace(converter) || !System.IO.File.Exists(converter))
        return Results.Json(new { message = "No está configurado ODA File Converter. Instalalo y definí ODA_CONVERTER_PATH con la ruta completa al ejecutable." }, statusCode: 503);
    var root = Path.Combine(Path.GetTempPath(), "LabelStudioDWG", Guid.NewGuid().ToString("N"));
    var input = Path.Combine(root, "input");
    var output = Path.Combine(root, "output");
    Directory.CreateDirectory(input); Directory.CreateDirectory(output);
    try {
        var source = Path.Combine(input, "plano.dwg");
        await using (var stream = System.IO.File.Create(source)) await file.CopyToAsync(stream);
        using var process = new System.Diagnostics.Process();
        process.StartInfo = new System.Diagnostics.ProcessStartInfo {
            FileName = converter,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true
        };
        foreach (var arg in new[] { input, output, "ACAD2018", "DXF", "0", "1" })
            process.StartInfo.ArgumentList.Add(arg);
        process.Start();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(45));
        try { await process.WaitForExitAsync(timeout.Token); }
        catch (OperationCanceledException) { if (!process.HasExited) process.Kill(true); return Results.Json(new { message = "ODA tardó demasiado en convertir el DWG." }, statusCode: 504); }
        var dxf = Directory.GetFiles(output, "*.dxf", SearchOption.AllDirectories).FirstOrDefault();
        if (process.ExitCode != 0 || dxf is null)
            return Results.Json(new { message = "ODA no pudo convertir el plano. Revisá la versión y la integridad del DWG." }, statusCode: 422);
        var text = await System.IO.File.ReadAllTextAsync(dxf);
        if (!text.Contains("SECTION") || !text.Contains("ENTITIES"))
            return Results.Json(new { message = "ODA generó un DXF no ASCII o sin entidades; exportá a DXF ASCII." }, statusCode: 422);
        return Results.Text(text, "text/plain");
    } catch (Exception ex) {
        return Results.Json(new { message = "Falló la conversión DWG: " + ex.Message }, statusCode: 422);
    } finally {
        try { Directory.Delete(root, true); } catch { /* temp cleanup best effort */ }
    }
}).DisableAntiforgery();
app.Run();
