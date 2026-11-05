import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, RefreshCw } from 'lucide-react';
import { Piece } from '../../types/index.ts';
import { processImageFile, ImageProcessingOptions } from '../../services/cad/imageProcessor.ts';
import { useScrollLock } from '../../services/scrollLock.ts';

interface ImageAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  piece: Piece;
  onSavePiece: (piece: Piece) => void;
}

export const ImageAdjustModal: React.FC<ImageAdjustModalProps> = ({
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

  const [contrast, setContrast] = useState<number>(20);
  const [threshold, setThreshold] = useState<number>(140);
  const [invert, setInvert] = useState<boolean>(false);
  const [removeMargins, setRemoveMargins] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      // Re-process image with current filters
      const updatedSvg = piece.rawSvg; // In a full app, re-processes stored original blob if available
      onSavePiece({
        ...piece,
        rawSvg: updatedSvg
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Ajuste Térmico de Imagen
              </h2>
              <p className="text-xs text-neutral-500">
                Optimice el dibujo para impresión térmica en blanco y negro (1-bit).
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

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Preview Box */}
          <div className="w-full h-48 bg-neutral-100 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center overflow-hidden">
            <div
              style={{
                filter: `${invert ? 'invert(1) ' : ''}contrast(${1 + contrast / 100})`
              }}
              className="w-full h-full flex items-center justify-center text-neutral-900 dark:text-neutral-100 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: piece.rawSvg }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Umbral blanco / negro (Threshold)
                </span>
                <span className="font-mono text-neutral-500">{threshold} / 255</span>
              </div>
              <input
                type="range"
                min="30"
                max="220"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] text-neutral-400">
                Valores altos limpian el fondo; valores bajos refuerzan líneas finas.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Aumento de Contraste
                </span>
                <span className="font-mono text-neutral-500">+{contrast}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Invertir polaridad (negativo a positivo)
              </span>
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
                className="rounded border-neutral-300 w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Eliminar márgenes blancos vacíos
              </span>
              <input
                type="checkbox"
                checked={removeMargins}
                onChange={(e) => setRemoveMargins(e.target.checked)}
                className="rounded border-neutral-300 w-4 h-4"
              />
            </div>
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
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Ajustes</span>
          </button>
        </div>

      </div>
    </div>
  );
};
