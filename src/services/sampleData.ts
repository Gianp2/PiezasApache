import { Piece, LabelTemplate } from '../types/index.ts';

// Vector paths for industrial parts
export const SAMPLE_SVG_FLANGE = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Outer circle flange contour -->
  <circle cx="50" cy="50" r="46" />
  <!-- Center bore hole -->
  <circle cx="50" cy="50" r="18" />
  <!-- Bolt circle guide (subtle dashed) -->
  <circle cx="50" cy="50" r="32" stroke-dasharray="2 3" stroke-width="0.8" />
  <!-- 4 Bolt holes -->
  <circle cx="50" cy="18" r="4" fill="currentColor" />
  <circle cx="50" cy="82" r="4" fill="currentColor" />
  <circle cx="18" cy="50" r="4" fill="currentColor" />
  <circle cx="82" cy="50" r="4" fill="currentColor" />
  <!-- 4 Diagonal bolt holes -->
  <circle cx="27.4" cy="27.4" r="4" fill="currentColor" />
  <circle cx="72.6" cy="27.4" r="4" fill="currentColor" />
  <circle cx="27.4" cy="72.6" r="4" fill="currentColor" />
  <circle cx="72.6" cy="72.6" r="4" fill="currentColor" />
</svg>`;

export const SAMPLE_SVG_BRACKET = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Outer bracket profile with chamfer -->
  <path d="M 10 10 L 110 10 L 110 55 L 90 75 L 10 75 Z" />
  <!-- Weight-reducing cutout slot -->
  <path d="M 40 25 L 80 25 A 8 8 0 0 1 88 33 A 8 8 0 0 1 80 41 L 40 41 A 8 8 0 0 1 32 33 A 8 8 0 0 1 40 25 Z" />
  <!-- Left mounting holes -->
  <circle cx="22" cy="25" r="5" />
  <circle cx="22" cy="60" r="5" />
  <!-- Right mounting hole -->
  <circle cx="98" cy="30" r="4" />
</svg>`;

export const SAMPLE_SVG_PLATE = `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Plate with rounded corners -->
  <rect x="6" y="6" width="88" height="68" rx="8" />
  <!-- Central circular pocket -->
  <circle cx="50" cy="40" r="16" />
  <!-- 4 Corner fastening countersunk holes -->
  <circle cx="18" cy="18" r="4" />
  <circle cx="82" cy="18" r="4" />
  <circle cx="18" cy="62" r="4" />
  <circle cx="82" cy="62" r="4" />
</svg>`;

export const SAMPLE_SVG_GEAR = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8">
  <!-- Gear profile teeth -->
  <path d="M 47 4 L 53 4 L 55 12 L 63 15 L 70 10 L 75 14 L 73 22 L 80 27 L 87 25 L 90 31 L 85 37 L 89 45 L 96 47 L 96 53 L 89 55 L 85 63 L 90 69 L 87 75 L 80 73 L 73 78 L 75 86 L 70 90 L 63 85 L 55 88 L 53 96 L 47 96 L 45 88 L 37 85 L 30 90 L 25 86 L 27 78 L 20 73 L 13 75 L 10 69 L 15 63 L 11 55 L 4 53 L 4 47 L 11 45 L 15 37 L 10 31 L 13 25 L 20 27 L 27 22 L 25 14 L 30 10 L 37 15 L 45 12 Z" />
  <!-- Pitch circle (reference) -->
  <circle cx="50" cy="50" r="32" stroke-dasharray="2 2" stroke-width="0.8" />
  <!-- Central shaft bore with keyway -->
  <path d="M 42 38 L 58 38 L 58 43 A 12 12 0 1 1 42 43 Z" />
