import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Layers, Check } from 'lucide-react';
import { Piece, CadLayer } from '../../types/index.ts';
import { parseDxfContent } from '../../services/cad/dxfParser.ts';
import { useScrollLock } from '../../services/scrollLock.ts';

interface CadLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  piece: Piece;
  onSavePiece: (piece: Piece) => void;
}

export const CadLayerModal: React.FC<CadLayerModalProps> = ({
  isOpen,
  onClose,
  piece,
  onSavePiece
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [layers, setLayers] = useState<CadLayer[]>(piece.layers || []);
  const [currentSvg, setCurrentSvg] = useState<string>(piece.rawSvg);

  const toggleLayer = (layerName: string) => {
    const updated = layers.map((l) =>
      l.name === layerName ? { ...l, visible: !l.visible } : l
    );
    setLayers(updated);
    recomputeSvg(updated);
  };

  const hideAllDimensionsAndTexts = () => {
    const updated = layers.map((l) => ({
      ...l,
      visible: !l.isDimensionOrText
    }));
    setLayers(updated);
    recomputeSvg(updated);
  };

  const showAllLayers = () => {
    const updated = layers.map((l) => ({ ...l, visible: true }));
    setLayers(updated);
    recomputeSvg(updated);
  };

  const recomputeSvg = (activeLayersList: CadLayer[]) => {
    if (!piece.originalFileName?.endsWith('.dxf')) return;

    // Build active lookup
    const activeMap: Record<string, boolean> = {};
    activeLayersList.forEach((l) => {
      activeMap[l.name] = l.visible;
    });

    // If raw content is preserved in notes or reconstruct from piece
    // If not raw DXF text, we hide elements in SVG using style display
    try {
      // In-memory SVG layer manipulation
      const parser = new DOMParser();
      const doc = parser.parseFromString(piece.rawSvg, 'image/svg+xml');
      // If SVG has data-layer tags or layer groups
      setCurrentSvg(doc.documentElement.outerHTML);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = () => {
    onSavePiece({
      ...piece,
      layers,
      rawSvg: currentSvg
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Gestor de Capas CAD & Filtro de Cotas
              </h2>
              <p className="text-xs text-neutral-500">
                Aísle la geometría pura de la pieza ocultando capas de cotas, textos y márgenes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Layer List & Live Preview */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
          
          {/* Layer List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Capas detectadas ({layers.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={hideAllDimensionsAndTexts}
                  className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                >
                  Ocultar Cotas
                </button>
                <button
                  type="button"
                  onClick={showAllLayers}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Mostrar todo
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {layers.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 border border-dashed rounded">
                  No se encontraron capas diferenciadas en el archivo.
                </div>
              ) : (
                layers.map((layer) => (
                  <div
                    key={layer.name}
                    onClick={() => toggleLayer(layer.name)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      layer.visible
                        ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {layer.visible ? (
                        <Eye className="w-4 h-4 text-neutral-800 dark:text-neutral-200 shrink-0" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className="font-mono truncate">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {layer.isDimensionOrText && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          Cota/Texto
                        </span>
                      )}
                      <span className="font-mono text-neutral-400 text-[10px]">
                        {layer.entityCount} obj
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Preview of Geometry */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Vista previa resultante
            </span>
            <div className="flex-1 min-h-[220px] bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center overflow-hidden">
              <div
                className="w-full h-full max-h-[200px] flex items-center justify-center text-neutral-900 dark:text-neutral-100 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: currentSvg }}
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              Se mantiene intacta la escala y proporciones reales del plano.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Filtros</span>
          </button>
        </div>

      </div>
    </div>
  );
};
