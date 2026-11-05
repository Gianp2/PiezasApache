import { LabelTemplate, LabelElement, Piece, LayoutWarning, LayoutAdaptationResult, ElementType } from '../../types/index.ts';

export interface LayoutAdaptationOptions {
  mode?: 'auto' | 'proportional' | 'manual';
  forceAdapt?: boolean;
  drawingAspectRatio?: number;
  piece?: Piece;
  hideOptionalIfCrowded?: boolean;
}

/**
 * Responsive physical millimetric layout engine for Label Studio Industrial.
 * Calculates independent coordinate zones, enforces aspect ratios, guarantees
 * readable barcode widths (>= 20mm), minimum font sizes, and eliminates collisions.
 */
export function adaptTemplateLayout(
  oldTemplate: LabelTemplate,
  newWidthMm: number,
  newHeightMm: number,
  options?: LayoutAdaptationOptions
): LabelTemplate {
  const mode = options?.mode || oldTemplate.layoutMode || 'auto';
  const margin = oldTemplate.marginMm || 1.5;
  const oldW = oldTemplate.widthMm;
  const oldH = oldTemplate.heightMm;
  const isSameSize = oldW === newWidthMm && oldH === newHeightMm;

  // If dimensions haven't changed and forceAdapt is not requested, return template with mode
  if (isSameSize && !options?.forceAdapt) {
    return {
      ...oldTemplate,
      layoutMode: mode
    };
  }

  const newOrientation = newWidthMm >= newHeightMm ? 'landscape' : 'portrait';

  // ----------------------------------------------------
  // MODE 1: MANUAL ADJUSTMENT
  // ----------------------------------------------------
  if (mode === 'manual') {
    const newInnerW = Math.max(10, newWidthMm - margin * 2);
    const newInnerH = Math.max(10, newHeightMm - margin * 2);

    const clampedElements = oldTemplate.elements.map((el) => {
      const w = Math.min(el.widthMm, newInnerW);
      const h = Math.min(el.heightMm, newInnerH);
      const x = Math.max(margin, Math.min(newWidthMm - margin - w, el.xMm));
      const y = Math.max(margin, Math.min(newHeightMm - margin - h, el.yMm));
      return {
        ...el,
        xMm: Number(x.toFixed(2)),
        yMm: Number(y.toFixed(2)),
        widthMm: Number(w.toFixed(2)),
        heightMm: Number(h.toFixed(2))
      };
    });

    return {
      ...oldTemplate,
      widthMm: newWidthMm,
      heightMm: newHeightMm,
      orientation: newOrientation,
      layoutMode: 'manual',
      elements: clampedElements
    };
  }

  // ----------------------------------------------------
  // MODE 2: PROPORTIONAL ADJUSTMENT
  // ----------------------------------------------------
  if (mode === 'proportional') {
    return adaptProportional(oldTemplate, newWidthMm, newHeightMm, margin, options);
  }

  // ----------------------------------------------------
  // MODE 3: AUTOMATIC INTELLIGENT REORGANIZATION
  // ----------------------------------------------------
  return adaptAutomatic(oldTemplate, newWidthMm, newHeightMm, margin, options);
}

/**
 * Extracts true CAD drawing aspect ratio from piece bounds or rawSvg viewBox.
 */
function extractDrawingAspect(el?: LabelElement, piece?: Piece, fallbackAspect?: number): number {
  if (piece?.bounds && piece.bounds.width > 0 && piece.bounds.height > 0) {
    return piece.bounds.width / piece.bounds.height;
  }
  if (piece?.rawSvg) {
    const match = piece.rawSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
    if (match) {
      const w = parseFloat(match[3]);
      const h = parseFloat(match[4]);
      if (w > 0 && h > 0) return w / h;
    }
  }
  if (fallbackAspect && fallbackAspect > 0) return fallbackAspect;
  if (el && el.widthMm > 0 && el.heightMm > 0) return el.widthMm / el.heightMm;
  return 1.0;
}

/**
 * Proportional adaptation: Scales relative positions and dimensions mathematically
 * while enforcing geometry locks (CAD aspect ratio, QR 1:1) and legible thresholds.
 */