</svg>`;

export const INITIAL_PIECES: Piece[] = [
  {
    id: 'piece-brida-ansi-150',
    code: 'BRD-150-SS316',
    name: 'Brida Ciega ANSI 150 Inox',
    material: 'Acero Inox AISI 316L',
    originalFileName: 'BRD-150-SS316_revB.dxf',
    fileType: 'dxf',
    fileSize: 42560,
    createdAt: Date.now() - 86400000 * 3,
    templateId: 'tpl-80x50-default',
    printCount: 0,
    notes: 'Tolerancia H7 en orificios de fijación. Corte láser fibra nitrógeno.',
    rawSvg: SAMPLE_SVG_FLANGE,
    rotation: 0,
    strokeWidth: 2,
    layers: [
      { name: 'PIEZA_CONTORNO', visible: true, entityCount: 9, isDimensionOrText: false, color: '#000000' },
      { name: 'COTAS_MEDIDAS', visible: false, entityCount: 16, isDimensionOrText: true, color: '#888888' },
      { name: 'TEXTOS_ROTULO', visible: false, entityCount: 4, isDimensionOrText: true, color: '#444444' },
      { name: 'DEFPOINTS', visible: false, entityCount: 22, isDimensionOrText: true, color: '#aaaaaa' }
    ],
    bounds: { minX: 4, minY: 4, maxX: 96, maxY: 96, width: 92, height: 92 }
  },
  {
    id: 'piece-soporte-cnc',
    code: 'SPT-CNC-V4',
    name: 'Soporte Angular Motor NEMA 34',
    material: 'Aluminio 6061-T6',
    originalFileName: 'SPT-CNC-V4.dxf',
    fileType: 'dxf',
    fileSize: 31200,
    createdAt: Date.now() - 86400000 * 2,
    templateId: 'tpl-80x50-default',
    printCount: 0,
    notes: 'Mecanizado CNC 4 ejes. Anodizado negro mate.',
    rawSvg: SAMPLE_SVG_BRACKET,
    rotation: 0,
    strokeWidth: 2,
    layers: [
      { name: 'CONTORNO_EXTERIOR', visible: true, entityCount: 5, isDimensionOrText: false, color: '#000000' },
      { name: 'ORIFICIOS_RANURAS', visible: true, entityCount: 4, isDimensionOrText: false, color: '#000000' },
      { name: 'COTAS_CENTROS', visible: false, entityCount: 12, isDimensionOrText: true, color: '#888888' }
    ],
    bounds: { minX: 10, minY: 10, maxX: 110, maxY: 75, width: 100, height: 65 }
  },
  {
    id: 'piece-placa-base',
    code: 'PLC-BASE-M12',
    name: 'Placa de Asiento Columna M12',
    material: 'Acero F-1140 Normalizado',
    originalFileName: 'PLACA_BASE_M12.svg',
    fileType: 'svg',
    fileSize: 18400,
    createdAt: Date.now() - 86400000,
    templateId: 'tpl-100x50-spec',
    printCount: 0,
    notes: 'Plegado en prensa 120Tn y granallado.',
    rawSvg: SAMPLE_SVG_PLATE,
    rotation: 0,
    strokeWidth: 2,
    bounds: { minX: 6, minY: 6, maxX: 94, maxY: 74, width: 88, height: 68 }
  },
  {
    id: 'piece-engranaje-mod2',
    code: 'ENG-M2-Z24',
    name: 'Engranaje Recto M2 Z24',
    material: 'Acero Cementación 16MnCr5',
    originalFileName: 'ENG_M2_Z24.png',
    fileType: 'png',
    fileSize: 56100,
    createdAt: Date.now() - 3600000 * 5,
    templateId: 'tpl-60x40-compact',
    printCount: 0,
    notes: 'Tallado por fresa madre y templado a 58-62 HRC.',
    rawSvg: SAMPLE_SVG_GEAR,
    rotation: 0,
    strokeWidth: 1.8,
    bounds: { minX: 4, minY: 4, maxX: 96, maxY: 96, width: 92, height: 92 }
  }
];

export const INITIAL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'tpl-80x50-default',
    name: 'Industrial Estándar 80×50 mm',
    description: 'Código superior, dibujo centrado con QR y código de barras inferior.',
    widthMm: 80,
    heightMm: 50,
    orientation: 'landscape',
    dpi: 203,
    marginMm: 2,
    isDefault: true,
    isCustom: false,
    createdAt: Date.now() - 86400000 * 10,
    elements: [
      {
        id: 'el-code-1',
        type: 'code',
        xMm: 3,
        yMm: 3,
        widthMm: 48,
        heightMm: 7,
        fontSizePt: 14,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      {
        id: 'el-name-1',
        type: 'name',
        xMm: 3,
        yMm: 11,
        widthMm: 48,
        heightMm: 5,
        fontSizePt: 8,
        fontWeight: 'normal',
        textAlign: 'left'
      },
      {
        id: 'el-qr-1',
        type: 'qrcode',
        xMm: 62,
        yMm: 3,
        widthMm: 15,
        heightMm: 15,
        qrErrorCorrection: 'M'
      },
      {
        id: 'el-divider-1',
        type: 'line',
        xMm: 3,
        yMm: 17,
        widthMm: 74,
        heightMm: 1,
        borderWidthMm: 0.4
      },
      {
        id: 'el-drawing-1',
        type: 'drawing',
        xMm: 4,
        yMm: 19,
        widthMm: 36,
        heightMm: 28,
        strokeWidthMm: 0.5,
        rotation: 0
      },
      {
        id: 'el-barcode-1',
        type: 'barcode',
        xMm: 43,
        yMm: 21,
        widthMm: 34,
        heightMm: 18,
        barcodeFormat: 'CODE128',
        includeTextUnderBarcode: true
      },
      {
        id: 'el-date-1',
        type: 'date',
        xMm: 43,
        yMm: 42,
        widthMm: 20,
        heightMm: 5,
        fontSizePt: 7,
        prefix: 'FECHA: '
      },
      {
        id: 'el-qty-1',
        type: 'quantity',
        xMm: 65,
        yMm: 42,
        widthMm: 12,
        heightMm: 5,
        fontSizePt: 7,
        prefix: 'CANT: 1'
      }
    ]
  },
  {
    id: 'tpl-100x50-spec',
    name: 'Ficha Técnica 100×50 mm',
    description: 'Dibujo a la izquierda en gran tamaño, especificaciones y códigos a la derecha.',
    widthMm: 100,
    heightMm: 50,
    orientation: 'landscape',
    dpi: 300,
    marginMm: 2,
    isDefault: false,
    isCustom: false,
    createdAt: Date.now() - 86400000 * 8,
    elements: [
      {
        id: 'el-box-left',
        type: 'rect_box',
        xMm: 3,
        yMm: 3,
        widthMm: 44,
        heightMm: 44,
        borderWidthMm: 0.4
      },
      {
        id: 'el-drawing-spec',
        type: 'drawing',
        xMm: 5,
        yMm: 5,
        widthMm: 40,
        heightMm: 40,
        strokeWidthMm: 0.6,
        rotation: 0
      },
      {
        id: 'el-code-spec',
        type: 'code',
        xMm: 50,
        yMm: 4,
        widthMm: 46,
        heightMm: 8,
        fontSizePt: 15,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      {
        id: 'el-name-spec',
        type: 'name',
        xMm: 50,
        yMm: 13,
        widthMm: 46,
        heightMm: 5,
        fontSizePt: 8.5,
        fontWeight: 'normal',
        textAlign: 'left'
      },
      {
        id: 'el-barcode-spec',
        type: 'barcode',
        xMm: 50,
        yMm: 20,
        widthMm: 32,
        heightMm: 16,
        barcodeFormat: 'CODE128',
        includeTextUnderBarcode: true
      },
      {
        id: 'el-qr-spec',
        type: 'qrcode',
        xMm: 84,
        yMm: 20,
        widthMm: 13,
        heightMm: 13,
        qrErrorCorrection: 'M'
      },
      {
        id: 'el-text-trace',
        type: 'custom_text',
        xMm: 50,
        yMm: 40,
        widthMm: 46,
        heightMm: 6,
        customText: 'TRAZABILIDAD Y CONTROL DE CALIDAD OK',
        fontSizePt: 6.5,
        fontWeight: 'bold'
      }
    ]
  },
  {
    id: 'tpl-60x40-compact',
    name: 'Compacta 60×40 mm',
    description: 'Etiqueta balanceada ideal para rotulado rápido en cajas o bolsas de piezas.',
    widthMm: 60,
    heightMm: 40,
    orientation: 'landscape',
    dpi: 203,
    marginMm: 2,
    isDefault: false,
    isCustom: false,
    createdAt: Date.now() - 86400000 * 5,
    elements: [
      {
        id: 'el-code-c',
        type: 'code',
        xMm: 3,
        yMm: 3,
        widthMm: 40,
        heightMm: 6,
        fontSizePt: 12,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      {
        id: 'el-qr-c',
        type: 'qrcode',
        xMm: 45,
        yMm: 3,
        widthMm: 12,
        heightMm: 12,
        qrErrorCorrection: 'M'
      },
      {
        id: 'el-drawing-c',
        type: 'drawing',
        xMm: 3,
        yMm: 10,
        widthMm: 26,
        heightMm: 20,
        strokeWidthMm: 0.5,
        rotation: 0
      },
      {
        id: 'el-name-c',
        type: 'name',
        xMm: 30,
        yMm: 17,
        widthMm: 27,
        heightMm: 12,
        fontSizePt: 7,
        textAlign: 'left'
      },
      {
        id: 'el-barcode-c',
        type: 'barcode',
        xMm: 3,
        yMm: 31,
        widthMm: 54,
        heightMm: 7,
        barcodeFormat: 'CODE128',
        includeTextUnderBarcode: false
      }
    ]
  },
  {
    id: 'tpl-50x30-mini',
    name: 'Mini 50×30 mm',
    description: 'Formato pequeño para piezas de tornillería, casquillos y bulones.',
    widthMm: 50,
    heightMm: 30,
    orientation: 'landscape',
    dpi: 203,
    marginMm: 1.5,
    isDefault: false,
    isCustom: false,
    createdAt: Date.now() - 86400000 * 4,
    elements: [
      {
        id: 'el-code-m',
        type: 'code',
        xMm: 2,
        yMm: 2,
        widthMm: 46,
        heightMm: 5,
        fontSizePt: 10,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        id: 'el-drawing-m',
        type: 'drawing',
        xMm: 2,
        yMm: 8,
        widthMm: 20,
        heightMm: 20,
        strokeWidthMm: 0.4
      },
      {
        id: 'el-qr-m',
        type: 'qrcode',
        xMm: 26,
        yMm: 9,
        widthMm: 18,
        heightMm: 18,
        qrErrorCorrection: 'M'
      }
    ]
  },
  {
    id: 'tpl-100x75-logistics',
    name: 'Palet / Embalaje 100×75 mm',
    description: 'Etiqueta de gran visibilidad para cajas maestras y contenedores.',
    widthMm: 100,
    heightMm: 75,
    orientation: 'landscape',
    dpi: 203,
    marginMm: 3,
    isDefault: false,
    isCustom: false,
    createdAt: Date.now() - 86400000 * 2,
    elements: [
      {
        id: 'el-header-box',
        type: 'rect_box',
        xMm: 3,
        yMm: 3,
        widthMm: 94,
        heightMm: 14,
        borderWidthMm: 0.6
      },
      {
        id: 'el-code-l',
        type: 'code',
        xMm: 5,
        yMm: 4,
        widthMm: 60,
        heightMm: 8,
        fontSizePt: 16,
        fontWeight: 'bold'
      },
      {
        id: 'el-name-l',
        type: 'name',
        xMm: 5,
        yMm: 12,
        widthMm: 60,
        heightMm: 4,
        fontSizePt: 8
      },
      {
        id: 'el-qr-l',
        type: 'qrcode',
        xMm: 78,
        yMm: 4,
        widthMm: 17,
        heightMm: 17,
        qrErrorCorrection: 'H'
      },
      {
        id: 'el-drawing-l',
        type: 'drawing',
        xMm: 4,
        yMm: 20,
        widthMm: 50,
        heightMm: 40,
        strokeWidthMm: 0.7
      },
      {
        id: 'el-barcode-l',
        type: 'barcode',
        xMm: 57,
        yMm: 26,
        widthMm: 40,
        heightMm: 24,
        barcodeFormat: 'CODE128',
        includeTextUnderBarcode: true
      },
      {
        id: 'el-date-l',
        type: 'date',
        xMm: 4,
        yMm: 65,
        widthMm: 30,
        heightMm: 6,
        fontSizePt: 8,
        prefix: 'FABRICADO: '
      },
      {
        id: 'el-qty-l',
        type: 'quantity',
        xMm: 60,
        yMm: 65,
        widthMm: 35,
        heightMm: 6,
        fontSizePt: 9,
        fontWeight: 'bold',
        prefix: 'LOTE EXPEDICIÓN: 100 UDS'
      }
    ]
  }
];
