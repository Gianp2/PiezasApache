import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Usb, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Code
} from 'lucide-react';
import { LabelTemplate, Piece, PrintJob } from '../../types/index.ts';
import { generateZpl } from '../../services/zpl/zplGenerator.ts';
import { 
  sendZplToZebra, 
  sendZplViaWebUsb, 
  downloadZplFile, 
  ZebraStatusResult 
} from '../../services/zebra/zebraBrowserPrint.ts';
import { exportLabelPdf, downloadLabelPng, renderLabelToCanvas } from '../../services/export/pdfExport.ts';
import { useScrollLock } from '../../services/scrollLock.ts';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  piece: Piece;
  template: LabelTemplate;
  zebraStatus: ZebraStatusResult;
  onRecordPrintJob: (job: PrintJob) => Promise<void>;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  piece,
  template,
  zebraStatus,
  onRecordPrintJob
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [copies, setCopies] = useState<number>(1);
  const [printMethod, setPrintMethod] = useState<'zebra_browser_print' | 'zebra_usb' | 'pdf_download' | 'zpl_file' | 'png_file'>(
    zebraStatus.isAvailable ? 'zebra_browser_print' : 'pdf_download'
  );
  const [darkness, setDarkness] = useState<number>(20);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showZplCode, setShowZplCode] = useState<boolean>(false);
  const [generatedZpl, setGeneratedZpl] = useState<string>('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const generatePreview = async () => {
      try {
        const canvas = await renderLabelToCanvas(template, piece, 2.5);
        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL('image/png'));
        }
        const zpl = await generateZpl(template, piece, { copies, darkness });
        if (isMounted) {
          setGeneratedZpl(zpl);
        }
      } catch (err) {
        console.error(err);
      }
    };
    generatePreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, template, piece, copies, darkness]);

  const handleExecutePrint = async () => {
    setIsPrinting(true);
    setStatusMessage(null);

    const zpl = await generateZpl(template, piece, { copies, darkness });

    try {
      if (printMethod === 'zebra_browser_print') {
        const res = await sendZplToZebra(zpl, zebraStatus.activeDevice);
        if (res.success) {
          setStatusMessage({ type: 'success', text: `Trabajo enviado a la cola de la impresora Zebra (${copies} copia/s).` });
          await onRecordPrintJob({
            id: `job-${Date.now()}`,
            timestamp: Date.now(),
            pieceId: piece.id,
            pieceCode: piece.code,
            pieceName: piece.name,
            copies,
            templateId: template.id,
            templateName: template.name,
            target: 'zebra_browser_print',
            printerName: zebraStatus.activeDevice?.name || 'Zebra Browser Print',
            status: 'enviada', // Enviada al servicio/cola de impresión
            labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
            dpi: template.dpi
          });
        } else {
          setStatusMessage({ type: 'error', text: res.message });
          await onRecordPrintJob({
            id: `job-${Date.now()}`,
            timestamp: Date.now(),
            pieceId: piece.id,
            pieceCode: piece.code,
            pieceName: piece.name,
            copies,
            templateId: template.id,
            templateName: template.name,
            target: 'zebra_browser_print',
            printerName: zebraStatus.activeDevice?.name,
            status: 'fallida',
            labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
            dpi: template.dpi,
            errorMessage: res.message
          });
        }
      } else if (printMethod === 'zebra_usb') {
        const res = await sendZplViaWebUsb(zpl);
        if (res.success) {
          setStatusMessage({ type: 'success', text: res.message });
          await onRecordPrintJob({
            id: `job-${Date.now()}`,
            timestamp: Date.now(),
            pieceId: piece.id,
            pieceCode: piece.code,
            pieceName: piece.name,
            copies,
            templateId: template.id,
            templateName: template.name,
            target: 'zebra_usb',
            printerName: 'Zebra USB Direct',
            status: 'enviada',
            labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
            dpi: template.dpi
          });
        } else {
          setStatusMessage({ type: 'error', text: res.message });
          await onRecordPrintJob({
            id: `job-${Date.now()}`,
            timestamp: Date.now(),
            pieceId: piece.id,
            pieceCode: piece.code,
            pieceName: piece.name,
            copies,
            templateId: template.id,
            templateName: template.name,
            target: 'zebra_usb',
            status: 'fallida',
            labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
            dpi: template.dpi,
            errorMessage: res.message
          });
        }
      } else if (printMethod === 'pdf_download') {
        await exportLabelPdf(template, piece, copies);
        setStatusMessage({ type: 'success', text: `PDF generado con ${copies} copia(s) en medidas reales.` });
        await onRecordPrintJob({
          id: `job-${Date.now()}`,
          timestamp: Date.now(),
          pieceId: piece.id,
          pieceCode: piece.code,
          pieceName: piece.name,
          copies,
          templateId: template.id,
          templateName: template.name,
          target: 'pdf_download',
          status: 'descargada',
          labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
          dpi: template.dpi
        });
      } else if (printMethod === 'zpl_file') {
        downloadZplFile(zpl, `etiqueta_${piece.code}_${template.widthMm}x${template.heightMm}mm.zpl`);
        setStatusMessage({ type: 'success', text: 'Archivo ZPL II descargado para impresión.' });
        await onRecordPrintJob({
          id: `job-${Date.now()}`,
          timestamp: Date.now(),
          pieceId: piece.id,
          pieceCode: piece.code,
          pieceName: piece.name,
          copies,
          templateId: template.id,
          templateName: template.name,
          target: 'zpl_file',
          status: 'descargada',
          labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
          dpi: template.dpi
        });
      } else if (printMethod === 'png_file') {
        await downloadLabelPng(template, piece);
        setStatusMessage({ type: 'success', text: 'Imagen PNG descargada.' });
        await onRecordPrintJob({
          id: `job-${Date.now()}`,
          timestamp: Date.now(),
          pieceId: piece.id,
          pieceCode: piece.code,
          pieceName: piece.name,
          copies: 1,
          templateId: template.id,
          templateName: template.name,
          target: 'png_file',
          status: 'descargada',
          labelDimensions: `${template.widthMm}x${template.heightMm}mm`,
          dpi: template.dpi
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error de impresión: ${err.message}` });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Imprimir Etiqueta Térmica
              </h2>
              <p className="text-xs text-neutral-500">
                Pieza: <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{piece.code}</span> · {template.widthMm} × {template.heightMm} mm
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200'
            }`}>
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="font-bold ml-2">×</button>
            </div>
          )}

          {/* Visual Preview */}
          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center min-h-[160px]">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Vista previa de etiqueta"
                className="max-h-36 object-contain shadow-md rounded-xs border border-neutral-300"
              />
            ) : (
              <div className="text-xs text-neutral-400 font-mono">Generando vista previa...</div>
            )}
          </div>

          {/* Destination Selector */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
              Destino de Impresión
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              
              <button
                type="button"
                onClick={() => setPrintMethod('zebra_browser_print')}
                className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                  printMethod === 'zebra_browser_print'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Printer className="w-4 h-4 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                <div>
                  <div className="text-neutral-900 dark:text-neutral-100">Zebra Browser Print</div>
                  <div className="text-[11px] font-normal text-neutral-500">
                    {zebraStatus.isAvailable ? 'Servicio activo en localhost:9100' : 'Offline (requiere software Zebra)'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintMethod('zebra_usb')}
                className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                  printMethod === 'zebra_usb'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Usb className="w-4 h-4 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                <div>
                  <div className="text-neutral-900 dark:text-neutral-100">WebUSB Directo</div>
                  <div className="text-[11px] font-normal text-neutral-500">Conexión directa por cable USB</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintMethod('pdf_download')}
                className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                  printMethod === 'pdf_download'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <FileText className="w-4 h-4 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                <div>
                  <div className="text-neutral-900 dark:text-neutral-100">Generar PDF Vectorial</div>
                  <div className="text-[11px] font-normal text-neutral-500">Medidas exactas en milímetros</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintMethod('zpl_file')}
                className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                  printMethod === 'zpl_file'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Download className="w-4 h-4 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                <div>
                  <div className="text-neutral-900 dark:text-neutral-100">Descargar Archivo .ZPL</div>
                  <div className="text-[11px] font-normal text-neutral-500">Para Zebra Setup Utilities</div>
                </div>
              </button>

            </div>
          </div>

          {/* Copies & Darkness Stepper */}
          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Cantidad de Copias
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-8 h-8 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center font-mono font-bold text-sm py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-8 h-8 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Temperatura Térmica (~SD)
                </span>
                <span className="font-mono text-neutral-500">{darkness}/30</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={darkness}
                onChange={(e) => setDarkness(Number(e.target.value))}
                className="w-full mt-1.5"
              />
            </div>
          </div>

          {/* ZPL Code Inspector Toggle */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
            <button
              type="button"
              onClick={() => setShowZplCode(!showZplCode)}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1.5 font-mono"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showZplCode ? 'Ocultar código ZPL' : 'Ver comandos ZPL II que se enviarán'}</span>
            </button>
            {showZplCode && (
              <pre className="mt-2 p-3 rounded-lg bg-neutral-900 text-emerald-400 font-mono text-[10px] max-h-36 overflow-auto">
                {generatedZpl}
              </pre>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isPrinting
                ? 'Transmitiendo...'
                : printMethod === 'pdf_download'
                ? `Exportar PDF (${copies} copias)`
                : printMethod === 'zpl_file'
                ? 'Descargar .ZPL'
                : `Imprimir ${copies} etiqueta${copies > 1 ? 's' : ''}`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
