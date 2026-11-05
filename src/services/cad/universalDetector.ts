import { DetectedFileType, DetectionResult } from './types.ts';

const DWG_VERSIONS: Record<string, string> = {
  'AC1015': 'AutoCAD 2000/2000i/2002',
  'AC1018': 'AutoCAD 2004/2005/2006',
  'AC1021': 'AutoCAD 2007/2008/2009',
  'AC1024': 'AutoCAD 2010/2011/2012',
  'AC1027': 'AutoCAD 2013/2014/2015/2016/2017',
  'AC1032': 'AutoCAD 2018/2019/2020/2021/2022/2023/2024+'
};

/**
 * Sniffs binary magic bytes and file content to automatically identify the true format
 * of any CAD drawing or image without relying solely on file extensions.
 */
export async function detectFileFormat(file: File | Blob, fileName: string = ''): Promise<DetectionResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Read the first 2048 bytes for signature analysis
  const slice = file.slice(0, 2048);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const textPreview = textDecoder.decode(bytes);

  // 1. Check PNG (Magic bytes: 89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return {
      detectedFormat: 'png',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'png',
      confidence: 1.0,
      mimeType: 'image/png',
      signatureDesc: 'Firma binaria PNG verificada (89 50 4E 47)'
    };
  }

  // 2. Check JPEG (Magic bytes: FF D8 FF)
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return {
      detectedFormat: 'jpg',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'jpg' && ext !== 'jpeg',
      confidence: 1.0,
      mimeType: 'image/jpeg',
      signatureDesc: 'Firma binaria JPEG verificada (FF D8 FF)'
    };
  }

  // 3. Check BMP (Magic bytes: 42 4D -> 'BM')
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return {
      detectedFormat: 'bmp',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'bmp',
      confidence: 1.0,
      mimeType: 'image/bmp',
      signatureDesc: 'Firma binaria Windows Bitmap (BM)'
    };
  }

  // 4. Check PDF (Magic bytes: 25 50 44 46 2D -> '%PDF-')
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2D
  ) {
    return {
      detectedFormat: 'pdf',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'pdf',
      confidence: 1.0,
      mimeType: 'application/pdf',
      signatureDesc: 'Documento vectorial PDF (%PDF-)'
    };
  }

  // 5. Check DWG (AutoCAD binary: Starts with 'AC10...')
  const header6 = String.fromCharCode(...bytes.slice(0, 6));
  if (header6.startsWith('AC')) {
    const versionName = DWG_VERSIONS[header6] || `Versión ${header6}`;
    return {
      detectedFormat: 'dwg',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'dwg',
      confidence: 1.0,
      mimeType: 'application/acad',
      signatureDesc: `Plano binario AutoCAD DWG (${versionName})`,
      autocadVersion: versionName
    };
  }

  // 6. Check Binary DXF (Starts with "AutoCAD Binary DXF")
  const binaryDxfHeader = String.fromCharCode(...bytes.slice(0, 18));
  if (binaryDxfHeader.startsWith('AutoCAD Binary DXF')) {
    return {
      detectedFormat: 'dxf',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'dxf',
      confidence: 1.0,
      mimeType: 'application/dxf',
      signatureDesc: 'AutoCAD Binary DXF verificado'
    };
  }

  // 7. Check SVG (Text starting with XML / <svg / containing <svg xmlns)
  const trimmedText = textPreview.trim();
  if (
    trimmedText.startsWith('<svg') ||
    (trimmedText.startsWith('<?xml') && trimmedText.includes('<svg')) ||
    /<svg[^>]*xmlns/i.test(textPreview)
  ) {
    return {
      detectedFormat: 'svg',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'svg',
      confidence: 0.98,
      mimeType: 'image/svg+xml',
      signatureDesc: 'Vector XML SVG estándar (<svg>)'
    };
  }

  // 8. Check ASCII DXF (Text containing SECTION, ENTITIES, TABLES, or group codes 0\nSECTION)
  if (
    /^\s*0\s*[\r\n]+\s*SECTION/i.test(trimmedText) ||
    (trimmedText.includes('SECTION') && (trimmedText.includes('HEADER') || trimmedText.includes('ENTITIES') || trimmedText.includes('TABLES')))
  ) {
    return {
      detectedFormat: 'dxf',
      extensionFromFileName: ext,
      isExtensionMismatch: ext !== 'dxf',
      confidence: 0.95,
      mimeType: 'application/dxf',
      signatureDesc: 'Plano vectorial ASCII DXF (AutoCAD Drawing Exchange)'
    };
  }

  // 9. Fallback by extension if signatures were inconclusive
  if (ext === 'dxf') {
    return {
      detectedFormat: 'dxf',
      extensionFromFileName: ext,
      isExtensionMismatch: false,
      confidence: 0.7,
      signatureDesc: 'Extensión .dxf'
    };
  } else if (ext === 'dwg') {
    return {
      detectedFormat: 'dwg',
      extensionFromFileName: ext,
      isExtensionMismatch: false,
      confidence: 0.7,
      signatureDesc: 'Extensión .dwg'
    };
  } else if (ext === 'svg') {
    return {
      detectedFormat: 'svg',
      extensionFromFileName: ext,
      isExtensionMismatch: false,
      confidence: 0.7,
      signatureDesc: 'Extensión .svg'
    };
  } else if (['png', 'jpg', 'jpeg', 'bmp'].includes(ext)) {
    return {
      detectedFormat: ext === 'jpeg' ? 'jpg' : (ext as DetectedFileType),
      extensionFromFileName: ext,
      isExtensionMismatch: false,
      confidence: 0.7,
      signatureDesc: `Extensión .${ext}`
    };
  } else if (ext === 'pdf') {
    return {
      detectedFormat: 'pdf',
      extensionFromFileName: ext,
      isExtensionMismatch: false,
      confidence: 0.7,
      signatureDesc: 'Extensión .pdf'
    };
  }

  return {
    detectedFormat: 'unknown',
    extensionFromFileName: ext,
    isExtensionMismatch: false,
    confidence: 0.0,
    signatureDesc: 'Formato no reconocido o archivo corrupto'
  };
}
