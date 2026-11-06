import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import { inspectDwgFile } from '../dwgHelper.ts';

/** DWG is proprietary binary CAD; do not substitute a sample drawing for the user's part. */
export class DwgAdapter implements FormatAdapter {
  id = 'dwg-adapter';
  supportedFormats = ['dwg' as const];
  supports(detection: DetectionResult): boolean { return detection.detectedFormat === 'dwg'; }
  async process(file: File | Blob, fileName: string, _options?: AdapterOptions): Promise<NormalizedDrawing> {
    const fileObj = file instanceof File ? file : new File([file], fileName);
    const inspection = await inspectDwgFile(fileObj);
    if (!inspection.isDwg) throw new Error(`No se pudo verificar el archivo DWG «${fileName}».`);
    throw new Error(`El archivo «${fileName}» es DWG binario (${inspection.autocadVersionName || 'AutoCAD'}). Esta versión web no puede extraer su geometría con precisión. Abrilo en AutoCAD o SolidWorks y exportá la vista 2D a DXF; luego importá ese DXF. No se generó ninguna pieza ficticia.`);
  }
}
