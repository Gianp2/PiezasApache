import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Copy, 
  Trash2, 
  FileUp, 
  Download, 
  Check, 
  LayoutGrid, 
  List,
  Calendar,
  Layers
} from 'lucide-react';
import { Piece, LabelTemplate } from '../../types/index.ts';

interface PartsLibraryViewProps {
  pieces: Piece[];
  templates: LabelTemplate[];
  onSelectPieceForEditor: (piece: Piece) => void;
  onQuickPrintPiece: (piece: Piece) => void;
  onDuplicatePiece: (piece: Piece) => void;
  onDeletePiece: (id: string) => void;
  onOpenNewPiece: () => void;
}

export const PartsLibraryView: React.FC<PartsLibraryViewProps> = ({
  pieces,
  templates,
  onSelectPieceForEditor,
  onQuickPrintPiece,
  onDuplicatePiece,
  onDeletePiece,
  onOpenNewPiece
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter pieces
  const filteredPieces = pieces.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.material && p.material.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFormat = selectedFormat === 'all' || p.fileType === selectedFormat;

    return matchesSearch && matchesFormat;
  });

  const downloadSvg = (p: Piece) => {
    const blob = new Blob([p.rawSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.code}_contorno.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Biblioteca de Piezas
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestione planos procesados, geometrías vectoriales e histórico de rotulación técnica.
          </p>
        </div>

        <button
          onClick={onOpenNewPiece}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition-colors shadow-xs"
        >
          <FileUp className="w-4 h-4" />
          <span>Añadir Nueva Pieza</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, descripción, material o plano..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          />
        </div>

        {/* Format Selectors and View Mode */}
        <div className="flex items-center gap-2">
          {/* Format Tabs (Interactive filter control) */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs">
            {['all', 'dxf', 'svg', 'png', 'jpg'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                {fmt === 'all' ? 'Todos' : fmt.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Grid / Table Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Content Area */}
      {filteredPieces.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            No se encontraron piezas que coincidan con la búsqueda.
          </p>
          <p className="text-xs text-neutral-500">
            Intente cambiar los filtros o cargue un nuevo plano.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPieces.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
            >
              {/* Drawing Preview Area */}
              <div
                onClick={() => onSelectPieceForEditor(p)}
                className="h-44 bg-neutral-50 dark:bg-neutral-950 p-4 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 cursor-pointer group"
              >
                <div
                  className="w-full h-full max-h-36 flex items-center justify-center text-neutral-800 dark:text-neutral-200 group-hover:scale-105 transition-transform [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: p.rawSvg }}
                />
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {p.code}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase shrink-0">
                      {p.fileType}
                    </span>
                  </div>
                  
                  <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate mt-1">
                    {p.name || 'Sin descripción'}
                  </h3>

                  {p.material && (
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      Material: {p.material}
                    </div>
                  )}

                  <div className="text-[11px] text-neutral-400 mt-2 truncate">
                    Archivo: {p.originalFileName}
                  </div>
                </div>

                {/* Footer with Stats & Action Buttons */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                    {p.printCount || 0} impresas
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => downloadSvg(p)}
                      title="Descargar contorno SVG"
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicatePiece(p)}
                      title="Duplicar pieza"
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePiece(p.id)}
                      title="Eliminar pieza"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onQuickPrintPiece(p)}
                      className="ml-1 px-3 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-3 px-4">Contorno</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Descripción / Material</th>
                  <th className="py-3 px-4">Archivo Original</th>
                  <th className="py-3 px-4 text-right">Impresiones</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredPieces.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div 
                        onClick={() => onSelectPieceForEditor(p)}
                        className="w-10 h-10 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 flex items-center justify-center p-0.5 cursor-pointer"
                      >
                        <div 
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: p.rawSvg }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {p.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">{p.name || '—'}</div>
                      <div className="text-[11px] text-neutral-500">{p.material || 'Material no especificado'}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500">
                      {p.originalFileName}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                      {p.printCount || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectPieceForEditor(p)}
                          className="px-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onQuickPrintPiece(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded"
                        >
                          Imprimir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredPieces.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => onSelectPieceForEditor(p)}
                    className="w-12 h-12 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-1 cursor-pointer shrink-0"
                  >
                    <div 
                      className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: p.rawSvg }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {p.code}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase shrink-0">
                        {p.fileType}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-700 dark:text-neutral-300 truncate mt-0.5">
                      {p.name || 'Sin descripción'}
                    </div>
                    {p.material && (
                      <div className="text-[11px] text-neutral-500 truncate">
                        {p.material}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                    {p.printCount || 0} impresas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectPieceForEditor(p)}
                      className="px-3 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 min-h-[36px]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onQuickPrintPiece(p)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded min-h-[36px] flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
