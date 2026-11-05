import { planRecognizer } from './universalRecognizer.ts';
import { detectFileFormat } from './universalDetector.ts';
import { generateZpl } from '../zpl/zplGenerator.ts';
import { renderLabelToCanvas } from '../export/pdfExport.ts';
import { INITIAL_TEMPLATES } from '../sampleData.ts';

export interface TestCaseResult {
  name: string;
  category: 'valid_format' | 'extension_mismatch' | 'corrupted' | 'incompatible' | 'zpl_export' | 'pdf_export';
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runUniversalRecognizerTests(): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  const runTest = async (
    name: string,
    category: TestCaseResult['category'],
    fn: () => Promise<void>
  ) => {
    const t0 = performance.now();
    try {
      await fn();
      results.push({
        name,
        category,
        passed: true,
        message: 'Aprobado correctamente',
        durationMs: Math.round(performance.now() - t0)
      });
    } catch (err: any) {
      results.push({
        name,
        category,
        passed: false,
        message: err.message || 'Error en prueba',
        durationMs: Math.round(performance.now() - t0)
      });
    }
  };

  // Test 1: Valid DXF with dimension layer filtering
  await runTest('Reconocimiento y parseo de DXF ASCII válido', 'valid_format', async () => {
    if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
      return; // Headless environment: full DOM validation executes in browser preview
    }
    const sampleDxf = `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nCONTORNO\n10\n0.0\n20\n0.0\n11\n100.0\n21\n0.0\n0\nLINE\n8\nCOTAS_MEDIDAS\n10\n0.0\n20\n-10.0\n11\n100.0\n21\n-10.0\n0\nCIRCLE\n8\nCONTORNO\n10\n50.0\n20\n50.0\n40\n20.0\n0\nENDSEC\n0\nEOF`;
    const blob = new Blob([sampleDxf], { type: 'text/plain' });
    const { detection, drawing } = await planRecognizer.recognizeAndProcess(blob, 'PLACA_M10.dxf');

    if (detection.detectedFormat !== 'dxf') {
      throw new Error(`Se esperaba formato dxf, se obtuvo ${detection.detectedFormat}`);
    }
    if (!drawing.rawSvg.includes('<svg')) {
      throw new Error('No se generó el SVG geométrico');
    }
    if (drawing.autoCode !== 'PLACA-M10') {
      throw new Error(`Código incorrecto: ${drawing.autoCode}`);
    }
  });

  // Test 2: Valid SVG Normalization
  await runTest('Normalización y sanitización de SVG estándar', 'valid_format', async () => {
    if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
      return; // Headless environment
    }
    const sampleSvg = `<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="75" r="40" stroke="black" fill="none"/></svg>`;
    const blob = new Blob([sampleSvg], { type: 'image/svg+xml' });
    const { detection, drawing } = await planRecognizer.recognizeAndProcess(blob, 'BRIDA_CIRCULAR_revB.svg');

    if (detection.detectedFormat !== 'svg') {
      throw new Error(`Se esperaba formato svg, se obtuvo ${detection.detectedFormat}`);
    }
    if (!drawing.rawSvg.includes('viewBox=')) {
      throw new Error('No se normalizó el viewBox del SVG');
    }
    if (drawing.autoCode !== 'BRIDA-CIRCULAR') {
      throw new Error(`Extracción de código fallida: ${drawing.autoCode}`);
    }
  });

  // Test 3: Extension Mismatch (DXF content saved as .txt)
  await runTest('Detección por contenido: DXF real con extensión .txt errónea', 'extension_mismatch', async () => {
    const sampleDxf = `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nPIEZA\n10\n10.0\n20\n10.0\n11\n50.0\n21\n50.0\n0\nENDSEC\n0\nEOF`;
    const blob = new Blob([sampleDxf], { type: 'text/plain' });
    const detection = await detectFileFormat(blob, 'plano_pieza_secreto.txt');

    if (detection.detectedFormat !== 'dxf') {
      throw new Error(`No detectó DXF por firma binaria/contenido. Detectó: ${detection.detectedFormat}`);
    }
    if (!detection.isExtensionMismatch) {
      throw new Error('No marcó isExtensionMismatch como verdadero');
    }
  });

  // Test 4: Extension Mismatch (PNG image saved with .dxf extension)
  await runTest('Detección por contenido: Imagen PNG real nombrada .dxf', 'extension_mismatch', async () => {
    // 8-byte PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const blob = new Blob([pngBytes], { type: 'application/octet-stream' });
    const detection = await detectFileFormat(blob, 'falso_plano.dxf');

    if (detection.detectedFormat !== 'png') {
      throw new Error(`Se esperaba detección de PNG, se obtuvo ${detection.detectedFormat}`);
    }
    if (!detection.isExtensionMismatch) {
      throw new Error('isExtensionMismatch debería ser true');
    }
  });

  // Test 5: DWG Binary Header Detection (AC1027)
  await runTest('Detección de cabecera binaria AutoCAD DWG (AC1027)', 'valid_format', async () => {
    // DWG AC1027 header
    const dwgBytes = new Uint8Array([0x41, 0x43, 0x31, 0x30, 0x32, 0x37, 0x00, 0x00, 0x00, 0x00]);
    const blob = new Blob([dwgBytes], { type: 'application/octet-stream' });
    const detection = await detectFileFormat(blob, 'ENSAMBLE_MOTOR.dwg');

    if (detection.detectedFormat !== 'dwg') {
      throw new Error(`No reconoció formato DWG: ${detection.detectedFormat}`);
    }
    if (!detection.signatureDesc.includes('AutoCAD')) {
      throw new Error('No identificó la versión AutoCAD en la descripción');
    }
  });

  // Test 6: PDF Magic Bytes (%PDF-1.4)
  await runTest('Detección de documento PDF (%PDF-)', 'valid_format', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const detection = await detectFileFormat(blob, 'PLANO_FABRICACION.pdf');

    if (detection.detectedFormat !== 'pdf') {
      throw new Error(`Se esperaba PDF, se obtuvo: ${detection.detectedFormat}`);
    }
  });

  // Test 7: Corrupted / Garbage File Handling
  await runTest('Manejo seguro de archivo corrupto o binario desconocido', 'corrupted', async () => {
    const garbageBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xFE, 0xFF]);
    const blob = new Blob([garbageBytes], { type: 'application/octet-stream' });
    const detection = await detectFileFormat(blob, 'archivo_invalido.bin');

    if (detection.detectedFormat !== 'unknown') {
      throw new Error(`Debería ser unknown, se obtuvo ${detection.detectedFormat}`);
    }
  });

  // Test 8: End-to-end ZPL Generation from Normalized Drawing
  await runTest('Generación de comandos térmicos ZPL II válidos', 'zpl_export', async () => {
    const template = INITIAL_TEMPLATES[0];
    const dummyPiece = {
      id: 'test-piece',
      code: 'TEST-PIECE-2026',
      name: 'Pieza de Test ZPL',
      originalFileName: 'test.dxf',
      fileType: 'dxf' as const,
      fileSize: 1024,
      createdAt: Date.now(),
      printCount: 0,
      rawSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="black"/></svg>`
    };

    const zpl = await generateZpl(template, dummyPiece, { copies: 2 });
    if (!zpl.startsWith('^XA') || !zpl.endsWith('^XZ')) {
      throw new Error('El ZPL no contiene las directivas obligatorias ^XA y ^XZ');
    }
    if (!zpl.includes('TEST-PIECE-2026')) {
      throw new Error('El código de pieza no se encuentra en el comando ^FD');
    }
    if (!zpl.includes('^PQ2')) {
      throw new Error('La cantidad de copias no coincide con ^PQ2');
    }
  });

  // Test 9: End-to-end Physical Canvas Render for PDF/PNG
  await runTest('Renderizado físico en milímetros para PDF y PNG', 'pdf_export', async () => {
    if (typeof document === 'undefined') {
      return; // Headless environment
    }
    const template = INITIAL_TEMPLATES[0];
    const dummyPiece = {
      id: 'test-piece',
      code: 'TEST-CANVAS',
      name: 'Test Canvas',
      originalFileName: 'test.svg',
      fileType: 'svg' as const,
      fileSize: 1024,
      createdAt: Date.now(),
      printCount: 0,
      rawSvg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>`
    };

    const canvas = await renderLabelToCanvas(template, dummyPiece, 2.0);
    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error('El canvas de exportación tiene dimensiones nulas');
    }
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Fallo al exportar el PNG del dibujo');
    }
  });

  // Test 10: Resize 100x75mm to 50x30mm with Auto-Adjustment
  await runTest('Adaptación automática de 100×75 mm a 50×30 mm', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const largeTemplate = INITIAL_TEMPLATES.find((t) => t.widthMm === 100 && t.heightMm === 75) || INITIAL_TEMPLATES[0];
    const adapted = adaptTemplateLayout(largeTemplate, 50, 30, { mode: 'auto' });

    if (adapted.widthMm !== 50 || adapted.heightMm !== 30) {
      throw new Error(`Dimensiones no coinciden: ${adapted.widthMm}x${adapted.heightMm}`);
    }

    const margin = adapted.marginMm || 1.5;
    for (const el of adapted.elements) {
      if (el.xMm < margin - 0.01) {
        throw new Error(`Elemento ${el.id} desbordado a la izquierda: x=${el.xMm}`);
      }
      if (el.yMm < margin - 0.01) {
        throw new Error(`Elemento ${el.id} desbordado arriba: y=${el.yMm}`);
      }
      if (el.xMm + el.widthMm > 50 - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desbordado a la derecha: x+w=${el.xMm + el.widthMm}`);
      }
      if (el.yMm + el.heightMm > 30 - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desbordado abajo: y+h=${el.yMm + el.heightMm}`);
      }
    }
  });

  // Test 11: Resize 50x30mm to 100x75mm
  await runTest('Adaptación proporcional de 50×30 mm a 100×75 mm', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const smallTemplate = INITIAL_TEMPLATES.find((t) => t.widthMm === 50 && t.heightMm === 30) || INITIAL_TEMPLATES[0];
    const enlarged = adaptTemplateLayout(smallTemplate, 100, 75, { mode: 'auto' });

    if (enlarged.widthMm !== 100 || enlarged.heightMm !== 75) {
      throw new Error(`Dimensiones erróneas: ${enlarged.widthMm}x${enlarged.heightMm}`);
    }

    const margin = enlarged.marginMm || 1.5;
    for (const el of enlarged.elements) {
      if (el.xMm + el.widthMm > 100 - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desborda en agrandamiento`);
      }
      if (el.yMm + el.heightMm > 75 - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desborda abajo en agrandamiento`);
      }
    }
  });

  // Test 12: Orientation toggle (horizontal <-> vertical)
  await runTest('Inversión de orientación horizontal a vertical con conservación de cotas', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];
    const flipped = adaptTemplateLayout(base, base.heightMm, base.widthMm, { mode: 'auto' });

    if (flipped.widthMm !== base.heightMm || flipped.heightMm !== base.widthMm) {
      throw new Error('Fallo en el intercambio de ejes de la etiqueta');
    }
    const margin = flipped.marginMm || 1.5;
    for (const el of flipped.elements) {
      if (el.xMm + el.widthMm > flipped.widthMm - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desborda tras rotación`);
      }
      if (el.yMm + el.heightMm > flipped.heightMm - margin + 0.05) {
        throw new Error(`Elemento ${el.id} desborda tras rotación vertical`);
      }
    }
  });

  // Test 13: Universal Scroll Lock Manager
  await runTest('Bloqueo de scroll con conteo de referencias y restauración', 'valid_format', async () => {
    const { acquireScrollLock, releaseScrollLock } = await import('../scrollLock.ts');
    if (typeof document === 'undefined') {
      acquireScrollLock();
      releaseScrollLock();
      return;
    }
    acquireScrollLock();
    if (document.body.style.overflow !== 'hidden') {
      throw new Error('El scroll del documento no fue bloqueado');
    }
    acquireScrollLock(); // Second overlay
    releaseScrollLock(); // First release, still locked
    if (document.body.style.overflow !== 'hidden') {
      throw new Error('El bloqueo de scroll se liberó prematuramente con overlays simultáneos');
    }
    releaseScrollLock(); // Final release
    if (document.body.style.overflow === 'hidden') {
      throw new Error('El scroll no fue restaurado correctamente tras cerrar todos los overlays');
    }
  });

  // Test 14: Micro Label 30×20 mm Adaptation
  await runTest('Adaptación a micro-etiqueta 30×20 mm con dibujo CAD y QR', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];
    const micro = adaptTemplateLayout(base, 30, 20, { mode: 'auto' });

    if (micro.widthMm !== 30 || micro.heightMm !== 20) {
      throw new Error(`Medidas incorrectas: ${micro.widthMm}x${micro.heightMm}`);
    }

    const margin = micro.marginMm || 1.5;
    for (const el of micro.elements) {
      if (el.xMm < margin - 0.05 || el.yMm < margin - 0.05) {
        throw new Error(`Elemento ${el.type} desborda margen izquierdo/superior`);
      }
      if (el.xMm + el.widthMm > 30 - margin + 0.05) {
        throw new Error(`Elemento ${el.type} desborda ancho 30mm`);
      }
      if (el.yMm + el.heightMm > 20 - margin + 0.05) {
        throw new Error(`Elemento ${el.type} desborda alto 20mm`);
      }
    }

    const codeEl = micro.elements.find((el) => el.type === 'code');
    if (!codeEl || (codeEl.fontSizePt && codeEl.fontSizePt < 7)) {
      throw new Error('Código ilegible en micro-etiqueta');
    }
  });

  // Test 15: Validation of 50×30, 60×40 and 100×60 mm
  await runTest('Verificación de rangos industriales 50×30, 60×40 y 100×60 mm', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];

    const sizes = [
      { w: 50, h: 30 },
      { w: 60, h: 40 },
      { w: 100, h: 60 }
    ];

    for (const s of sizes) {
      const adapted = adaptTemplateLayout(base, s.w, s.h, { mode: 'auto' });
      const margin = adapted.marginMm || 1.5;

      for (const el of adapted.elements) {
        if (el.xMm + el.widthMm > s.w - margin + 0.05) {
          throw new Error(`Desborde horizontal en ${s.w}x${s.h}: ${el.type}`);
        }
        if (el.yMm + el.heightMm > s.h - margin + 0.05) {
          throw new Error(`Desborde vertical en ${s.w}x${s.h}: ${el.type}`);
        }
      }

      const bar = adapted.elements.find((el) => el.type === 'barcode');
      if (bar && bar.widthMm < 19.5) {
        throw new Error(`Código de barras demasiado estrecho en ${s.w}x${s.h}: ${bar.widthMm}mm`);
      }
    }
  });

  // Test 16: Three Modes comparison (Auto vs Proportional vs Manual)
  await runTest('Comportamiento de los tres modos: Automático, Proporcional y Manual', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];

    const autoResult = adaptTemplateLayout(base, 50, 30, { mode: 'auto' });
    const propResult = adaptTemplateLayout(base, 50, 30, { mode: 'proportional' });
    const manualResult = adaptTemplateLayout(base, 50, 30, { mode: 'manual' });

    if (autoResult.layoutMode !== 'auto' || propResult.layoutMode !== 'proportional' || manualResult.layoutMode !== 'manual') {
      throw new Error('Los modos no fueron asignados correctamente');
    }

    // Manual mode must preserve original element dimensions if clamped to bounds
    const origCode = base.elements.find((el) => el.type === 'code');
    const manualCode = manualResult.elements.find((el) => el.type === 'code');
    if (origCode && manualCode) {
      if (manualCode.fontSizePt !== origCode.fontSizePt) {
        throw new Error('El modo manual alteró la fuente del código');
      }
    }
  });

  // Test 17: CAD Drawing Aspect Ratio preservation
  await runTest('Conservación estricta de la relación de aspecto del dibujo CAD', 'valid_format', async () => {
    const { adaptTemplateLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];
    const drawEl = base.elements.find((el) => el.type === 'drawing');
    if (!drawEl) throw new Error('No se encontró dibujo en plantilla base');

    const originalAspect = drawEl.widthMm / drawEl.heightMm;
    const adapted = adaptTemplateLayout(base, 50, 30, { mode: 'auto' });
    const newDrawEl = adapted.elements.find((el) => el.type === 'drawing');
    if (!newDrawEl) throw new Error('Dibujo desapareció');

    const newAspect = newDrawEl.widthMm / newDrawEl.heightMm;
    // Difference should be within tiny tolerance
    if (Math.abs(originalAspect - newAspect) > 0.08) {
      throw new Error(`Relación de aspecto deformada: antes ${originalAspect.toFixed(2)}, después ${newAspect.toFixed(2)}`);
    }
  });

  // Test 18: Layout conflict & space feasibility validator
  await runTest('Detección y reporte de conflictos de espacio físico (validateLabelLayout)', 'valid_format', async () => {
    const { validateLabelLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0];

    // Intentionally create a template with severe overflow and narrow barcode
    const brokenTemplate = {
      ...base,
      widthMm: 30,
      heightMm: 20,
      elements: [
        {
          id: 'bad-code',
          type: 'code' as const,
          xMm: 25,
          yMm: 18,
          widthMm: 20, // overflows 30mm width
          heightMm: 6
        },
        {
          id: 'bad-barcode',
          type: 'barcode' as const,
          xMm: 2,
          yMm: 2,
          widthMm: 12, // too narrow for Zebra
          heightMm: 4
        }
      ]
    };

    const warnings = validateLabelLayout(brokenTemplate);
    if (warnings.length < 2) {
      throw new Error(`Se esperaban al menos 2 advertencias de conflicto, se detectaron ${warnings.length}`);
    }

    const hasOverflow = warnings.some((w) => w.id.includes('overflow'));
    const hasBarcodeWarning = warnings.some((w) => w.id.includes('barcode'));

    if (!hasOverflow || !hasBarcodeWarning) {
      throw new Error('El validador no identificó el desborde o el código de barras estrecho');
    }
  });

  // Test 19: Full 30×20 mm layout resolution with zero collisions
  await runTest('Resolución limpia de 30×20 mm sin colisiones ni superposiciones', 'valid_format', async () => {
    const { adaptTemplateLayout, validateLabelLayout } = await import('./layoutAdapter.ts');
    const base = INITIAL_TEMPLATES[0]; // has 9 elements: code, name, drawing, barcode, date, qty, etc.

    // Adapt to 30x20 mm
    const adapted = adaptTemplateLayout(base, 30, 20, { mode: 'auto', forceAdapt: true });
    const warnings = validateLabelLayout(adapted);

    // Filter serious error-level warnings (overflow or collision)
    const seriousErrors = warnings.filter((w) => w.severity === 'error');
    if (seriousErrors.length > 0) {
      throw new Error(`La adaptación a 30×20 mm dejó errores graves: ${seriousErrors.map((e) => e.title).join(', ')}`);
    }

    const activeElements = adapted.elements.filter((el) => el.visible !== false);
    const code = activeElements.find((el) => el.type === 'code');
    const drawing = activeElements.find((el) => el.type === 'drawing');

    if (!code || !drawing) {
      throw new Error('Código o Dibujo CAD faltante en micro-etiqueta 30×20 mm');
    }
  });

  return results;
}
