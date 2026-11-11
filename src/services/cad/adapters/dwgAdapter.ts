import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import { inspectDwgFile } from '../dwgHelper.ts';
import { DxfAdapter } from './dxfAdapter.ts';

/** DWG requires a genuine local CAD conversion; never generate placeholder geometry. */
export class DwgAdapter implements FormatAdapter {
  id = 'dwg-adapter';
  supportedFormats = ['dwg' as const];
  supports(detection: DetectionResult): boolean { return detection.detectedFormat === 'dwg'; }
  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const source = file instanceof File ? file : new File([file], fileName);
    const inspection = await inspectDwgFile(source);
    if (!inspection.isDwg) throw new Error('No se pudo validar la cabecera DWG.');
    const body = new FormData();
    body.append('file', source, fileName);
    let response: Response;
    try {
      response = await fetch('http://127.0.0.1:5187/convert-dwg', { method: 'POST', body, signal: AbortSignal.timeout(60000) });
    } catch {
      throw new Error('El DWG requiere el conector Windows y ODA File Converter. Iniciá el conector en la PC con ODA instalado; no se generó una pieza de ejemplo.');
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(detail?.message || `El conector DWG respondió ${response.status}.`);
    }
    const dxfText = await response.text();
    if (!dxfText.includes('SECTION') || !dxfText.includes('ENTITIES')) throw new Error('La conversión DWG no produjo geometría DXF válida.');
    const dxf = new File([dxfText], fileName.replace(/\.dwg$/i, '.dxf'), { type: 'text/plain' });
    const drawing = await new DxfAdapter().process(dxf, dxf.name, options);
    drawing.format = 'dwg';
    drawing.originalFileName = fileName;
    drawing.fileSizeBytes = file.size;
    drawing.autoCode = fileName.replace(/\.dwg$/i, '').toUpperCase();
    drawing.autoName = fileName.replace(/\.dwg$/i, '');
    drawing.warnings.push('DWG convertido localmente a DXF. Verificá que la vista elegida y todos los contornos sean correctos.');
    return drawing;
  }
}
