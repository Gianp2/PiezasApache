# Integración de SolidWorks y sistema de fábrica

## Estado real
- El editor web NO abre archivos SLDPRT, SLDDRW ni SLDASM de forma nativa.
- `src/services/connectors/planConnector.ts` define el contrato para una futura integración; **no está conectado** a la intranet.
- Para obtener la silueta real, exportar desde SolidWorks una vista 2D (preferentemente DXF) que incluya contorno exterior y perforaciones visibles, sin cotas ni ejes. Importar ese archivo en el editor.
- No usar el nombre de archivo como prueba de que el contenido se ha convertido.

## Conector Windows futuro
1. Solicitar autorización a Sistemas y documentar cómo la intranet entrega el archivo al abrirlo en SolidWorks.
2. Implementar un servicio local Windows con acceso autorizado a archivos y a la API de SolidWorks; nunca guardar claves de empleados en el frontend.
3. Resolver código -> archivo con el mecanismo real documentado; contemplar revisiones y códigos duplicados.
4. Abrir el modelo en SolidWorks, obtener proyección 2D de la vista elegida y exportar geometría. Probar que los agujeros visibles y contornos interiores se conservan.
5. Enviar SVG/DXF o imagen al frontend mediante un canal local autenticado y limitado a orígenes permitidos. No exponer un servicio de archivos arbitrarios.
6. Cachear por código + revisión + vista; invalidar al cambiar el modelo.
7. Probar en la computadora de fábrica con SolidWorks y Zebra reales.

## Etiquetas compactas
En modo automático, para etiquetas micro (p.ej. 30×20 mm), el motor prioriza código y dibujo y oculta el código de barras 1D si no hay espacio fiable. El usuario puede elegir otra plantilla o una etiqueta más grande para incorporar códigos adicionales. Revisar siempre la vista previa y validar el escaneo con la Zebra real.

## Verificaciones pendientes
La compilación no verifica por sí sola la impresión física, la precisión del DXF, ni el conector SolidWorks. Probar ZPL en el modelo Zebra real, incluidos DPI, márgenes y ancho mínimo de barras.
