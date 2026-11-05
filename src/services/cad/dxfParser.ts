import DxfParser from 'dxf-parser';
import { CadLayer, PieceBounds } from '../../types/index.ts';

export interface ParsedDxfResult {
  svg: string;
  bounds: PieceBounds;
  layers: CadLayer[];
  entityCount: number;
  unsupportedEntities: string[];
}

// Common CAD dimension / text layer names
const DIMENSION_LAYER_REGEX = /(dim|cota|text|annot|defpoints|title|marco|rotulo|hatch|sombreado|cuadro|rev|stamp)/i;

interface DxfEntity {
  type: string;
  layer?: string;
  vertices?: Array<{ x: number; y: number; bulge?: number }>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  shape?: boolean;
  controlPoints?: Array<{ x: number; y: number }>;
}

export function parseDxfContent(dxfText: string, activeLayers?: Record<string, boolean>): ParsedDxfResult {
  const parser = new DxfParser();
  let dxfData: any;
  try {
    dxfData = parser.parseSync(dxfText);
  } catch (err) {
    throw new Error('No se pudo interpretar el archivo DXF. Verifique que sea un archivo de texto DXF válido.');
  }

  if (!dxfData || !dxfData.entities || !Array.isArray(dxfData.entities)) {
    throw new Error('El archivo DXF no contiene entidades geométricas legibles.');
  }

  // 1. Identify layers
  const layerStats: Record<string, { count: number; isDim: boolean; color?: string }> = {};

  // Check header layers if defined
  if (dxfData.tables?.layer?.layers) {
    Object.keys(dxfData.tables.layer.layers).forEach((lName) => {
      const isDim = DIMENSION_LAYER_REGEX.test(lName);
      layerStats[lName] = { count: 0, isDim };
    });
  }

  // Count entities per layer
  dxfData.entities.forEach((ent: DxfEntity) => {
    const lName = ent.layer || '0';
    if (!layerStats[lName]) {
      const isDim = DIMENSION_LAYER_REGEX.test(lName) || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'DIMENSION';
      layerStats[lName] = { count: 0, isDim };
    }
    layerStats[lName].count++;
  });

  const cadLayers: CadLayer[] = Object.keys(layerStats).map((name) => {
    // If activeLayers is provided, use it; otherwise hide dimension/text layers by default!
    const defaultVisible = activeLayers ? (activeLayers[name] ?? !layerStats[name].isDim) : !layerStats[name].isDim;
    return {
      name,
      entityCount: layerStats[name].count,
      isDimensionOrText: layerStats[name].isDim,
      visible: defaultVisible
    };
  });

  // Build active lookup
  const isLayerVisible = (lName?: string): boolean => {
    const key = lName || '0';
    const found = cadLayers.find((l) => l.name === key);
    return found ? found.visible : true;
  };

  // 2. Extract geometry points and elements for bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (isNaN(x) || isNaN(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  const svgPaths: string[] = [];
  const unsupportedList = new Set<string>();
  let includedCount = 0;

  for (const ent of dxfData.entities as DxfEntity[]) {
    // Skip invisible layers or dimension/text entities
    if (!isLayerVisible(ent.layer)) continue;
    if (ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'DIMENSION' || ent.type === 'HATCH') {
      continue;
    }

    if (ent.type === 'LINE' && ent.start && ent.end) {
      updateBounds(ent.start.x, ent.start.y);
      updateBounds(ent.end.x, ent.end.y);
      svgPaths.push(`M ${ent.start.x} ${-ent.start.y} L ${ent.end.x} ${-ent.end.y}`);
      includedCount++;
    } else if ((ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') && ent.vertices && ent.vertices.length > 0) {
      const v = ent.vertices;
      let pathD = '';
      for (let i = 0; i < v.length; i++) {
        updateBounds(v[i].x, v[i].y);
        const cmd = i === 0 ? 'M' : 'L';
        pathD += `${cmd} ${v[i].x} ${-v[i].y} `;
      }
      if (ent.shape) {
        pathD += 'Z';
      }
      svgPaths.push(pathD.trim());
      includedCount++;
    } else if (ent.type === 'CIRCLE' && ent.center && ent.radius) {
      const r = ent.radius;
      updateBounds(ent.center.x - r, ent.center.y - r);
      updateBounds(ent.center.x + r, ent.center.y + r);
      // SVG path for circle
      const cx = ent.center.x;
      const cy = -ent.center.y;
      svgPaths.push(`M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`);
      includedCount++;
    } else if (ent.type === 'ARC' && ent.center && ent.radius) {
      const r = ent.radius;
      const cx = ent.center.x;
      const cy = -ent.center.y;
      const sAngle = (ent.startAngle || 0) * (Math.PI / 180);
      const eAngle = (ent.endAngle || 0) * (Math.PI / 180);

      const sx = cx + r * Math.cos(sAngle);
      const sy = cy - r * Math.sin(sAngle);
      const ex = cx + r * Math.cos(eAngle);
      const ey = cy - r * Math.sin(eAngle);

      updateBounds(ent.center.x - r, ent.center.y - r);
      updateBounds(ent.center.x + r, ent.center.y + r);

      let delta = (ent.endAngle || 0) - (ent.startAngle || 0);
      if (delta < 0) delta += 360;
      const largeArcFlag = delta > 180 ? 1 : 0;

      svgPaths.push(`M ${sx} ${sy} A ${r} ${r} 0 ${largeArcFlag} 0 ${ex} ${ey}`);
      includedCount++;
    } else if (ent.type === 'SPLINE' && ent.controlPoints && ent.controlPoints.length > 1) {
      const pts = ent.controlPoints;
      let pathD = `M ${pts[0].x} ${-pts[0].y}`;
      updateBounds(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        updateBounds(pts[i].x, pts[i].y);
        pathD += ` L ${pts[i].x} ${-pts[i].y}`;
      }
      svgPaths.push(pathD);
      includedCount++;
    } else {
      unsupportedList.add(ent.type);
    }
  }

  // Handle empty or zero bounds
  if (minX === Infinity || maxX === -Infinity || includedCount === 0) {
    // Fallback bounds
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  const rawWidth = Math.abs(maxX - minX);
  const rawHeight = Math.abs(maxY - minY);
  const width = rawWidth > 0.001 ? rawWidth : 100;
  const height = rawHeight > 0.001 ? rawHeight : 100;

  // Invert Y coordinate for SVG standard coordinate system
  const svgMinX = minX;
  const svgMinY = -maxY;

  // Add 4% padding around the bounding box
  const padX = width * 0.04;
  const padY = height * 0.04;
  const vbX = svgMinX - padX;
  const vbY = svgMinY - padY;
  const vbW = width + padX * 2;
  const vbH = height + padY * 2;

  const combinedPath = svgPaths.join(' ');
  const generatedSvg = `<svg viewBox="${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="${combinedPath}" />
  </svg>`;

  return {
    svg: generatedSvg,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height
    },
    layers: cadLayers,
    entityCount: includedCount,
    unsupportedEntities: Array.from(unsupportedList)
  };
}
