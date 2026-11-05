import React from 'react';
import { 
  Barcode, 
  QrCode, 
  Type, 
  Image as ImageIcon, 
  Calendar, 
  Hash, 
  BoxSelect, 
  Minus, 
  LayoutTemplate,
  Sliders,
  LayoutGrid
} from 'lucide-react';
import { LabelTemplate, ElementType, LabelDpi, PresetLayoutId, Piece } from '../../types/index.ts';
import { adaptTemplateLayout } from '../../services/cad/layoutAdapter.ts';

interface LeftToolsPanelProps {
  template: LabelTemplate;
  piece?: Piece;
  onUpdateTemplate: (template: LabelTemplate) => void;
  onAddElement: (type: ElementType) => void;
  onApplyPresetLayout: (layoutId: PresetLayoutId) => void;
  onAdaptContent?: () => void;
}

const PRESET_SIZES = [
  { label: '30 × 20 mm', w: 30, h: 20, desc: 'Microetiquetas / cables / tornillería' },
  { label: '50 × 30 mm', w: 50, h: 30, desc: 'Piezas pequeñas / estanterías' },
  { label: '60 × 40 mm', w: 60, h: 40, desc: 'Bolsas y componentes estándar' },
  { label: '80 × 50 mm', w: 80, h: 50, desc: 'Industrial estándar (Recomendado)' },
  { label: '100 × 60 mm', w: 100, h: 60, desc: 'Ficha técnica / piezas medianas' },
  { label: '100 × 75 mm', w: 100, h: 75, desc: 'Cajas maestras y paletizado' }
];