function adaptProportional(
  oldTemplate: LabelTemplate,
  newWidthMm: number,
  newHeightMm: number,
  margin: number,
  options?: LayoutAdaptationOptions
): LabelTemplate {
  const oldW = oldTemplate.widthMm;
  const oldH = oldTemplate.heightMm;
  const oldInnerW = Math.max(10, oldW - margin * 2);
  const oldInnerH = Math.max(10, oldH - margin * 2);
  const newInnerW = Math.max(10, newWidthMm - margin * 2);
  const newInnerH = Math.max(10, newHeightMm - margin * 2);

  const scaleX = newInnerW / oldInnerW;
  const scaleY = newInnerH / oldInnerH;
  const uniformScale = Math.min(scaleX, scaleY);
  const newOrientation = newWidthMm >= newHeightMm ? 'landscape' : 'portrait';

  const drawingAspect = extractDrawingAspect(
    oldTemplate.elements.find((el) => el.type === 'drawing'),
    options?.piece,
    options?.drawingAspectRatio
  );

  const adaptedElements: LabelElement[] = oldTemplate.elements.map((el) => {
    const relX = (el.xMm - margin) / oldInnerW;
    const relY = (el.yMm - margin) / oldInnerH;

    let targetW = el.widthMm * scaleX;
    let targetH = el.heightMm * scaleY;
    let targetX = margin + relX * newInnerW;
    let targetY = margin + relY * newInnerH;
    let targetFontSize = el.fontSizePt;

    switch (el.type) {
      case 'code': {
        const baseFont = el.fontSizePt || 12;
        targetFontSize = Math.max(7, Math.min(22, Math.round(baseFont * uniformScale)));
        targetH = Math.max(4.2, targetFontSize * 0.45);
        targetW = Math.min(newInnerW, Math.max(16, targetW));
        break;
      }
      case 'name':
      case 'custom_text':
      case 'quantity': {
        const baseFont = el.fontSizePt || 8;
        targetFontSize = Math.max(5.5, Math.min(15, Math.round(baseFont * uniformScale)));
        targetH = Math.max(3.2, targetFontSize * 0.45);
        targetW = Math.min(newInnerW, Math.max(12, targetW));
        break;
      }
      case 'date': {
        const baseFont = el.fontSizePt || 7;
        targetFontSize = Math.max(5, Math.min(11, Math.round(baseFont * uniformScale)));
        targetH = Math.max(2.8, targetFontSize * 0.45);
        targetW = Math.min(newInnerW, Math.max(10, targetW));
        break;
      }
      case 'drawing': {
        let dw = el.widthMm * uniformScale;
        let dh = dw / drawingAspect;

        if (dh > newInnerH * 0.85) {
          dh = newInnerH * 0.85;
          dw = dh * drawingAspect;
        }
        if (dw > newInnerW * 0.85) {
          dw = newInnerW * 0.85;
          dh = dw / drawingAspect;
        }

        targetW = Math.max(8, dw);
        targetH = Math.max(8, dh);
        break;
      }
      case 'qrcode': {
        const side = Math.min(
          newInnerH * 0.7,
          newInnerW * 0.5,
          Math.max(7, el.widthMm * uniformScale)
        );
        targetW = side;
        targetH = side;
        break;
      }
      case 'barcode': {
        const minW = newWidthMm <= 35 ? 18 : 20;
        targetW = Math.min(newInnerW, Math.max(minW, el.widthMm * scaleX));
        targetH = Math.min(newInnerH * 0.45, Math.max(4.5, el.heightMm * scaleY));
        break;
      }
      case 'line': {
        targetW = newInnerW;
        targetX = margin;
        targetH = Math.max(0.4, el.heightMm);
        break;
      }
      case 'rect_box': {
        targetW = newInnerW;
        targetH = newInnerH;
        targetX = margin;
        targetY = margin;
        break;
      }
    }

    targetW = Math.min(newInnerW, Math.max(2, targetW));
    targetH = Math.min(newInnerH, Math.max(2, targetH));
    const clampedX = Math.max(margin, Math.min(newWidthMm - margin - targetW, targetX));
    const clampedY = Math.max(margin, Math.min(newHeightMm - margin - targetH, targetY));

    return {
      ...el,
      xMm: Number(clampedX.toFixed(2)),
      yMm: Number(clampedY.toFixed(2)),
      widthMm: Number(targetW.toFixed(2)),
      heightMm: Number(targetH.toFixed(2)),
      fontSizePt: targetFontSize
    };
  });

  resolveCollisions(adaptedElements, newWidthMm, newHeightMm, margin);

  return {
    ...oldTemplate,
    widthMm: newWidthMm,
    heightMm: newHeightMm,
    orientation: newOrientation,
    layoutMode: 'proportional',
    elements: adaptedElements
  };
}

/**
 * Automatic intelligent reorganization:
 * Classifies label size and aspect ratio, then assigns each element to an optimal
 * independent zone without clipping or overlaps.
 */
