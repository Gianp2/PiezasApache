import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileDown, 
  Printer, 
  Trash2, 
  FileText, 
  RefreshCw, 
  FolderArchive, 
  Download,
  FileCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { Piece, LabelTemplate } from '../../types/index.ts';
import { planRecognizer } from '../../services/cad/universalRecognizer.ts';
import { DetectionResult, NormalizedDrawing } from '../../services/cad/types.ts';
import { exportBatchPdf } from '../../services/export/pdfExport.ts';
import { generateZpl } from '../../services/zpl/zplGenerator.ts';
import { sendZplToZebra, ZebraStatusResult } from '../../services/zebra/zebraBrowserPrint.ts';

interface BatchImportViewProps {
  templates: LabelTemplate[];
  onSaveImportedPieces: (pieces: Piece[]) => Promise<void>;
  zebraStatus: ZebraStatusResult;
  onNavigateToHistory: () => void;
}

interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  detectedFormat?: string;
  signatureDesc?: string;
  isMismatch?: boolean;
  detectedCode: string;
  customCode: string;
  customName: string;
  material: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  piece?: Piece;
  selected: boolean;
}

export const BatchImportView: React.FC<BatchImportViewProps> = ({
  templates,
  onSaveImportedPieces,
  zebraStatus,
  onNavigateToHistory
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ''
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Helper to extract clean code from filename
  const extractCodeFromFileName = (fileName: string): string => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    return baseName
      .replace(/[\s_]+/g, '-')
      .replace(/[-_]rev[a-z0-9]*/i, '')
      .toUpperCase();
  };

  // Handle Drag & Drop / File Input Selection (ANY format mixed)
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const code = extractCodeFromFileName(f.name);
      newItems.push({
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file: f,
        fileName: f.name,
        detectedCode: code,
        customCode: code,
        customName: f.name.replace(/\.[^/.]+$/, ''),
        material: '',
        status: 'pending',
        selected: true
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  // Process all pending items with Universal Recognizer
  const handleProcessBatch = async () => {
    const pendingItems = items.filter((it) => it.status === 'pending' || it.status === 'error');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: pendingItems.length, message: 'Iniciando reconocimiento universal de planos...' });

    const updatedItems = [...items];

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      const itemIndex = updatedItems.findIndex((it) => it.id === item.id);
      if (itemIndex === -1) continue;

      setProgress({
        current: i + 1,
        total: pendingItems.length,
        message: `Reconociendo ${item.fileName} (${i + 1}/${pendingItems.length})...`
      });

      try {
        // Universal Recognition & Processing (handles DXF, SVG, PNG, JPG, BMP, PDF, DWG)
        const { detection, drawing } = await planRecognizer.recognizeAndProcess(item.file, item.fileName);

        // Convert to Piece
        const piece = planRecognizer.convertNormalizedToPiece(
          {
            ...drawing,
            autoCode: item.customCode || drawing.autoCode,
            autoName: item.customName || drawing.autoName
          },
          selectedTemplateId
        );

        if (item.material) {
          piece.material = item.material;
        }

        updatedItems[itemIndex] = {
          ...item,
          status: 'ready',
          detectedFormat: detection.detectedFormat,
          signatureDesc: detection.signatureDesc,
          isMismatch: detection.isExtensionMismatch,
          piece
        };
      } catch (err: any) {
        updatedItems[itemIndex] = {
          ...item,
          status: 'error',
          errorMessage: err.message || 'Error al reconocer el archivo'
        };
      }

      setItems([...updatedItems]);
    }

    setIsProcessing(false);
    setProgress({ current: pendingItems.length, total: pendingItems.length, message: 'Reconocimiento universal completado.' });

    // Save ready pieces to persistent IndexedDB
    const readyPieces = updatedItems.filter((it) => it.status === 'ready' && it.piece).map((it) => it.piece!);
    if (readyPieces.length > 0) {
      await onSaveImportedPieces(readyPieces);
      setStatusMessage({
        type: 'success',
        text: `Se procesaron y guardaron ${readyPieces.length} planos en la biblioteca local.`
      });
    }
  };

  // CSV Import to match codes/materials
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
      const fileIdx = header.findIndex((h) => h.includes('archivo') || h.includes('file'));
      const codeIdx = header.findIndex((h) => h.includes('codigo') || h.includes('code'));
      const nameIdx = header.findIndex((h) => h.includes('nombre') || h.includes('desc') || h.includes('name'));
      const matIdx = header.findIndex((h) => h.includes('material') || h.includes('mat'));

      const lookup: Record<string, { code?: string; name?: string; material?: string }> = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());
        const fKey = cols[fileIdx]?.toLowerCase();
        if (fKey) {
          lookup[fKey] = {
            code: codeIdx !== -1 ? cols[codeIdx] : undefined,
            name: nameIdx !== -1 ? cols[nameIdx] : undefined,
            material: matIdx !== -1 ? cols[matIdx] : undefined
          };
        }
      }

      setItems((prev) =>
        prev.map((it) => {
          const match = lookup[it.fileName.toLowerCase()] || lookup[it.detectedCode.toLowerCase()];
          if (match) {
            return {
              ...it,
              customCode: match.code || it.customCode,
              customName: match.name || it.customName,
              material: match.material || it.material
            };
          }
          return it;
        })
      );

      setStatusMessage({
        type: 'success',
        text: `Metadatos de CSV aplicados a los planos importados.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al leer CSV: ${err.message}`
      });
    }
  };

  // Export Multipage PDF
  const handleExportBatchPdf = async () => {
    const readyPieces = items.filter((it) => it.selected && it.status === 'ready' && it.piece).map((it) => it.piece!);
    if (readyPieces.length === 0) {
      setStatusMessage({ type: 'error', text: 'No hay piezas listas seleccionadas para exportar.' });
      return;
    }

    setIsExporting(true);
    try {
      await exportBatchPdf(selectedTemplate, readyPieces, (curr, tot) => {
        setProgress({ current: curr, total: tot, message: `Generando PDF (${curr}/${tot})...` });
      });
      setStatusMessage({ type: 'success', text: `PDF multipágina generado con ${readyPieces.length} etiquetas.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error al generar PDF: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Download ZIP with all individual .zpl files
  const handleDownloadZplZip = async () => {
    const readyPieces = items.filter((it) => it.selected && it.status === 'ready' && it.piece).map((it) => it.piece!);
    if (readyPieces.length === 0) {
      setStatusMessage({ type: 'error', text: 'No hay piezas listas seleccionadas.' });
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < readyPieces.length; i++) {
        const p = readyPieces[i];
        const zpl = await generateZpl(selectedTemplate, p);
        zip.file(`${p.code}_${selectedTemplate.widthMm}x${selectedTemplate.heightMm}mm.zpl`, zpl);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lote_zpl_${readyPieces.length}_etiquetas.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: `Archivo ZIP con ${readyPieces.length} comandos ZPL descargado.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error al empaquetar ZPL: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Sequential Batch Print to Zebra
  const handleDirectPrintBatch = async () => {
    const readyPieces = items.filter((it) => it.selected && it.status === 'ready' && it.piece).map((it) => it.piece!);
    if (readyPieces.length === 0) {
      setStatusMessage({ type: 'error', text: 'No hay piezas listas seleccionadas.' });
      return;
    }

    if (!zebraStatus.isAvailable) {
      setStatusMessage({
        type: 'error',
        text: 'Zebra Browser Print no detectado en localhost:9100. Verifique la pestaña Zebra/Config.'
      });
      return;
    }

    setIsExporting(true);
    let successCount = 0;

    for (let i = 0; i < readyPieces.length; i++) {
      const p = readyPieces[i];
      setProgress({ current: i + 1, total: readyPieces.length, message: `Enviando a Zebra: ${p.code} (${i + 1}/${readyPieces.length})...` });
      const zpl = await generateZpl(selectedTemplate, p);
      const res = await sendZplToZebra(zpl, zebraStatus.activeDevice);
      if (res.success) {
        successCount++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsExporting(false);
    setStatusMessage({
      type: successCount === readyPieces.length ? 'success' : 'error',
      text: `Impresión completada: ${successCount} de ${readyPieces.length} etiquetas enviadas a la impresora térmica.`
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, selected: checked })));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
            <span>Importación Masiva de Formatos Mixtos</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Arrastre decenas o cientos de planos de cualquier formato (DXF, SVG, PNG, JPG, PDF, DWG). El motor identifica automáticamente el formato real de cada archivo.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-neutral-500 hover:text-red-500 transition-colors"
          >
            Limpiar lista de lote
          </button>
        )}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Drop Zone & CSV Matcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Bulk Drawing Upload (Span 2) */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
          }}
          className="md:col-span-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 dark:hover:border-neutral-500 rounded-xl p-8 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-700 dark:text-neutral-300">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Arrastre planos individuales o lotes mixtos aquí
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            Soporta cualquier combinación de DXF, SVG, PNG, JPG, BMP, PDF y DWG. Reconocimiento automático sin selección previa.
          </p>
        </div>

        {/* CSV/Excel Linker (Span 1) */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase font-mono">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Cargar CSV de Códigos</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Asocie automáticamente códigos, nombres y materiales importando una tabla con columnas: <code className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">archivo, codigo, material</code>.
            </p>
          </div>

          <div className="mt-4">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvImport}
              className="hidden"
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              className="w-full py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Seleccionar archivo CSV...
            </button>
          </div>
        </div>

      </div>

      {/* Batch Processing Configuration & Actions Bar */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Template Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Plantilla para el lote:
              </span>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.widthMm}×{t.heightMm} mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={handleProcessBatch}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Reconocer Geometrías ({items.filter((i) => i.status === 'pending').length})</span>
              </button>

              <button
                onClick={handleExportBatchPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Multipágina</span>
              </button>

              <button
                onClick={handleDownloadZplZip}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Descargar ZIP ZPLs</span>
              </button>

              <button
                onClick={handleDirectPrintBatch}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-900 dark:text-neutral-100 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Lote en Zebra</span>
              </button>
            </div>

          </div>

          {/* Progress Indicator */}
          {(isProcessing || isExporting) && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between text-xs text-neutral-500 font-mono">
                <span>{progress.message}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-neutral-900 dark:bg-neutral-100 h-full transition-all duration-200"
                  style={{
                    width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
                  }}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Batch Items Table */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={items.every((it) => it.selected)}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                <span>Seleccionar todas ({items.length})</span>
              </label>
            </div>
            <div className="text-xs text-neutral-400">
              {items.filter((it) => it.status === 'ready').length} listos · {items.filter((it) => it.status === 'error').length} errores
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 w-10"></th>
                  <th className="py-2.5 px-4 w-16">Preview</th>
                  <th className="py-2.5 px-4">Archivo / Formato Detectado</th>
                  <th className="py-2.5 px-4">Código de Pieza</th>
                  <th className="py-2.5 px-4">Descripción / Material</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4 text-right">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setItems((prev) => prev.map((item) => (item.id === it.id ? { ...item, selected: val } : item)));
                        }}
                        className="rounded border-neutral-300"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="w-10 h-10 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-0.5">
                        {it.piece?.rawSvg ? (
                          <div
                            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: it.piece.rawSvg }}
                          />
                        ) : (
                          <span className="text-[9px] text-neutral-400 uppercase font-mono">
                            {it.fileName.split('.').pop()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                        {it.fileName}
                      </div>
                      {it.detectedFormat ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 uppercase text-neutral-600 dark:text-neutral-400">
                            {it.detectedFormat}
                          </span>
                          {it.isMismatch && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400">
                              (contenido corregido)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Pendiente de escaneo</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={it.customCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => prev.map((item) => (item.id === it.id ? { ...item, customCode: val } : item)));
                        }}
                        className="px-2 py-1 font-mono font-bold text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-36"
                      />
                    </td>
                    <td className="py-2.5 px-4 space-y-1">
                      <input
                        type="text"
                        placeholder="Descripción..."
                        value={it.customName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => prev.map((item) => (item.id === it.id ? { ...item, customName: val } : item)));
                        }}
                        className="px-2 py-0.5 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 w-44 block"
                      />
                      <input
                        type="text"
                        placeholder="Material..."
                        value={it.material}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => prev.map((item) => (item.id === it.id ? { ...item, material: val } : item)));
                        }}
                        className="px-2 py-0.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 w-44 block text-neutral-500"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      {it.status === 'ready' && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Normalizado</span>
                        </span>
                      )}
                      {it.status === 'pending' && (
                        <span className="text-neutral-400 font-mono">En espera</span>
                      )}
                      {it.status === 'error' && (
                        <span className="text-red-500 font-mono text-[10px]" title={it.errorMessage}>
                          Error: {it.errorMessage?.substring(0, 32)}...
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => removeItem(it.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
