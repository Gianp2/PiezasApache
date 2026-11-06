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
app.Run();
