# Revisión de Label Studio Industrial

## Cambios aplicados
- DXF: reconocimiento de LINE cuando dxf-parser entrega vértices (formato común). Se rechaza un DXF sin geometría visible en vez de dibujar un cuadrado genérico.
- DXF binario: error explícito; requiere exportar a DXF ASCII.
- Importación: se evita que una conversión anterior sobrescriba una carga posterior; al cargar se limpia la vista anterior y se impide guardar mientras haya un error.
- Ejemplos: identificados como demostraciones, nunca como importaciones verificadas.
- Editor: controles directos de ancho y alto en milímetros, con aplicación y adaptación; propiedades de elementos limitadas al área física de la etiqueta; Ctrl+Z respeta campos de texto.
- PDF: worker servido por Vite localmente en lugar de depender de CDN externa.
- Configuración Vite: eliminado uso de __dirname.

## Limitaciones importantes y pruebas pendientes
- Este paquete no ha sido validado con una impresora Zebra real ni con SolidWorks real en este entorno. El módulo de impresión existente se conserva, no se reescribe.
- SLDPRT requiere conector .NET ejecutándose en la PC Windows que tiene SolidWorks instalado y pruebas de exportación isométrica. No puede procesarse únicamente en Vercel.
- DWG binario no se interpreta en el navegador; exportar a DXF ASCII.
- DXF con bloques INSERT, curvas con bulge o entidades no soportadas puede necesitar un conversor CAD externo. Si no hay geometría visible, se informa error.
- La vista de ejemplo de la biblioteca sigue siendo demostración; no equivale a la pieza que se importa.
- No se verificó compilación de TypeScript ni del conector .NET en este entorno por falta de dependencias completas.

## Pruebas Windows
```
npm install
npx tsc --noEmit
npm run build
npm run dev -- --force
```
Luego importar DXF ASCII con líneas y círculos, SVG, PNG y PDF; comprobar el tamaño de etiqueta y la impresión en la Zebra antes de usarlo en producción.