function adaptAutomatic(
  oldTemplate: LabelTemplate,
  newWidthMm: number,
  newHeightMm: number,
  margin: number,
  options?: LayoutAdaptationOptions
): LabelTemplate {
  const newOrientation = newWidthMm >= newHeightMm ? 'landscape' : 'portrait';
  const innerW = Math.max(10, newWidthMm - margin * 2);
  const innerH = Math.max(10, newHeightMm - margin * 2);

  const isPortrait = newOrientation === 'portrait';
  const isMicro = newWidthMm <= 38 || newHeightMm <= 25; // e.g. 30×20 mm
  const isSmall = !isMicro && (newWidthMm <= 58 && newHeightMm <= 38); // e.g. 50×30 mm
  const isMedium = !isMicro && !isSmall && (newWidthMm <= 88 && newHeightMm <= 58); // e.g. 60×40, 80×50 mm
  // isLarge: 100×60, 100×75 mm

  // Separate elements by role
  const codeEl = oldTemplate.elements.find((el) => el.type === 'code');
  const nameEl = oldTemplate.elements.find((el) => el.type === 'name');
  const drawingEl = oldTemplate.elements.find((el) => el.type === 'drawing');
  const barcodeEl = oldTemplate.elements.find((el) => el.type === 'barcode');
  const qrEl = oldTemplate.elements.find((el) => el.type === 'qrcode');
  const dateEl = oldTemplate.elements.find((el) => el.type === 'date');
  const qtyEl = oldTemplate.elements.find((el) => el.type === 'quantity');
  const lineEl = oldTemplate.elements.find((el) => el.type === 'line');
  const rectEl = oldTemplate.elements.find((el) => el.type === 'rect_box');
  const extraTexts = oldTemplate.elements.filter(
    (el) => el.type === 'custom_text' || (![codeEl, nameEl, drawingEl, barcodeEl, qrEl, dateEl, qtyEl, lineEl, rectEl].includes(el))
  );

  const drawingAspect = extractDrawingAspect(drawingEl, options?.piece, options?.drawingAspectRatio);
  const updatedMap = new Map<string, LabelElement>();

  // -----------------------------------------------------------
  // LAYOUT STRATEGY 1: MICRO LABELS (<= 38×25 mm, e.g. 30×20 mm)
  // -----------------------------------------------------------
  if (isMicro) {
    // In micro labels, secondary elements cannot fit simultaneously without colliding.
    // Automatically hide secondary elements (description, date, quantity, separator line)
    // to give Priority 1 (Code) and Priority 2 (CAD Drawing) the physical room they need.
    if (nameEl) {
      updatedMap.set(nameEl.id, { ...nameEl, visible: false });
    }
    if (dateEl) {
      updatedMap.set(dateEl.id, { ...dateEl, visible: false });
    }
    if (qtyEl) {
      updatedMap.set(qtyEl.id, { ...qtyEl, visible: false });
    }
    if (lineEl) {
      updatedMap.set(lineEl.id, { ...lineEl, visible: false });
    }
    extraTexts.forEach((el) => {
      updatedMap.set(el.id, { ...el, visible: false });
    });

    let currentY = margin;
    const hasQr = Boolean(qrEl);
    const hasBarcode = Boolean(barcodeEl);

    // Subcase 1A: Micro with QR Code
    if (qrEl) {
      const qrSide = Math.min(innerH - 2, 8.5);
      const codeW = innerW - qrSide - 1.5;
      const codeH = 3.6;

      if (codeEl) {
        updatedMap.set(codeEl.id, {
          ...codeEl,
          xMm: margin,
          yMm: currentY,
          widthMm: Number(codeW.toFixed(2)),
          heightMm: codeH,
          fontSizePt: 7.5,
          fontWeight: 'bold',
          textAlign: 'left',
          visible: true
        });
      }

      updatedMap.set(qrEl.id, {
        ...qrEl,
        xMm: Number((newWidthMm - margin - qrSide).toFixed(2)),
        yMm: currentY,
        widthMm: qrSide,
        heightMm: qrSide,
        visible: true
      });

      // CAD Drawing placed below code or on the left
      if (drawingEl) {
        const drawY = currentY + codeH + 0.6;
        const drawAvailH = Math.max(6, newHeightMm - margin - drawY);
        let dw = innerW - qrSide - 1.5;
        let dh = dw / drawingAspect;
        if (dh > drawAvailH) {
          dh = drawAvailH;
          dw = dh * drawingAspect;
        }

        updatedMap.set(drawingEl.id, {
          ...drawingEl,
          xMm: margin,
          yMm: Number((drawY + (drawAvailH - dh) / 2).toFixed(2)),
          widthMm: Number(dw.toFixed(2)),
          heightMm: Number(dh.toFixed(2)),
          strokeWidthMm: 0.35,
          visible: true
        });
      }

      // If barcode was also present, hide barcode in 30x20 when QR is already active
      if (barcodeEl) {
        updatedMap.set(barcodeEl.id, { ...barcodeEl, visible: false });
      }
    }

    // Subcase 1B: Micro label with barcode: prioritize the code and silhouette.
    // A 1D barcode for a long industrial part code cannot be assumed scannable
    // in 30×20 mm. Keep it in the template, but do not print it by default.
    else if (barcodeEl) {
      updatedMap.set(barcodeEl.id, { ...barcodeEl, visible: false });
      const codeH = 3.5;
      if (codeEl) {
        updatedMap.set(codeEl.id, {
          ...codeEl, xMm: margin, yMm: currentY,
          widthMm: innerW, heightMm: codeH,
          fontSizePt: 8, fontWeight: 'bold', textAlign: 'center', visible: true
        });
        currentY += codeH + 0.6;
      }
      if (drawingEl) {
        const availableH = Math.max(0, newHeightMm - margin - currentY);
        const dw = Math.min(innerW, availableH * drawingAspect);
        const dh = dw / drawingAspect;
        updatedMap.set(drawingEl.id, {
          ...drawingEl,
          xMm: Number((margin + (innerW - dw) / 2).toFixed(2)),
          yMm: Number((currentY + (availableH - dh) / 2).toFixed(2)),
          widthMm: Number(dw.toFixed(2)),
          heightMm: Number(dh.toFixed(2)),
          strokeWidthMm: 0.35, visible: true
        });
      }
    }

    // Subcase 1C: Micro with only Drawing and Code (no barcodes)
    else {
      const codeH = 3.5;
      if (codeEl) {
        updatedMap.set(codeEl.id, {
          ...codeEl,
          xMm: margin,
          yMm: currentY,
          widthMm: innerW,
          heightMm: codeH,
          fontSizePt: 8,
          fontWeight: 'bold',
          textAlign: 'center',
          visible: true
        });
        currentY += codeH + 0.6;
      }

      const drawAvailH = Math.max(6, newHeightMm - margin - currentY);
      if (drawingEl) {
        let dw = innerW;
        let dh = dw / drawingAspect;
        if (dh > drawAvailH) {
          dh = drawAvailH;
          dw = dh * drawingAspect;
        }

        updatedMap.set(drawingEl.id, {
          ...drawingEl,
          xMm: Number((margin + (innerW - dw) / 2).toFixed(2)),
          yMm: Number((currentY + (drawAvailH - dh) / 2).toFixed(2)),
          widthMm: Number(dw.toFixed(2)),
          heightMm: Number(dh.toFixed(2)),
          strokeWidthMm: 0.4,
          visible: true
        });
      }
    }
  }

  // -----------------------------------------------------------
  // LAYOUT STRATEGY 2: PORTRAIT ORIENTATION (e.g. 50×80 mm)
  // -----------------------------------------------------------
  else if (isPortrait) {
    let currentY = margin;

    if (codeEl) {
      const codeH = isSmall ? 5 : 7;
      updatedMap.set(codeEl.id, {
        ...codeEl,
        xMm: margin,
        yMm: currentY,
        widthMm: innerW,
        heightMm: codeH,
        fontSizePt: isSmall ? 9.5 : 13,
        fontWeight: 'bold',
        textAlign: 'center',
        visible: true
      });
      currentY += codeH + 1.2;
    }

    if (nameEl) {
      const nameH = isSmall ? 3.5 : 5;
      updatedMap.set(nameEl.id, {
        ...nameEl,
        xMm: margin,
        yMm: currentY,
        widthMm: innerW,
        heightMm: nameH,
        fontSizePt: isSmall ? 6.5 : 8,
        textAlign: 'center',
        visible: true
      });
      currentY += nameH + 1.5;
    }

    if (lineEl) {
      updatedMap.set(lineEl.id, {
        ...lineEl,
        xMm: margin,
        yMm: currentY,
        widthMm: innerW,
        heightMm: 0.6,
        borderWidthMm: 0.35,
        visible: true
      });
      currentY += 1.8;
    }

    // CAD Drawing occupies upper-middle area
    if (drawingEl) {
      const drawMaxH = innerH * 0.42;
      let dw = innerW * 0.92;
      let dh = dw / drawingAspect;
      if (dh > drawMaxH) {
        dh = drawMaxH;
        dw = dh * drawingAspect;
      }
      updatedMap.set(drawingEl.id, {
        ...drawingEl,
        xMm: Number((margin + (innerW - dw) / 2).toFixed(2)),
        yMm: Number(currentY.toFixed(2)),
        widthMm: Number(dw.toFixed(2)),
        heightMm: Number(dh.toFixed(2)),
        strokeWidthMm: isSmall ? 0.4 : 0.5,
        visible: true
      });
      currentY += dh + 2.5;
    }

    // Barcode occupies lower-middle area
    if (barcodeEl) {
      const barH = Math.min(14, Math.max(6.5, (newHeightMm - margin - currentY) * 0.55));
      const barW = Math.min(innerW, 44);
      updatedMap.set(barcodeEl.id, {
        ...barcodeEl,
        xMm: Number((margin + (innerW - barW) / 2).toFixed(2)),
        yMm: Number(currentY.toFixed(2)),
        widthMm: Number(barW.toFixed(2)),
        heightMm: Number(barH.toFixed(2)),
        includeTextUnderBarcode: true,
        visible: true
      });
      currentY += barH + 2;
    }

    // Bottom row: QR, Date, Quantity
    const bottomH = Math.max(6, newHeightMm - margin - currentY);
    if (qrEl) {
      const qrSide = Math.min(bottomH, 13);
      updatedMap.set(qrEl.id, {
        ...qrEl,
        xMm: margin,
        yMm: Number((currentY + (bottomH - qrSide) / 2).toFixed(2)),
        widthMm: qrSide,
        heightMm: qrSide,
        visible: true
      });
    }

    if (dateEl) {
      updatedMap.set(dateEl.id, {
        ...dateEl,
        xMm: qrEl ? margin + 15 : margin,
        yMm: currentY + 1,
        widthMm: Math.max(16, innerW - (qrEl ? 16 : 0)),
        heightMm: 3.5,
        fontSizePt: isSmall ? 5.5 : 6.5,
        visible: true
      });
    }

    if (qtyEl) {
      updatedMap.set(qtyEl.id, {
        ...qtyEl,
        xMm: qrEl ? margin + 15 : margin,
        yMm: currentY + 5,
        widthMm: Math.max(16, innerW - (qrEl ? 16 : 0)),
        heightMm: 3.5,
        fontSizePt: isSmall ? 6 : 7,
        visible: true
      });
    }
  }

  // -----------------------------------------------------------
  // LAYOUT STRATEGY 3: SMALL LANDSCAPE (e.g. 50×30 mm)
  // -----------------------------------------------------------
  else if (isSmall) {
    const hasQr = Boolean(qrEl);
    const qrSide = hasQr ? 10.5 : 0;
    const headerW = hasQr ? innerW - qrSide - 2 : innerW;

    // Header Left: Code and Name
    if (codeEl) {
      updatedMap.set(codeEl.id, {
        ...codeEl,
        xMm: margin,
        yMm: margin,
        widthMm: Number(headerW.toFixed(2)),
        heightMm: 4.8,
        fontSizePt: 9.5,
        fontWeight: 'bold',
        textAlign: 'left',
        visible: true
      });
    }

    if (nameEl) {
      updatedMap.set(nameEl.id, {
        ...nameEl,
        xMm: margin,
        yMm: margin + 5.0,
        widthMm: Number(headerW.toFixed(2)),
        heightMm: 3.4,
        fontSizePt: 6.5,
        fontWeight: 'normal',
        textAlign: 'left',
        visible: true
      });
    }

    // Header Right: QR Code
    if (qrEl) {
      updatedMap.set(qrEl.id, {
        ...qrEl,
        xMm: Number((newWidthMm - margin - qrSide).toFixed(2)),
        yMm: margin,
        widthMm: qrSide,
        heightMm: qrSide,
        visible: true
      });
    }

    const bodyY = margin + 9.2;
    const bodyH = Math.max(6, newHeightMm - margin - bodyY);

    if (drawingEl && barcodeEl) {
      // Split body into two columns: Drawing on left, Barcode on right
      const colW = (innerW - 2) * 0.48;
      let dw = colW;
      let dh = dw / drawingAspect;
      if (dh > bodyH) {
        dh = bodyH;
        dw = dh * drawingAspect;
      }

      updatedMap.set(drawingEl.id, {
        ...drawingEl,
        xMm: Number((margin + (colW - dw) / 2).toFixed(2)),
        yMm: Number((bodyY + (bodyH - dh) / 2).toFixed(2)),
        widthMm: Number(dw.toFixed(2)),
        heightMm: Number(dh.toFixed(2)),
        strokeWidthMm: 0.4,
        visible: true
      });

      const barW = Math.max(20, innerW - colW - 2);
      const barH = Math.min(bodyH - 3.5, 12);
      updatedMap.set(barcodeEl.id, {
        ...barcodeEl,
        xMm: Number((newWidthMm - margin - barW).toFixed(2)),
        yMm: bodyY,
        widthMm: Number(barW.toFixed(2)),
        heightMm: Number(barH.toFixed(2)),
        includeTextUnderBarcode: true,
        visible: true
      });

      if (dateEl) {
        updatedMap.set(dateEl.id, {
          ...dateEl,
          xMm: Number((newWidthMm - margin - barW).toFixed(2)),
          yMm: Number((bodyY + barH + 0.5).toFixed(2)),
          widthMm: Number(barW.toFixed(2)),
          heightMm: 3,
          fontSizePt: 5.5,
          visible: true
        });
      }
    } else if (drawingEl) {
      let dw = innerW;
      let dh = dw / drawingAspect;
      if (dh > bodyH) {
        dh = bodyH;
        dw = dh * drawingAspect;
      }
      updatedMap.set(drawingEl.id, {
        ...drawingEl,
        xMm: Number((margin + (innerW - dw) / 2).toFixed(2)),
        yMm: Number((bodyY + (bodyH - dh) / 2).toFixed(2)),
        widthMm: Number(dw.toFixed(2)),
        heightMm: Number(dh.toFixed(2)),
        strokeWidthMm: 0.45,
        visible: true
      });
    } else if (barcodeEl) {
      updatedMap.set(barcodeEl.id, {
        ...barcodeEl,
        xMm: margin,
        yMm: bodyY,
        widthMm: innerW,
        heightMm: bodyH,
        includeTextUnderBarcode: true,
        visible: true
      });
    }
  }

  // -----------------------------------------------------------
  // LAYOUT STRATEGY 4: MEDIUM & LARGE LANDSCAPE (60×40, 80×50, 100×60, 100×75 mm)
  // -----------------------------------------------------------
  else {
    const hasQr = Boolean(qrEl);
    const qrSide = hasQr ? (isMedium ? 13 : 16) : 0;
    const headerW = hasQr ? innerW - qrSide - 3 : innerW;

    // Header: Code, Name, QR
    if (codeEl) {
      const codeH = isMedium ? 6.5 : 8.5;
      updatedMap.set(codeEl.id, {
        ...codeEl,
        xMm: margin,
        yMm: margin,
        widthMm: Number(headerW.toFixed(2)),
        heightMm: codeH,
        fontSizePt: isMedium ? 12.5 : 15.5,
        fontWeight: 'bold',
        textAlign: 'left',
        visible: true
      });
    }

    if (nameEl) {
      const nameH = isMedium ? 4.5 : 5.5;
      updatedMap.set(nameEl.id, {
        ...nameEl,
        xMm: margin,
        yMm: Number((margin + (isMedium ? 7.0 : 9.0)).toFixed(2)),
        widthMm: Number(headerW.toFixed(2)),
        heightMm: nameH,
        fontSizePt: isMedium ? 8 : 10,
        fontWeight: 'normal',
        textAlign: 'left',
        visible: true
      });
    }

    if (qrEl) {
      updatedMap.set(qrEl.id, {
        ...qrEl,
        xMm: Number((newWidthMm - margin - qrSide).toFixed(2)),
        yMm: margin,
        widthMm: qrSide,
        heightMm: qrSide,
        visible: true
      });
    }

    const dividerY = margin + (isMedium ? 12.5 : 16.0);

    if (lineEl) {
      updatedMap.set(lineEl.id, {
        ...lineEl,
        xMm: margin,
        yMm: Number(dividerY.toFixed(2)),
        widthMm: innerW,
        heightMm: 0.6,
        borderWidthMm: 0.4,
        visible: true
      });
    }

    const mainY = dividerY + 2.0;
    const mainH = Math.max(10, newHeightMm - margin - mainY);

    if (drawingEl && barcodeEl) {
      // High-end industrial split: Left 48% CAD drawing, Right 48% Barcode + Specs
      const drawColW = innerW * 0.48;
      let dw = drawColW;
      let dh = dw / drawingAspect;
      if (dh > mainH) {
        dh = mainH;
        dw = dh * drawingAspect;
      }

      updatedMap.set(drawingEl.id, {
        ...drawingEl,
        xMm: Number((margin + (drawColW - dw) / 2).toFixed(2)),
        yMm: Number((mainY + (mainH - dh) / 2).toFixed(2)),
        widthMm: Number(dw.toFixed(2)),
        heightMm: Number(dh.toFixed(2)),
        strokeWidthMm: isMedium ? 0.5 : 0.6,
        visible: true
      });

      const barColX = margin + innerW * 0.52;
      const barColW = innerW * 0.48;
      const barH = isMedium ? Math.min(14, mainH - 6) : Math.min(18, mainH - 8);

      updatedMap.set(barcodeEl.id, {
        ...barcodeEl,
        xMm: Number(barColX.toFixed(2)),
        yMm: Number(mainY.toFixed(2)),
        widthMm: Number(barColW.toFixed(2)),
        heightMm: Number(barH.toFixed(2)),
        includeTextUnderBarcode: true,
        visible: true
      });

      // Metadata placed below barcode
      if (dateEl) {
        updatedMap.set(dateEl.id, {
          ...dateEl,
          xMm: Number(barColX.toFixed(2)),
          yMm: Number((mainY + barH + 1.5).toFixed(2)),
          widthMm: Number((barColW * 0.5).toFixed(2)),
          heightMm: 4,
          fontSizePt: isMedium ? 6.5 : 7.5,
          visible: true
        });
      }

      if (qtyEl) {
        updatedMap.set(qtyEl.id, {
          ...qtyEl,
          xMm: Number((barColX + barColW * 0.52).toFixed(2)),
          yMm: Number((mainY + barH + 1.5).toFixed(2)),
          widthMm: Number((barColW * 0.48).toFixed(2)),
          heightMm: 4,
          fontSizePt: isMedium ? 7 : 8,
          fontWeight: 'bold',
          visible: true
        });
      }
    } else if (drawingEl) {
      let dw = innerW;
      let dh = dw / drawingAspect;
      if (dh > mainH) {
        dh = mainH;
        dw = dh * drawingAspect;
      }
      updatedMap.set(drawingEl.id, {
        ...drawingEl,
        xMm: Number((margin + (innerW - dw) / 2).toFixed(2)),
        yMm: Number((mainY + (mainH - dh) / 2).toFixed(2)),
        widthMm: Number(dw.toFixed(2)),
        heightMm: Number(dh.toFixed(2)),
        strokeWidthMm: isMedium ? 0.5 : 0.65,
        visible: true
      });
    } else if (barcodeEl) {
      updatedMap.set(barcodeEl.id, {
        ...barcodeEl,
        xMm: Number((margin + (innerW - Math.min(innerW, 60)) / 2).toFixed(2)),
        yMm: Number(mainY.toFixed(2)),
        widthMm: Number(Math.min(innerW, 60).toFixed(2)),
        heightMm: Number(Math.min(mainH, 20).toFixed(2)),
        includeTextUnderBarcode: true,
        visible: true
      });
    }
  }

  // Rectangular border box if present
  if (rectEl) {
    updatedMap.set(rectEl.id, {
      ...rectEl,
      xMm: margin,
      yMm: margin,
      widthMm: innerW,
      heightMm: innerH,
      borderWidthMm: 0.4
    });
  }

  // Handle any remaining elements (extra custom texts, etc.)
  for (const el of extraTexts) {
    if (!updatedMap.has(el.id)) {
      const w = Math.min(innerW, el.widthMm);
      const h = Math.min(innerH, el.heightMm);
      const x = Math.max(margin, Math.min(newWidthMm - margin - w, el.xMm));
      const y = Math.max(margin, Math.min(newHeightMm - margin - h, el.yMm));
      updatedMap.set(el.id, {
        ...el,
        xMm: Number(x.toFixed(2)),
        yMm: Number(y.toFixed(2)),
        widthMm: Number(w.toFixed(2)),
        heightMm: Number(h.toFixed(2))
      });
    }
  }

  // Assemble final element array
  const finalElements = oldTemplate.elements.map((el) => {
    return updatedMap.get(el.id) || el;
  });

  // Secondary collision resolution pass
  resolveCollisions(finalElements, newWidthMm, newHeightMm, margin);

  return {
    ...oldTemplate,
    widthMm: newWidthMm,
    heightMm: newHeightMm,
    orientation: newOrientation,
    layoutMode: 'auto',
    elements: finalElements
  };
}

