import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LabelTemplate, Piece, LabelElement, ElementType, PresetLayoutId } from '../../types/index.ts';
import { LeftToolsPanel } from './LeftToolsPanel.tsx';
import { LabelCanvas } from './LabelCanvas.tsx';
import { RightPropertiesPanel } from './RightPropertiesPanel.tsx';
import { EditorToolbar, MobileEditorTab } from './EditorToolbar.tsx';
import { CadLayerModal } from './CadLayerModal.tsx';
import { ImageAdjustModal } from './ImageAdjustModal.tsx';
import { useScrollLock } from '../../services/scrollLock.ts';
import { adaptTemplateLayout, validateLabelLayout } from '../../services/cad/layoutAdapter.ts';

interface EditorViewProps {
  currentPiece: Piece;
  pieces: Piece[];
  onSelectPiece: (piece: Piece) => void;
  currentTemplate: LabelTemplate;
  onUpdateTemplate: (template: LabelTemplate) => void;
  onSaveTemplateAsNew: (template: LabelTemplate) => void;
  onUpdatePiece: (piece: Piece) => void;
  onOpenPrintModal: () => void;
  onDownloadZpl: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  currentPiece,
  pieces,
  onSelectPiece,
  currentTemplate,
  onUpdateTemplate,
  onSaveTemplateAsNew,
  onUpdatePiece,
  onOpenPrintModal,
  onDownloadZpl,
  onExportPdf,
  onExportPng
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileEditorTab>('canvas');
  const [zoom, setZoom] = useState<number>(1.25);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<LabelTemplate[]>([]);
  const [redoStack, setRedoStack] = useState<LabelTemplate[]>([]);

