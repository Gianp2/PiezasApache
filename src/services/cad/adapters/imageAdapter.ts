import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions, DetectedFileType } from '../types.ts';
import { processImageFile } from '../imageProcessor.ts';

export class ImageAdapter implements FormatAdapter {
  id = 'image-adapter';
  supportedFormats: DetectedFileType[] = ['png', 'jpg', 'bmp'];

  supports(detection: DetectionResult): boolean {
    return ['png', 'jpg', 'bmp'].includes(detection.detectedFormat);
  }

  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
    const fmt: DetectedFileType = ext === 'jpeg' ? 'jpg' : (ext as DetectedFileType);

    const result = await processImageFile(file, {
      contrast: options?.contrast ?? 25,
      threshold: options?.threshold ?? 140,
      invert: options?.invert ?? false,
      removeMargins: options?.removeMargins ?? true,
      cropRect: options?.pdfCropRegion
    });

    return {
      format: fmt,
      rawSvg: result.svg,
      previewDataUrl: result.dataUrl,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: result.width,
        maxY: result.height,
        width: result.width,
        height: result.height
      },
      imageMetadata: {
        originalWidth: result.width,
        originalHeight: result.height,
        thresholdUsed: options?.threshold ?? 140
      },
      autoCode: cleanCodeFromFileName(fileName),
      autoName: cleanNameFromFileName(fileName),
      originalFileName: fileName,
      fileSizeBytes: file.size,
      warnings: []
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