export const LeftToolsPanel: React.FC<LeftToolsPanelProps> = ({
  template,
  piece,
  onUpdateTemplate,
  onAddElement,
  onApplyPresetLayout,
  onAdaptContent
}) => {
  const currentMode = template.layoutMode || 'auto';

  const handleSizeChange = (w: number, h: number) => {
    const adapted = adaptTemplateLayout(template, w, h, { mode: currentMode, piece });
    onUpdateTemplate(adapted);
  };

  const handleOrientationToggle = () => {
    const newW = template.heightMm;
    const newH = template.widthMm;
    const adapted = adaptTemplateLayout(template, newW, newH, { mode: currentMode, piece });
    onUpdateTemplate(adapted);
  };

  const handleModeChange = (mode: 'auto' | 'proportional' | 'manual') => {
    onUpdateTemplate({
      ...template,
      layoutMode: mode
    });
  };

  const handleAdaptNow = () => {
    if (onAdaptContent) {
      onAdaptContent();
    } else {
      const adapted = adaptTemplateLayout(template, template.widthMm, template.heightMm, {
        mode: 'auto',
        forceAdapt: true,
        piece
      });
      onUpdateTemplate(adapted);
    }
  };

  const handleDpiChange = (dpi: LabelDpi) => {
    onUpdateTemplate({
      ...template,
      dpi
    });
  };

  return (
    <div className="w-full lg:w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full overflow-y-auto">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Herramientas de Etiqueta
        </h2>
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* Section 1: Add Elements */}
        <div>
          <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block mb-2.5">
            Añadir Elemento
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => onAddElement('code')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Hash className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Código Pieza</span>
            </button>

            <button
              onClick={() => onAddElement('drawing')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Dibujo CAD</span>
            </button>

            <button
              onClick={() => onAddElement('name')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Type className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Nombre/Desc</span>
            </button>

            <button
              onClick={() => onAddElement('barcode')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Barcode className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Código Barras</span>
            </button>

            <button
              onClick={() => onAddElement('qrcode')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Código QR</span>
            </button>

            <button
              onClick={() => onAddElement('custom_text')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Type className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Texto Libre</span>
            </button>

            <button
              onClick={() => onAddElement('date')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Fecha Auto</span>
            </button>

            <button
              onClick={() => onAddElement('quantity')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Hash className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Cantidad</span>
            </button>

            <button
              onClick={() => onAddElement('line')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <Minus className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Línea Divisoria</span>
            </button>

            <button
              onClick={() => onAddElement('rect_box')}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
            >
              <BoxSelect className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">Recuadro</span>
            </button>
          </div>
        </div>

        {/* Section 2: Preset Layouts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Distribuciones Rápidas
            </label>
            <LayoutTemplate className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="space-y-1 text-xs">
            <button
              onClick={() => onApplyPresetLayout('code_top_drawing_bottom')}
              className="w-full text-left p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">1. Código arriba, dibujo abajo</div>
              <div className="text-[11px] text-neutral-500">Distribución clásica de rotulación</div>
            </button>

            <button
              onClick={() => onApplyPresetLayout('drawing_top_code_bottom')}
              className="w-full text-left p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">2. Dibujo arriba, código abajo</div>
              <div className="text-[11px] text-neutral-500">Prioridad visual al contorno</div>
            </button>

            <button
              onClick={() => onApplyPresetLayout('code_left_drawing_right')}
              className="w-full text-left p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">3. Código izq, dibujo derecha</div>
              <div className="text-[11px] text-neutral-500">Ideal para etiquetas apaisadas</div>
            </button>

            <button
              onClick={() => onApplyPresetLayout('drawing_left_code_right')}
              className="w-full text-left p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">4. Dibujo izq, código derecha</div>
              <div className="text-[11px] text-neutral-500">Ficha técnica y trazabilidad</div>
            </button>
          </div>
        </div>

        {/* Section 3: Label Dimensions & Resolution */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Medidas de Etiqueta
            </label>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">
              Modo {currentMode}
            </span>
          </div>

          {/* Adapt Content Action Button */}
          <button
            type="button"
            onClick={handleAdaptNow}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-colors group"
            title="Reorganizar y adaptar automáticamente los elementos al espacio disponible"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:scale-110 transition-transform" />
            <span>Adaptar contenido</span>
          </button>

          {/* 3-Mode Selector: Auto, Proportional, Manual */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs mb-3">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={`py-1.5 px-1.5 rounded-md text-[11px] text-center transition-colors ${
                currentMode === 'auto'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title="Automático: redistribuye de forma inteligente según el tamaño disponible"
            >
              Automático
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('proportional')}
              className={`py-1.5 px-1.5 rounded-md text-[11px] text-center transition-colors ${
                currentMode === 'proportional'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title="Proporcional: escala posiciones y dimensiones respecto al tamaño anterior"
            >
              Proporcional
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={`py-1.5 px-1.5 rounded-md text-[11px] text-center transition-colors ${
                currentMode === 'manual'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title="Manual: conserva el control individual permitiendo mover y redimensionar libremente"
            >
              Manual
            </button>
          </div>

          {/* Standard Presets */}
          <div className="space-y-1 mb-3">
            {PRESET_SIZES.map((size) => {
              const isSelected = template.widthMm === size.w && template.heightMm === size.h;
              return (
                <button
                  key={size.label}
                  onClick={() => handleSizeChange(size.w, size.h)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>{size.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-neutral-400'}`}>
                    {size.w}×{size.h}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Size Steppers */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <span className="text-[11px] text-neutral-500 block mb-1">Ancho (mm)</span>
              <input
                type="number"
                min="20"
                max="150"
                value={template.widthMm}
                onChange={(e) => handleSizeChange(Number(e.target.value) || 20, template.heightMm)}
                className="w-full px-2 py-1 font-mono text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 block mb-1">Alto (mm)</span>
              <input
                type="number"
                min="15"
                max="150"
                value={template.heightMm}
                onChange={(e) => handleSizeChange(template.widthMm, Number(e.target.value) || 15)}
                className="w-full px-2 py-1 font-mono text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Orientation & DPI */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleOrientationToggle}
              className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-center text-[11px] font-medium"
            >
              Orientación: {template.widthMm >= template.heightMm ? 'Horizontal' : 'Vertical'}
            </button>

            <select
              value={template.dpi || 203}
              onChange={(e) => handleDpiChange(Number(e.target.value) as LabelDpi)}
              className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[11px] font-mono"
            >
              <option value="203">203 DPI (8 d/mm)</option>
              <option value="300">300 DPI (12 d/mm)</option>
              <option value="600">600 DPI (24 d/mm)</option>
            </select>
          </div>
        </div>

      </div>

    </div>
  );
};
