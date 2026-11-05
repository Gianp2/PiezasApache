export type LabelDpi = 203 | 300 | 600;

export type LabelOrientation = 'landscape' | 'portrait';

export type ElementType =
  | 'drawing'
  | 'code'
  | 'name'
  | 'barcode'
  | 'qrcode'
  | 'custom_text'
  | 'date'
  | 'quantity'
  | 'rect_box'
  | 'line';

export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13';

export interface LabelElement {
  id: string;
  type: ElementType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
  // Common styling
  fontSizePt?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  color?: string;
  // Specific properties
  customText?: string;
  prefix?: string;
  suffix?: string;
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MMM-YYYY';
  barcodeFormat?: BarcodeFormat;
  includeTextUnderBarcode?: boolean;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  // Drawing specific
  strokeWidthMm?: number;
  rotation?: 0 | 90 | 180 | 270;
  invertColors?: boolean;
  aspectRatioLocked?: boolean;
  // Border/line specific
  borderWidthMm?: number;
  borderStyle?: 'solid' | 'dashed';
}

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  orientation: LabelOrientation;
  dpi: LabelDpi;
  marginMm: number;
  layoutMode?: 'auto' | 'proportional' | 'manual';
  isDefault?: boolean;
  isCustom?: boolean;
  elements: LabelElement[];
  createdAt: number;
}

export interface LayoutWarning {
  id: string;
  category?: 'overflow' | 'collision' | 'barcode' | 'qr' | 'text_overflow' | 'overcrowding';
  severity: 'warning' | 'error';
  title: string;
  message: string;
  suggestion: string;
  elementId?: string;
  elementIds?: string[];
  actionType?: 'adapt' | 'hide_optional' | 'resize_50x30' | 'resize_60x40';
}

export interface LayoutAdaptationResult {
  template: LabelTemplate;
  warnings: LayoutWarning[];
}

export interface CadLayer {
  name: string;
  color?: string;
  visible: boolean;
  entityCount: number;
  isDimensionOrText?: boolean;
}

export interface PieceBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Piece {
  id: string;
  code: string;
  name: string;
  material?: string;
  originalFileName: string;
  fileType: 'dxf' | 'dwg' | 'svg' | 'pdf' | 'png' | 'jpg' | 'bmp';
  fileSize: number;
  createdAt: number;
  templateId?: string;
  printCount: number;
  notes?: string;
  // Geometric data
  rawSvg: string; // Clean vector SVG representation
  previewDataUrl?: string; // Raster preview or thumbnail
  bounds?: PieceBounds;
  layers?: CadLayer[];
  rotation?: 0 | 90 | 180 | 270;
  strokeWidth?: number;
  scale?: number;
}

export type PrintJobStatus = 'generada' | 'descargada' | 'enviada' | 'confirmada' | 'fallida';

export interface PrintJob {
  id: string; // Identificador de operación
  timestamp: number; // Fecha y hora
  pieceId: string;
  pieceCode: string; // Código de pieza
  pieceName: string;
  copies: number; // Cantidad de copias
  templateId?: string;
  templateName?: string; // Plantilla utilizada
  target: 'zebra_browser_print' | 'zebra_usb' | 'pdf_download' | 'zpl_file' | 'png_file';
  printerName?: string; // Impresora seleccionada
  status: PrintJobStatus; // Estado de impresión
  labelDimensions: string;
  dpi: LabelDpi;
  errorMessage?: string;
}

export interface ZebraPrinterConfig {
  connectionType: 'browser_print' | 'webusb' | 'raw_socket';
  browserPrintUrl: string;
  selectedPrinterName: string;
  dpi: LabelDpi;
  darkness: number; // 0 to 30
  printSpeed: number; // 2 to 6 inches/sec
  mediaType: 'thermal_transfer' | 'direct_thermal';
  labelWidthMm: number;
  labelHeightMm: number;
  marginMm: number;
}

export type PresetLayoutId =
  | 'code_top_drawing_bottom'
  | 'drawing_top_code_bottom'
  | 'code_left_drawing_right'
  | 'drawing_left_code_right'
  | 'industrial_spec_sheet';
