
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://127.0.0.1:5187");

const string allowedOrigin = "http://localhost:3000";
const long maxFileSize = 25 * 1024 * 1024;

builder.Services.AddCors(options =>
{
    options.AddPolicy("LabelStudio", policy =>
        policy.WithOrigins(allowedOrigin)
              .WithMethods("GET", "POST")
              .WithHeaders("Content-Type"));
});

var app = builder.Build();
var solidWorksService = new SolidWorksService();
app.UseCors("LabelStudio");

app.MapGet("/health", () => Results.Ok(new
{
    status = "online",
    service = "Label Studio Industrial Connector",
    version = "1.1.0",
    solidWorksIntegration = "pending"
}));

app.MapGet("/solidworks/status", () =>
{
    return Results.Ok(new
    {
        status = solidWorksService.GetStatus(),
        capabilities = solidWorksService.GetCapabilities()
    });
});

app.MapPost("/convert", async (HttpRequest request) =>
{
    if (request.Headers.Origin.ToString() != allowedOrigin)
        return Results.StatusCode(403);

    if (!request.HasFormContentType)
        return Results.BadRequest(new
        {
            message = "Se esperaba un archivo."
        });

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");

    if (file == null || file.Length == 0)
        return Results.BadRequest(new
        {
            message = "No se recibió un archivo válido."
        });

    if (file.Length > maxFileSize)
        return Results.BadRequest(new
        {
            message = "El archivo supera los 25 MB."
        });

    if (!Path.GetExtension(file.FileName)
             .Equals(".sldprt", StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest(new
        {
            message = "Solo se admiten archivos .SLDPRT."
        });

    // Leer el archivo sin almacenarlo permanentemente.
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);

    return Results.Json(new
    {
        success = false,
        fileName = Path.GetFileName(file.FileName),
        receivedBytes = stream.Length,
        code = "SOLIDWORKS_NOT_CONFIGURED",
        message = "Archivo recibido correctamente. La conversión con SolidWorks todavía no está configurada."
    }, statusCode: 501);
})
.DisableAntiforgery();

app.Run();
