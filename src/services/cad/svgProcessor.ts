import { PieceBounds } from '../../types/index.ts';

export interface ProcessedSvgResult {
  svg: string;
  bounds: PieceBounds;
  originalWidth: number;
  originalHeight: number;
}

export function processSvgContent(svgString: string, rotationDeg: 0 | 90 | 180 | 270 = 0): ProcessedSvgResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    throw new Error('El archivo no contiene un elemento <svg> válido.');
  }

  // Remove dangerous elements for safety
  const unsafeTags = svgEl.querySelectorAll('script, iframe, object, embed, link');
  unsafeTags.forEach((el) => el.remove());

  // Determine viewBox or dimensions
  let vb = svgEl.getAttribute('viewBox');
  let vbMinX = 0;
  let vbMinY = 0;
  let vbWidth = 100;
  let vbHeight = 100;

  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      vbMinX = parts[0];
      vbMinY = parts[1];
      vbWidth = parts[2];
      vbHeight = parts[3];
    }
  } else {
    const w = parseFloat(svgEl.getAttribute('width') || '100');
    const h = parseFloat(svgEl.getAttribute('height') || '100');
    vbWidth = isNaN(w) ? 100 : w;
    vbHeight = isNaN(h) ? 100 : h;
    svgEl.setAttribute('viewBox', `0 0 ${vbWidth} ${vbHeight}`);
  }

  // Ensure fill & stroke defaults for technical drawing rendering
  svgEl.setAttribute('fill', svgEl.getAttribute('fill') || 'none');
  if (!svgEl.getAttribute('stroke')) {
    svgEl.setAttribute('stroke', 'currentColor');
  }

  // Handle rotation
  let finalSvg = svgEl.outerHTML;
  if (rotationDeg !== 0) {
    const cx = vbMinX + vbWidth / 2;
    const cy = vbMinY + vbHeight / 2;
    // Swap width & height if 90 or 270
    const isTransposed = rotationDeg === 90 || rotationDeg === 270;
    const targetW = isTransposed ? vbHeight : vbWidth;
    const targetH = isTransposed ? vbWidth : vbHeight;
    const newVb = `${cx - targetW / 2} ${cy - targetH / 2} ${targetW} ${targetH}`;

    // Wrap contents in a rotated group
    const innerContent = svgEl.innerHTML;
    finalSvg = `<svg viewBox="${newVb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
      <g transform="rotate(${rotationDeg} ${cx} ${cy})">
        ${innerContent}
      </g>
    </svg>`;
  }

  return {
    svg: finalSvg,
    bounds: {
      minX: vbMinX,
      minY: vbMinY,
      maxX: vbMinX + vbWidth,
      maxY: vbMinY + vbHeight,
      width: vbWidth,
      height: vbHeight
    },
    originalWidth: vbWidth,
    originalHeight: vbHeight
  };
}
