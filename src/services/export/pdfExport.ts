import { jsPDF } from 'jspdf';
import { LabelTemplate, Piece, LabelElement } from '../../types/index.ts';

/**
 * Generates an offscreen Canvas representing the label at high DPI for PDF or PNG export
 */
export async function renderLabelToCanvas(
  template: LabelTemplate,
  piece: Piece,
  scaleFactor: number = 3.5 // high resolution for crisp print
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const widthPx = Math.round(template.widthMm * 3.7795 * scaleFactor);
  const heightPx = Math.round(template.heightMm * 3.7795 * scaleFactor);

  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Conversion helper: mm to canvas pixels
  const mmToPx = (mm: number) => mm * 3.7795 * scaleFactor;

  // Render elements sorted by zIndex
  const sortedElements = [...template.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const el of sortedElements) {
    if (el.visible === false) continue;

    const x = mmToPx(el.xMm);
    const y = mmToPx(el.yMm);
    const w = mmToPx(el.widthMm);
    const h = mmToPx(el.heightMm);

    ctx.save();

    switch (el.type) {
      case 'code': {
        const textVal = (el.prefix || '') + (piece.code || 'PIEZA-000') + (el.suffix || '');
        const fontPt = el.fontSizePt || 14;
        const fontPx = fontPt * 1.333 * scaleFactor;
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : ''}${fontPx}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(textVal, x, y);
        break;
      }

      case 'name': {
        const textVal = (el.prefix || '') + (piece.name || piece.code || '') + (el.suffix || '');
        const fontPt = el.fontSizePt || 8.5;
        const fontPx = fontPt * 1.333 * scaleFactor;
        ctx.font = `${el.fontWeight === 'bold' ? '600 ' : '400 '}${fontPx}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#111111';
        ctx.textBaseline = 'top';
        ctx.fillText(textVal, x, y, w);
        break;
      }

      case 'custom_text': {
        const textVal = el.customText || '';
        const fontPt = el.fontSizePt || 7.5;
        const fontPx = fontPt * 1.333 * scaleFactor;
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : 'normal '}${fontPx}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(textVal, x, y, w);
        break;
      }

      case 'date': {
        const d = new Date();
        const dateStr = (el.prefix || '') + `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}` + (el.suffix || '');
        const fontPt = el.fontSizePt || 7.5;
        const fontPx = fontPt * 1.333 * scaleFactor;
        ctx.font = `${fontPx}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#333333';
        ctx.textBaseline = 'top';
        ctx.fillText(dateStr, x, y);
        break;
      }

      case 'quantity': {
        const textVal = el.customText || el.prefix || 'CANT: 1 UDS';
        const fontPt = el.fontSizePt || 8;
        const fontPx = fontPt * 1.333 * scaleFactor;
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : '500 '}${fontPx}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(textVal, x, y);
        break;
      }

      case 'line': {
        const thickness = mmToPx(el.borderWidthMm || 0.4);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
        break;
      }

      case 'rect_box': {
        const thickness = mmToPx(el.borderWidthMm || 0.4);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = thickness;
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'drawing': {
        if (piece.rawSvg) {
          await drawSvgToContext(ctx, piece.rawSvg, x, y, w, h, el.invertColors || false);
        }
        break;
      }

      case 'barcode': {
        drawRealisticBarcode(ctx, piece.code || '12345678', x, y, w, h, el.includeTextUnderBarcode !== false, scaleFactor);
        break;
      }

      case 'qrcode': {
        drawRealisticQrCode(ctx, piece.code || 'LABEL-STUDIO', x, y, w, h);
        break;
      }
    }

    ctx.restore();
  }

  return canvas;
}

function drawSvgToContext(
  ctx: CanvasRenderingContext2D,
  svgString: string,
  x: number,
  y: number,
  w: number,
  h: number,
  invert: boolean
): Promise<void> {
  return new Promise((resolve) => {
    // Add black stroke styling
    const styledSvg = svgString.includes('stroke=')
      ? svgString
      : svgString.replace('<svg', '<svg stroke="#000000" fill="none"');

    const blob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(w / img.width, h / img.height) * 0.96;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = x + (w - drawW) / 2;
      const offsetY = y + (h - drawH) / 2;

      if (invert) {
        ctx.filter = 'invert(1)';
      }
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      if (invert) {
        ctx.filter = 'none';
      }
      URL.revokeObjectURL(url);
      resolve();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };

    img.src = url;
  });
}

