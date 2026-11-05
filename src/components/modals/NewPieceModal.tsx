import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Layers, 
  Check, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  FileCheck,
  RotateCw,
  Sliders,
  FileQuestion
} from 'lucide-react';
import { Piece, LabelTemplate, CadLayer } from '../../types/index.ts';
import { planRecognizer } from '../../services/cad/universalRecognizer.ts';
import { DetectionResult, NormalizedDrawing } from '../../services/cad/types.ts';
import { SAMPLE_SVG_FLANGE, SAMPLE_SVG_BRACKET } from '../../services/sampleData.ts';
import { useScrollLock } from '../../services/scrollLock.ts';

interface NewPieceModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: LabelTemplate[];
  onPieceCreated: (piece: Piece, targetTemplateId?: string) => void;
}

export const NewPieceModal: React.FC<NewPieceModalProps> = ({
  isOpen,
  onClose,
  templates,
  onPieceCreated
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [material, setMaterial] = useState<string>('Acero Inoxidable AISI 304');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [notes, setNotes] = useState<string>('');

  // Universal recognition state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [normalizedDrawing, setNormalizedDrawing] = useState<NormalizedDrawing | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual adjustments
  const [activeCadLayers, setActiveCadLayers] = useState<CadLayer[]>([]);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [threshold, setThreshold] = useState<number>(140);







const handleFileDropOrSelect = async (selectedFile: File) => {
  setFile(selectedFile);
  setErrorMessage(null);
  setDetectionResult(null);
  setNormalizedDrawing(null);
  setActiveCadLayers([]);
  setIsProcessing(true);

  const fileNameWithoutExtension = selectedFile.name.replace(/\.[^.]+$/, '');

  setCode(fileNameWithoutExtension.toUpperCase());
  setName(fileNameWithoutExtension);
  setPdfPage(1);

  try {
    const { detection, drawing } =
      await planRecognizer.recognizeAndProcess(
        selectedFile,
        selectedFile.name,
        {
          pdfPageNumber: 1,
          threshold
        }
      );

    setDetectionResult(detection);
    setNormalizedDrawing(drawing);
    setCode(drawing.autoCode);
    setName(drawing.autoName);
    setActiveCadLayers(drawing.layers || []);

  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo procesar el archivo.';

    setErrorMessage(message);
    setNormalizedDrawing(null);
    setDetectionResult(null);
  } finally {
    setIsProcessing(false);
  }
};











  const handleToggleLayer = async (layerName: string) => {
    if (!file || !normalizedDrawing) return;
    const updated = activeCadLayers.map((l) =>
      l.name === layerName ? { ...l, visible: !l.visible } : l
    );
    setActiveCadLayers(updated);

    const activeMap: Record<string, boolean> = {};
    updated.forEach((l) => { activeMap[l.name] = l.visible; });

    try {
      const { drawing } = await planRecognizer.recognizeAndProcess(file, file.name, {
        activeLayers: activeMap
      });
      setNormalizedDrawing(drawing);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePdfPageChange = async (newPage: number) => {
    if (!file) return;
    setPdfPage(newPage);
    setIsProcessing(true);
    try {
      const { drawing } = await planRecognizer.recognizeAndProcess(file, file.name, {
        pdfPageNumber: newPage,
        threshold
      });
      setNormalizedDrawing(drawing);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleThresholdChange = async (newVal: number) => {
    setThreshold(newVal);
    if (!file) return;
    try {
      const { drawing } = await planRecognizer.recognizeAndProcess(file, file.name, {
        threshold: newVal,
        pdfPageNumber: pdfPage
      });
      setNormalizedDrawing(drawing);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSamplePreset = (type: 'flange' | 'bracket') => {
    setErrorMessage(null);
    if (type === 'flange') {
      const drawing: NormalizedDrawing = {
        format: 'dxf',
        rawSvg: SAMPLE_SVG_FLANGE,
        previewDataUrl: '',
        bounds: { minX: 4, minY: 4, maxX: 96, maxY: 96, width: 92, height: 92 },
        layers: [
          { name: 'CONTORNO_PIEZA', visible: true, entityCount: 9, isDimensionOrText: false },
          { name: 'COTAS_MEDIDAS', visible: false, entityCount: 16, isDimensionOrText: true }
        ],
        entityCount: 9,
        holeCount: 9,
        autoCode: 'BRD-M100-INOX',
        autoName: 'Brida Ciega ANSI B16.5',
        originalFileName: 'BRD_M100_INOX.dxf',
        fileSizeBytes: 24500,
        warnings: []
      };
      setNormalizedDrawing(drawing);
      setCode('BRD-M100-INOX');
      setName('Brida Ciega ANSI B16.5');
      setMaterial('Acero Inoxidable AISI 316L');
      setActiveCadLayers(drawing.layers || []);
      setDetectionResult({
        detectedFormat: 'dxf',
        isExtensionMismatch: false,
        confidence: 1.0,
        signatureDesc: 'AutoCAD ASCII DXF verificado'
      });
    } else {
      const drawing: NormalizedDrawing = {
        format: 'dxf',
        rawSvg: SAMPLE_SVG_BRACKET,
        previewDataUrl: '',
        bounds: { minX: 10, minY: 10, maxX: 110, maxY: 75, width: 100, height: 65 },
        layers: [
          { name: 'CORTE_EXTERIOR', visible: true, entityCount: 5, isDimensionOrText: false },
          { name: 'COTAS_CENTROS', visible: false, entityCount: 12, isDimensionOrText: true }
        ],
        entityCount: 5,
        holeCount: 3,
        autoCode: 'SOPORTE-ANG-V5',
        autoName: 'Soporte Angular Reforzado',
        originalFileName: 'SOPORTE_ANG_V5.dxf',
        fileSizeBytes: 18200,
        warnings: []
      };
      setNormalizedDrawing(drawing);
      setCode('SOPORTE-ANG-V5');
      setName('Soporte Angular Reforzado');
      setMaterial('Aluminio 6082-T6');
      setActiveCadLayers(drawing.layers || []);
      setDetectionResult({
        detectedFormat: 'dxf',
        isExtensionMismatch: false,
        confidence: 1.0,
        signatureDesc: 'AutoCAD ASCII DXF verificado'
      });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !normalizedDrawing) return;

    const piece = planRecognizer.convertNormalizedToPiece(
      {
        ...normalizedDrawing,
        autoCode: code.trim(),
        autoName: name.trim()
      },
      selectedTemplateId,
      notes
    );

    piece.material = material;
    onPieceCreated(piece, selectedTemplateId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              <span>Reconocimiento Universal de Planos</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Suba cualquier archivo sin seleccionar el formato. El sistema analiza firmas binarias y normaliza el dibujo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Universal Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileDropOrSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file
                ? 'border-neutral-400 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-950/50'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 bg-neutral-50 dark:bg-neutral-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileDropOrSelect(e.target.files[0]);
              }}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-2 text-neutral-700 dark:text-neutral-300">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {file ? file.name : 'Arrastre aquí cualquier plano o dibujo (DXF, DWG, PDF, SVG, PNG, JPG, BMP)'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Detección automática por cabeceras binarias y contenido (no depende de la extensión).
            </div>
          </div>

          {/* Quick preset buttons if no file loaded */}
          {!file && !normalizedDrawing && (
            <div className="flex items-center justify-between text-xs p-3 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">¿Desea probar sin subir archivos?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadSamplePreset('flange')}
                  className="px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium hover:bg-neutral-300 transition-colors"
                >
                  Brida ANSI Inox
                </button>
                <button
                  type="button"
                  onClick={() => loadSamplePreset('bracket')}
                  className="px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium hover:bg-neutral-300 transition-colors"
                >
                  Soporte Angular CNC
                </button>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-mono text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              <span>Analizando firmas binarias y extrayendo contorno de la pieza...</span>
            </div>
          )}

          {/* Error / Diagnostic message */}
          {errorMessage && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Atención en el archivo</span>
              </div>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Detected Format & Normalized Drawing Preview */}
          {normalizedDrawing && (
            <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              
              {/* Detection Result Badge Banner */}
              {detectionResult && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold uppercase text-neutral-900 dark:text-neutral-100">
                      {detectionResult.detectedFormat}
                    </span>
                    <span className="text-neutral-500">· {detectionResult.signatureDesc}</span>
                  </div>

                  {detectionResult.isExtensionMismatch && (
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded font-sans">
                      Extensión corregida
                    </span>
                  )}
                </div>
              )}

              {/* Split: Geometry Preview & Format-Specific Adjusters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* SVG Geometry Preview */}
                <div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    Contorno Vectorial Normalizado
                  </span>
                  <div className="h-44 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex items-center justify-center">
                    <div
                      className="w-full h-full flex items-center justify-center text-neutral-950 dark:text-neutral-50 [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: normalizedDrawing.rawSvg }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                    <span>{Math.round(normalizedDrawing.bounds.width)} × {Math.round(normalizedDrawing.bounds.height)} mm</span>
                    {normalizedDrawing.holeCount !== undefined && (
                      <span>{normalizedDrawing.holeCount} orificio(s) detectado(s)</span>
                    )}
                  </div>
                </div>

                {/* Format Specific Manual Fine-tuning */}
                <div className="space-y-3">
                  
                  {/* DXF Layer Selector */}
                  {normalizedDrawing.format === 'dxf' && (
                    <div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Capas CAD ({activeCadLayers.length})
                      </span>
                      <div className="h-40 overflow-y-auto space-y-1 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-xs">
                        {activeCadLayers.map((l) => (
                          <label
                            key={l.name}
                            className="flex items-center justify-between p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={l.visible}
                                onChange={() => handleToggleLayer(l.name)}
                                className="rounded border-neutral-300"
                              />
                              <span className="font-mono truncate">{l.name}</span>
                            </div>
                            {l.isDimensionOrText && (
                              <span className="text-[9px] px-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded">
                                Cota
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDF Page Selector */}
                  {normalizedDrawing.format === 'pdf' && normalizedDrawing.pdfMetadata && (
                    <div className="space-y-2 text-xs">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                        Selector de Página PDF ({normalizedDrawing.pdfMetadata.pageCount} páginas)
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={pdfPage}
                          onChange={(e) => handlePdfPageChange(Number(e.target.value))}
                          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-xs"
                        >
                          {[...Array(normalizedDrawing.pdfMetadata.pageCount)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Página {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Image / Raster Threshold Slider */}
                  {(['png', 'jpg', 'bmp', 'pdf'].includes(normalizedDrawing.format)) && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Umbral de Blanco y Negro Térmico
                        </span>
                        <span className="font-mono text-neutral-500">{threshold}/255</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="220"
                        value={threshold}
                        onChange={(e) => handleThresholdChange(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-[10px] text-neutral-400 block">
                        Regula la nitidez de las líneas para el cabezal Zebra.
                      </span>
                    </div>
                  )}

                  {/* Warnings or notices */}
                  {normalizedDrawing.warnings.length > 0 && (
                    <div className="p-2.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
                      {normalizedDrawing.warnings.map((w, idx) => (
                        <div key={idx}>• {w}</div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* Piece Metadata Inputs */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Parámetros de Identificación de la Etiqueta
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Código de Pieza (Detectado automáticamente)
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ej: BRD-150-SS316"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 font-mono font-bold text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Descripción Comercial / Nombre
                </span>
                <input
                  type="text"
                  placeholder="Ej: Brida Ciega ANSI 150"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Material de Pieza
                </span>
                <input
                  type="text"
                  placeholder="Ej: Acero Inox AISI 316L"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Plantilla de Rotulado Zebra
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.widthMm}×{t.heightMm} mm)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!code.trim() || !normalizedDrawing || isProcessing}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <span>Generar Etiqueta & Editar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
