import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import { parseDxfContent } from '../dxfParser.ts';

export class DxfAdapter implements FormatAdapter {
  id = 'dxf-adapter';
  supportedFormats = ['dxf' as const];

  supports(detection: DetectionResult): boolean {
    return detection.detectedFormat === 'dxf';
  }

  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const text = await file.text();
    const result = parseDxfContent(text, options?.activeLayers);

    // Count holes (circles or closed cuts)
    const holeCount = (result.svg.match(/<circle/g) || []).length;

    // Generate preview raster data URL
    const previewDataUrl = await svgToPreviewDataUrl(result.svg, 300, 300);

    const warnings: string[] = [];
    if (result.unsupportedEntities.length > 0) {
      warnings.push(`Entidades complejas no geométricas omitidas: ${result.unsupportedEntities.join(', ')}`);
    }

    return {
      format: 'dxf',
      rawSvg: result.svg,
      previewDataUrl,
      bounds: result.bounds,
      layers: result.layers,
      entityCount: result.entityCount,
      holeCount,
      autoCode: cleanCodeFromFileName(fileName),
      autoName: cleanNameFromFileName(fileName),
      originalFileName: fileName,
      fileSizeBytes: file.size,
      warnings
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

export function svgToPreviewDataUrl(svgString: string, w: number = 300, h: number = 300): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const styledSvg = svgString.includes('stroke=')
      ? svgString
      : svgString.replace('<svg', '<svg stroke="#000000" fill="none"');

    const blob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min((w * 0.9) / img.width, (h * 0.9) / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}
