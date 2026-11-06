import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from './types.ts';
import { detectFileFormat } from './universalDetector.ts';
import { DxfAdapter } from './adapters/dxfAdapter.ts';
import { SvgAdapter } from './adapters/svgAdapter.ts';
import { ImageAdapter } from './adapters/imageAdapter.ts';
import { PdfAdapter } from './adapters/pdfAdapter.ts';
import { DwgAdapter } from './adapters/dwgAdapter.ts';
import { Piece } from '../../types/index.ts';
import { requestSolidWorksConversion } from '../solidWorksConnector.ts';

export class UniversalPlanRecognizer {
  private adapters: FormatAdapter[] = [];

  constructor() {
    // Register standard adapters
    this.registerAdapter(new DxfAdapter());
    this.registerAdapter(new SvgAdapter());
    this.registerAdapter(new ImageAdapter());
    this.registerAdapter(new PdfAdapter());
    this.registerAdapter(new DwgAdapter());
  }

  registerAdapter(adapter: FormatAdapter) {
    this.adapters.push(adapter);
  }

  /**
   * Recognizes and processes any uploaded CAD drawing, vector, PDF, or image
   * without needing the user to specify the format.
   */
  async recognizeAndProcess(
    file: File | Blob,
    fileName: string = '',
    options?: AdapterOptions
  ): Promise<{ detection: DetectionResult; drawing: NormalizedDrawing }> {
    const finalName = fileName || (file instanceof File ? file.name : 'PLANO-INDUSTRIAL.dxf');


if (/\.sldprt$/i.test(finalName)) {
  const solidWorksFile = file instanceof File ? file : new File([file], finalName);
  const realView = await requestSolidWorksConversion(solidWorksFile);
  const imageAdapter = new ImageAdapter();
  const drawing = await imageAdapter.process(realView, realView.name, {
    ...options, removeMargins: true, threshold: options?.threshold ?? 175
  });
  drawing.format = 'sldprt';
  drawing.autoCode = finalName.replace(/\.sldprt$/i, '').toUpperCase();
  drawing.autoName = finalName.replace(/\.sldprt$/i, '');
  drawing.originalFileName = finalName;
  drawing.fileSizeBytes = file.size;
  drawing.warnings.push('Vista isométrica real exportada desde SolidWorks. Revisá el contraste y la legibilidad antes de imprimir.');
  return {
    detection: { detectedFormat: 'sldprt', extensionFromFileName: 'sldprt',
      isExtensionMismatch: false, confidence: 1, signatureDesc: 'Vista exportada por SolidWorks local' },
    drawing
  };
}

if (/\.(slddrw|sldasm)$/i.test(finalName)) {
  throw new Error(
    "Los archivos .SLDDRW y .SLDASM todavía no están habilitados."
  );
}


    // 1. Detect real format via magic bytes & signatures
    const detection = await detectFileFormat(file, finalName);

    if (detection.detectedFormat === 'unknown') {
      throw new Error(
        `Formato no reconocido para "${finalName}". Admite archivos DXF, DWG, SVG, PDF, PNG, JPG y BMP.`
      );
    }

    // 2. Locate corresponding adapter
    const adapter = this.adapters.find((a) => a.supports(detection));
    if (!adapter) {
      throw new Error(
        `No se encontró un adaptador adecuado para el formato detectado: ${detection.detectedFormat.toUpperCase()}`
      );
    }

    // 3. Process geometry with selected adapter
    const drawing = await adapter.process(file, finalName, options);

    // If extension was mismatched, attach warning
    if (detection.isExtensionMismatch && detection.extensionFromFileName) {
      drawing.warnings.push(
        `El archivo tiene extensión .${detection.extensionFromFileName}, pero su contenido real es ${detection.detectedFormat.toUpperCase()}. Se ha procesado según su formato real verificado.`
      );
    }

    return { detection, drawing };
  }

  /**
   * Helper to convert a NormalizedDrawing into a persistent Piece for the library and editor
   */
  convertNormalizedToPiece(
    normalized: NormalizedDrawing,
    templateId: string = 'tpl-80x50-default',
    customNotes?: string
  ): Piece {
    return {
      id: `piece-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: normalized.autoCode,
      name: normalized.autoName,
      material: 'Acero Estándar',
      originalFileName: normalized.originalFileName,
      fileType: normalized.format as any,
      fileSize: normalized.fileSizeBytes,
      createdAt: Date.now(),
      templateId,
      printCount: 0,
      notes: customNotes || normalized.warnings.join(' · '),
      rawSvg: normalized.rawSvg,
      previewDataUrl: normalized.previewDataUrl,
      bounds: normalized.bounds,
      layers: normalized.layers,
      rotation: 0,
      strokeWidth: 2
    };
  }
}

// Global Singleton Instance
export const planRecognizer = new UniversalPlanRecognizer();