/**
 * Resolves remaining bounding box collisions and strictly clamps to safety margins.
 */
function resolveCollisions(
  elements: LabelElement[],
  totalWidthMm: number,
  totalHeightMm: number,
  marginMm: number
): void {
  const innerW = totalWidthMm - marginMm * 2;
  const innerH = totalHeightMm - marginMm * 2;

  for (const el of elements) {
    if (el.type === 'rect_box') {
      el.xMm = marginMm;
      el.yMm = marginMm;
      el.widthMm = innerW;
      el.heightMm = innerH;
      continue;
    }

    if (el.type === 'line') {
      el.xMm = marginMm;
      el.widthMm = innerW;
      if (el.yMm < marginMm) el.yMm = marginMm;
      if (el.yMm + el.heightMm > totalHeightMm - marginMm) {
        el.yMm = Math.max(marginMm, totalHeightMm - marginMm - el.heightMm);
      }
      continue;
    }

    // Ensure dimension itself does not exceed available width/height
    if (el.widthMm > innerW) {
      el.widthMm = innerW;
    }
    if (el.heightMm > innerH) {
      el.heightMm = innerH;
    }

    if (el.xMm < marginMm) el.xMm = marginMm;
    if (el.yMm < marginMm) el.yMm = marginMm;

    if (el.xMm + el.widthMm > totalWidthMm - marginMm) {
      el.xMm = Math.max(marginMm, totalWidthMm - marginMm - el.widthMm);
    }
    if (el.yMm + el.heightMm > totalHeightMm - marginMm) {
      el.yMm = Math.max(marginMm, totalHeightMm - marginMm - el.heightMm);
    }

    el.xMm = Number(el.xMm.toFixed(2));
    el.yMm = Number(el.yMm.toFixed(2));
    el.widthMm = Number(el.widthMm.toFixed(2));
    el.heightMm = Number(el.heightMm.toFixed(2));
  }
}

