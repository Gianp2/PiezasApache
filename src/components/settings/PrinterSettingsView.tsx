import React, { useState } from 'react';
import { 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Code, 
  Database, 
  Download, 
  Upload, 
  Usb, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Play
} from 'lucide-react';
import { ZebraPrinterConfig } from '../../types/index.ts';
import { 
  ZebraStatusResult, 
  checkZebraBrowserPrint, 
  sendZplToZebra, 
  sendZplViaWebUsb 
} from '../../services/zebra/zebraBrowserPrint.ts';
import { 
  exportDatabaseBackup, 
  importDatabaseBackup 
} from '../../services/db.ts';
import { runUniversalRecognizerTests, TestCaseResult } from '../../services/cad/testSuite.ts';

interface PrinterSettingsViewProps {
  zebraConfig: ZebraPrinterConfig;
  onUpdateConfig: (config: ZebraPrinterConfig) => void;
  zebraStatus: ZebraStatusResult;
  onRefreshZebraStatus: () => void;
}

const SAMPLE_TEST_ZPL = `^XA
^PW640
^LL400
^LS0
^CI28
^FO50,40^A0N,40,32^FDLABEL STUDIO INDUSTRIAL^FS
^FO50,90^A0N,24,20^FDTEST IMPRESION ZEBRA OK^FS
^FO50,130^GB540,2,2^FS
^FO50,150^BCN,70,Y,N,N,A^FDTEST-ZEBRA-2026^FS
^FO380,150^BQN,2,5^FDQA,https://labelstudio.industrial^FS
^FO50,280^A0N,20,18^FDResolucion: 203 DPI (8 dots/mm)^FS
^FO50,310^A0N,18,16^FDConexion: Zebra Browser Print^FS
^PQ1,0,1,Y
^XZ`;

