# Label Studio Industrial — revisión de importación y editor

## Cambios de esta versión
- El sistema ya no agrega automáticamente piezas de demostración a una biblioteca vacía. Los registros que existían en IndexedDB se conservan para evitar borrar datos de usuarios; eliminá manualmente las piezas antiguas de ejemplo si aparecen.
- DXF: lectura mejorada de líneas, círculos, arcos, elipses, polilíneas con bulge y bloques INSERT anidados. Las cotas y capas auxiliares se pueden ocultar. Las entidades que no se pueden representar con fidelidad (por ejemplo SPLINE) generan una advertencia, **no se sustituyen por líneas inventadas**.
- DWG: opción de conversión real mediante conector Windows + ODA File Converter, si está instalado y configurado. No hay interpretación DWG nativa en el navegador.
- Importación: protección frente a resultados de cargas/reprocesamientos asincrónicos que lleguen fuera de orden.
- Editor: prevención de selección por clic derecho y de propagación accidental durante el arrastre.
- Impresoras: no se preselecciona falsamente una Zebra ZD420; el usuario debe elegir la impresora detectada.

## Requisitos para DWG
1. Instalar ODA File Converter en Windows de acuerdo con sus condiciones de licencia.
2. Definir la variable de entorno `ODA_CONVERTER_PATH` con la ruta completa del ejecutable (por ejemplo `C:\\Program Files\\ODA\\ODAFileConverter...\\ODAFileConverter.exe`, ajustando a la ruta real).
3. Ejecutar `connector\\INICIAR_CONECTOR_WINDOWS.cmd` con .NET SDK instalado.
4. Importar DWG desde la web en la misma PC. El navegador envía el DWG al conector en `127.0.0.1:5187`, y el conector llama a ODA para producir DXF ASCII.
5. Revisar las advertencias y la vista previa. Algunos planos tienen varias vistas, cotas y geometría 3D; **no se garantiza detección automática del contorno correcto**.

## Verificación obligatoria
En la raíz del proyecto:
```
npm install
npx tsc --noEmit
npm run build
npm run dev -- --force
```
Luego probar con DWG real, DXF real, SLDPRT en la fábrica y la Zebra. El entorno de preparación de este ZIP no permitió instalar dependencias de npm ni ejecutar SolidWorks, ODA o una Zebra. Se comprobó la sintaxis TypeScript de los archivos modificados, pero no una compilación integral ni una prueba CAD de extremo a extremo.

## Limitaciones conocidas
- SPLINE y algunas entidades CAD especializadas no se convierten todavía con fidelidad; se informa en la importación.
- La selección de vista o componente en planos con varias vistas sigue siendo manual mediante capas y verificación de vista previa.
- El archivo SLDPRT necesita SolidWorks instalado y registrado en Windows.
- El servicio Zebra Browser Print debe estar instalado y autorizado por el navegador.
- Los archivos DWG y SLDPRT de prueba no se pueden interpretar directamente sin sus respectivos motores CAD.
