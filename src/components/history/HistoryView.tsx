import React from 'react';
import { 
  History, 
  Printer, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Check,
  Send,
  Clock
} from 'lucide-react';
import { PrintJob, Piece, PrintJobStatus } from '../../types/index.ts';

interface HistoryViewProps {
  history: PrintJob[];
  pieces: Piece[];
  onRePrint: (piece: Piece, copies: number) => void;
  onClearHistory: () => void;
  onConfirmPrintJob?: (jobId: string) => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  pieces,
  onRePrint,
  onClearHistory,
  onConfirmPrintJob
}) => {
  const exportHistoryCsv = () => {
    if (history.length === 0) return;
    const header = 'ID,Fecha,Codigo,Nombre,Copias,Plantilla,Destino,Estado\n';
    const rows = history
      .map(
        (j) =>
          `"${j.id}","${new Date(j.timestamp).toISOString()}","${j.pieceCode}","${j.pieceName || ''}",${j.copies},"${j.templateName || ''}","${j.target}","${j.status}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_auditoria_impresion_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: PrintJobStatus) => {
    switch (status) {
      case 'confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Físicamente Confirmada</span>
          </span>
        );
      case 'enviada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
            <Send className="w-3 h-3" />
            <span>Enviada a Impresora</span>
          </span>
        );
      case 'descargada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <Download className="w-3 h-3" />
            <span>Descargada (PDF/ZPL)</span>
          </span>
        );
      case 'fallida':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200">
            <AlertCircle className="w-3 h-3" />
            <span>Error de Envío</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-neutral-500 font-mono">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4 sm:pb-5">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Historial de Impresión & Trazabilidad
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 sm:mt-1">
            Registro auditable de etiquetas despachadas, trabajos en cola y confirmaciones físicas de operario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={exportHistoryCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Registro</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {history.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2">
          <Clock className="w-8 h-8 text-neutral-400 mx-auto opacity-50 mb-3" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Sin operaciones registradas
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            El historial se inicia automáticamente al imprimir con Zebra, descargar archivos ZPL o exportar documentos PDF en medidas reales.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-3">
            {history.map((job) => {
              const associatedPiece = pieces.find((p) => p.code === job.pieceCode || p.id === job.pieceId);

              return (
                <div
                  key={job.id}
                  className="p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {job.pieceCode}
                      </span>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-0.5">
                        {job.pieceName || 'Sin descripción'}
                      </div>
                    </div>
                    <div>{getStatusBadge(job.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-neutral-100 dark:border-neutral-800 text-neutral-500">
                    <div>
                      Fecha: <span className="font-mono text-neutral-800 dark:text-neutral-200">{new Date(job.timestamp).toLocaleDateString()} {new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      Copias: <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{job.copies}</span>
                    </div>
                    <div className="truncate">
                      Destino: <span className="text-neutral-700 dark:text-neutral-300 capitalize">{job.target.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="truncate">
                      Plantilla: <span className="text-neutral-700 dark:text-neutral-300">{job.templateName || job.labelDimensions}</span>
                    </div>
                  </div>

                  {job.errorMessage && (
                    <div className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/40 p-2 rounded">
                      {job.errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    {job.status === 'enviada' && onConfirmPrintJob && (
                      <button
                        onClick={() => onConfirmPrintJob(job.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Confirmar Salida Física</span>
                      </button>
                    )}
                    {associatedPiece && (
                      <button
                        onClick={() => onRePrint(associatedPiece, job.copies)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reimprimir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Código de Pieza</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-center">Copias</th>
                  <th className="py-3 px-4">Destino / Impresora</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {history.map((job) => {
                  const associatedPiece = pieces.find((p) => p.code === job.pieceCode || p.id === job.pieceId);

                  return (
                    <tr key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(job.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {job.pieceCode}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400 truncate max-w-xs">
                        {job.pieceName || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {job.copies}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 capitalize">
                        {job.printerName || job.target.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === 'enviada' && onConfirmPrintJob && (
                            <button
                              onClick={() => onConfirmPrintJob(job.id)}
                              title="Marcar confirmada tras verificar etiqueta impresa en bandeja"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span className="hidden lg:inline">Confirmar Salida</span>
                            </button>
                          )}
                          {associatedPiece && (
                            <button
                              onClick={() => onRePrint(associatedPiece, job.copies)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reimprimir</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
};
