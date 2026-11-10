import { FormatAdapter, DetectionResult, NormalizedDrawing, AdapterOptions } from '../types.ts';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker safely
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
} catch (e) {
  console.warn('PDF worker configuration fallback', e);
}

export class PdfAdapter implements FormatAdapter {
  id = 'pdf-adapter';
  supportedFormats = ['pdf' as const];

  supports(detection: DetectionResult): boolean {
    return detection.detectedFormat === 'pdf';
  }

  async process(file: File | Blob, fileName: string, options?: AdapterOptions): Promise<NormalizedDrawing> {
    const arrayBuffer = await file.arrayBuffer();

    let doc: any;
    let pageCount = 1;
    let targetPageNum = options?.pdfPageNumber || 1;

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      doc = await loadingTask.promise;
      pageCount = doc.numPages;
      if (targetPageNum > pageCount) targetPageNum = 1;
    } catch (err: any) {
      throw new Error(`No se pudo leer el documento PDF: ${err.message || 'Estructura corrupta'}`);
    }

    // Render target page
    const page = await doc.getPage(targetPageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo inicializar el lienzo para renderizar el PDF.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    // Region Crop or Auto Trim margins
    let srcX = 0;
    let srcY = 0;
    let srcW = canvas.width;
    let srcH = canvas.height;

    if (options?.pdfCropRegion) {
      srcX = Math.round(options.pdfCropRegion.x * canvas.width);
      srcY = Math.round(options.pdfCropRegion.y * canvas.height);
      srcW = Math.round(options.pdfCropRegion.width * canvas.width);
      srcH = Math.round(options.pdfCropRegion.height * canvas.height);
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = srcW;
    croppedCanvas.height = srcH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) throw new Error('Error al recortar dibujo PDF');

    croppedCtx.fillStyle = '#FFFFFF';
    croppedCtx.fillRect(0, 0, srcW, srcH);
    croppedCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    // Apply Thermal 1-bit thresholding
    const imgData = croppedCtx.getImageData(0, 0, srcW, srcH);
    const data = imgData.data;
    const threshold = options?.threshold ?? 150;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const bin = gray < threshold ? 0 : 255;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
      data[i + 3] = 255;
    }
    croppedCtx.putImageData(imgData, 0, 0);

    const finalDataUrl = croppedCanvas.toDataURL('image/png');
    const rawSvg = `<svg viewBox="0 0 ${srcW} ${srcH}" xmlns="http://www.w3.org/2000/svg">
      <image href="${finalDataUrl}" width="${srcW}" height="${srcH}" />
    </svg>`;

    return {
      format: 'pdf',
      rawSvg,
      previewDataUrl: finalDataUrl,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: srcW,
        maxY: srcH,
        width: srcW,
        height: srcH
      },
      pdfMetadata: {
        pageCount,
        selectedPage: targetPageNum
      },
      autoCode: cleanCodeFromFileName(fileName),
      autoName: cleanNameFromFileName(fileName),
      originalFileName: fileName,
      fileSizeBytes: file.size,
      warnings: pageCount > 1 ? [`El PDF contiene ${pageCount} páginas. Se ha procesado la página ${targetPageNum}.`] : []
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