function drawRealisticBarcode(
  ctx: CanvasRenderingContext2D,
  code: string,
  x: number,
  y: number,
  w: number,
  h: number,
  showText: boolean,
  scale: number
) {
  const textSpace = showText ? 14 * scale : 0;
  const barHeight = Math.max(10, h - textSpace);

  // Generate deterministic bar pattern based on code characters
  const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const barCount = 45;
  const barWidth = w / barCount;

  ctx.fillStyle = '#000000';

  // Guard quiet zones
  let currentX = x + barWidth * 2;
  const endX = x + w - barWidth * 2;

  // Start guard bars
  ctx.fillRect(currentX, y, barWidth * 1.5, barHeight);
  currentX += barWidth * 2.5;

  let patternIdx = seed % 7;
  while (currentX < endX - barWidth * 4) {
    const isThick = ((currentX * 13 + patternIdx * 7) % 11) > 5;
    const thickness = isThick ? barWidth * 1.8 : barWidth * 0.9;
    ctx.fillRect(currentX, y, thickness, barHeight);
    currentX += thickness + barWidth * (1 + ((patternIdx % 3) * 0.4));
    patternIdx++;
  }

  // End guard bars
  ctx.fillRect(endX - barWidth * 2, y, barWidth * 1.5, barHeight);

  if (showText) {
    ctx.font = `600 ${10 * scale}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(code, x + w / 2, y + barHeight + 11 * scale);
  }
}

function drawRealisticQrCode(
  ctx: CanvasRenderingContext2D,
  data: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const size = Math.min(w, h);
  const offsetX = x + (w - size) / 2;
  const offsetY = y + (h - size) / 2;

  const modules = 21; // Standard Version 1 QR matrix
  const cellSize = size / modules;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(offsetX, offsetY, size, size);

  ctx.fillStyle = '#000000';

  // Draw 3 Position Detection Patterns (Corners)
  const drawFinder = (fx: number, fy: number) => {
    // Outer 7x7 box
    ctx.fillRect(fx, fy, cellSize * 7, cellSize * 7);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx + cellSize, fy + cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(fx + cellSize * 2, fy + cellSize * 2, cellSize * 3, cellSize * 3);
  };

  drawFinder(offsetX, offsetY);
  drawFinder(offsetX + (modules - 7) * cellSize, offsetY);
  drawFinder(offsetX, offsetY + (modules - 7) * cellSize);

  // Timing patterns
  for (let i = 8; i < modules - 8; i += 2) {
    ctx.fillRect(offsetX + i * cellSize, offsetY + 6 * cellSize, cellSize, cellSize);
    ctx.fillRect(offsetX + 6 * cellSize, offsetY + i * cellSize, cellSize, cellSize);
  }

  // Deterministic data dots
  const hash = data.split('').reduce((acc, c, i) => acc ^ (c.charCodeAt(0) << (i % 8)), 1337);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Avoid finder patterns
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
        continue;
      }
      if (r === 6 || c === 6) continue;

      const dotVal = (hash * (r + 1) * 31 + c * 17) % 7;
      if (dotVal === 1 || dotVal === 3 || dotVal === 5) {
        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize * 0.95, cellSize * 0.95);
      }
    }
  }
}

/**
 * Exports a single label as PDF with real physical millimeter dimensions
 */
export async function exportLabelPdf(
  template: LabelTemplate,
  piece: Piece,
  copies: number = 1
): Promise<void> {
  const orientation = template.widthMm >= template.heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [template.widthMm, template.heightMm]
  });

  const canvas = await renderLabelToCanvas(template, piece, 4);
  const imgData = canvas.toDataURL('image/png');

  for (let i = 0; i < copies; i++) {
    if (i > 0) {
      pdf.addPage([template.widthMm, template.heightMm], orientation);
    }
    pdf.addImage(imgData, 'PNG', 0, 0, template.widthMm, template.heightMm);
  }

  pdf.save(`etiqueta_${piece.code || 'industrial'}_${template.widthMm}x${template.heightMm}mm.pdf`);
}

/**
 * Exports a batch of multiple pieces as a single multipage PDF
 */
export async function exportBatchPdf(
  template: LabelTemplate,
  pieces: Piece[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pieces.length === 0) return;

  const orientation = template.widthMm >= template.heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [template.widthMm, template.heightMm]
  });

  for (let i = 0; i < pieces.length; i++) {
    if (i > 0) {
      pdf.addPage([template.widthMm, template.heightMm], orientation);
    }

    const p = pieces[i];
    const canvas = await renderLabelToCanvas(template, p, 3.5);
    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, 0, template.widthMm, template.heightMm);

    if (onProgress) {
      onProgress(i + 1, pieces.length);
    }
  }

  pdf.save(`lote_etiquetas_${pieces.length}_piezas_${template.widthMm}x${template.heightMm}mm.pdf`);
}

/**
 * Downloads a high resolution PNG of the label
 */
export async function downloadLabelPng(
  template: LabelTemplate,
  piece: Piece,
  fileName?: string
): Promise<void> {
  const canvas = await renderLabelToCanvas(template, piece, 4);
  const link = document.createElement('a');
  link.download = fileName || `etiqueta_${piece.code || 'industrial'}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
