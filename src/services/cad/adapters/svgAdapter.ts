import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import { processSvgContent } from '../svgProcessor.ts';
import { svgToPreviewDataUrl } from './dxfAdapter.ts';

export class SvgAdapter implements FormatAdapter {
  id = 'svg-adapter';
  supportedFormats = ['svg' as const];

  supports(detection: DetectionResult): boolean {
    return detection.detectedFormat === 'svg';
  }

  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const text = await file.text();
    const result = processSvgContent(text, options?.rotation || 0);

    const previewDataUrl = await svgToPreviewDataUrl(result.svg, 300, 300);

    return {
      format: 'svg',
      rawSvg: result.svg,
      previewDataUrl,
      bounds: result.bounds,
      entityCount: 1,
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
