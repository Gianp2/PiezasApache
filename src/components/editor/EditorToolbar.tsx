import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  Grid, 
  Save, 
  SlidersHorizontal, 
  Wrench, 
  Maximize2, 
  Undo2, 
  Redo2, 
  MoreVertical, 
  Check, 
  LayoutGrid 
} from 'lucide-react';
import { Piece, LabelTemplate } from '../../types/index.ts';

export type MobileEditorTab = 'canvas' | 'tools' | 'properties';

interface EditorToolbarProps {
  currentPiece: Piece;
  pieces: Piece[];
  onSelectPiece: (piece: Piece) => void;
  currentTemplate: LabelTemplate;
  onSaveTemplate: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onOpenPrintModal: () => void;
  onDownloadZpl: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  mobileTab?: MobileEditorTab;
  onMobileTabChange?: (tab: MobileEditorTab) => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  onAdaptContent?: () => void;
  onFitZoom?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentPiece,
  pieces,
  onSelectPiece,
  currentTemplate,
  onSaveTemplate,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  onOpenPrintModal,
  onDownloadZpl,
  onExportPdf,
  onExportPng,
  mobileTab = 'canvas',
  onMobileTabChange,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  onAdaptContent,
  onFitZoom
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-3 select-none">
      
      {/* Group 1: Piece & Template Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <select
          value={currentPiece.id}
          onChange={(e) => {
            const found = pieces.find((p) => p.id === e.target.value);
            if (found) onSelectPiece(found);
          }}
          className="px-2 py-1 font-mono font-bold text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 max-w-[105px] xs:max-w-[140px] sm:max-w-[190px] truncate"
          title="Seleccionar pieza técnica"
        >
          {pieces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>

        {/* Undo Action */}
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={canUndo ? "Deshacer último cambio (Ctrl+Z)" : "Nada para deshacer"}
            className="p-1.5 rounded text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Deshacer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Redo Action */}
        {onRedo && (
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={canRedo ? "Rehacer cambio (Ctrl+Y / Ctrl+Shift+Z)" : "Nada para rehacer"}
            className="p-1.5 rounded text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Rehacer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Adapt Content Button */}
        {onAdaptContent && (
          <button
            onClick={onAdaptContent}
            title="Adaptar contenido: Reorganiza automáticamente los elementos al tamaño físico disponible"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
            aria-label="Adaptar contenido"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
            <span className="hidden md:inline">Adaptar</span>
          </button>
        )}

        {/* Template save button */}
        <button
          onClick={onSaveTemplate}
          title="Guardar como nueva plantilla"
          className="p-1.5 rounded text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Guardar plantilla"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group 2: Mobile/Tablet Panel Switcher (< 1024px) */}
      {onMobileTabChange && (
        <div className="flex lg:hidden items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs shrink-0">
          <button
            type="button"
            onClick={() => onMobileTabChange('tools')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              mobileTab === 'tools'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
            title="Herramientas y medidas"
          >
            <Wrench className="w-3 h-3" />
            <span className="hidden sm:inline">Herramientas</span>
          </button>
          <button
            type="button"
            onClick={() => onMobileTabChange('canvas')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              mobileTab === 'canvas'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
            title="Ver lienzo de la etiqueta"
          >
            Lienzo
          </button>
          <button
            type="button"
            onClick={() => onMobileTabChange('properties')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              mobileTab === 'properties'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
            title="Propiedades del elemento"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Propiedades</span>
          </button>
        </div>
      )}

      {/* Group 3: Zoom & Canvas Centering Controls */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md shrink-0">
        <button
          onClick={() => onZoomChange(Math.max(0.4, Number((zoom - 0.15).toFixed(2))))}
          title="Alejar (-)"
          className="p-1 rounded hover:bg-white dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
          aria-label="Alejar"
        >
          <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <span className="px-1 font-mono tabular-nums text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-300 min-w-[32px] sm:min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => onZoomChange(Math.min(2.5, Number((zoom + 0.15).toFixed(2))))}
          title="Acercar (+)"
          className="p-1 rounded hover:bg-white dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
          aria-label="Acercar"
        >
          <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        {/* Fit to Screen Button */}
        {onFitZoom && (
          <button
            onClick={onFitZoom}
            title="Ajustar etiqueta completa a la pantalla"
            className="p-1 rounded hover:bg-white dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
            aria-label="Ajustar a pantalla"
          >
            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </div>

      {/* Group 4: Secondary Dropdown & Primary Print CTA */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        
        {/* Desktop inline exports (hidden on mobile to keep toolbar compact) */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-colors"
            title="Exportar archivo PDF con medidas reales"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={onDownloadZpl}
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] transition-colors"
            title="Descargar código ZPL II (.zpl)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ZPL</span>
          </button>
        </div>

        {/* Dropdown for Secondary Tools on Mobile / Overflow */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs transition-colors"
            title="Más opciones de vista y exportación"
            aria-expanded={dropdownOpen}
            aria-label="Más opciones"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 p-1.5 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
              
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                Exportación
              </div>
              
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onExportPdf();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Exportar PDF Vectorial</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onDownloadZpl();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>Descargar Código ZPL II</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onExportPng();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left"
              >
                <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                <span>Exportar Imagen PNG</span>
              </button>

              <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />

              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                Visualización
              </div>

              <button
                onClick={() => {
                  onToggleGrid();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left"
              >
                <span className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Cuadrícula milimétrica</span>
                </span>
                {showGrid && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />}
              </button>

              <button
                onClick={() => {
                  onToggleSnap();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left"
              >
                <span>Ajuste magnético (Snap)</span>
                {snapToGrid && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />}
              </button>
            </div>
          )}
        </div>

        {/* Primary CTA Print Button */}
        <button
          onClick={onOpenPrintModal}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-colors whitespace-nowrap min-h-[32px]"
          title="Imprimir etiqueta en Zebra o descargar"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir</span>
        </button>
      </div>

    </div>
  );
};
