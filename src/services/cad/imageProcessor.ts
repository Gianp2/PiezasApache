export interface ImageProcessingOptions {
  contrast: number; // -100 to 100
  threshold: number; // 0 to 255 (128 default)
  invert: boolean;
  cropRect?: { x: number; y: number; width: number; height: number }; // In normalized percentage (0 to 1)
  removeMargins: boolean;
}

export interface ProcessedImageResult {
  dataUrl: string;
  svg: string;
  width: number;
  height: number;
}

export async function processImageFile(
  file: File | Blob,
  options: ImageProcessingOptions = {
    contrast: 20,
    threshold: 140,
    invert: false,
    removeMargins: true
  }
): Promise<ProcessedImageResult> {
  const img = await loadImageFromBlob(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo inicializar el contexto de imagen.');

  // Crop calculation
  let srcX = 0;
  let srcY = 0;
  let srcW = img.width;
  let srcH = img.height;

  if (options.cropRect) {
    srcX = Math.max(0, options.cropRect.x * img.width);
    srcY = Math.max(0, options.cropRect.y * img.height);
    srcW = Math.min(img.width - srcX, options.cropRect.width * img.width);
    srcH = Math.min(img.height - srcY, options.cropRect.height * img.height);
  }

  canvas.width = Math.round(srcW);
  canvas.height = Math.round(srcH);

  // Fill canvas with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

  // Apply Pixel Filters
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Contrast factor
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Luminance grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Thresholding to pure 1-bit monochrome (0 or 255)
    let binary = gray < options.threshold ? 0 : 255;

    // Invert if needed
    if (options.invert) {
      binary = 255 - binary;
    }

    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  // Trim excess white margins if requested
  let finalCanvas = canvas;
  if (options.removeMargins) {
    const trimmed = trimCanvasMargins(canvas);
    if (trimmed) {
      finalCanvas = trimmed;
    }
  }

  const finalDataUrl = finalCanvas.toDataURL('image/png');
  const svg = `<svg viewBox="0 0 ${finalCanvas.width} ${finalCanvas.height}" xmlns="http://www.w3.org/2000/svg">
    <image href="${finalDataUrl}" width="${finalCanvas.width}" height="${finalCanvas.height}" />
  </svg>`;

  return {
    dataUrl: finalDataUrl,
    svg,
    width: finalCanvas.width,
    height: finalCanvas.height
  };
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen.'));
    };
    img.src = url;
  });
}

function trimCanvasMargins(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return null;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  // Find non-white pixels (< 240)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const isBlack = data[idx] < 240;
      if (isBlack) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If nothing or entire canvas is black
  if (maxX <= minX || maxY <= minY) {
    return null;
  }

  // Add 10px margin
  const pad = 12;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return null;

  trimmedCtx.fillStyle = '#FFFFFF';
  trimmedCtx.fillRect(0, 0, cropW, cropH);
  trimmedCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return trimmedCanvas;
}
