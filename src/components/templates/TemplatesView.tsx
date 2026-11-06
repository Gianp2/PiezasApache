import React from 'react';
import { 
  LayoutTemplate, 
  Check, 
  Copy, 
  Trash2, 
  Sliders, 
  Plus, 
  Star,
  Download,
  Upload
} from 'lucide-react';
import { LabelTemplate } from '../../types/index.ts';

interface TemplatesViewProps {
  templates: LabelTemplate[];
  onSelectTemplate: (template: LabelTemplate) => void;
  onSetDefaultTemplate: (id: string) => void;
  onDuplicateTemplate: (template: LabelTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateNewTemplate: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSelectTemplate,
  onSetDefaultTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onCreateNewTemplate
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Plantillas de Rotulación
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Formatos estandarizados en milímetros con distribución fija para diferentes tamaños de etiqueta y líneas de producción.
          </p>
        </div>

        <button
          onClick={onCreateNewTemplate}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Plantilla</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`bg-white dark:bg-neutral-900 rounded-lg border overflow-hidden flex flex-col transition-all ${
              tpl.isDefault
                ? 'border-neutral-900 dark:border-neutral-400 ring-1 ring-neutral-900/10'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            {/* Schematic Mockup Box */}
            <div 
              onClick={() => onSelectTemplate(tpl)}
              className="h-44 bg-neutral-100 dark:bg-neutral-950 p-6 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 cursor-pointer group"
            >
              <div 
                style={{
                  aspectRatio: `${tpl.widthMm} / ${tpl.heightMm}`,
                  maxHeight: '140px',
                  maxWidth: '240px'
                }}
                className="w-full bg-white shadow-md rounded-xs border border-neutral-300 relative p-2 overflow-hidden flex flex-col justify-between group-hover:scale-102 transition-transform"
              >
                <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-900">
                  <LayoutTemplate className="w-8 h-8 text-neutral-400" />
                  <span className="text-[9px] font-semibold text-center truncate max-w-full">{tpl.name}</span>
                  <span className="text-[8px] text-neutral-500 text-center">{tpl.elements.filter(el => el.visible !== false).map(el => ({ drawing: 'Dibujo', name: 'Nombre', code: 'Código', barcode: 'Barras', qrcode: 'QR' } as Record<string,string>)[el.type] || 'Otro').join(' · ')}</span>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {tpl.name}
                  </h3>
                  {tpl.isDefault && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 uppercase">
                      Predeterminada
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {tpl.description}
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                  <span>{tpl.widthMm} × {tpl.heightMm} mm</span>
                  <span>·</span>
                  <span>{tpl.dpi} DPI</span>
                  <span>·</span>
                  <span>{tpl.elements.length} elementos</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {!tpl.isDefault && (
                    <button
                      onClick={() => onSetDefaultTemplate(tpl.id)}
                      title="Establecer como predeterminada"
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-amber-500"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDuplicateTemplate(tpl)}
                    title="Duplicar plantilla"
                    className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {tpl.isCustom && (
                    <button
                      onClick={() => onDeleteTemplate(tpl.id)}
                      title="Eliminar plantilla"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectTemplate(tpl)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                >
                  Editar / Guardar
                </button>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
