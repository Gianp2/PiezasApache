import { CadLayer, PieceBounds } from '../../types/index.ts';
import { DwgInspectionResult } from './dwgHelper.ts';

export type DetectedFileType = 'dxf' | 'dwg' | 'pdf' | 'svg' | 'png' | 'jpg' | 'bmp' | 'unknown';

export interface DetectionResult {
  detectedFormat: DetectedFileType;
  extensionFromFileName?: string;
  isExtensionMismatch: boolean;
  confidence: number; // 0.0 to 1.0
  mimeType?: string;
  signatureDesc: string;
  autocadVersion?: string;
}

export interface NormalizedDrawing {
  format: DetectedFileType;
  rawSvg: string; // The canonical clean vector SVG
  previewDataUrl: string; // High-contrast thumbnail
  bounds: PieceBounds;
  layers?: CadLayer[];
  entityCount?: number;
  holeCount?: number;
  autoCode: string;
  autoName: string;
  originalFileName: string;
  fileSizeBytes: number;
  warnings: string[];
  pdfMetadata?: {
    pageCount: number;
    selectedPage: number;
  };
  imageMetadata?: {
    originalWidth: number;
    originalHeight: number;
    thresholdUsed: number;
  };
  dwgDetails?: DwgInspectionResult;
  requiresManualIntervention?: boolean;
}

export interface AdapterOptions {
  activeLayers?: Record<string, boolean>;
  threshold?: number;
  contrast?: number;
  invert?: boolean;
  removeMargins?: boolean;
  pdfPageNumber?: number;
  pdfCropRegion?: { x: number; y: number; width: number; height: number }; // Normalized 0-1
  lineThicknessMm?: number;
  rotation?: 0 | 90 | 180 | 270;
}

export interface FormatAdapter {
  id: string;
  supportedFormats: DetectedFileType[];
  supports(detection: DetectionResult): boolean;
  process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing>;
}
