import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import { inspectDwgFile, DwgInspectionResult } from '../dwgHelper.ts';

export class DwgAdapter implements FormatAdapter {
  id = 'dwg-adapter';
  supportedFormats = ['dwg' as const];

  supports(detection: DetectionResult): boolean {
    return detection.detectedFormat === 'dwg';
  }

  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const fileObj = file instanceof File ? file : new File([file], fileName);
    const inspection: DwgInspectionResult = await inspectDwgFile(fileObj);

    const autoCode = cleanCodeFromFileName(fileName);
    const autoName = cleanNameFromFileName(fileName);

    // Schematic fallback SVG explaining the conversion
    const schematicSvg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="10" y="10" width="380" height="280" rx="8" stroke="#333333" stroke-width="2" stroke-dasharray="4 4" fill="#FAFAFA" />
      <path d="M 50 150 L 350 150" stroke="#888888" stroke-width="1.5" />
      <path d="M 200 40 L 200 260" stroke="#888888" stroke-width="1.5" />
      <circle cx="200" cy="150" r="70" stroke="#111111" stroke-width="2.5" />
      <circle cx="200" cy="150" r="28" stroke="#111111" stroke-width="2" />
      <circle cx="150" cy="150" r="6" fill="#111111" />
      <circle cx="250" cy="150" r="6" fill="#111111" />
      <circle cx="200" cy="100" r="6" fill="#111111" />
      <circle cx="200" cy="200" r="6" fill="#111111" />
    </svg>`;

    return {
      format: 'dwg',
      rawSvg: schematicSvg,
      previewDataUrl: '',
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 400,
        maxY: 300,
        width: 400,
        height: 300
      },
      autoCode,
      autoName,
      originalFileName: fileName,
      fileSizeBytes: file.size,
      requiresManualIntervention: true,
      dwgDetails: inspection,
      warnings: [
        `Formato binario propietario detectado (${inspection.autocadVersionName || 'AutoCAD DWG'}).`,
        'Para procesar las geometrías sin cotas, guarde el plano como DXF (comando DXFOUT en AutoCAD).'
      ]
    };
  }
}

function cleanCodeFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base
    .replace(/[\s_]+/g, '-')
    .replace(/[-_]rev[a-z0-9]*/i, '')
    .toUpperCase();
}

function cleanNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base.replace(/[_-]+/g, ' ');
}
