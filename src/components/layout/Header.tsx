import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Layers, 
  FileSpreadsheet, 
  FolderArchive, 
  Settings, 
  PlusCircle, 
  History, 
  LayoutDashboard,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { ZebraStatusResult } from '../../services/zebra/zebraBrowserPrint.ts';
import { useScrollLock } from '../../services/scrollLock.ts';

export type NavView = 
  | 'dashboard' 
  | 'editor' 
  | 'library' 
  | 'templates' 
  | 'batch' 
  | 'history' 
  | 'settings';

interface HeaderProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  zebraStatus: ZebraStatusResult;
  onOpenNewPiece: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface NavItemConfig {
  view: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'editor', label: 'Editor de Etiquetas', icon: Edit3 },
  { view: 'library', label: 'Biblioteca de Piezas', icon: FolderArchive },
  { view: 'templates', label: 'Plantillas de Rotulación', icon: LayoutTemplate },
  { view: 'batch', label: 'Importación Masiva (Lotes)', icon: Layers },
  { view: 'history', label: 'Historial de Impresión', icon: History },
  { view: 'settings', label: 'Configuración Zebra', icon: Printer }
];

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  zebraStatus,
  onOpenNewPiece,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Universal scroll lock when drawer is open
  useScrollLock(mobileMenuOpen);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 h-14 sm:h-15">
        
        {/* Zone 1: Single Brand Wordmark & Hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={() => handleNavClick('dashboard')} 
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm sm:text-base shadow-xs">
              <span className="font-mono">L</span>
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
              Label Studio
              <span className="hidden xs:inline"> Industrial</span>
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links for Desktop & Tablet Landscape */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`whitespace-nowrap transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 py-1 ${
                  isActive ? 'text-neutral-900 dark:text-neutral-100 font-semibold border-b-2 border-neutral-900 dark:border-neutral-100' : ''
                }`}
              >
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Zebra Status, Dark Mode & Primary Action */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Printer status badge (responsive) */}
          <button
            onClick={() => handleNavClick('settings')}
            title={zebraStatus.isAvailable ? `Zebra conectada (${zebraStatus.activeDevice?.name || 'Local'})` : 'Zebra no detectada'}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-mono rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline text-neutral-700 dark:text-neutral-300">
              {zebraStatus.isAvailable ? 'Online' : 'Offline'}
            </span>
            {zebraStatus.isAvailable ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-500" />
            )}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-sm"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? '☼' : '☾'}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenNewPiece}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Nueva Etiqueta</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Modern Left-sliding Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer Sidebar */}
          <div 
            className="fixed inset-y-0 left-0 w-[290px] sm:w-[320px] max-w-[85vw] h-full bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col border-r border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal de navegación"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-xs">
                  <span className="font-mono">L</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                    Label Studio Industrial
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    CAD & Impresión Zebra ZPL
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Options List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1.5">
                Navegación
              </div>

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left min-h-[44px] ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-xs'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer with Quick Hardware Status */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">Impresora Zebra:</span>
                <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                  zebraStatus.isAvailable ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {zebraStatus.isAvailable ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenNewPiece();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 transition-colors shadow-xs min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cargar Nueva Pieza CAD</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