export const PrinterSettingsView: React.FC<PrinterSettingsViewProps> = ({
  zebraConfig,
  onUpdateConfig,
  zebraStatus,
  onRefreshZebraStatus
}) => {
  const [testZpl, setTestZpl] = useState<string>(SAMPLE_TEST_ZPL);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [testSuiteResults, setTestSuiteResults] = useState<TestCaseResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const handleRunTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const results = await runUniversalRecognizerTests();
      setTestSuiteResults(results);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);

    if (zebraConfig.connectionType === 'webusb') {
      const res = await sendZplViaWebUsb(testZpl);
      setTestResult(res);
    } else {
      const res = await sendZplToZebra(testZpl, zebraStatus.activeDevice, zebraConfig.browserPrintUrl);
      setTestResult(res);
    }
    setIsTesting(false);
  };

  const handleCopyZpl = () => {
    navigator.clipboard.writeText(testZpl);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const handleDownloadBackup = async () => {
    try {
      const json = await exportDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_label_studio_industrial_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('Copia de seguridad descargada correctamente.');
    } catch (e: any) {
      setBackupStatus(`Error al exportar: ${e.message}`);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importDatabaseBackup(text);
      setBackupStatus(`Restauración exitosa: ${res.piecesCount} piezas y ${res.templatesCount} plantillas recuperadas.`);
      window.location.reload();
    } catch (err: any) {
      setBackupStatus(`Error en la restauración: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Configuración de Impresora Zebra & Sistema
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Conexión con Zebra Browser Print, emulación ZPL II, calibración térmica y copias de seguridad.
          </p>
        </div>

        <button
          onClick={onRefreshZebraStatus}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sondear Impresoras</span>
        </button>
      </div>

      {/* Grid: Zebra Connection & Hardware Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Zebra Connection Status & Test */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Connection Status Box */}
          <div className="p-5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  zebraStatus.isAvailable 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {zebraStatus.isAvailable ? 'Servicio Zebra Browser Print Detectado' : 'Zebra Browser Print No Detectado'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {zebraStatus.isAvailable 
                      ? 'Conexión local activa en http://127.0.0.1:9100' 
                      : 'El software oficial de Zebra no responde en el puerto local 9100'}
                  </p>
                </div>
              </div>

              {zebraStatus.isAvailable ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>En Línea</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Fuera de Línea</span>
                </span>
              )}
            </div>

            {/* If offline, give transparent instructions */}
            {!zebraStatus.isAvailable && (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Cómo habilitar la impresión directa desde el navegador?
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Instale y ejecute <strong>Zebra Browser Print</strong> en su estación de trabajo Windows o Mac.</li>
                  <li>Acepte el certificado SSL local en el navegador visitando <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">https://localhost:9101</code>.</li>
                  <li>Asegúrese de que su impresora Zebra (ZD420, ZT230, GK420t, etc.) esté encendida y conectada por USB o Red.</li>
                  <li>También puede usar el modo <strong>WebUSB Directo</strong> o descargar el archivo <strong>.ZPL</strong> para imprimir vía Zebra Setup Utilities.</li>
                </ol>
              </div>
            )}

            {/* Connection Mode Selection */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...zebraConfig, connectionType: 'browser_print' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  zebraConfig.connectionType === 'browser_print'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Printer className="w-4 h-4" />
                  <span>Zebra Browser Print (Daemon)</span>
                </div>
                <div className="text-[11px] font-normal text-neutral-500">
                  Puerto local 9100 / 9101 (Recomendado fábrica)
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateConfig({ ...zebraConfig, connectionType: 'webusb' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  zebraConfig.connectionType === 'webusb'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Usb className="w-4 h-4" />
                  <span>WebUSB Directo (Chrome / Edge)</span>
                </div>
                <div className="text-[11px] font-normal text-neutral-500">
                  Transmisión directa por cable USB (Vendor ID 0x0A5F)
                </div>
              </button>
            </div>
          </div>

          {/* Live ZPL Simulator & Code Inspector */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Inspector de Comandos ZPL II
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyZpl}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  {copiedZpl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedZpl ? 'Copiado' : 'Copiar ZPL'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={testZpl}
              onChange={(e) => setTestZpl(e.target.value)}
              rows={8}
              className="w-full p-3 font-mono text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-900 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />

            {/* Test result status message */}
            {testResult && (
              <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                testResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200' 
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200'
              }`}>
                <span>{testResult.message}</span>
                <button onClick={() => setTestResult(null)} className="font-bold ml-2">×</button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-neutral-400 font-mono">
                Sintaxis compatible con Zebra Programming Language II
              </span>
              <button
                onClick={handleTestPrint}
                disabled={isTesting}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>{isTesting ? 'Enviando a Zebra...' : 'Enviar Etiqueta de Prueba'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Thermal Hardware Parameters & Database Backups */}
        <div className="space-y-6">
          
          {/* Thermal Printhead Parameters */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Parámetros del Cabezal Térmico
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Resolución del Cabezal
                </span>
                <select
                  value={zebraConfig.dpi}
                  onChange={(e) => onUpdateConfig({ ...zebraConfig, dpi: Number(e.target.value) as any })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                >
                  <option value="203">203 DPI (8 puntos por mm) - Estándar</option>
                  <option value="300">300 DPI (12 puntos por mm) - Alta definición</option>
                  <option value="600">600 DPI (24 puntos por mm) - Microcomponentes</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Oscuridad / Temperatura (~SD)
                  </span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">
                    {zebraConfig.darkness} / 30
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={zebraConfig.darkness}
                  onChange={(e) => onUpdateConfig({ ...zebraConfig, darkness: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <span className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Tipo de Soporte Térmico
                </span>
                <select
                  value={zebraConfig.mediaType}
                  onChange={(e) => onUpdateConfig({ ...zebraConfig, mediaType: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                >
                  <option value="thermal_transfer">Transferencia Térmica (Con Cinta Ribbon)</option>
                  <option value="direct_thermal">Térmico Directo (Papel Termosensible)</option>
                </select>
              </div>

              <div>
                <span className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Velocidad de Impresión (^PR)
                </span>
                <select
                  value={zebraConfig.printSpeed}
                  onChange={(e) => onUpdateConfig({ ...zebraConfig, printSpeed: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                >
                  <option value="2">2 pulgadas/segundo (Máxima nitidez)</option>
                  <option value="3">3 pulgadas/segundo</option>
                  <option value="4">4 pulgadas/segundo (Estándar)</option>
                  <option value="6">6 pulgadas/segundo (Alta velocidad)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Backup & Restore (Requirement 12) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Respaldo y Restauración Local
              </h3>
            </div>
            <p className="text-xs text-neutral-500">
              Guarde una copia completa en archivo JSON de todas las piezas, dibujos procesados y plantillas almacenadas en IndexedDB.
            </p>

            {backupStatus && (
              <div className="p-2.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300 font-mono">
                {backupStatus}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleDownloadBackup}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Copia de Seguridad JSON</span>
              </button>

              <label className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Restaurar desde archivo JSON...</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Automated Test Suite & Quality Verification (Requirement 6) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Pruebas del Motor de Reconocimiento
                </h3>
              </div>
              <button
                onClick={handleRunTestSuite}
                disabled={isRunningTests}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                <span>{isRunningTests ? 'Ejecutando...' : 'Ejecutar Pruebas'}</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Verifica formatos válidos (DXF, SVG, PNG), archivos con extensiones incorrectas (.txt a DXF), firmas DWG/PDF, manejo de archivos corruptos y generación física ZPL/PDF.
            </p>

            {testSuiteResults && (
              <div className="space-y-1.5 pt-2 max-h-56 overflow-y-auto">
                {testSuiteResults.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        {t.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        )}
                        <span>{t.name}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{t.message}</div>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400 shrink-0">
                      {t.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