  // Modals
  const [isLayersModalOpen, setIsLayersModalOpen] = useState<boolean>(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isSaveTemplatePromptOpen, setIsSaveTemplatePromptOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');

  useScrollLock(isSaveTemplatePromptOpen);

  // Auto-fit Zoom calculation
  const calculateFitZoom = useCallback((wMm: number, hMm: number) => {
    if (typeof window === 'undefined') return 1.0;
    const isMobile = window.innerWidth < 1024;
    const availableW = isMobile ? window.innerWidth - 32 : window.innerWidth - 600;
    const availableH = isMobile ? window.innerHeight - 180 : window.innerHeight - 160;
    const neededW = wMm * 3.7795 + 50;
    const neededH = hMm * 3.7795 + 50;
    const scale = Math.min(availableW / neededW, availableH / neededH);
    return Math.max(0.4, Math.min(2.0, Number((Math.floor(scale * 20) / 20).toFixed(2))));
  }, []);

  // Auto-fit label on mobile mount or when dimensions change
  useEffect(() => {
    if (window.innerWidth < 1024) {
      const fit = calculateFitZoom(currentTemplate.widthMm, currentTemplate.heightMm);
      setZoom(fit);
    }
  }, [currentTemplate.widthMm, currentTemplate.heightMm, calculateFitZoom]);

  // Commit template change with history record
  const commitTemplateChange = useCallback((newTemplate: LabelTemplate) => {
    setHistoryStack((prev) => [...prev.slice(-25), currentTemplate]);
    setRedoStack([]);
    onUpdateTemplate(newTemplate);
  }, [currentTemplate, onUpdateTemplate]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, currentTemplate]);
    onUpdateTemplate(previous);
  }, [historyStack, currentTemplate, onUpdateTemplate]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setHistoryStack((prev) => [...prev, currentTemplate]);
    onUpdateTemplate(next);
  }, [redoStack, currentTemplate, onUpdateTemplate]);

  // Intelligent content adaptation action
  const handleAdaptContent = useCallback(() => {
    const adapted = adaptTemplateLayout(currentTemplate, currentTemplate.widthMm, currentTemplate.heightMm, {
      mode: 'auto',
      forceAdapt: true,
      piece: currentPiece
    });
    commitTemplateChange(adapted);
  }, [currentTemplate, currentPiece, commitTemplateChange]);

  // Hide optional/secondary elements to resolve small-label congestion
  const handleHideOptionalElements = useCallback(() => {
    const updated = currentTemplate.elements.map((el) => {
      if (
        el.type === 'date' || 
        el.type === 'quantity' || 
        el.type === 'name' || 
        el.type === 'custom_text' || 
        el.type === 'line'
      ) {
        return { ...el, visible: false };
      }
      return el;
    });

    const adapted = adaptTemplateLayout(
      { ...currentTemplate, elements: updated },
      currentTemplate.widthMm,
      currentTemplate.heightMm,
      { mode: 'auto', forceAdapt: true, piece: currentPiece }
    );
    commitTemplateChange(adapted);
  }, [currentTemplate, currentPiece, commitTemplateChange]);

  // Quick resize handler for warning resolution (e.g. 50x30 mm)
  const handleResizeLabel = useCallback((w: number, h: number) => {
    const adapted = adaptTemplateLayout(currentTemplate, w, h, {
      mode: currentTemplate.layoutMode || 'auto',
      piece: currentPiece
    });
    commitTemplateChange(adapted);
  }, [currentTemplate, currentPiece, commitTemplateChange]);

  // Layout warnings validator
  const layoutWarnings = useMemo(() => {
    return validateLabelLayout(currentTemplate, currentPiece);
  }, [currentTemplate, currentPiece]);

  // Keyboard shortcut listener (Ctrl+Z: Undo, Ctrl+Y / Ctrl+Shift+Z: Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Close save template on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSaveTemplatePromptOpen) {
        setIsSaveTemplatePromptOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaveTemplatePromptOpen]);

  // Update a single element in template
  const handleUpdateElement = (updatedElement: LabelElement) => {
    const updatedElements = currentTemplate.elements.map((el) =>
      el.id === updatedElement.id ? updatedElement : el
    );
    commitTemplateChange({
      ...currentTemplate,
      elements: updatedElements
    });
  };

  // Delete an element
  const handleDeleteElement = (id: string) => {
    const updatedElements = currentTemplate.elements.filter((el) => el.id !== id);
    commitTemplateChange({
      ...currentTemplate,
      elements: updatedElements
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  // Add new element
  const handleAddElement = (type: ElementType) => {
    const newId = `el-${type}-${Date.now()}`;
    const margin = currentTemplate.marginMm || 2;
    let newElement: LabelElement;

    switch (type) {
      case 'code':
        newElement = {
          id: newId,
          type: 'code',
          xMm: margin + 2,
          yMm: margin + 2,
          widthMm: 45,
          heightMm: 7,
          fontSizePt: 13,
          fontWeight: 'bold',
          textAlign: 'left'
        };
        break;

      case 'drawing':
        newElement = {
          id: newId,
          type: 'drawing',
          xMm: margin + 2,
          yMm: margin + 12,
          widthMm: 35,
          heightMm: 28,
          strokeWidthMm: 0.5,
          rotation: 0
        };
        break;

      case 'name':
        newElement = {
          id: newId,
          type: 'name',
          xMm: margin + 2,
          yMm: margin + 9,
          widthMm: 45,
          heightMm: 5,
          fontSizePt: 8,
          textAlign: 'left'
        };
        break;

      case 'barcode':
        newElement = {
          id: newId,
          type: 'barcode',
          xMm: margin + 35,
          yMm: margin + 18,
          widthMm: 35,
          heightMm: 16,
          barcodeFormat: 'CODE128',
          includeTextUnderBarcode: true
        };
        break;

      case 'qrcode':
        newElement = {
          id: newId,
          type: 'qrcode',
          xMm: currentTemplate.widthMm - margin - 16,
          yMm: margin + 2,
          widthMm: 14,
          heightMm: 14,
          qrErrorCorrection: 'M'
        };
        break;

      case 'custom_text':
        newElement = {
          id: newId,
          type: 'custom_text',
          xMm: margin + 2,
          yMm: currentTemplate.heightMm - margin - 8,
          widthMm: 40,
          heightMm: 5,
          customText: 'TEXTO PERSONALIZADO',
          fontSizePt: 8,
          fontWeight: 'normal'
        };
        break;

      case 'date':
        newElement = {
          id: newId,
          type: 'date',
          xMm: margin + 2,
          yMm: currentTemplate.heightMm - margin - 6,
          widthMm: 25,
          heightMm: 5,
          fontSizePt: 7,
          prefix: 'FECHA: '
        };
        break;

      case 'quantity':
        newElement = {
          id: newId,
          type: 'quantity',
          xMm: currentTemplate.widthMm - margin - 25,
          yMm: currentTemplate.heightMm - margin - 6,
          widthMm: 24,
          heightMm: 5,
          fontSizePt: 8,
          fontWeight: 'bold',
          prefix: 'CANT: 1 UDS'
        };
        break;

      case 'line':
        newElement = {
          id: newId,
          type: 'line',
          xMm: margin,
          yMm: margin + 12,
          widthMm: currentTemplate.widthMm - margin * 2,
          heightMm: 1,
          borderWidthMm: 0.4
        };
        break;

      case 'rect_box':
        newElement = {
          id: newId,
          type: 'rect_box',
          xMm: margin,
          yMm: margin,
          widthMm: currentTemplate.widthMm - margin * 2,
          heightMm: currentTemplate.heightMm - margin * 2,
          borderWidthMm: 0.4
        };
        break;

      default:
        return;
    }

    onUpdateTemplate({
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement]
    });
    setSelectedElementId(newId);
  };

  // Apply one of the 5 preset distributions
  const handleApplyPresetLayout = (layoutId: PresetLayoutId) => {
    const W = currentTemplate.widthMm;
    const H = currentTemplate.heightMm;
    const m = currentTemplate.marginMm || 2;

    let newElements: LabelElement[] = [];

    switch (layoutId) {
      case 'code_top_drawing_bottom':
        newElements = [
          {
            id: `el-code-${Date.now()}`,
            type: 'code',
            xMm: m + 1,
            yMm: m + 1,
            widthMm: W - m * 2 - 20,
            heightMm: 7,
            fontSizePt: 13,
            fontWeight: 'bold'
          },
          {
            id: `el-name-${Date.now()}`,
            type: 'name',
            xMm: m + 1,
            yMm: m + 8,
            widthMm: W - m * 2 - 20,
            heightMm: 5,
            fontSizePt: 8
          },
          {
            id: `el-qr-${Date.now()}`,
            type: 'qrcode',
            xMm: W - m - 16,
            yMm: m + 1,
            widthMm: 15,
            heightMm: 15
          },
          {
            id: `el-line-${Date.now()}`,
            type: 'line',
            xMm: m,
            yMm: m + 15,
            widthMm: W - m * 2,
            heightMm: 1,
            borderWidthMm: 0.4
          },
          {
            id: `el-drawing-${Date.now()}`,
            type: 'drawing',
            xMm: m + 2,
            yMm: m + 17,
            widthMm: (W - m * 2) * 0.48,
            heightMm: H - m * 2 - 19,
            strokeWidthMm: 0.5
          },
          {
            id: `el-barcode-${Date.now()}`,
            type: 'barcode',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: m + 18,
            widthMm: (W - m * 2) * 0.46,
            heightMm: H - m * 2 - 26,
            barcodeFormat: 'CODE128',
            includeTextUnderBarcode: true
          },
          {
            id: `el-date-${Date.now()}`,
            type: 'date',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: H - m - 6,
            widthMm: 25,
            heightMm: 5,
            fontSizePt: 7,
            prefix: 'FECHA: '
          }
        ];
        break;

      case 'drawing_top_code_bottom':
        newElements = [
          {
            id: `el-drawing-${Date.now()}`,
            type: 'drawing',
            xMm: m + 2,
            yMm: m + 2,
            widthMm: W - m * 2 - 4,
            heightMm: H * 0.56,
            strokeWidthMm: 0.5
          },
          {
            id: `el-line-${Date.now()}`,
            type: 'line',
            xMm: m,
            yMm: H * 0.58 + m,
            widthMm: W - m * 2,
            heightMm: 1,
            borderWidthMm: 0.4
          },
          {
            id: `el-code-${Date.now()}`,
            type: 'code',
            xMm: m + 2,
            yMm: H * 0.62 + m,
            widthMm: W - m * 2 - 20,
            heightMm: 7,
            fontSizePt: 13,
            fontWeight: 'bold'
          },
          {
            id: `el-name-${Date.now()}`,
            type: 'name',
            xMm: m + 2,
            yMm: H * 0.76 + m,
            widthMm: W - m * 2 - 20,
            heightMm: 5,
            fontSizePt: 8
          },
          {
            id: `el-qr-${Date.now()}`,
            type: 'qrcode',
            xMm: W - m - 16,
            yMm: H * 0.62 + m,
            widthMm: 15,
            heightMm: 15
          }
        ];
        break;

      case 'code_left_drawing_right':
        newElements = [
          {
            id: `el-code-${Date.now()}`,
            type: 'code',
            xMm: m + 2,
            yMm: m + 2,
            widthMm: (W - m * 2) * 0.5,
            heightMm: 7,
            fontSizePt: 13,
            fontWeight: 'bold'
          },
          {
            id: `el-name-${Date.now()}`,
            type: 'name',
            xMm: m + 2,
            yMm: m + 10,
            widthMm: (W - m * 2) * 0.5,
            heightMm: 8,
            fontSizePt: 8
          },
          {
            id: `el-barcode-${Date.now()}`,
            type: 'barcode',
            xMm: m + 2,
            yMm: m + 20,
            widthMm: (W - m * 2) * 0.48,
            heightMm: H - m * 2 - 22,
            barcodeFormat: 'CODE128',
            includeTextUnderBarcode: true
          },
          {
            id: `el-drawing-${Date.now()}`,
            type: 'drawing',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: m + 2,
            widthMm: (W - m * 2) * 0.46,
            heightMm: H - m * 2 - 4,
            strokeWidthMm: 0.5
          }
        ];
        break;

      case 'drawing_left_code_right':
        newElements = [
          {
            id: `el-drawing-${Date.now()}`,
            type: 'drawing',
            xMm: m + 2,
            yMm: m + 2,
            widthMm: (W - m * 2) * 0.48,
            heightMm: H - m * 2 - 4,
            strokeWidthMm: 0.5
          },
          {
            id: `el-code-${Date.now()}`,
            type: 'code',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: m + 2,
            widthMm: (W - m * 2) * 0.46,
            heightMm: 7,
            fontSizePt: 13,
            fontWeight: 'bold'
          },
          {
            id: `el-name-${Date.now()}`,
            type: 'name',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: m + 10,
            widthMm: (W - m * 2) * 0.46,
            heightMm: 8,
            fontSizePt: 8
          },
          {
            id: `el-barcode-${Date.now()}`,
            type: 'barcode',
            xMm: (W - m * 2) * 0.52 + m,
            yMm: m + 20,
            widthMm: (W - m * 2) * 0.46,
            heightMm: H - m * 2 - 22,
            barcodeFormat: 'CODE128',
            includeTextUnderBarcode: true
          }
        ];
        break;

      default:
        return;
    }

    onUpdateTemplate({
      ...currentTemplate,
      elements: newElements
    });
    setSelectedElementId(null);
  };

  const handleSaveAsTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTpl: LabelTemplate = {
      ...currentTemplate,
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      description: `Plantilla personalizada (${currentTemplate.widthMm}×${currentTemplate.heightMm} mm)`,
      isDefault: false,
      isCustom: true,
      createdAt: Date.now()
    };

    onSaveTemplateAsNew(newTpl);
    setIsSaveTemplatePromptOpen(false);
    setNewTemplateName('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-61px)] overflow-hidden">
      
      {/* Top Toolbar */}
      <EditorToolbar
        currentPiece={currentPiece}
        pieces={pieces}
        onSelectPiece={onSelectPiece}
        currentTemplate={currentTemplate}
        onSaveTemplate={() => setIsSaveTemplatePromptOpen(true)}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onOpenPrintModal={onOpenPrintModal}
        onDownloadZpl={onDownloadZpl}
        onExportPdf={onExportPdf}
        onExportPng={onExportPng}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        canUndo={historyStack.length > 0}
        onUndo={handleUndo}
        canRedo={redoStack.length > 0}
        onRedo={handleRedo}
        onAdaptContent={handleAdaptContent}
        onFitZoom={() => setZoom(calculateFitZoom(currentTemplate.widthMm, currentTemplate.heightMm))}
      />

      {/* Responsive Layout: 3 columns on desktop (>=1024px), single tabbed view on mobile/tablet (<1024px) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Tools & Layouts Panel */}
        <div className={`h-full ${mobileTab === 'tools' ? 'flex flex-1 w-full z-10' : 'hidden'} lg:flex lg:w-72 lg:shrink-0`}>
          <LeftToolsPanel
            template={currentTemplate}
            piece={currentPiece}
            onUpdateTemplate={commitTemplateChange}
            onAdaptContent={handleAdaptContent}
            onAddElement={(type) => {
              handleAddElement(type);
              // Switch back to canvas on mobile so user sees the newly placed element
              if (window.innerWidth < 1024) {
                setMobileTab('canvas');
              }
            }}
            onApplyPresetLayout={(layoutId) => {
              handleApplyPresetLayout(layoutId);
              if (window.innerWidth < 1024) {
                setMobileTab('canvas');
              }
            }}
          />
        </div>

        {/* Center Canvas */}
        <div className={`h-full ${mobileTab === 'canvas' ? 'flex flex-1 w-full' : 'hidden'} lg:flex lg:flex-1 min-w-0`}>
          <LabelCanvas
            template={currentTemplate}
            piece={currentPiece}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
            }}
            onUpdateElement={handleUpdateElement}
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            warnings={layoutWarnings}
            onAdaptContent={handleAdaptContent}
            onHideOptionalElements={handleHideOptionalElements}
            onResizeLabel={handleResizeLabel}
          />
        </div>

        {/* Right Properties & Piece Panel */}
        <div className={`h-full ${mobileTab === 'properties' ? 'flex flex-1 w-full z-10' : 'hidden'} lg:flex lg:w-72 lg:shrink-0`}>
          <RightPropertiesPanel
            template={currentTemplate}
            piece={currentPiece}
            selectedElementId={selectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onUpdatePiece={onUpdatePiece}
            onOpenLayersModal={() => setIsLayersModalOpen(true)}
            onOpenImageModal={() => setIsImageModalOpen(true)}
          />
        </div>

      </div>

      {/* CAD Layer Modal */}
      {isLayersModalOpen && (
        <CadLayerModal
          isOpen={isLayersModalOpen}
          onClose={() => setIsLayersModalOpen(false)}
          piece={currentPiece}
          onSavePiece={onUpdatePiece}
        />
      )}

      {/* Image Adjust Modal */}
      {isImageModalOpen && (
        <ImageAdjustModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          piece={currentPiece}
          onSavePiece={onUpdatePiece}
        />
      )}

      {/* Save Template Prompt Modal */}
      {isSaveTemplatePromptOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSaveTemplatePromptOpen(false); }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveAsTemplateSubmit}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Guardar como Plantilla Reutilizable
            </h3>
            <p className="text-xs text-neutral-500">
              Guarde esta distribución ({currentTemplate.widthMm}×{currentTemplate.heightMm} mm) para aplicarla a otras piezas o lotes.
            </p>
            <input
              type="text"
              required
              placeholder="Nombre de la plantilla..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveTemplatePromptOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800"
              >
                Guardar Plantilla
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
