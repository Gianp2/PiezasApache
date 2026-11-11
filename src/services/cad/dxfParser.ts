import DxfParser from 'dxf-parser';
import { CadLayer, PieceBounds } from '../../types/index.ts';

export interface ParsedDxfResult {
  svg: string;
  bounds: PieceBounds;
  layers: CadLayer[];
  entityCount: number;
  unsupportedEntities: string[];
}

const AUXILIARY = /(dim|cota|text|annot|defpoints|title|marco|rotulo|hatch|sombreado|cuadro|rev|stamp|axis|eje|centerline)/i;
type Point = { x: number; y: number; bulge?: number };
type Matrix = [number, number, number, number, number, number];
const ID: Matrix = [1, 0, 0, 1, 0, 0];
const apply = (m: Matrix, p: Point): Point => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
const mul = (a: Matrix, b: Matrix): Matrix => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const fmt = (n: number) => Number(n.toFixed(5));
const pt = (p: Point) => `${fmt(p.x)} ${fmt(-p.y)}`;
const valid = (p: any): p is Point => p && Number.isFinite(p.x) && Number.isFinite(p.y);

export function parseDxfContent(dxfText: string, activeLayers?: Record<string, boolean>): ParsedDxfResult {
  let doc: any;
  try { doc = new DxfParser().parseSync(dxfText); }
  catch { throw new Error('El archivo no es un DXF ASCII válido. Convertí el DWG o DXF binario a DXF ASCII.'); }
  if (!Array.isArray(doc?.entities)) throw new Error('No se encontraron entidades CAD legibles.');
  const layers = new Map<string, { count: number; auxiliary: boolean }>();
  const unsupported = new Set<string>();
  const paths: string[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let count = 0;
  const include = (p: Point) => {
    if (!valid(p)) return;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  };
  const track = (p: Point, m: Matrix) => { const t = apply(m, p); include(t); return t; };
  const layerNames = Object.keys(doc.tables?.layer?.layers || {});
  for (const name of layerNames) layers.set(name, { count: 0, auxiliary: AUXILIARY.test(name) });
  const scan = (entities: any[], inherited = '0', depth = 0) => {
    if (depth > 8) return;
    for (const e of entities) {
      const name = e.layer && e.layer !== '0' ? e.layer : inherited;
      const current = layers.get(name) || { count: 0, auxiliary: AUXILIARY.test(name) };
      current.count++;
      layers.set(name, current);
      if (e.type === 'INSERT' && doc.blocks?.[e.name]?.entities) scan(doc.blocks[e.name].entities, name, depth + 1);
    }
  };
  scan(doc.entities);
  const visible = (layer: string) => activeLayers?.[layer] ?? !AUXILIARY.test(layer);
  const draw = (entities: any[], matrix: Matrix, inherited = '0', depth = 0, stack: string[] = []) => {
    if (depth > 8) { unsupported.add('BLOQUES_ANIDADOS'); return; }
    for (const e of entities) {
      const layer = e.layer && e.layer !== '0' ? e.layer : inherited;
      if (!visible(layer) || e.visible === false) continue;
      if (['TEXT','MTEXT','DIMENSION','HATCH','ATTDEF','ATTRIB','LEADER','IMAGE'].includes(e.type)) continue;
      if (e.type === 'INSERT') {
        const block = doc.blocks?.[e.name];
        if (!block?.entities || stack.includes(e.name)) { unsupported.add('INSERT'); continue; }
        const pos = e.position || e.insertPoint || { x: 0, y: 0 };
        const base = block.position || { x: 0, y: 0 };
        const a = (e.rotation || 0) * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);
        const sx = e.xScale ?? 1, sy = e.yScale ?? 1;
        const transform: Matrix = [c*sx, s*sx, -s*sy, c*sy, pos.x - c*sx*base.x + s*sy*base.y, pos.y - s*sx*base.x - c*sy*base.y];
        draw(block.entities, mul(matrix, transform), layer, depth + 1, [...stack, e.name]);
        continue;
      }
      if (e.type === 'LINE') {
        const v = e.vertices || [e.start, e.end];
        if (!valid(v?.[0]) || !valid(v?.[1])) { unsupported.add('LINE_INVALIDA'); continue; }
        paths.push(`M ${pt(track(v[0], matrix))} L ${pt(track(v[1], matrix))}`); count++; continue;
      }
      if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        const v: Point[] = e.vertices || [];
        if (v.length < 2 || !v.every(valid)) { unsupported.add('POLILINEA_INVALIDA'); continue; }
        const closed = !!(e.shape || e.closed);
        let d = `M ${pt(track(v[0], matrix))}`;
        const total = closed ? v.length : v.length - 1;
        for (let i = 0; i < total; i++) {
          const a = v[i], b = v[(i+1) % v.length];
          const bulge = a.bulge || 0;
          if (Math.abs(bulge) < 1e-9) d += ` L ${pt(track(b, matrix))}`;
          else {
            // A bulge is tan(sweep/4). Sample the exact circular arc to
            // preserve curvature even for mirrored/rotated INSERT blocks.
            const dx = b.x-a.x, dy = b.y-a.y;
            const chord = Math.hypot(dx, dy);
            if (chord < 1e-9) continue;
            const sweep = 4*Math.atan(bulge);
            const radius = Math.abs(chord/(2*Math.sin(Math.abs(sweep)/2)));
            const midX = (a.x+b.x)/2, midY = (a.y+b.y)/2;
            const offset = chord/(2*Math.tan(sweep/2));
            const cx = midX - dy/chord*offset, cy = midY + dx/chord*offset;
            const start = Math.atan2(a.y-cy, a.x-cx);
            const steps = Math.max(8, Math.ceil(Math.abs(sweep)*24));
            for (let j=1;j<=steps;j++) {
              const t = start + sweep*j/steps;
              d += ` L ${pt(track({x:cx+radius*Math.cos(t),y:cy+radius*Math.sin(t)},matrix))}`;
            }
          }
        }
        if (closed) d += ' Z';
        paths.push(d); count++; continue;
      }
      if (e.type === 'CIRCLE' || e.type === 'ARC') {
        if (!valid(e.center) || !Number.isFinite(e.radius) || e.radius <= 0) { unsupported.add(e.type); continue; }
        // dxf-parser exposes ARC angles in radians, unlike raw DXF group codes.
        const start = e.type === 'CIRCLE' ? 0 : (e.startAngle ?? 0);
        let end = e.type === 'CIRCLE' ? 2*Math.PI : (e.endAngle ?? 2*Math.PI);
        while (end <= start) end += 2*Math.PI;
        const sweep = Math.min(2*Math.PI, end-start);
        const steps = Math.max(48, Math.ceil(sweep*36));
        let d = '';
        for (let j=0;j<=steps;j++) {
          const angle = start + sweep*j/steps;
          const p = track({x:e.center.x+e.radius*Math.cos(angle), y:e.center.y+e.radius*Math.sin(angle)},matrix);
          d += `${j===0?'M':' L'} ${pt(p)}`;
        }
        if (e.type === 'CIRCLE') d += ' Z';
        paths.push(d); count++; continue;
      }
      if (e.type === 'ELLIPSE' && valid(e.center) && valid(e.majorAxisEndPoint)) {
        const a = e.majorAxisEndPoint, ratio = e.axisRatio ?? 1;
        const start = e.startAngle ?? 0, end = e.endAngle ?? 2*Math.PI;
        const sweep = Math.max(0.001, end-start);
        let d = '';
        for(let j=0;j<=120;j++) {
          const t = start + sweep*j/120;
          const p = track({x:e.center.x+a.x*Math.cos(t)-a.y*ratio*Math.sin(t),y:e.center.y+a.y*Math.cos(t)+a.x*ratio*Math.sin(t)},matrix);
          d += `${j===0?'M':' L'} ${pt(p)}`;
        }
        paths.push(d); count++; continue;
      }
      if (e.type === 'SPLINE') {
        // Control polygon is not the actual spline. Refuse rather than fabricate a profile.
        unsupported.add('SPLINE'); continue;
      }
      unsupported.add(e.type || 'DESCONOCIDO');
    }
  };
  draw(doc.entities, ID);
  if (!count || !Number.isFinite(minX) || !Number.isFinite(maxX))
    throw new Error('No se pudo extraer geometría compatible. Revisá las capas, bloques y entidades del CAD. No se generó una pieza ficticia.');
  const width = Math.max(maxX-minX, 0.01), height = Math.max(maxY-minY, 0.01);
  const pad = Math.max(width,height)*0.025;
  const viewBox = `${fmt(minX-pad)} ${fmt(-maxY-pad)} ${fmt(width+pad*2)} ${fmt(height+pad*2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="#111111" stroke-width="${fmt(Math.max(0.01,Math.min(width,height)*0.003))}" stroke-linecap="round" stroke-linejoin="round"><path d="${paths.join(' ')}" /></svg>`;
  return { svg, bounds: {minX,minY,maxX,maxY,width,height}, layers: [...layers].map(([name, info]):CadLayer => ({name,entityCount:info.count,isDimensionOrText:info.auxiliary,visible:visible(name)})), entityCount:count, unsupportedEntities:[...unsupported] };
}
