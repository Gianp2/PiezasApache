# Label Studio Industrial — Pruebas de fábrica

## Estado
- Web Vercel: editor, plantillas y ZPL independientes del conector.
- `.SLDPRT`: requiere SolidWorks instalado/licenciado y el conector local abierto en Windows.
- Conversión: intenta exportar una **vista isométrica PNG real** desde SolidWorks mediante COM. **No extrae un sólido 3D ni genera DXF**. La salida se convierte a dibujo monocromo para la etiqueta.
- `.DWG`: no se genera geometría falsa; exportar a DXF cuando no pueda leerse.
- La impresión Zebra se debe verificar con modelo, DPI, tamaño y ZPL de la impresora real.

## Publicar web
`npm ci` / `npx tsc --noEmit` / `npm run build`. Publicar `dist` en Vercel.

## Ejecutar conector en la PC con SolidWorks
Desde `connector/LabelStudioConnector`:
`dotnet restore`
`dotnet run`
Comprobar `http://127.0.0.1:5187/health` y `http://127.0.0.1:5187/solidworks/status`.
Para distribuir un ejecutable en Windows x64: `dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish`.
El conector se ejecuta en la **sesión interactiva de Windows** de la empleada, no como servicio Windows sin escritorio.

## Seguridad y navegador
El conector solo escucha en loopback `127.0.0.1`, comprueba el origen HTTP y limita archivos a 25 MB.
Acepta por defecto `https://piezasapache.vercel.app` y `http://localhost:3000`.
Para dominios adicionales usar `LABEL_STUDIO_ALLOWED_ORIGINS` con orígenes HTTPS separados por comas.
Los navegadores pueden bloquear llamadas desde HTTPS a localhost por políticas de acceso a red local: validar en Chrome de fábrica y autorizar acceso si se solicita. No desactivar seguridad global de Chrome.

## Lista de pruebas
1. Importar DXF real; validar contorno y agujeros.
2. Importar SLDPRT real en la PC con SolidWorks y conector ejecutándose; comprobar que la vista isométrica coincide con la pieza.
3. Guardar una plantilla, cerrar y reabrir el navegador y verificar persistencia **en esa misma PC** (almacenamiento local).
4. Seleccionar y mover texto y dibujo, borrar con Supr, deshacer.
5. Exportar ZPL y comparar con la vista previa y tamaño físico Zebra.
6. Probar fallos de SolidWorks: el programa debe mostrar error, nunca sustituir por ejemplo.

**Limitación:** no se ha podido validar el conector COM en Windows con SolidWorks en este entorno. Algunas versiones de SolidWorks podrían requerir ajustes en el método de exportación PNG. La vista isométrica puede necesitar ajustes de contraste y encuadre.