/**
 * Validates the physical feasibility of the label layout.
 * Groups notices by cause, avoids spam/repetition, and provides actionable options.
 */
export function validateLabelLayout(
  template: LabelTemplate,
  piece?: Piece
): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const margin = template.marginMm || 1.5;
  const W = template.widthMm;
  const H = template.heightMm;
  const innerW = W - margin * 2;
  const innerH = H - margin * 2;
  const usableArea = innerW * innerH;

  const activeElements = template.elements.filter((el) => el.visible !== false);

  // 1. Grouped Margin Boundary Check
  const overflowingElements: LabelElement[] = [];
  for (const el of activeElements) {
    if (el.type === 'rect_box') continue;

    const overflowsLeft = el.xMm < margin - 0.05;
    const overflowsTop = el.yMm < margin - 0.05;
    const overflowsRight = el.xMm + el.widthMm > W - margin + 0.05;
    const overflowsBottom = el.yMm + el.heightMm > H - margin + 0.05;

    if (overflowsLeft || overflowsTop || overflowsRight || overflowsBottom) {
      overflowingElements.push(el);
    }
  }

  if (overflowingElements.length > 0) {
    const names = overflowingElements.map((el) => getElementDisplayName(el.type)).join(', ');
    warnings.push({
      id: 'group-overflow',
      category: 'overflow',
      severity: 'error',
      title: 'Elementos fuera del área imprimible',
      message: `${overflowingElements.length === 1 ? 'El elemento' : 'Los elementos'} ${names} desbordan los márgenes de seguridad.`,
      suggestion: 'Pulse «Adaptar contenido» para reencuadrar dentro de los límites imprimibles.',
      elementIds: overflowingElements.map((el) => el.id),
      actionType: 'adapt'
    });
  }

  // 2. Barcode Scannability Check (Zebra standard requires min 20mm for Code 128 / Code 39)
  const barcodeEl = activeElements.find((el) => el.type === 'barcode');
  if (barcodeEl) {
    if (barcodeEl.widthMm < 19.5) {
      warnings.push({
        id: 'barcode-scannability',
        category: 'barcode',
        severity: 'warning',
        title: 'Código de barras no escaneable (< 20 mm)',
        message: `El código de barras tiene un ancho de ${barcodeEl.widthMm.toFixed(1)} mm. El estándar óptico Zebra requiere al menos 20 mm para lectura fiable.`,
        suggestion: W <= 35
          ? 'En etiquetas de 30×20 mm recomendamos usar Código QR o ampliar a 50×30 mm.'
          : 'Amplíe el ancho del código de barras a ≥ 20 mm.',
        elementIds: [barcodeEl.id],
        actionType: W <= 35 ? 'resize_50x30' : 'adapt'
      });
    }
  }

  // 3. QR Code Scannability Check
  const qrEl = activeElements.find((el) => el.type === 'qrcode');
  if (qrEl && (qrEl.widthMm < 6.8 || qrEl.heightMm < 6.8)) {
    warnings.push({
      id: 'qr-scannability',
      category: 'qr',
      severity: 'warning',
      title: 'Código QR demasiado pequeño (< 7 mm)',
      message: `El código QR mide ${qrEl.widthMm.toFixed(1)} mm. En impresoras térmicas de 203 DPI puede ser difícil de escanear si mide menos de 7×7 mm.`,
      suggestion: 'Aumente el tamaño del QR a al menos 8×8 mm.',
      elementIds: [qrEl.id],
      actionType: 'adapt'
    });
  }

  // 4. Grouped Collision Check between Active Content Elements
  const contentElements = activeElements.filter((el) => el.type !== 'rect_box' && el.type !== 'line');
  const collidingIds = new Set<string>();
  const collisionPairs: string[] = [];

  for (let i = 0; i < contentElements.length; i++) {
    for (let j = i + 1; j < contentElements.length; j++) {
      const a = contentElements[i];
      const b = contentElements[j];

      const xOverlap = Math.max(0, Math.min(a.xMm + a.widthMm, b.xMm + b.widthMm) - Math.max(a.xMm, b.xMm));
      const yOverlap = Math.max(0, Math.min(a.yMm + a.heightMm, b.yMm + b.heightMm) - Math.max(a.yMm, b.yMm));
      const overlapArea = xOverlap * yOverlap;

      const smallerArea = Math.min(a.widthMm * a.heightMm, b.widthMm * b.heightMm);
      if (smallerArea > 0 && overlapArea / smallerArea > 0.15) {
        collidingIds.add(a.id);
        collidingIds.add(b.id);
        collisionPairs.push(`"${getElementDisplayName(a.type)}" y "${getElementDisplayName(b.type)}"`);
      }
    }
  }

  if (collidingIds.size > 0) {
    warnings.push({
      id: 'group-collisions',
      category: 'collision',
      severity: 'error',
      title: 'Superposición de elementos',
      message: `Se detectó superposición física entre: ${collisionPairs.slice(0, 3).join(', ')}${collisionPairs.length > 3 ? '...' : ''}.`,
      suggestion: 'Pulse «Adaptar contenido» para reorganizar en zonas independientes sin solapamientos.',
      elementIds: Array.from(collidingIds),
      actionType: 'adapt'
    });
  }

  // 5. Overcrowding Check for Small / Micro Labels
  const totalElementsArea = contentElements.reduce((acc, el) => acc + el.widthMm * el.heightMm, 0);
  if (usableArea < 650 && (totalElementsArea > usableArea * 0.88 || contentElements.length > 4)) {
    warnings.push({
      id: 'group-overcrowding',
      category: 'overcrowding',
      severity: 'warning',
      title: `Espacio físico congestionado (${W}×${H} mm)`,
      message: `La etiqueta contiene ${contentElements.length} elementos para un área útil de solo ${innerW.toFixed(0)}×${innerH.toFixed(0)} mm.`,
      suggestion: 'Oculte elementos secundarios (descripción, fecha, cantidad) o amplíe a 50×30 mm para garantizar legibilidad.',
      elementIds: contentElements.filter((el) => el.type !== 'code' && el.type !== 'drawing').map((el) => el.id),
      actionType: 'hide_optional'
    });
  }

  return warnings;
}

export function getElementDisplayName(type: ElementType): string {
  switch (type) {
    case 'code':
      return 'Código de Pieza';
    case 'drawing':
      return 'Dibujo CAD';
    case 'barcode':
      return 'Código de Barras';
    case 'qrcode':
      return 'Código QR';
    case 'name':
      return 'Descripción';
    case 'date':
      return 'Fecha';
    case 'quantity':
      return 'Cantidad';
    case 'custom_text':
      return 'Texto Libre';
    case 'line':
      return 'Línea';
    case 'rect_box':
      return 'Recuadro';
    default:
      return type;
  }
}
