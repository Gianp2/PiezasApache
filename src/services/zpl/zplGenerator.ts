import { LabelTemplate, Piece, LabelDpi, LabelElement } from '../../types/index.ts';

export function mmToDots(mm: number, dpi: LabelDpi): number {
  switch (dpi) {
    case 203:
      return Math.round(mm * 8.0);
    case 300:
      return Math.round(mm * 11.811);
    case 600:
      return Math.round(mm * 23.622);
    default:
      return Math.round(mm * 8.0);
  }
}

export function dotsToMm(dots: number, dpi: LabelDpi): number {
  switch (dpi) {
    case 203:
      return dots / 8.0;
    case 300:
      return dots / 11.811;
    case 600:
      return dots / 23.622;
    default:
      return dots / 8.0;
  }
}

/**
 * Converts an SVG string or image to ZPL Graphic Field ASCII (^GFA)
 */
export async function convertSvgToZplGfa(
  svgString: string,
  widthDots: number,
  heightDots: number,
  strokeWidth: number = 2,
  invert: boolean = false
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, widthDots);
  canvas.height = Math.max(8, heightDots);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render SVG onto canvas
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Draw preserving aspect ratio inside box
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.94;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (canvas.width - drawW) / 2;
      const offsetY = (canvas.height - drawH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const widthBytes = Math.ceil(canvas.width / 8);
  const totalBytes = widthBytes * canvas.height;

  let hexResult = '';

  for (let y = 0; y < canvas.height; y++) {
    for (let byteIdx = 0; byteIdx < widthBytes; byteIdx++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        if (x < canvas.width) {
          const pixelIdx = (y * canvas.width + x) * 4;
          // Monochrome threshold
          const r = data[pixelIdx];
          const g = data[pixelIdx + 1];
          const b = data[pixelIdx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          const isBlack = gray < 160;
          const bitVal = invert ? (isBlack ? 0 : 1) : (isBlack ? 1 : 0);

          if (bitVal === 1) {
            byteVal |= 1 << (7 - bit);
          }
        }
      }
      hexResult += byteVal.toString(16).padStart(2, '0').toUpperCase();
    }
  }

  return `^GFA,${totalBytes},${totalBytes},${widthBytes},${hexResult}`;
}

export interface ZplGenerationOptions {
  copies?: number;
  darkness?: number; // 0-30
  printSpeed?: number; // 2-6
  overridePiece?: Partial<Piece>;
}

