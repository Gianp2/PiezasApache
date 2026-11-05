import React from 'react';
import { 
  FileUp, 
  Layers, 
  Printer, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Download,
  Send
} from 'lucide-react';
import { Piece, PrintJob, LabelTemplate } from '../../types/index.ts';
import { ZebraStatusResult } from '../../services/zebra/zebraBrowserPrint.ts';
import { NavView } from '../layout/Header.tsx';

interface DashboardViewProps {
  pieces: Piece[];
  templates: LabelTemplate[];
  printHistory: PrintJob[];
  zebraStatus: ZebraStatusResult;
  onNavigate: (view: NavView) => void;
  onSelectPieceForEditor: (piece: Piece) => void;
  onQuickPrintPiece: (piece: Piece) => void;
  onOpenNewPiece: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pieces,
  templates,
  printHistory,
  zebraStatus,
  onNavigate,
  onSelectPieceForEditor,
  onQuickPrintPiece,
  onOpenNewPiece
}) => {
  // Real confirmed printed labels (starts strictly at 0 if no confirmed prints exist)
  const confirmedPrintsCount = printHistory
    .filter((j) => j.status === 'confirmada')
    .reduce((sum, j) => sum + (j.copies || 1), 0);

  // Real jobs dispatched to printer queue
  const sentJobsCount = printHistory
    .filter((j) => j.status === 'enviada')
    .reduce((sum, j) => sum + (j.copies || 1), 0);

  // Real downloaded/exported labels (PDF, ZPL, PNG)
  const downloadedCount = printHistory
    .filter((j) => j.status === 'descargada')
    .reduce((sum, j) => sum + (j.copies || 1), 0);

  const recentPieces = [...pieces].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const recentJobs = printHistory.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      
      {/* Editorial Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Control de Rotulado Industrial
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 sm:mt-1">
            Generación y despacho de etiquetas térmicas con geometría técnica real para piezas metálicas.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('batch')}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors text-center"
          >
            Importar Lotes
          </button>
          <button
            onClick={onOpenNewPiece}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg transition-colors shadow-xs"
          >
            <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Cargar Plano</span>
          </button>
        </div>
      </div>

      {/* Metrics Row: Pure Real Data (Single elevation, tabular figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Metric 1: Real stored pieces */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Piezas Registradas
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
            {pieces.length}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 sm:mt-1 truncate">
            Almacenadas en IndexedDB
          </div>
        </div>

        {/* Metric 2: Real confirmed prints (starts at 0) */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Etiquetas Confirmadas
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
            {confirmedPrintsCount}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 sm:mt-1 truncate">
            {sentJobsCount > 0 ? `${sentJobsCount} en cola/enviadas` : 'Sin impresiones físicas previas'}
          </div>
        </div>

        {/* Metric 3: Sent or Downloaded operations */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Trabajos Despachados
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
            {sentJobsCount + downloadedCount}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 sm:mt-1 truncate">
            {sentJobsCount} a Zebra · {downloadedCount} PDF/ZPL
          </div>
        </div>

        {/* Metric 4: Real printer status */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Impresora Térmica
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
            <span className="text-sm sm:text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 truncate">
              {zebraStatus.isAvailable ? 'Zebra ZPL OK' : 'Offline'}
            </span>
            {zebraStatus.isAvailable ? (
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 sm:mt-1 truncate">
            {zebraStatus.isAvailable ? (zebraStatus.activeDevice?.name || 'Zebra Browser Print') : 'Daemon local puerto 9100'}
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div 
          onClick={onOpenNewPiece}
          className="group p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 mb-2.5 sm:mb-3">
            <FileUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-800">
            Reconocimiento Universal de Planos
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Suba cualquier archivo (DXF, DWG, PDF, SVG, imágenes). Detección automática por firmas binarias sin elegir formato.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-3 sm:mt-4">
            <span>Iniciar asistente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('batch')}
          className="group p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 mb-2.5 sm:mb-3">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-800">
            Importación Masiva por Lotes
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Procese decenas de planos mixtos simultáneamente, asocie códigos y genere tiradas en PDF o ZPL.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-3 sm:mt-4">
            <span>Procesar lotes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('settings')}
          className="group p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 mb-2.5 sm:mb-3">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-800">
            Conexión Zebra & Diagnóstico
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Verifique la conexión con Zebra Browser Print, ajuste DPI (203/300/600) y pruebe códigos ZPL reales.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-3 sm:mt-4">
            <span>Diagnosticar impresora</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Recent Pieces & Print Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Pieces List (Col span 2 on desktop) */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Piezas Recientes
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                Contornos listos para rotulación técnica
              </p>
            </div>
            <button
              onClick={() => onNavigate('library')}
              className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:underline"
            >
              Ver todas ({pieces.length})
            </button>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recentPieces.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No hay piezas registradas aún. Cargue un plano CAD o imagen para comenzar.
              </div>
            ) : (
              recentPieces.map((p) => (
                <div 
                  key={p.id} 
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail preview */}
                    <div 
                      onClick={() => onSelectPieceForEditor(p)}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 flex items-center justify-center p-1 cursor-pointer shrink-0"
                    >
                      <div 
                        className="w-full h-full flex items-center justify-center text-neutral-800 dark:text-neutral-200"
                        dangerouslySetInnerHTML={{ __html: p.rawSvg }}
                      />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {p.code}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase">
                          {p.fileType}
                        </span>
                      </div>
                      <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {p.name || 'Sin descripción'} {p.material ? `· ${p.material}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                    <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400 mr-1">
                      {p.printCount || 0} confirmadas
                    </span>
                    <button
                      onClick={() => onSelectPieceForEditor(p)}
                      className="px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onQuickPrintPiece(p)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded transition-colors flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real Print Jobs / Audit Log (Col span 1) */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Auditoría de Despachos
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                Historial real verificado
              </p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:underline"
            >
              Ver registro
            </button>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5 flex-1 overflow-y-auto">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs space-y-1">
                <Clock className="w-5 h-5 mx-auto text-neutral-400 mb-2 opacity-50" />
                <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Sin registros de impresión
                </div>
                <div className="text-[11px] text-neutral-400">
                  Al despachar una etiqueta a Zebra o exportar PDF se iniciará la trazabilidad real.
                </div>
              </div>
            ) : (
              recentJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[140px]">
                      {job.pieceCode}
                    </span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      job.status === 'confirmada'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : job.status === 'enviada'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : job.status === 'descargada'
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}>
                      {job.status === 'confirmada' ? '✓ Confirmada' : job.status === 'enviada' ? '↗ Enviada a cola' : job.status === 'descargada' ? '↓ Descargada' : '⚠ Fallida'}
                    </span>
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 flex items-center justify-between text-[11px] pt-0.5">
                    <span>{job.copies} copia{job.copies > 1 ? 's' : ''} · {job.target.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Real footnote */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between">
            <span className="text-neutral-500">Resolución activa:</span>
            <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
              {templates[0]?.dpi || 203} DPI (8 dots/mm)
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
