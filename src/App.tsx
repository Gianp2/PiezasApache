import React, { useState, useEffect } from 'react';
import { 
  Piece, 
  LabelTemplate, 
  PrintJob, 
  ZebraPrinterConfig 
} from './types/index.ts';
import { 
  initDatabase, 
  getAllPieces, 
  savePiece, 
  saveMultiplePieces, 
  deletePiece, 
  getAllTemplates, 
  saveTemplate, 
  deleteTemplate, 
  getPrintHistory, 
  recordPrintJob, 
  clearPrintHistory, 
  getZebraConfig, 
  saveZebraConfig,
  incrementPiecePrintCount
} from './services/db.ts';
import { 
  checkZebraBrowserPrint, 
  ZebraStatusResult 
} from './services/zebra/zebraBrowserPrint.ts';
import { Header, NavView } from './components/layout/Header.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { EditorView } from './components/editor/EditorView.tsx';
import { PartsLibraryView } from './components/library/PartsLibraryView.tsx';
import { TemplatesView } from './components/templates/TemplatesView.tsx';
import { BatchImportView } from './components/batch/BatchImportView.tsx';
import { HistoryView } from './components/history/HistoryView.tsx';
import { PrinterSettingsView } from './components/settings/PrinterSettingsView.tsx';
import { PrintModal } from './components/modals/PrintModal.tsx';
import { NewPieceModal } from './components/modals/NewPieceModal.tsx';
import { exportLabelPdf, downloadLabelPng } from './services/export/pdfExport.ts';
import { generateZpl } from './services/zpl/zplGenerator.ts';
import { downloadZplFile } from './services/zebra/zebraBrowserPrint.ts';