export async function generateZpl(
  template: LabelTemplate,
  piece: Piece,
  options: ZplGenerationOptions = {}
): Promise<string> {
  const dpi = template.dpi || 203;
  const copies = options.copies || 1;
  const darkness = options.darkness ?? 20;
  const speed = options.printSpeed ?? 4;

  const totalWidthDots = mmToDots(template.widthMm, dpi);
  const totalHeightDots = mmToDots(template.heightMm, dpi);

  const lines: string[] = [];

  // Start format
  lines.push('^XA');
  lines.push('^CI28'); // Enable UTF-8 encoding
  lines.push(`^PW${totalWidthDots}`); // Print width
  lines.push(`^LL${totalHeightDots}`); // Label length
  lines.push('^LS0'); // Label shift
  lines.push(`~SD${darkness}`); // Set darkness
  lines.push(`^PR${speed},${speed}`); // Print speed

  // Process elements
  for (const el of template.elements) {
    if (el.visible === false) continue;

    const xDots = mmToDots(el.xMm, dpi);
    const yDots = mmToDots(el.yMm, dpi);
    const wDots = mmToDots(el.widthMm, dpi);
    const hDots = mmToDots(el.heightMm, dpi);

    switch (el.type) {
      case 'code': {
        const textVal = (el.prefix || '') + (piece.code || 'PIEZA-000') + (el.suffix || '');
        const fontHeight = Math.max(16, mmToDots((el.fontSizePt || 14) * 0.3527, dpi));
        const fontWidth = Math.round(fontHeight * 0.8);
        lines.push(`^FO${xDots},${yDots}^A0N,${fontHeight},${fontWidth}^FD${textVal}^FS`);
        break;
      }

      case 'name': {
        const textVal = (el.prefix || '') + (piece.name || piece.code || '') + (el.suffix || '');
        const fontHeight = Math.max(14, mmToDots((el.fontSizePt || 9) * 0.3527, dpi));
        const fontWidth = Math.round(fontHeight * 0.75);
        // Field block for multi-line support
        lines.push(`^FO${xDots},${yDots}^FB${wDots},2,2,L,0^A0N,${fontHeight},${fontWidth}^FD${textVal}^FS`);
        break;
      }

      case 'custom_text': {
        const textVal = el.customText || '';
        const fontHeight = Math.max(12, mmToDots((el.fontSizePt || 8) * 0.3527, dpi));
        const fontWidth = Math.round(fontHeight * 0.75);
        lines.push(`^FO${xDots},${yDots}^A0N,${fontHeight},${fontWidth}^FD${textVal}^FS`);
        break;
      }

      case 'barcode': {
        const codeVal = piece.code || '12345678';
        const barHeight = Math.max(20, hDots - 15);
        const showText = el.includeTextUnderBarcode ? 'Y' : 'N';
        // Code 128
        lines.push(`^FO${xDots},${yDots}^BY2,3,${barHeight}`);
        lines.push(`^BCN,${barHeight},${showText},N,N,A^FD${codeVal}^FS`);
        break;
      }

      case 'qrcode': {
        const qrData = piece.code || 'QR-CODE';
        // QR magnification: 1 to 10
        let mag = Math.round(Math.min(wDots, hDots) / 32);
        mag = Math.max(2, Math.min(10, mag));
        lines.push(`^FO${xDots},${yDots}^BQN,2,${mag}^FDQA,${qrData}^FS`);
        break;
      }

      case 'date': {
        const d = new Date();
        const dateStr = (el.prefix || '') + `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}` + (el.suffix || '');
        const fontHeight = Math.max(12, mmToDots((el.fontSizePt || 7) * 0.3527, dpi));
        const fontWidth = Math.round(fontHeight * 0.75);
        lines.push(`^FO${xDots},${yDots}^A0N,${fontHeight},${fontWidth}^FD${dateStr}^FS`);
        break;
      }

      case 'quantity': {
        const qtyStr = el.customText || el.prefix || 'CANT: 1 UDS';
        const fontHeight = Math.max(12, mmToDots((el.fontSizePt || 8) * 0.3527, dpi));
        const fontWidth = Math.round(fontHeight * 0.75);
        lines.push(`^FO${xDots},${yDots}^A0N,${fontHeight},${fontWidth}^FD${qtyStr}^FS`);
        break;
      }

      case 'rect_box': {
        const borderDots = Math.max(1, mmToDots(el.borderWidthMm || 0.4, dpi));
        lines.push(`^FO${xDots},${yDots}^GB${wDots},${hDots},${borderDots}^FS`);
        break;
      }

      case 'line': {
        const borderDots = Math.max(1, mmToDots(el.borderWidthMm || 0.4, dpi));
        lines.push(`^FO${xDots},${yDots}^GB${wDots},${borderDots},${borderDots}^FS`);
        break;
      }

      case 'drawing': {
        if (piece.rawSvg) {
          try {
            const gfaCmd = await convertSvgToZplGfa(
              piece.rawSvg,
              wDots,
              hDots,
              el.strokeWidthMm || 0.5,
              el.invertColors || false
            );
            if (gfaCmd) {
              lines.push(`^FO${xDots},${yDots}${gfaCmd}^FS`);
            }
          } catch (e) {
            console.error('Error generating graphic field for piece drawing', e);
          }
        }
        break;
      }
    }
  }

  // Print quantity copies
  lines.push(`^PQ${copies},0,1,Y`);
  lines.push('^XZ');

  return lines.join('\n');
}
