import React, { useRef, useState, useEffect } from 'react';
import { AlertTriangle, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { LabelTemplate, Piece, LabelElement, LayoutWarning } from '../../types/index.ts';

interface LabelCanvasProps {
  template: LabelTemplate;
  piece: Piece;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (element: LabelElement) => void;
  zoom: number; // e.g. 1.25 = 125%
  onZoomChange?: (zoom: number) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  warnings?: LayoutWarning[];
  onAdaptContent?: () => void;
  onHideOptionalElements?: () => void;
  onResizeLabel?: (w: number, h: number) => void;
}

export const LabelCanvas: React.FC<LabelCanvasProps> = ({
  template,
  piece,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  zoom,
  onZoomChange,
  showGrid,
  snapToGrid,
  warnings,
  onAdaptContent,
  onHideOptionalElements,
  onResizeLabel
}) => {
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'se' | 'sw' | 'ne'
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(zoom);

  // 1 mm in screen pixels at zoom 1.0 (96 DPI screen standard: 1 mm ~ 3.7795 px)
  const pxPerMm = 3.7795 * zoom;
  const canvasWidthPx = template.widthMm * pxPerMm;
  const canvasHeightPx = template.heightMm * pxPerMm;

  const selectedElement = template.elements.find((el) => el.id === selectedElementId);

  // Handle Mouse Drag Start
  const handleMouseDown = (e: React.MouseEvent, el: LabelElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    if (el.locked) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: el.xMm, y: el.yMm, w: el.widthMm, h: el.heightMm });
  };

  // Handle Touch Drag Start
  const handleTouchStart = (e: React.TouchEvent, el: LabelElement) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      onSelectElement(el.id);
      if (el.locked) return;

      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setElementStart({ x: el.xMm, y: el.yMm, w: el.widthMm, h: el.heightMm });
    }
  };

  // Handle Resize Handle Mouse Start
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;

    setIsResizing(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({
      x: selectedElement.xMm,
      y: selectedElement.yMm,
      w: selectedElement.widthMm,
      h: selectedElement.heightMm
    });
  };

  // Handle Resize Handle Touch Start
  const handleResizeTouchStart = (e: React.TouchEvent, handle: string) => {
    if (e.touches.length === 1 && selectedElement && !selectedElement.locked) {
      e.stopPropagation();
      const touch = e.touches[0];
      setIsResizing(handle);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setElementStart({
        x: selectedElement.xMm,
        y: selectedElement.yMm,
        w: selectedElement.widthMm,
        h: selectedElement.heightMm
      });
    }
  };

  // Window-level mouse move and up listeners
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!selectedElement) return;

      const deltaX = (clientX - dragStart.x) / pxPerMm;
      const deltaY = (clientY - dragStart.y) / pxPerMm;

      if (isDragging) {
        let newX = elementStart.x + deltaX;
        let newY = elementStart.y + deltaY;

        if (snapToGrid) {
          newX = Math.round(newX);
          newY = Math.round(newY);
        }

        // Clamp inside label boundaries
        newX = Math.max(0, Math.min(template.widthMm - selectedElement.widthMm, newX));
        newY = Math.max(0, Math.min(template.heightMm - selectedElement.heightMm, newY));

        onUpdateElement({
          ...selectedElement,
          xMm: Number(newX.toFixed(2)),
          yMm: Number(newY.toFixed(2))
        });
      } else if (isResizing) {
        let newW = elementStart.w;
        let newH = elementStart.h;
        let newX = elementStart.x;
        let newY = elementStart.y;

        if (isResizing === 'se') {
          newW = Math.max(4, elementStart.w + deltaX);
          newH = Math.max(4, elementStart.h + deltaY);
        } else if (isResizing === 'sw') {
          newW = Math.max(4, elementStart.w - deltaX);
          newH = Math.max(4, elementStart.h + deltaY);
          newX = elementStart.x + (elementStart.w - newW);
        } else if (isResizing === 'ne') {
          newW = Math.max(4, elementStart.w + deltaX);
          newH = Math.max(4, elementStart.h - deltaY);
          newY = elementStart.y + (elementStart.h - newH);
        }

        if (snapToGrid) {
          newW = Math.round(newW);
          newH = Math.round(newH);
        }

        // Ensure resizing stays within label bounds
        newW = Math.min(template.widthMm - newX, Math.max(4, newW));
        newH = Math.min(template.heightMm - newY, Math.max(4, newH));

        onUpdateElement({
          ...selectedElement,
          xMm: Number(newX.toFixed(2)),
          yMm: Number(newY.toFixed(2)),
          widthMm: Number(newW.toFixed(2)),
          heightMm: Number(newH.toFixed(2))
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, isResizing, dragStart, elementStart, selectedElement, pxPerMm, snapToGrid, template, onUpdateElement]);

  // Touch Pinch-to-Zoom on Container
  const handleContainerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && onZoomChange) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDist(dist);
      setInitialPinchZoom(zoom);
    }
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist && onZoomChange) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDist;
      const targetZoom = Math.max(0.4, Math.min(2.5, Number((initialPinchZoom * ratio).toFixed(2))));
      onZoomChange(targetZoom);
    }
  };

  const handleContainerTouchEnd = () => {
    setInitialPinchDist(null);
  };

  // Render Top Ruler Marks
  const renderTopRuler = () => {
    const marks: React.ReactNode[] = [];
    for (let mm = 0; mm <= template.widthMm; mm += 5) {
      const isMajor = mm % 10 === 0;
      marks.push(
        <div
          key={mm}
          className="absolute top-0 flex flex-col items-center pointer-events-none"
          style={{ left: `${mm * pxPerMm}px` }}
        >
          <div className={`w-[1px] bg-neutral-400 dark:bg-neutral-600 ${isMajor ? 'h-3' : 'h-1.5'}`} />
          {isMajor && (
            <span className="text-[8px] sm:text-[9px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5 select-none -translate-x-1/2">
              {mm}
            </span>
          )}
        </div>
      );
    }
    return marks;
  };

  // Render Left Ruler Marks
  const renderLeftRuler = () => {
    const marks: React.ReactNode[] = [];
    for (let mm = 0; mm <= template.heightMm; mm += 5) {
      const isMajor = mm % 10 === 0;
      marks.push(
        <div
          key={mm}
          className="absolute left-0 flex items-center pointer-events-none"
          style={{ top: `${mm * pxPerMm}px` }}
        >
          <div className={`h-[1px] bg-neutral-400 dark:bg-neutral-600 ${isMajor ? 'w-3' : 'w-1.5'}`} />
          {isMajor && (
            <span className="text-[8px] sm:text-[9px] font-mono text-neutral-500 dark:text-neutral-400 ml-1 select-none">
              {mm}
            </span>
          )}
        </div>
      );
    }
    return marks;
  };

  return (
    <div 
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
      className="relative flex-1 w-full h-full bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto select-none"
    >
      {/* Physical Space & Feasibility Warning Banner */}
      {warnings && warnings.length > 0 && (
        <div className="w-full max-w-xl mb-3 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl shadow-xs text-xs text-amber-900 dark:text-amber-200 z-20 shrink-0">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="truncate">{warnings[0].title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 rounded font-mono">
                    {warnings.length} {warnings.length === 1 ? 'aviso' : 'avisos'}
                  </span>
                  {warnings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowAllWarnings(!showAllWarnings)}
                      className="p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-800/60 rounded text-amber-900 dark:text-amber-200 transition-colors"
                      title={showAllWarnings ? 'Ocultar detalles' : 'Ver todos los avisos'}
                    >
                      {showAllWarnings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                {warnings[0].message}
              </p>

              {/* Suggestions & Action Buttons */}
              <div className="text-[11px] font-medium text-amber-900 dark:text-amber-200 mt-2 flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-amber-200/80 dark:border-amber-800/80">
                <span className="italic text-neutral-600 dark:text-neutral-400">
                  💡 {warnings[0].suggestion}
                </span>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Action 1: Hide optional secondary fields */}
                  {onHideOptionalElements && (warnings.some((w) => w.category === 'overcrowding' || w.category === 'collision') || template.widthMm <= 35) && (
                    <button
                      type="button"
                      onClick={onHideOptionalElements}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-[10px] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      title="Ocultar campos secundarios (fecha, cantidad, descripción) para despejar el código y dibujo"
                    >
                      Ocultar opcionales
                    </button>
                  )}

                  {/* Action 2: Resize to 50x30 mm */}
                  {onResizeLabel && template.widthMm <= 35 && (
                    <button
                      type="button"
                      onClick={() => onResizeLabel(50, 30)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-[10px] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      title="Cambiar a etiqueta estándar de 50 × 30 mm"
                    >
                      Ampliar a 50×30 mm
                    </button>
                  )}

                  {/* Action 3: Adapt content */}
                  {onAdaptContent && (
                    <button
                      type="button"
                      onClick={onAdaptContent}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-md font-semibold text-[10px] hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
                      title="Reorganizar automáticamente los elementos en zonas no superpuestas"
                    >
                      <LayoutGrid className="w-3 h-3" />
                      Adaptar contenido
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details for multiple warnings */}
              {showAllWarnings && warnings.length > 1 && (
                <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-800 space-y-1.5">
                  {warnings.slice(1).map((w) => (
                    <div key={w.id} className="text-[10px] text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">• {w.title}:</span> {w.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Self-contained Rulers + Label Sheet Container */}
      <div className="relative flex flex-col items-center m-auto">
        
        {/* Rulers + Canvas aligned wrapper */}
        <div className="relative pt-6 pl-7">
          
          {/* Top Horizontal Ruler */}
          <div 
            className="absolute top-0 left-7 h-6 border-b border-neutral-300 dark:border-neutral-700 bg-neutral-200/70 dark:bg-neutral-800/70 overflow-visible"
            style={{ width: `${canvasWidthPx}px` }}
          >
            {renderTopRuler()}
          </div>

          {/* Left Vertical Ruler */}
          <div 
            className="absolute top-6 left-0 w-7 border-r border-neutral-300 dark:border-neutral-700 bg-neutral-200/70 dark:bg-neutral-800/70 overflow-visible"
            style={{ height: `${canvasHeightPx}px` }}
          >
            {renderLeftRuler()}
          </div>

          {/* The Thermal Label Physical Sheet */}
          <div
            id="label-editor-canvas"
            style={{
              width: `${canvasWidthPx}px`,
              height: `${canvasHeightPx}px`,
              backgroundImage: showGrid
                ? `radial-gradient(circle, rgba(0,0,0,0.16) 1px, transparent 1px)`
                : undefined,
              backgroundSize: `${10 * pxPerMm}px ${10 * pxPerMm}px`
            }}
            className="relative bg-white shadow-xl border border-neutral-300 dark:border-neutral-600 rounded-xs overflow-hidden"
          >
            {/* Safety Margin boundary guide (dashed line) */}
            <div
              className="absolute border border-dashed border-red-300/80 pointer-events-none"
              style={{
                top: `${(template.marginMm || 1.5) * pxPerMm}px`,
                left: `${(template.marginMm || 1.5) * pxPerMm}px`,
                right: `${(template.marginMm || 1.5) * pxPerMm}px`,
                bottom: `${(template.marginMm || 1.5) * pxPerMm}px`
              }}
            />

            {/* Render Elements */}
            {template.elements.map((el) => {
              if (el.visible === false) return null;

              const isSelected = el.id === selectedElementId;
              const left = el.xMm * pxPerMm;
              const top = el.yMm * pxPerMm;
              const width = el.widthMm * pxPerMm;
              const height = el.heightMm * pxPerMm;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el)}
                  onTouchStart={(e) => handleTouchStart(e, el)}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    zIndex: el.zIndex || 1
                  }}
                  className={`absolute group cursor-move select-none touch-none ${
                    isSelected
                      ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-1 z-20'
                      : 'hover:ring-1 hover:ring-neutral-400'
                  }`}
                >
                  {/* Element Content Render */}
                  <div className="w-full h-full flex flex-col justify-center overflow-hidden pointer-events-none">
                    {renderElementContent(el, piece, width, height)}
                  </div>

                  {/* Resize Handles (Visible when selected & unlocked) */}
                  {isSelected && !el.locked && (
                    <>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                        onTouchStart={(e) => handleResizeTouchStart(e, 'se')}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-neutral-900 dark:bg-neutral-100 border-2 border-white dark:border-neutral-900 rounded-xs cursor-se-resize z-30 touch-none"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                        onTouchStart={(e) => handleResizeTouchStart(e, 'sw')}
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-neutral-900 dark:bg-neutral-100 border-2 border-white dark:border-neutral-900 rounded-xs cursor-sw-resize z-30 touch-none"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                        onTouchStart={(e) => handleResizeTouchStart(e, 'ne')}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-neutral-900 dark:bg-neutral-100 border-2 border-white dark:border-neutral-900 rounded-xs cursor-ne-resize z-30 touch-none"
                      />
                    </>
                  )}

                  {/* Locked Indicator */}
                  {el.locked && isSelected && (
                    <div className="absolute top-0.5 right-0.5 text-[9px] bg-neutral-800 text-white px-1 rounded-xs">
                      🔒
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Dimension Label (e.g. "80 × 50 mm @ 203 DPI · Visualización 125%") */}
        <div className="mt-2.5 text-center text-[11px] sm:text-xs font-mono text-neutral-500 dark:text-neutral-400">
          {template.widthMm} × {template.heightMm} mm · {template.dpi || 203} DPI · Visualización {Math.round(zoom * 100)}%
        </div>

      </div>
    </div>
  );
};

function renderElementContent(el: LabelElement, piece: Piece, wPx: number, hPx: number) {
  switch (el.type) {
    case 'code':
      return (
        <div
          style={{
            fontSize: `${(el.fontSizePt || 14) * 1.3}px`,
            fontWeight: el.fontWeight === 'bold' ? 700 : 400,
            textAlign: el.textAlign || 'left'
          }}
          className="font-mono text-neutral-950 truncate px-0.5 leading-tight tracking-tight select-none"
          title={`${el.prefix || ''}${piece.code}${el.suffix || ''}`}
        >
          {el.prefix || ''}{piece.code}{el.suffix || ''}
        </div>
      );

    case 'name':
      return (
        <div
          style={{
            fontSize: `${(el.fontSizePt || 9) * 1.3}px`,
            fontWeight: el.fontWeight === 'bold' ? 700 : 500,
            textAlign: el.textAlign || 'left'
          }}
          className="text-neutral-800 truncate px-0.5 leading-tight select-none"
          title={`${el.prefix || ''}${piece.name || 'Descripción'}${el.suffix || ''}`}
        >
          {el.prefix || ''}{piece.name || 'Descripción de Pieza'}{el.suffix || ''}
        </div>
      );

    case 'custom_text':
      return (
        <div
          style={{
            fontSize: `${(el.fontSizePt || 8) * 1.3}px`,
            textAlign: el.textAlign || 'left'
          }}
          className="text-neutral-700 truncate px-0.5 leading-tight select-none"
        >
          {el.customText || 'Texto personalizado'}
        </div>
      );

    case 'drawing':
      return (
        <div
          style={{
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined
          }}
          className="w-full h-full flex items-center justify-center p-0.5 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain select-none"
          dangerouslySetInnerHTML={{ __html: piece.rawSvg }}
        />
      );

    case 'barcode':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
          {/* Simulated 1D Barcode with vector lines */}
          <div className="flex-1 w-full flex items-stretch justify-center gap-[2px] px-1 py-0.5 bg-white">
            {Array.from({ length: Math.min(38, Math.floor(wPx / 4)) }).map((_, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: (i % 3 === 0 || i % 7 === 0) ? '3px' : '1.5px'
                }}
              />
            ))}
          </div>
          {el.includeTextUnderBarcode !== false && (
            <span className="text-[9px] font-mono tracking-wider font-semibold text-neutral-900 truncate">
              {piece.code}
            </span>
          )}
        </div>
      );

    case 'qrcode':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-0.5 bg-white border border-neutral-300">
          {/* Schematic QR Code representation */}
          <div className="w-full h-full grid grid-cols-5 gap-0.5 p-0.5">
            <div className="bg-black col-span-2 row-span-2 border-2 border-white" />
            <div className="bg-black" />
            <div className="bg-black col-span-2 row-span-2 border-2 border-white" />
            <div className="bg-transparent" />
            <div className="bg-black" />
            <div className="bg-transparent" />
            <div className="bg-black col-span-2 row-span-2 border-2 border-white" />
            <div className="bg-black" />
            <div className="bg-black col-span-2" />
          </div>
        </div>
      );

    case 'date':
      return (
        <div
          style={{ fontSize: `${(el.fontSizePt || 7) * 1.3}px` }}
          className="font-mono text-neutral-600 truncate px-0.5"
        >
          {new Date().toISOString().slice(0, 10)}
        </div>
      );

    case 'quantity':
      return (
        <div
          style={{ fontSize: `${(el.fontSizePt || 8) * 1.3}px` }}
          className="font-mono font-bold text-neutral-700 truncate px-0.5"
        >
          {el.prefix || 'CANT:'} {el.customText || '1 UN'}
        </div>
      );

    case 'line':
      return (
        <div className="w-full h-full flex items-center">
          <div className="w-full h-[1.5px] bg-neutral-900" />
        </div>
      );

    case 'rect_box':
      return (
        <div className="w-full h-full border border-neutral-900 rounded-2xs pointer-events-none" />
      );

    default:
      return null;
  }
}