export default function App() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintJob[]>([]);
  const [zebraConfig, setZebraConfig] = useState<ZebraPrinterConfig | null>(null);
  const [zebraStatus, setZebraStatus] = useState<ZebraStatusResult>({ isAvailable: false, devices: [] });

  // Active items for editor
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate | null>(null);

  // Global modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isNewPieceModalOpen, setIsNewPieceModalOpen] = useState<boolean>(false);
  const [modalTargetPiece, setModalTargetPiece] = useState<Piece | null>(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('label_studio_theme') === 'dark';
  });

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('label_studio_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('label_studio_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Load from IndexedDB & Zebra Probe
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        const loadedPieces = await getAllPieces();
        const loadedTemplates = await getAllTemplates();
        const loadedHistory = await getPrintHistory();
        const loadedConfig = await getZebraConfig();

        setPieces(loadedPieces);
        setTemplates(loadedTemplates);
        setPrintHistory(loadedHistory);
        setZebraConfig(loadedConfig);

        if (loadedPieces.length > 0) {
          setCurrentPiece(loadedPieces[0]);
        }
        if (loadedTemplates.length > 0) {
          setCurrentTemplate(loadedTemplates.find((t) => t.isDefault) || loadedTemplates[0]);
        }

        // Probe Zebra local Browser Print
        const status = await checkZebraBrowserPrint(loadedConfig.browserPrintUrl);
        setZebraStatus(status);
      } catch (err) {
        console.error('Error initializing Label Studio Industrial DB:', err);
      } finally {
        setIsInitialized(true);
      }
    }
    setup();
  }, []);

  const refreshZebraStatus = async () => {
    if (!zebraConfig) return;
    const status = await checkZebraBrowserPrint(zebraConfig.browserPrintUrl);
    setZebraStatus(status);
  };

  // Switch to Editor with specific Piece
  const handleSelectPieceForEditor = (piece: Piece) => {
    setCurrentPiece(piece);
    if (piece.templateId) {
      const matchTpl = templates.find((t) => t.id === piece.templateId);
      if (matchTpl) setCurrentTemplate(matchTpl);
    }
    setCurrentView('editor');
  };

  // Direct print piece shortcut
  const handleQuickPrintPiece = (piece: Piece, copies: number = 1) => {
    setModalTargetPiece(piece);
    setIsPrintModalOpen(true);
  };

  // Save new piece from upload wizard
  const handlePieceCreated = async (newPiece: Piece, targetTemplateId?: string) => {
    await savePiece(newPiece);
    const updated = await getAllPieces();
    setPieces(updated);
    setCurrentPiece(newPiece);

    if (targetTemplateId) {
      const match = templates.find((t) => t.id === targetTemplateId);
      if (match) setCurrentTemplate(match);
    }

    setCurrentView('editor');
  };

  // Update piece
  const handleUpdatePiece = async (piece: Piece) => {
    await savePiece(piece);
    setPieces((prev) => prev.map((p) => (p.id === piece.id ? piece : p)));
    if (currentPiece?.id === piece.id) {
      setCurrentPiece(piece);
    }
  };

  // Duplicate piece
  const handleDuplicatePiece = async (piece: Piece) => {
    const dup: Piece = {
      ...piece,
      id: `piece-${Date.now()}`,
      code: `${piece.code}-COPY`,
      name: `${piece.name || ''} (Copia)`,
      createdAt: Date.now(),
      printCount: 0
    };
    await savePiece(dup);
    const updated = await getAllPieces();
    setPieces(updated);
  };

  // Delete piece
  const handleDeletePiece = async (id: string) => {
    await deletePiece(id);
    const updated = await getAllPieces();
    setPieces(updated);
    if (currentPiece?.id === id && updated.length > 0) {
      setCurrentPiece(updated[0]);
    }
  };

  // Save batch pieces
  const handleSaveImportedPieces = async (newPieces: Piece[]) => {
    await saveMultiplePieces(newPieces);
    const updated = await getAllPieces();
    setPieces(updated);
  };

  // Update current template
  const handleUpdateTemplate = async (template: LabelTemplate) => {
    setCurrentTemplate(template);
    await saveTemplate(template);
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
  };

  // Save as new template
  const handleSaveTemplateAsNew = async (newTemplate: LabelTemplate) => {
    await saveTemplate(newTemplate);
    const updated = await getAllTemplates();
    setTemplates(updated);
    setCurrentTemplate(newTemplate);
  };

  // Duplicate template
  const handleDuplicateTemplate = async (template: LabelTemplate) => {
    const dup: LabelTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copia)`,
      isDefault: false,
      isCustom: true,
      createdAt: Date.now()
    };
    await saveTemplate(dup);
    const updated = await getAllTemplates();
    setTemplates(updated);
  };

  // Set default template
  const handleSetDefaultTemplate = async (id: string) => {
    const updated = templates.map((t) => ({ ...t, isDefault: t.id === id }));
    for (const t of updated) {
      await saveTemplate(t);
    }
    setTemplates(updated);
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate(id);
    const updated = await getAllTemplates();
    setTemplates(updated);
    if (currentTemplate?.id === id && updated.length > 0) {
      setCurrentTemplate(updated[0]);
    }
  };

  // Create new custom template
  const handleCreateNewTemplate = async () => {
    const newTpl: LabelTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: 'Nueva Plantilla Personalizada',
      description: 'Plantilla de 80×50 mm configurable',
      widthMm: 80,
      heightMm: 50,
      orientation: 'landscape',
      dpi: 203,
      marginMm: 2,
      isDefault: false,
      isCustom: true,
      createdAt: Date.now(),
      elements: [
        {
          id: `el-code-${Date.now()}`,
          type: 'code',
          xMm: 3,
          yMm: 3,
          widthMm: 45,
          heightMm: 7,
          fontSizePt: 13,
          fontWeight: 'bold'
        },
        {
          id: `el-drawing-${Date.now()}`,
          type: 'drawing',
          xMm: 3,
          yMm: 12,
          widthMm: 40,
          heightMm: 34,
          strokeWidthMm: 0.5
        }
      ]
    };
    await saveTemplate(newTpl);
    const updated = await getAllTemplates();
    setTemplates(updated);
    setCurrentTemplate(newTpl);
    setCurrentView('editor');
  };

  // Record print job
  const handleRecordPrintJob = async (job: PrintJob) => {
    await recordPrintJob(job);
    if (job.status === 'confirmada') {
      await incrementPiecePrintCount(job.pieceId, job.copies);
      const updatedPieces = await getAllPieces();
      setPieces(updatedPieces);
    }
    const updatedHistory = await getPrintHistory();
    setPrintHistory(updatedHistory);
  };

  // Explicit confirmation of physical printout
  const handleConfirmPrintJob = async (jobId: string) => {
    const job = printHistory.find((j) => j.id === jobId);
    if (job && (job.status === 'enviada' || job.status === 'descargada')) {
      const updatedJob: PrintJob = { ...job, status: 'confirmada' };
      await recordPrintJob(updatedJob);
      await incrementPiecePrintCount(job.pieceId, job.copies);
      const updatedPieces = await getAllPieces();
      setPieces(updatedPieces);
      const updatedHistory = await getPrintHistory();
      setPrintHistory(updatedHistory);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    await clearPrintHistory();
    setPrintHistory([]);
  };

  // Update Zebra config
  const handleUpdateZebraConfig = async (newConfig: ZebraPrinterConfig) => {
    await saveZebraConfig(newConfig);
    setZebraConfig(newConfig);
  };

  // Direct editor actions
  const handleEditorDownloadZpl = async () => {
    if (!currentTemplate || !currentPiece) return;
    const zpl = await generateZpl(currentTemplate, currentPiece);
    downloadZplFile(zpl, `etiqueta_${currentPiece.code}_${currentTemplate.widthMm}x${currentTemplate.heightMm}mm.zpl`);
  };

  const handleEditorExportPdf = async () => {
    if (!currentTemplate || !currentPiece) return;
    await exportLabelPdf(currentTemplate, currentPiece, 1);
  };

  const handleEditorExportPng = async () => {
    if (!currentTemplate || !currentPiece) return;
    await downloadLabelPng(currentTemplate, currentPiece);
  };

  if (!isInitialized || !zebraConfig || !currentTemplate || !currentPiece) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-sm animate-pulse mb-3">
          <span className="font-mono">L</span>
        </div>
        <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          Iniciando Label Studio Industrial...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col w-full overflow-x-hidden">
      
      {/* Top Header */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        zebraStatus={zebraStatus}
        onOpenNewPiece={() => setIsNewPieceModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Body Router */}
      <main className="flex-1">
        {currentView === 'dashboard' && (
          <DashboardView
            pieces={pieces}
            templates={templates}
            printHistory={printHistory}
            zebraStatus={zebraStatus}
            onNavigate={setCurrentView}
            onSelectPieceForEditor={handleSelectPieceForEditor}
            onQuickPrintPiece={(p) => handleQuickPrintPiece(p)}
            onOpenNewPiece={() => setIsNewPieceModalOpen(true)}
          />
        )}

        {currentView === 'editor' && (
          <EditorView
            currentPiece={currentPiece}
            pieces={pieces}
            onSelectPiece={setCurrentPiece}
            currentTemplate={currentTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onSaveTemplateAsNew={handleSaveTemplateAsNew}
            onUpdatePiece={handleUpdatePiece}
            onOpenPrintModal={() => {
              setModalTargetPiece(currentPiece);
              setIsPrintModalOpen(true);
            }}
            onDownloadZpl={handleEditorDownloadZpl}
            onExportPdf={handleEditorExportPdf}
            onExportPng={handleEditorExportPng}
          />
        )}

        {currentView === 'library' && (
          <PartsLibraryView
            pieces={pieces}
            templates={templates}
            onSelectPieceForEditor={handleSelectPieceForEditor}
            onQuickPrintPiece={(p) => handleQuickPrintPiece(p)}
            onDuplicatePiece={handleDuplicatePiece}
            onDeletePiece={handleDeletePiece}
            onOpenNewPiece={() => setIsNewPieceModalOpen(true)}
          />
        )}

        {currentView === 'templates' && (
          <TemplatesView
            templates={templates}
            onSelectTemplate={(tpl) => {
              setCurrentTemplate(tpl);
              setCurrentView('editor');
            }}
            onSetDefaultTemplate={handleSetDefaultTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateNewTemplate={handleCreateNewTemplate}
          />
        )}

        {currentView === 'batch' && (
          <BatchImportView
            templates={templates}
            onSaveImportedPieces={handleSaveImportedPieces}
            zebraStatus={zebraStatus}
            onNavigateToHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            history={printHistory}
            pieces={pieces}
            onRePrint={(p, copies) => handleQuickPrintPiece(p, copies)}
            onClearHistory={handleClearHistory}
            onConfirmPrintJob={handleConfirmPrintJob}
          />
        )}

        {currentView === 'settings' && (
          <PrinterSettingsView
            zebraConfig={zebraConfig}
            onUpdateConfig={handleUpdateZebraConfig}
            zebraStatus={zebraStatus}
            onRefreshZebraStatus={refreshZebraStatus}
          />
        )}
      </main>

      {/* Global Print Modal */}
      {isPrintModalOpen && (
        <PrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setModalTargetPiece(null);
          }}
          piece={modalTargetPiece || currentPiece}
          template={currentTemplate}
          zebraStatus={zebraStatus}
          onRecordPrintJob={handleRecordPrintJob}
        />
      )}

      {/* Global New Piece Modal */}
      {isNewPieceModalOpen && (
        <NewPieceModal
          isOpen={isNewPieceModalOpen}
          onClose={() => setIsNewPieceModalOpen(false)}
          templates={templates}
          onPieceCreated={handlePieceCreated}
        />
      )}

    </div>
  );
}
