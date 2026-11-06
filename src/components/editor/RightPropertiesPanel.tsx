import React from 'react';
import { 
  Trash2, 
  Lock, 
  Unlock, 
  RotateCw, 
  Layers, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  SlidersHorizontal,
  Sliders,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { LabelTemplate, Piece, LabelElement } from '../../types/index.ts';

interface RightPropertiesPanelProps {
  template: LabelTemplate;
  piece: Piece;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (element: LabelElement) => void;
  onDeleteElement: (id: string) => void;
  onUpdatePiece: (piece: Piece) => void;
  onOpenLayersModal: () => void;
  onOpenImageModal: () => void;
}

export const RightPropertiesPanel: React.FC<RightPropertiesPanelProps> = ({
  template,
  piece,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onUpdatePiece,
  onOpenLayersModal,
  onOpenImageModal
}) => {
  const selectedElement = template.elements.find((el) => el.id === selectedElementId);

  // Alignment helpers
  const handleAlign = (type: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
    if (!selectedElement) return;

    let newX = selectedElement.xMm;
    let newY = selectedElement.yMm;

    switch (type) {
      case 'left':
        newX = template.marginMm || 1.5;
        break;
      case 'centerX':
        newX = (template.widthMm - selectedElement.widthMm) / 2;
        break;
      case 'right':
        newX = template.widthMm - selectedElement.widthMm - (template.marginMm || 1.5);
        break;
      case 'top':
        newY = template.marginMm || 1.5;
        break;
      case 'centerY':
        newY = (template.heightMm - selectedElement.heightMm) / 2;
        break;
      case 'bottom':
        newY = template.heightMm - selectedElement.heightMm - (template.marginMm || 1.5);
        break;
    }

    onUpdateElement({
      ...selectedElement,
      xMm: Number(newX.toFixed(1)),
      yMm: Number(newY.toFixed(1))
    });
  };

  const handleRotateDrawing = () => {
    if (!selectedElement || selectedElement.type !== 'drawing') return;
    const currentRot = selectedElement.rotation || 0;
    const nextRot = ((currentRot + 90) % 360) as 0 | 90 | 180 | 270;
    onUpdateElement({
      ...selectedElement,
      rotation: nextRot
    });
  };

  return (
    <div className="w-full lg:w-72 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col h-full overflow-y-auto">
      
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Elementos de la etiqueta</span>
          <span className="text-[10px] text-neutral-500">{template.elements.filter(el => el.visible !== false).length}</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1" aria-label="Seleccionar elemento para editar">
          {template.elements.filter(el => el.visible !== false).map((el, index) => (
            <button type="button" key={el.id} onClick={() => onSelectElement(el.id)}
              className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex justify-between gap-2 transition-colors ${selectedElementId === el.id ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
              <span>{index + 1}. {({ drawing: 'Dibujo', code: 'Código', name: 'Nombre', barcode: 'Código de barras', qrcode: 'QR', custom_text: 'Texto', date: 'Fecha', quantity: 'Cantidad', line: 'Línea', rect_box: 'Recuadro' } as Record<string, string>)[el.type] || el.type}</span>
              {el.locked && <Lock className="w-3 h-3 shrink-0" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">Elegí un elemento para editarlo o eliminarlo.</p>
      </div>

      {/* Panel Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {selectedElement ? 'Propiedades del Elemento' : 'Información de la Pieza'}
        </h2>
        {selectedElement && (
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Eliminar elemento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* If an element is selected */}
        {selectedElement ? (
          <>
            {/* Element Type & Lock */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 uppercase font-mono">
                {selectedElement.type.replace('_', ' ')}
              </span>
              <button
                onClick={() => onUpdateElement({ ...selectedElement, locked: !selectedElement.locked })}
                className={`p-1.5 rounded border text-xs flex items-center gap-1 ${
                  selectedElement.locked
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600'
                }`}
              >
                {selectedElement.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{selectedElement.locked ? 'Bloqueado' : 'Libre'}</span>
              </button>
            </div>

            {/* Position and Dimensions (X, Y, W, H) in mm */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-2">
                Geometría (mm)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400">X (desde izq)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElement.xMm}
                    onChange={(e) => onUpdateElement({ ...selectedElement, xMm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Y (desde arriba)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElement.yMm}
                    onChange={(e) => onUpdateElement({ ...selectedElement, yMm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Ancho</span>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    value={selectedElement.widthMm}
                    onChange={(e) => onUpdateElement({ ...selectedElement, widthMm: parseFloat(e.target.value) || 4 })}
                    className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Alto</span>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    value={selectedElement.heightMm}
                    onChange={(e) => onUpdateElement({ ...selectedElement, heightMm: parseFloat(e.target.value) || 4 })}
                    className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
              </div>
            </div>

            {/* Quick Alignment Toolbar */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1.5">
                Alineación en Etiqueta
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAlign('left')}
                  title="Alinear al margen izquierdo"
                  className="flex-1 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Izq
                </button>
                <button
                  onClick={() => handleAlign('centerX')}
                  title="Centrar horizontalmente"
                  className="flex-1 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Centro
                </button>
                <button
                  onClick={() => handleAlign('right')}
                  title="Alinear al margen derecho"
                  className="flex-1 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Der
                </button>
                <button
                  onClick={() => handleAlign('centerY')}
                  title="Centrar verticalmente"
                  className="flex-1 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Medio
                </button>
              </div>
            </div>

            {/* Type Specific Fields */}
            {(selectedElement.type === 'code' || selectedElement.type === 'name' || selectedElement.type === 'custom_text' || selectedElement.type === 'date' || selectedElement.type === 'quantity') && (
              <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                  Tipografía y Formato
                </label>

                {selectedElement.type === 'custom_text' && (
                  <div>
                    <span className="text-[10px] text-neutral-400">Texto</span>
                    <input
                      type="text"
                      value={selectedElement.customText || ''}
                      onChange={(e) => onUpdateElement({ ...selectedElement, customText: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400">Tamaño (pt)</span>
                    <input
                      type="number"
                      min="5"
                      max="36"
                      value={selectedElement.fontSizePt || 10}
                      onChange={(e) => onUpdateElement({ ...selectedElement, fontSizePt: parseFloat(e.target.value) || 10 })}
                      className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400">Estilo</span>
                    <select
                      value={selectedElement.fontWeight || 'normal'}
                      onChange={(e) => onUpdateElement({ ...selectedElement, fontWeight: e.target.value as any })}
                      className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Negrita</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400">Prefijo (opcional)</span>
                  <input
                    type="text"
                    placeholder="Ej: COD: "
                    value={selectedElement.prefix || ''}
                    onChange={(e) => onUpdateElement({ ...selectedElement, prefix: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
              </div>
            )}

            {/* Drawing Specific Properties */}
            {selectedElement.type === 'drawing' && (
              <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                  Ajustes de Dibujo Técnico
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Rotar 90°</span>
                  <button
                    onClick={handleRotateDrawing}
                    className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 text-xs"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{selectedElement.rotation || 0}°</span>
                  </button>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400">Grosor de trazo (mm)</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.1"
                    value={selectedElement.strokeWidthMm || 0.5}
                    onChange={(e) => onUpdateElement({ ...selectedElement, strokeWidthMm: parseFloat(e.target.value) })}
                    className="w-full mt-1"
                  />
                  <div className="text-[10px] font-mono text-neutral-500 text-right">
                    {selectedElement.strokeWidthMm || 0.5} mm
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Invertir blanco/negro</span>
                  <input
                    type="checkbox"
                    checked={selectedElement.invertColors || false}
                    onChange={(e) => onUpdateElement({ ...selectedElement, invertColors: e.target.checked })}
                    className="rounded border-neutral-300"
                  />
                </div>
              </div>
            )}

            {/* Barcode Specific Properties */}
            {selectedElement.type === 'barcode' && (
              <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                  Configuración Código de Barras
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Texto inferior legible</span>
                  <input
                    type="checkbox"
                    checked={selectedElement.includeTextUnderBarcode !== false}
                    onChange={(e) => onUpdateElement({ ...selectedElement, includeTextUnderBarcode: e.target.checked })}
                    className="rounded border-neutral-300"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400">Simbología</span>
                  <select
                    value={selectedElement.barcodeFormat || 'CODE128'}
                    onChange={(e) => onUpdateElement({ ...selectedElement, barcodeFormat: e.target.value as any })}
                    className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                  >
                    <option value="CODE128">Code 128 (Estándar Industrial)</option>
                    <option value="CODE39">Code 39</option>
                  </select>
                </div>
              </div>
            )}

            {/* Border / Box Specific Properties */}
            {(selectedElement.type === 'rect_box' || selectedElement.type === 'line') && (
              <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                  Grosor de Línea (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="3.0"
                  value={selectedElement.borderWidthMm || 0.4}
                  onChange={(e) => onUpdateElement({ ...selectedElement, borderWidthMm: parseFloat(e.target.value) || 0.4 })}
                  className="w-full px-2 py-1 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                />
              </div>
            )}
          </>
        ) : (
          /* Piece Global Metadata */
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-400">Código Identificador</span>
              <input
                type="text"
                value={piece.code}
                onChange={(e) => onUpdatePiece({ ...piece, code: e.target.value })}
                className="w-full mt-1 px-2.5 py-1.5 font-mono font-bold text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-400">Descripción / Nombre</span>
              <input
                type="text"
                value={piece.name || ''}
                onChange={(e) => onUpdatePiece({ ...piece, name: e.target.value })}
                className="w-full mt-1 px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-400">Material / Tratamiento</span>
              <input
                type="text"
                placeholder="Ej: Inox AISI 304, F-114..."
                value={piece.material || ''}
                onChange={(e) => onUpdatePiece({ ...piece, material: e.target.value })}
                className="w-full mt-1 px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {/* CAD Layer / Image Tool shortcuts */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">
                Filtros de Plano Original
              </label>

              {piece.fileType === 'dxf' ? (
                <button
                  onClick={onOpenLayersModal}
                  className="w-full p-2.5 text-left rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Capas y Cotas DXF</div>
                      <div className="text-[10px] text-neutral-500">Ocultar cotas, textos y márgenes</div>
                    </div>
                  </div>
                  <span className="text-neutral-400 font-mono text-xs">→</span>
                </button>
              ) : (
                <button
                  onClick={onOpenImageModal}
                  className="w-full p-2.5 text-left rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Filtro B&N y Recorte</div>
                      <div className="text-[10px] text-neutral-500">Umbral térmico y contraste</div>
                    </div>
                  </div>
                  <span className="text-neutral-400 font-mono text-xs">→</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 space-y-1">
              <div>Archivo: <span className="font-mono text-neutral-800 dark:text-neutral-200">{piece.originalFileName}</span></div>
              <div>Formato: <span className="uppercase font-mono">{piece.fileType}</span></div>
              <div>Impresiones: <span className="font-mono">{piece.printCount || 0}</span></div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
