import { Piece, LabelTemplate, PrintJob, ZebraPrinterConfig } from '../types/index.ts';
import { INITIAL_PIECES, INITIAL_TEMPLATES } from './sampleData.ts';

const DB_NAME = 'LabelStudioIndustrialDB';
const DB_VERSION = 1;

export const DEFAULT_ZEBRA_CONFIG: ZebraPrinterConfig = {
  connectionType: 'browser_print',
  browserPrintUrl: 'http://127.0.0.1:9100',
  selectedPrinterName: 'Zebra ZD420 (203dpi)',
  dpi: 203,
  darkness: 20,
  printSpeed: 4,
  mediaType: 'thermal_transfer',
  labelWidthMm: 80,
  labelHeightMm: 50,
  marginMm: 2
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('pieces')) {
        const pieceStore = db.createObjectStore('pieces', { keyPath: 'id' });
        pieceStore.createIndex('code', 'code', { unique: false });
        pieceStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('templates')) {
        const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
        templateStore.createIndex('isDefault', 'isDefault', { unique: false });
      }

      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initialize seed data if database is empty
export async function initDatabase(): Promise<void> {
  const db = await openDB();

  // Check pieces
  const pieces = await getAllPieces();
  if (pieces.length === 0) {
    const tx = db.transaction('pieces', 'readwrite');
    const store = tx.objectStore('pieces');
    for (const piece of INITIAL_PIECES) {
      store.add(piece);
    }
    await new Promise((res) => {
      tx.oncomplete = res;
    });
  }

  // Check templates
  const templates = await getAllTemplates();
  if (templates.length === 0) {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    for (const tpl of INITIAL_TEMPLATES) {
      store.add(tpl);
    }
    await new Promise((res) => {
      tx.oncomplete = res;
    });
  }

  // Check settings
  const config = await getZebraConfig();
  if (!config) {
    await saveZebraConfig(DEFAULT_ZEBRA_CONFIG);
  }

  // Safe migration: Clear legacy mock printCount if no real print history exists
  const history = await getPrintHistory();
  if (history.length === 0) {
    const existingPieces = await getAllPieces();
    const needsReset = existingPieces.some((p) => (p.printCount || 0) > 0);
    if (needsReset) {
      const sanitized = existingPieces.map((p) => ({ ...p, printCount: 0 }));
      await saveMultiplePieces(sanitized);
    }
  }
}

// ----------------- PIECES CRUD -----------------
export async function getAllPieces(): Promise<Piece[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pieces', 'readonly');
    const store = tx.objectStore('pieces');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Piece[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getPieceById(id: string): Promise<Piece | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pieces', 'readonly');
    const store = tx.objectStore('pieces');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as Piece | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function savePiece(piece: Piece): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pieces', 'readwrite');
    const store = tx.objectStore('pieces');
    const request = store.put(piece);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveMultiplePieces(pieces: Piece[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pieces', 'readwrite');
    const store = tx.objectStore('pieces');
    for (const p of pieces) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePiece(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pieces', 'readwrite');
    const store = tx.objectStore('pieces');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function incrementPiecePrintCount(id: string, copies: number = 1): Promise<void> {
  const piece = await getPieceById(id);
  if (piece) {
    piece.printCount = (piece.printCount || 0) + copies;
    await savePiece(piece);
  }
}

// ----------------- TEMPLATES CRUD -----------------
export async function getAllTemplates(): Promise<LabelTemplate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as LabelTemplate[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getTemplateById(id: string): Promise<LabelTemplate | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as LabelTemplate | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplate(template: LabelTemplate): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const request = store.put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- PRINT HISTORY -----------------
export async function getPrintHistory(): Promise<PrintJob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = (request.result as PrintJob[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function recordPrintJob(job: PrintJob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const request = store.put(job);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearPrintHistory(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- SETTINGS & CONFIG -----------------
export async function getZebraConfig(): Promise<ZebraPrinterConfig> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('zebra_config');
    request.onsuccess = () => {
      resolve(request.result?.value || DEFAULT_ZEBRA_CONFIG);
    };
    request.onerror = () => resolve(DEFAULT_ZEBRA_CONFIG);
  });
}

export async function saveZebraConfig(config: ZebraPrinterConfig): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'zebra_config', value: config });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- BACKUP & RESTORE -----------------
export async function exportDatabaseBackup(): Promise<string> {
  const pieces = await getAllPieces();
  const templates = await getAllTemplates();
  const history = await getPrintHistory();
  const zebraConfig = await getZebraConfig();

  const backupData = {
    app: 'LabelStudioIndustrial',
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      pieces,
      templates,
      history,
      zebraConfig
    }
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<{ piecesCount: number; templatesCount: number }> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.data) {
    throw new Error('Formato de respaldo no válido.');
  }

  const { pieces = [], templates = [], history = [], zebraConfig } = parsed.data;

  const db = await openDB();

  // Save pieces
  if (pieces.length > 0) {
    const tx = db.transaction('pieces', 'readwrite');
    const store = tx.objectStore('pieces');
    for (const p of pieces) {
      store.put(p);
    }
    await new Promise((res) => { tx.oncomplete = res; });
  }

  // Save templates
  if (templates.length > 0) {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    for (const t of templates) {
      store.put(t);
    }
    await new Promise((res) => { tx.oncomplete = res; });
  }

  // Save history
  if (history.length > 0) {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    for (const h of history) {
      store.put(h);
    }
    await new Promise((res) => { tx.oncomplete = res; });
  }

  if (zebraConfig) {
    await saveZebraConfig(zebraConfig);
  }

  return { piecesCount: pieces.length, templatesCount: templates.length };
}
