
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Row } from "@/lib/mock-data";
import { set, get, clear, del } from 'idb-keyval';
import * as XLSX from 'xlsx';

export type { Row };

export function excelSerialDateToJSDate(serial: number): Date {
  if (typeof serial !== 'number' || isNaN(serial)) {
    return new Date(NaN);
  }
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
  // Adjust for timezone offset to get the correct local date
  const tzOffset = jsDate.getTimezoneOffset() * 60000;
  return new Date(jsDate.getTime() + tzOffset);
}

function formatDateMMDDYYYY(date: Date): string {
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}


export function scientificToFull(value: any): string | number {
    let numStr = String(value).trim();

    // Only process if it's likely scientific notation.
    if ((typeof value !== 'string' && typeof value !== 'number') || !/[eE]/i.test(numStr) || isNaN(Number(numStr))) {
        return value;
    }

    const parts = numStr.split(/[eE]/);
    if (parts.length !== 2) return value;

    const [mantissa, exponent] = parts;
    const exp = parseInt(exponent, 10);
    if (isNaN(exp)) return value;

    const [lead, decimal = ''] = mantissa.split('.');
    const sign = lead.startsWith('-') ? '-' : '';
    const absLead = lead.replace('-', '');

    if (exp > 0) {
        if (decimal.length <= exp) {
            numStr = sign + absLead + decimal.padEnd(exp, '0');
        } else {
            numStr = sign + absLead + decimal.slice(0, exp) + '.' + decimal.slice(exp);
        }
    } else {
        const absExp = Math.abs(exp);
        if (absExp >= absLead.length) {
            const padding = '0'.repeat(absExp - absLead.length);
            numStr = sign + '0.' + padding + absLead + decimal;
        } else {
            const splitIdx = absLead.length - absExp;
            numStr = sign + absLead.slice(0, splitIdx) + '.' + absLead.slice(splitIdx) + decimal;
        }
    }
    
    numStr = numStr.replace(/\.$/, '');

    // Always return as string for whole large numbers to avoid BigInt DataCloneError
    // BigInt cannot be sent via postMessage (Structured Clone Algorithm)
    if (!numStr.includes('.')) {
        return numStr;
    }
    
    // For numbers with decimals, return as number or string if too large for Number type.
    const asNumber = Number(numStr);
    if (asNumber > Number.MAX_SAFE_INTEGER || asNumber < Number.MIN_SAFE_INTEGER) {
        return numStr;
    }

    return asNumber;
}


const idrCurrencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCell = (value: any, type: 'text' | 'number' | 'currency' | 'date' = 'text'): string => {
  if (value === null || value === undefined || value === '') return '';
  
  switch (type) {
    case 'date':
      if (typeof value === 'number') {
        return formatDateMMDDYYYY(excelSerialDateToJSDate(value));
      }
      if (typeof value === 'string') {
        const numVal = Number(value);
        if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
          return formatDateMMDDYYYY(excelSerialDateToJSDate(numVal));
        }
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          return formatDateMMDDYYYY(parsedDate);
        }
      }
      return String(value);
    case 'number': {
      if (typeof value === 'number') return String(value);
      let cleanNumStr = String(value).trim();
      if (cleanNumStr.includes('.') && cleanNumStr.includes(',')) {
        if (cleanNumStr.indexOf('.') < cleanNumStr.indexOf(',')) {
          cleanNumStr = cleanNumStr.replace(/\./g, '').replace(',', '.');
        } else {
          cleanNumStr = cleanNumStr.replace(/,/g, '');
        }
      } else if (cleanNumStr.includes(',')) {
        const parts = cleanNumStr.split(',');
        if (parts[parts.length - 1].length === 3) {
          cleanNumStr = cleanNumStr.replace(/,/g, '');
        } else {
          cleanNumStr = cleanNumStr.replace(',', '.');
        }
      } else if (cleanNumStr.includes('.')) {
        const parts = cleanNumStr.split('.');
        if (parts[parts.length - 1].length === 3) {
          cleanNumStr = cleanNumStr.replace(/\./g, '');
        }
      }
      const numValue = Number(cleanNumStr.replace(/[^0-9.-]+/g,""));
      if (isNaN(numValue)) return String(value);
      return String(numValue);
    }
    case 'currency': {
      if (typeof value === 'number') {
        return idrCurrencyFormatter.format(value);
      }
      let cleanCurrStr = String(value).trim().replace(/^(Rp|IDR|\$)\s*/i, '');
      if (cleanCurrStr.includes('.') && cleanCurrStr.includes(',')) {
        if (cleanCurrStr.indexOf('.') < cleanCurrStr.indexOf(',')) {
          cleanCurrStr = cleanCurrStr.replace(/\./g, '').replace(',', '.');
        } else {
          cleanCurrStr = cleanCurrStr.replace(/,/g, '');
        }
      } else if (cleanCurrStr.includes(',')) {
        const parts = cleanCurrStr.split(',');
        if (parts[parts.length - 1].length === 3) {
          cleanCurrStr = cleanCurrStr.replace(/,/g, '');
        } else {
          cleanCurrStr = cleanCurrStr.replace(',', '.');
        }
      } else if (cleanCurrStr.includes('.')) {
        const parts = cleanCurrStr.split('.');
        if (parts[parts.length - 1].length === 3) {
          cleanCurrStr = cleanCurrStr.replace(/\./g, '');
        }
      }
      const currencyValue = Number(cleanCurrStr.replace(/[^0-9.-]+/g,""));
      if (isNaN(currencyValue)) return String(value);
      return idrCurrencyFormatter.format(currencyValue);
    }
    case 'text':
    default:
      return String(value);
  }
};

const autoDetectColumnTypes = (headers: string[], rows: Row[]) => {
  const detectedTypes: Record<string, ColumnType> = {};
  const sampleSize = Math.min(rows.length, 50);
  
  headers.forEach(col => {
    let numericCount = 0;
    let currencyCount = 0;
    let dateCount = 0;
    let textCount = 0;
    let filledCount = 0;

    const colLower = col.toLowerCase();
    
    // Heuristic based on column name: skip auto numeric/currency for ID, Code, Batch, Invoice columns
    const isIdOrCodeColumn = /(?:no|id|code|nik|npwp|phone|telp|batch|invoice|va|rekening|account|ref|sec_key)/i.test(colLower) && 
                             !/(?:amount|nominal|total|paid|price|biaya|saldo|tarif|fee|charge|sum|val)/i.test(colLower);

    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i]?.[col];
      if (val === undefined || val === null || val === '') continue;
      filledCount++;

      const strVal = String(val).trim();
      
      // 1. Check Date
      const isExcelSerialDate = typeof val === 'number' && val > 30000 && val < 60000;
      const isDateStr = /^\d{2,4}[-/.]\d{2}[-/.]\d{2,4}$/.test(strVal) || (!isNaN(Date.parse(strVal)) && isNaN(Number(strVal)) && strVal.length > 5);
      if (isExcelSerialDate || isDateStr) {
        dateCount++;
        continue;
      }

      // 2. Check Currency
      const hasCurrencySymbol = /^(Rp|IDR|\$)\s*/i.test(strVal) || strVal.includes('Rp') || strVal.includes('IDR');
      if (hasCurrencySymbol) {
        currencyCount++;
        continue;
      }

      // 3. Check Numeric
      const cleanVal = strVal.replace(/^(Rp|IDR|\$)\s*/i, '').replace(/,/g, '');
      const isNum = typeof val === 'number' || (!isNaN(Number(cleanVal)) && cleanVal !== '');
      
      if (isNum) {
        if (isIdOrCodeColumn || (cleanVal.length > 10 && !cleanVal.includes('.'))) {
          textCount++;
        } else {
          if (/(?:amount|nominal|total|paid|price|biaya|saldo|tarif|fee|charge|sum|val|value)/i.test(colLower)) {
            currencyCount++;
          } else {
            numericCount++;
          }
        }
        continue;
      }

      textCount++;
    }

    if (filledCount === 0) {
      detectedTypes[col] = 'text';
      return;
    }

    const threshold = filledCount * 0.6;
    if (currencyCount >= threshold) {
      detectedTypes[col] = 'currency';
    } else if (dateCount >= threshold) {
      detectedTypes[col] = 'date';
    } else if (numericCount >= threshold) {
      detectedTypes[col] = 'number';
    } else {
      detectedTypes[col] = 'text';
    }
  });

  return detectedTypes;
};


type AppState = 'initial' | 'loaded';
export type ExcelData = {
    headers: string[];
    rows: Row[];
};
export type ColumnType = 'text' | 'number' | 'currency' | 'date' ;
export type SearchOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

export interface SearchCriterion {
  value: string;
  operator: SearchOperator;
}

export interface DisplayTemplate {
  displayColumns: string[];
  columnTypes: Record<string, ColumnType>;
  columnColors: Record<string, string>;
}

export interface UploadProgress {
  fileType: 'primary' | 'secondary';
  stage: string;
  detail: string;
  percent: number;
}

export interface BackupProgress {
  mode: 'export' | 'import';
  stage: string;
  detail: string;
  percent: number;
}

export interface SwapProgress {
  stage: string;
  detail: string;
  percent: number;
}

const CHUNK_ROW_SIZE = 4000;

export const saveRowsToStorage = async (
  fileType: 'primary' | 'secondary',
  rows: Row[],
  onProgress?: (percent: number, detail: string, ratio?: number) => void
): Promise<void> => {
  const chunkCount = Math.ceil(rows.length / CHUNK_ROW_SIZE);

  // Ambil metadata lama untuk membersihkan chunk berlebih jika data sebelumnya lebih banyak
  const prevMeta = await get<{ chunkCount: number }>(`${fileType}_rows_meta`);
  const prevCount = prevMeta?.chunkCount || 0;

  for (let i = 0; i < chunkCount; i++) {
    const start = i * CHUNK_ROW_SIZE;
    const end = Math.min(start + CHUNK_ROW_SIZE, rows.length);
    const chunk = rows.slice(start, end);

    if (onProgress) {
      const ratio = (i + 1) / (chunkCount || 1);
      const pct = 90 + Math.round(ratio * 6);
      onProgress(pct, `Menyimpan potongan ${i + 1} dari ${chunkCount} (${rows.length.toLocaleString('id-ID')} baris)...`, ratio);
    }

    await set(`${fileType}_rows_chunk_${i}`, chunk);
  }

  // Bersihkan sisa chunk jika data baru memiliki lebih sedikit chunk dibanding data sebelumnya
  if (prevCount > chunkCount) {
    for (let i = chunkCount; i < prevCount; i++) {
      await del(`${fileType}_rows_chunk_${i}`);
    }
  }

  // Simpan metadata baru
  await set(`${fileType}_rows_meta`, {
    totalRows: rows.length,
    chunkSize: CHUNK_ROW_SIZE,
    chunkCount,
  });

  // Hapus key lama monolitik jika masih ada untuk menghemat kuota IndexedDB
  await del(`${fileType}_rows`);
};

export const loadRowsFromStorage = async (
  fileType: 'primary' | 'secondary',
  onProgress?: (msg: string, ratio?: number) => void
): Promise<Row[] | null> => {
  try {
    const meta = await get<{ totalRows: number; chunkSize: number; chunkCount: number }>(`${fileType}_rows_meta`);
    if (meta && typeof meta.chunkCount === 'number') {
      const allRows: Row[] = [];
      for (let i = 0; i < meta.chunkCount; i++) {
        if (onProgress) {
          onProgress(`Membaca potongan ${i + 1} dari ${meta.chunkCount}...`, (i + 1) / (meta.chunkCount || 1));
        }
        const chunk = await get<Row[]>(`${fileType}_rows_chunk_${i}`);
        if (chunk && Array.isArray(chunk)) {
          for (let r = 0; r < chunk.length; r++) {
            allRows.push(chunk[r]);
          }
        }
      }
      return allRows;
    }

    // Fallback: periksa key monolitik lama jika belum di-chunk
    const legacyRows = await get<Row[]>(`${fileType}_rows`);
    if (legacyRows && Array.isArray(legacyRows)) {
      return legacyRows;
    }

    return null;
  } catch (err) {
    console.error(`Gagal membaca baris ${fileType} dari IndexedDB:`, err);
    return null;
  }
};

export const clearRowsFromStorage = async (fileType: 'primary' | 'secondary'): Promise<void> => {
  try {
    const meta = await get<{ chunkCount: number }>(`${fileType}_rows_meta`);
    if (meta?.chunkCount) {
      for (let i = 0; i < meta.chunkCount; i++) {
        await del(`${fileType}_rows_chunk_${i}`);
      }
    }
    await del(`${fileType}_rows_meta`);
    await del(`${fileType}_rows`);
  } catch (e) {
    console.error(`Gagal menghapus baris ${fileType} dari IndexedDB:`, e);
  }
};

const getNonEmptyRowId = (row: Row, idColumn: string): string => {
  const raw = row[idColumn];
  if (raw === undefined || raw === null) return '';
  const str = String(raw);
  return str.trim() === '' ? '' : str;
};

const buildRowSignature = (row: Row, headers: string[]): string =>
  headers.map(h => String(row[h] ?? '')).join('|||');

const formatFileSummaryName = (fileList: string[]): string =>
  fileList.length <= 1 ? (fileList[0] || '') : `${fileList[0]} (+ ${fileList.length - 1} file lain)`;

interface RowMergeState {
  rows: Row[];
  idToIndex: Map<string, number>;
  idIndexColumn: string;
  rowStrings: Set<string> | null;
}

const mergeRowsIntoState = (
  state: RowMergeState,
  incomingRows: Row[],
  signatureHeaders: string[],
  incomingHeaders: string[],
  idColumn: string
): { added: number; updated: number; duplicates: number } => {
  let added = 0;
  let updated = 0;
  let duplicates = 0;

  if (idColumn && signatureHeaders.includes(idColumn) && incomingHeaders.includes(idColumn)) {
    if (state.idIndexColumn !== idColumn) {
      state.idToIndex.clear();
      for (let i = 0; i < state.rows.length; i++) {
        const idVal = getNonEmptyRowId(state.rows[i], idColumn);
        if (idVal) state.idToIndex.set(idVal, i);
      }
      state.idIndexColumn = idColumn;
    }

    for (let i = 0; i < incomingRows.length; i++) {
      const newRow = incomingRows[i];
      const idVal = getNonEmptyRowId(newRow, idColumn);
      if (idVal) {
        const existingIdx = state.idToIndex.get(idVal);
        if (existingIdx !== undefined) {
          state.rows[existingIdx] = newRow;
          updated++;
        } else {
          state.idToIndex.set(idVal, state.rows.length);
          state.rows.push(newRow);
          added++;
        }
      } else {
        state.rows.push(newRow);
        added++;
      }
    }
    state.rowStrings = null;
    return { added, updated, duplicates };
  }

  if (!state.rowStrings) {
    state.rowStrings = new Set<string>();
    for (let i = 0; i < state.rows.length; i++) {
      state.rowStrings.add(buildRowSignature(state.rows[i], signatureHeaders));
    }
  }

  for (let i = 0; i < incomingRows.length; i++) {
    const newRow = incomingRows[i];
    const sig = buildRowSignature(newRow, signatureHeaders);
    if (state.rowStrings.has(sig)) {
      duplicates++;
    } else {
      state.rowStrings.add(sig);
      state.rows.push(newRow);
      if (state.idIndexColumn && idColumn === state.idIndexColumn) {
        const idVal = getNonEmptyRowId(newRow, idColumn);
        if (idVal) state.idToIndex.set(idVal, state.rows.length - 1);
      }
      added++;
    }
  }

  return { added, updated, duplicates };
};

export const useExcelMatcher = () => {
  const [appState, setAppState] = useState<AppState>('initial');
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  
  const [primaryDataHeaders, setPrimaryDataHeaders] = useState<string[]>([]);
  const [primaryFileName, setPrimaryFileName] = useState<string>('');
  const [primaryFileList, setPrimaryFileList] = useState<string[]>([]);
  const [searchColumns, setSearchColumns] = useState<Set<string>>(new Set());
  const [primaryDisplayColumns, setPrimaryDisplayColumns] = useState<string[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  
  const [secondaryDataHeaders, setSecondaryDataHeaders] = useState<string[]>([]);
  const [secondaryFileName, setSecondaryFileName] = useState<string>('');
  const [secondaryFileList, setSecondaryFileList] = useState<string[]>([]);
  const [secondarySearchColumns, setSecondarySearchColumns] = useState<Set<string>>(new Set());
  const [secondaryDisplayColumns, setSecondaryDisplayColumns] = useState<string[]>([]);
  const [secondarySearchCriteria, setSecondarySearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [secondaryFilteredResults, setSecondaryFilteredResults] = useState<Row[] | null>(null);
  
  const [primaryLinkColumn, setPrimaryLinkColumn] = useState<string>('');
  const [secondaryLinkColumn, setSecondaryLinkColumn] = useState<string>('');
  
  const [primaryRowCount, setPrimaryRowCount] = useState<number>(0);
  const [secondaryRowCount, setSecondaryRowCount] = useState<number>(0);
  const [primaryAppendIdColumn, setPrimaryAppendIdColumn] = useState<string>('');
  const [secondaryAppendIdColumn, setSecondaryAppendIdColumn] = useState<string>('');
  
  const [secondaryResults, setSecondaryResults] = useState<Row[]>([]);
  const [isSecondarySheetOpen, setIsSecondarySheetOpen] = useState(false);
  const [isPrimarySheetOpen, setIsPrimarySheetOpen] = useState(false);
  const [primaryResults, setPrimaryResults] = useState<Row[]>([]);
  const [currentLookupValue, setCurrentLookupValue] = useState<string | number>('');
  
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [primaryDisplayTemplates, setPrimaryDisplayTemplates] = useState<Record<string, DisplayTemplate>>({});
  const [newPrimaryTemplateName, setNewPrimaryTemplateName] = useState('');
  const [secondaryDisplayTemplates, setSecondaryDisplayTemplates] = useState<Record<string, DisplayTemplate>>({});
  const [newSecondaryTemplateName, setNewSecondaryTemplateName] = useState('');
  
  const [isPrimaryProcessing, setIsPrimaryProcessing] = useState(false);
  const [isSecondaryProcessing, setIsSecondaryProcessing] = useState(false);
  const isProcessing = isPrimaryProcessing || isSecondaryProcessing;
  const [isLoadingFile, setIsLoadingFile] = useState<'primary' | 'secondary' | false>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [swapProgress, setSwapProgress] = useState<SwapProgress | null>(null);
  const [isRestoringStorage, setIsRestoringStorage] = useState(true);
  const [restoreStatus, setRestoreStatus] = useState<string>('Memeriksa penyimpanan lokal...');
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'replace' | 'append'>('replace');
  const { toast } = useToast();
  // Use a ref for toast to avoid worker useEffect re-running on every toast reference change
  const toastRef = useRef(toast);
  // Keep toastRef in sync with latest toast function without causing re-renders
  useEffect(() => { toastRef.current = toast; }, [toast]);
  
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [includeEmptyRowsInResults, setIncludeEmptyRowsInResults] = useState(true);

  const [selectedPrimaryRow, setSelectedPrimaryRow] = useState<Row | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [columnsToConvert, setColumnsToConvert] = useState<Set<string>>(new Set());
  const [fileTypeToConvert, setFileTypeToConvert] = useState<'primary' | 'secondary'>('primary');
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const syncedDatasetsRef = useRef<Set<string>>(new Set());

  const syncDatasetToWorker = useCallback((type: 'primary' | 'secondary', rows: Row[]) => {
    if (!workerRef.current || !rows || rows.length === 0) return;
    try {
      const CHUNK_SIZE = 3000;
      if (rows.length <= CHUNK_SIZE) {
        workerRef.current.postMessage({
          action: 'setData',
          datasetType: type,
          dataRows: rows,
        });
        syncedDatasetsRef.current.add(type);
        return;
      }

      // Stream data in chunks to prevent V8 Structured Clone buffer overflow (DataCloneError)
      workerRef.current.postMessage({
        action: 'initDataStream',
        datasetType: type,
      });

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        workerRef.current.postMessage({
          action: 'appendDataChunk',
          datasetType: type,
          chunk: rows.slice(i, i + CHUNK_SIZE),
        });
      }

      workerRef.current.postMessage({
        action: 'finalizeDataStream',
        datasetType: type,
      });
      syncedDatasetsRef.current.add(type);
    } catch (err) {
      console.error(`Gagal sinkronisasi data ${type} ke worker:`, err);
    }
  }, []);

  const [storageEstimate, setStorageEstimate] = useState<{
    usageMB: number;
    quotaMB: number;
    percent: number;
    isPersisted?: boolean;
  } | null>(null);

  const updateStorageEstimate = useCallback(async () => {
    if (typeof window !== 'undefined' && navigator.storage) {
      try {
        let isPersisted = false;
        if (navigator.storage.persisted) {
          isPersisted = await navigator.storage.persisted();
          if (!isPersisted && navigator.storage.persist) {
            isPersisted = await navigator.storage.persist();
          }
        }
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 1;
          setStorageEstimate({
            usageMB: Number((usage / (1024 * 1024)).toFixed(2)),
            quotaMB: Number((quota / (1024 * 1024)).toFixed(2)),
            percent: Number(((usage / quota) * 100).toFixed(2)),
            isPersisted,
          });
        }
      } catch (e) {
        console.error("Gagal mendapatkan estimasi kuota penyimpanan:", e);
      }
    }
  }, []);

  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationMismatchInfo, setValidationMismatchInfo] = useState<{
    missing: string[];
    added: string[];
  } | null>(null);
  const [pendingUploadData, setPendingUploadData] = useState<{
    rows: Row[];
    headers: string[];
    fileType: 'primary' | 'secondary';
    fileName: string;
    action: 'replace' | 'append';
  } | null>(null);

  const loadFromStorage = useCallback(async (silentToast = false) => {
    try {
      setIsRestoringStorage(true);
      setRestoreStatus('Memeriksa riwayat data...');

      const pHeaders = await get<string[]>('primary_headers');
      const sHeaders = await get<string[]>('secondary_headers');
      const hasStoredData = Boolean((pHeaders && pHeaders.length > 0) || (sHeaders && sHeaders.length > 0));

      if (hasStoredData) {
        setRestoreStatus('Membaca data tersimpan dari penyimpanan lokal (IndexedDB)...');
      }

      if (pHeaders && pHeaders.length > 0) {
        setPrimaryDataHeaders(pHeaders);
        const pName = (await get('primary_fileName')) || '';
        setPrimaryFileName(pName);
        let pList = await get<string[]>('primary_fileList');
        if (!pList || pList.length === 0) {
          if (pName.includes('(+')) {
            const cleanBase = pName.replace(/\s*\(\+.*?\)/, '');
            pList = [cleanBase, 'Berkas Tambahan Sebelumnya'];
          } else if (pName) {
            pList = [pName];
          } else {
            pList = [];
          }
        }
        setPrimaryFileList(pList);

        setRestoreStatus(pName ? `Membaca ${pName}...` : 'Membaca baris Data Utama...');
        const pRows = await loadRowsFromStorage('primary', (msg) => {
          setRestoreStatus(msg);
        });
        if (pRows) {
          setPrimaryRowCount(pRows.length);
          setRestoreStatus(`Sinkronisasi worker Data Utama (${pRows.length.toLocaleString('id-ID')} baris)...`);
          syncDatasetToWorker('primary', pRows);
        }
      } else {
        setPrimaryDataHeaders([]);
        setPrimaryFileName('');
        setPrimaryFileList([]);
        setPrimaryRowCount(0);
      }
      
      if (sHeaders && sHeaders.length > 0) {
        setSecondaryDataHeaders(sHeaders);
        const sName = (await get('secondary_fileName')) || '';
        setSecondaryFileName(sName);
        let sList = await get<string[]>('secondary_fileList');
        if (!sList || sList.length === 0) {
          if (sName.includes('(+')) {
            const cleanBase = sName.replace(/\s*\(\+.*?\)/, '');
            sList = [cleanBase, 'Berkas Tambahan Sebelumnya'];
          } else if (sName) {
            sList = [sName];
          } else {
            sList = [];
          }
        }
        setSecondaryFileList(sList);

        setRestoreStatus(sName ? `Membaca ${sName}...` : 'Membaca baris Data Sekunder...');
        const sRows = await loadRowsFromStorage('secondary', (msg) => {
          setRestoreStatus(msg);
        });
        if (sRows) {
          setSecondaryRowCount(sRows.length);
          setRestoreStatus(`Sinkronisasi worker Data Sekunder (${sRows.length.toLocaleString('id-ID')} baris)...`);
          syncDatasetToWorker('secondary', sRows);
        }
      } else {
        setSecondaryDataHeaders([]);
        setSecondaryFileName('');
        setSecondaryFileList([]);
        setSecondaryRowCount(0);
      }

      const getFromLocalStorage = (key: string, setter: (value: any) => void, isSet = false, defaultVal: any) => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            setter(isSet ? new Set(parsed) : parsed);
          } else {
            setter(defaultVal);
          }
        } catch (e) {
          console.error(`Gagal memuat ${key} dari localStorage`, e);
          setter(defaultVal);
        }
      };

      getFromLocalStorage('rekonMatch_primaryDisplayColumns', setPrimaryDisplayColumns, false, pHeaders || []);
      getFromLocalStorage('rekonMatch_secondaryDisplayColumns', setSecondaryDisplayColumns, false, sHeaders || []);
      getFromLocalStorage('rekonMatch_searchColumns', setSearchColumns, true, new Set());
      getFromLocalStorage('rekonMatch_secondarySearchColumns', setSecondarySearchColumns, true, new Set());
      getFromLocalStorage('rekonMatch_searchCriteria', setSearchCriteria, false, {});
      getFromLocalStorage('rekonMatch_secondarySearchCriteria', setSecondarySearchCriteria, false, {});
      getFromLocalStorage('rekonMatch_primaryLinkColumn', setPrimaryLinkColumn, false, '');
      getFromLocalStorage('rekonMatch_secondaryLinkColumn', setSecondaryLinkColumn, false, '');
      getFromLocalStorage('rekonMatch_columnTypes', setColumnTypes, false, {});
      getFromLocalStorage('rekonMatch_columnColors', setColumnColors, false, {});
      getFromLocalStorage('rekonMatch_primaryTemplates', setPrimaryDisplayTemplates, false, {});
      getFromLocalStorage('rekonMatch_secondaryTemplates', setSecondaryDisplayTemplates, false, {});
      
      if (hasStoredData) {
        setAppState('loaded');
        if (!silentToast) {
          toastRef.current({
            title: 'Sesi Kerja Dipulihkan',
            description: 'Data Anda berhasil dimuat kembali dari penyimpanan lokal.',
          });
        }
      } else {
        setAppState('initial');
      }
      updateStorageEstimate();
    } catch (error) {
      console.error("Gagal memeriksa IndexedDB saat inisialisasi:", error);
      setAppState('initial');
    } finally {
      setIsRestoringStorage(false);
    }
  }, [updateStorageEstimate, syncDatasetToWorker]);
  
  useEffect(() => {
    const updateTheme = () => setCurrentTheme(localStorage.getItem('rekonmatch_theme') || 'dark');
    updateTheme();
    window.addEventListener('themeChanged', updateTheme);
    return () => window.removeEventListener('themeChanged', updateTheme);
  }, []);

  useEffect(() => {
    // Instantiate the Web Worker only once on mount.
    workerRef.current = new Worker(new URL('../workers/query.worker.ts', import.meta.url));

    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type, results, error } = event.data;
      if (type === 'datasetSynced' || type === 'dataCleared') {
        return;
      }
      if (error) {
        console.error(`Worker error for ${type}:`, error);
        toastRef.current({ variant: "destructive", title: "Gagal Menjalankan Kueri", description: error });
        if (type === 'primary') setIsPrimaryProcessing(false);
        else setIsSecondaryProcessing(false);
        return;
      }

      if (type === 'primary') {
        setFilteredResults(results);
        setIsPrimaryProcessing(false);
      } else {
        setSecondaryFilteredResults(results);
        setIsSecondaryProcessing(false);
      }
    };

    // Muat data dari IndexedDB setelah worker terpasang
    loadFromStorage();

    return () => {
      workerRef.current?.terminate();
    };
  }, [loadFromStorage]);

  const runQuery = useCallback(async (type: 'primary' | 'secondary') => {
    const isPrimary = type === 'primary';
    const criteria = isPrimary ? searchCriteria : secondarySearchCriteria;
    const searchCols = isPrimary ? searchColumns : secondarySearchColumns;
    const headers = isPrimary ? primaryDataHeaders : secondaryDataHeaders;
    const setResults = isPrimary ? setFilteredResults : setSecondaryFilteredResults;
    const setProcessing = isPrimary ? setIsPrimaryProcessing : setIsSecondaryProcessing;
  
    const activeCriteria = Object.fromEntries(
        Object.entries(criteria).filter(([col, crit]) => searchCols.has(col) && crit?.value.trim())
    );
    const isQueryInvalid = searchCols.size === 0 || Object.keys(activeCriteria).length === 0;
  
    if (isQueryInvalid) {
        setResults([]);
        return;
    }

    // Guard: if worker is not ready, do not proceed
    if (!workerRef.current) {
        console.warn(`[runQuery] Worker belum siap untuk kueri ${type}, dilewati.`);
        return;
    }
    
    setProcessing(true);

    if (syncedDatasetsRef.current.has(type)) {
        workerRef.current.postMessage({
            action: 'query',
            type,
            activeCriteria,
            headers,
            includeEmptyRowsInResults
        });
        return;
    }
  
    try {
        const dataRows = await loadRowsFromStorage(type);
        if (!dataRows) {
            toastRef.current({ variant: "destructive", title: `Data ${isPrimary ? 'Utama' : 'Sekunder'} Tidak Ditemukan` });
            setProcessing(false);
            return;
        }

        syncDatasetToWorker(type, dataRows);
  
        workerRef.current.postMessage({
            action: 'query',
            type,
            activeCriteria,
            headers,
            includeEmptyRowsInResults
        });
    } catch(e) {
        console.error(`Gagal menjalankan kueri ${type}:`, e);
        toastRef.current({ variant: "destructive", title: "Gagal Menjalankan Kueri", description: "Tidak dapat mengambil data dari penyimpanan lokal." });
        setProcessing(false);
    }
  }, [searchCriteria, secondarySearchCriteria, searchColumns, secondarySearchColumns, primaryDataHeaders, secondaryDataHeaders, includeEmptyRowsInResults, syncDatasetToWorker]);


  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      runQuery('primary');
      runQuery('secondary');
    }, 500);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchCriteria, secondarySearchCriteria, includeEmptyRowsInResults, runQuery]);


  const resetDataStates = (type: 'primary' | 'secondary', headers: string[] | null, preserveLink = false) => {
    const newHeaders = headers || [];
    const stateMapping = {
      primary: {
        setDisplayCols: setPrimaryDisplayColumns,
        setSearchCols: setSearchColumns,
        setSearchCrit: setSearchCriteria,
        setFilteredRes: setFilteredResults,
        setLinkCol: setPrimaryLinkColumn,
      },
      secondary: {
        setDisplayCols: setSecondaryDisplayColumns,
        setSearchCols: setSecondarySearchColumns,
        setSearchCrit: setSecondarySearchCriteria,
        setFilteredRes: setSecondaryFilteredResults,
        setLinkCol: setSecondaryLinkColumn,
      }
    };
    
    const { setDisplayCols, setSearchCols, setSearchCrit, setFilteredRes, setLinkCol } = stateMapping[type];

    setDisplayCols(newHeaders);
    localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(newHeaders));
    setSearchCols(new Set());
    localStorage.removeItem(`rekonMatch_${type}SearchColumns`);
    setSearchCrit({});
    localStorage.removeItem(`rekonMatch_${type}SearchCriteria`);
    setFilteredRes(null);
    if (!preserveLink) {
      setLinkCol('');
      localStorage.removeItem(`rekonMatch_${type}LinkColumn`);
    }

    if (type === 'primary') {
      setColumnTypes({});
      localStorage.removeItem('rekonMatch_columnTypes');
      setColumnColors({});
      localStorage.removeItem('rekonMatch_columnColors');
    }
  };
  
  const handleSwapFiles = async () => {
    if (swapProgress || isLoadingFile || backupProgress) return;
    try {
        setSwapProgress({
          stage: 'Mempersiapkan penukaran sumber data...',
          detail: 'Memeriksa metadata Data Utama & Data Sekunder...',
          percent: 3,
        });
        await new Promise(r => setTimeout(r, 10));

        const pHeaders = await get<string[]>('primary_headers');
        const pName = await get('primary_fileName');
        const sHeaders = await get<string[]>('secondary_headers');
        const sName = await get('secondary_fileName');

        if (!pHeaders?.length || !sHeaders?.length) {
            toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Kedua file harus ada untuk ditukar." });
            return;
        }

        setSwapProgress({
          stage: 'Membaca Data Utama dari penyimpanan...',
          detail: 'Memuat potongan baris Data Utama...',
          percent: 5,
        });
        const pRows = await loadRowsFromStorage('primary', (msg, ratio = 1) => {
          setSwapProgress({
            stage: 'Membaca Data Utama dari penyimpanan...',
            detail: msg,
            percent: Math.round(5 + ratio * 20),
          });
        });

        setSwapProgress({
          stage: 'Membaca Data Sekunder dari penyimpanan...',
          detail: 'Memuat potongan baris Data Sekunder...',
          percent: 25,
        });
        const sRows = await loadRowsFromStorage('secondary', (msg, ratio = 1) => {
          setSwapProgress({
            stage: 'Membaca Data Sekunder dari penyimpanan...',
            detail: msg,
            percent: Math.round(25 + ratio * 20),
          });
        });

        const pList = (await get<string[]>('primary_fileList')) || (pName ? [pName] : []);
        const sList = (await get<string[]>('secondary_fileList')) || (sName ? [sName] : []);

        setSwapProgress({
          stage: 'Menukar metadata berkas...',
          detail: 'Menyimpan header & daftar berkas ke IndexedDB...',
          percent: 48,
        });

        await Promise.all([
          set('primary_headers', sHeaders), set('primary_fileName', sName), set('primary_fileList', sList),
          set('secondary_headers', pHeaders), set('secondary_fileName', pName), set('secondary_fileList', pList)
        ]);

        if (sRows) {
          await saveRowsToStorage('primary', sRows, (_pct, detail, ratio = 1) => {
            setSwapProgress({
              stage: 'Menyimpan Data Sekunder menjadi Data Utama...',
              detail,
              percent: Math.round(50 + ratio * 20),
            });
          });
        }
        if (pRows) {
          await saveRowsToStorage('secondary', pRows, (_pct, detail, ratio = 1) => {
            setSwapProgress({
              stage: 'Menyimpan Data Utama menjadi Data Sekunder...',
              detail,
              percent: Math.round(70 + ratio * 20),
            });
          });
        }

        setSwapProgress({
          stage: 'Memperbarui indeks pencarian Web Worker...',
          detail: 'Menyinkronkan dataset & kolom penghubung...',
          percent: 92,
        });
        await new Promise(r => setTimeout(r, 15));

        setPrimaryDataHeaders(sHeaders);
        setPrimaryFileName(sName || '');
        setPrimaryFileList(sList);
        setPrimaryRowCount(sRows ? sRows.length : 0);
        setSecondaryDataHeaders(pHeaders);
        setSecondaryFileName(pName || '');
        setSecondaryFileList(pList);
        setSecondaryRowCount(pRows ? pRows.length : 0);

        const newPrimaryLink = secondaryLinkColumn;
        const newSecondaryLink = primaryLinkColumn;
        setPrimaryLinkColumn(newPrimaryLink);
        setSecondaryLinkColumn(newSecondaryLink);
        localStorage.setItem('rekonMatch_primaryLinkColumn', JSON.stringify(newPrimaryLink));
        localStorage.setItem('rekonMatch_secondaryLinkColumn', JSON.stringify(newSecondaryLink));

        resetDataStates('primary', sHeaders, true);
        resetDataStates('secondary', pHeaders, true);
        if (sRows) syncDatasetToWorker('primary', sRows as Row[]);
        if (pRows) syncDatasetToWorker('secondary', pRows as Row[]);

        setSwapProgress({
          stage: 'Selesai!',
          detail: 'Peran Data Utama dan Data Sekunder berhasil ditukar.',
          percent: 100,
        });
        await new Promise(r => setTimeout(r, 250));

        toast({ title: "Data Ditukar", description: "Peran data utama dan sekunder telah berhasil ditukar." });
    } catch(e) {
        console.error("Gagal menukar file:", e);
        toast({ variant: "destructive", title: "Gagal Menukar", description: "Terjadi kesalahan saat menukar data." });
    } finally {
        setSwapProgress(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'primary' | 'secondary') => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const action = fileActionRef.current;
    const isSingleFile = files.length === 1;

    setIsLoadingFile(fileType);
    setUploadProgress({
      fileType,
      stage: isSingleFile ? 'Membaca berkas dari disk...' : `Mempersiapkan ${files.length} berkas...`,
      detail: `0 MB / ${(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB`,
      percent: 5,
    });
    toast({
      title: isSingleFile ? 'Memproses File...' : `Memproses ${files.length} File Sekaligus...`,
      description: isSingleFile ? `Membaca ${files[0].name}.` : `Memulai penggabungan ${files.length} berkas Excel.`,
    });

    try {
      const isReplaceAction = action === 'replace';
      const existingHeaders = isReplaceAction ? [] : ((await get<string[]>(`${fileType}_headers`)) || []);
      const existingRows = isReplaceAction ? [] : ((await loadRowsFromStorage(fileType)) || []);
      const idColumn = fileType === 'primary' ? primaryAppendIdColumn : secondaryAppendIdColumn;

      let currentHeaders = [...existingHeaders];
      const mergeState: RowMergeState = {
        rows: existingRows.slice(),
        idToIndex: new Map<string, number>(),
        idIndexColumn: '',
        rowStrings: null,
      };

      let totalAdded = 0;
      let totalUpdated = 0;
      let totalDuplicates = 0;
      const acceptedFileNames: string[] = [];

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const fileWeight = 80 / files.length;
        const fileBasePct = Math.round(5 + fileIdx * fileWeight);

        // 1. Baca ArrayBuffer dari disk
        const fileContent = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              const filePct = e.loaded / e.total;
              const pct = fileBasePct + Math.round(filePct * (fileWeight * 0.3));
              const loadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (e.total / (1024 * 1024)).toFixed(1);
              setUploadProgress({
                fileType,
                stage: isSingleFile
                  ? 'Membaca berkas dari disk...'
                  : `[Berkas ${fileIdx + 1}/${files.length}] Membaca ${file.name}...`,
                detail: `${loadedMB} MB / ${totalMB} MB (${Math.round(filePct * 100)}%)`,
                percent: Math.min(pct, 88),
              });
            }
          };
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });

        setUploadProgress({
          fileType,
          stage: isSingleFile
            ? 'Mengekstrak lembar kerja Excel...'
            : `[Berkas ${fileIdx + 1}/${files.length}] Mengekstrak sheet...`,
          detail: `Menganalisis ${file.name}...`,
          percent: fileBasePct + Math.round(fileWeight * 0.35),
        });
        await new Promise(r => setTimeout(r, 10));

        const workbook = XLSX.read(fileContent, { type: 'array', cellDates: false, dense: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, rawNumbers: true, defval: '' }) as (string | number | boolean)[][];

        if (!json || json.length < 1 || !json[0] || json[0].length === 0) {
          if (isSingleFile) {
            toast({ variant: "destructive", title: "File Kosong atau Format Salah", description: "Pastikan file Excel Anda tidak kosong dan memiliki header." });
            setIsLoadingFile(false);
            setUploadProgress(null);
            return;
          } else {
            toast({ variant: "destructive", title: `Berkas Kosong: ${file.name}`, description: "Berkas ini dilewati karena tidak memiliki data/header." });
            continue;
          }
        }

        const headers = json[0].map(String);
        const totalRows = Math.max(json.length - 1, 1);
        const fileRows: Row[] = [];
        const chunkSize = 5000;

        for (let i = 1; i < json.length; i += chunkSize) {
          const end = Math.min(i + chunkSize, json.length);
          for (let j = i; j < end; j++) {
            const rowArray = json[j];
            const rowObject: Row = {};
            for (let c = 0; c < headers.length; c++) {
              const value = rowArray[c];
              rowObject[headers[c]] = typeof value === 'boolean' ? value.toString() : (value ?? '');
            }
            fileRows.push(rowObject);
          }
          const processed = Math.min(fileRows.length, totalRows);
          const chunkPct = fileBasePct + Math.round(fileWeight * (0.35 + (processed / totalRows) * 0.55));
          setUploadProgress({
            fileType,
            stage: isSingleFile
              ? 'Memformat baris data...'
              : `[Berkas ${fileIdx + 1}/${files.length}] Memformat baris...`,
            detail: `${processed.toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')} baris`,
            percent: Math.min(chunkPct, 88),
          });
          await new Promise(r => setTimeout(r, 0));
        }

        // Validasi skema khusus berkas tunggal (menampilkan dialog konfirmasi jika berbeda)
        if (isSingleFile && action === 'append' && existingHeaders.length > 0) {
          const missing = existingHeaders.filter(h => !headers.includes(h));
          const added = headers.filter(h => !existingHeaders.includes(h));
          const isSchemaMismatch = missing.length > 0 || added.length > 0;

          if (isSchemaMismatch) {
            setUploadProgress(null);
            setPendingUploadData({
              rows: fileRows,
              headers,
              fileType,
              fileName: file.name,
              action: fileActionRef.current
            });
            setValidationMismatchInfo({ missing, added });
            setIsValidationDialogOpen(true);
            setIsLoadingFile(false);
            if (event.target) event.target.value = "";
            return;
          }
        }

        // Penggabungan Skema Kolom (Schema Union)
        if (currentHeaders.length === 0) {
          currentHeaders = headers;
        } else {
          const overlap = headers.filter(h => currentHeaders.includes(h));
          if (overlap.length === 0) {
            toast({
              variant: "destructive",
              title: `Kolom Tidak Cocok: ${file.name}`,
              description: "Berkas ini dilewati karena tidak memiliki satu pun kolom yang cocok dengan data utama."
            });
            continue;
          }
          const prevLen = currentHeaders.length;
          currentHeaders = Array.from(new Set([...currentHeaders, ...headers]));
          if (currentHeaders.length !== prevLen) {
            mergeState.rowStrings = null;
          }
        }

        // Penggabungan baris data & deduplikasi (single source of truth di mergeState.rows)
        if (action === 'append' || acceptedFileNames.length > 0) {
          const { added, updated, duplicates } = mergeRowsIntoState(
            mergeState,
            fileRows,
            currentHeaders,
            headers,
            idColumn
          );
          totalAdded += added;
          totalUpdated += updated;
          totalDuplicates += duplicates;
        } else {
          mergeState.rows = fileRows;
          totalAdded = fileRows.length;
        }
        acceptedFileNames.push(file.name);
      }

      if (acceptedFileNames.length === 0) {
        return;
      }

      const finalRows = mergeState.rows;
      const finalHeaders = currentHeaders;

      setUploadProgress({
        fileType,
        stage: 'Menyimpan ke memori lokal...',
        detail: `Menyiapkan penyimpanan ${finalRows.length.toLocaleString('id-ID')} baris...`,
        percent: 90,
      });
      await new Promise(r => setTimeout(r, 10));

      await saveRowsToStorage(fileType, finalRows, (pct, detail) => {
        setUploadProgress({
          fileType,
          stage: 'Menyimpan ke memori lokal...',
          detail,
          percent: pct,
        });
      });
      await set(`${fileType}_headers`, finalHeaders);

      const prevFileName = ((await get(`${fileType}_fileName`)) as string) || '';
      const existingFileList = ((await get<string[]>(`${fileType}_fileList`)) as string[]) || (prevFileName ? [prevFileName] : []);

      const newFileList = isReplaceAction
        ? acceptedFileNames
        : [...existingFileList, ...acceptedFileNames];
      const newFileName = formatFileSummaryName(newFileList);

      await set(`${fileType}_fileName`, newFileName);
      await set(`${fileType}_fileList`, newFileList);

      if (fileType === 'primary') {
        setPrimaryDataHeaders(finalHeaders);
        setPrimaryFileName(newFileName);
        setPrimaryFileList(newFileList);
        setPrimaryRowCount(finalRows.length);
        if (isReplaceAction) {
          resetDataStates('primary', finalHeaders);
          const detected = autoDetectColumnTypes(finalHeaders, finalRows);
          setColumnTypes(detected);
          localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(detected));
        }
      } else {
        setSecondaryDataHeaders(finalHeaders);
        setSecondaryFileName(newFileName);
        setSecondaryFileList(newFileList);
        setSecondaryRowCount(finalRows.length);
        if (isReplaceAction) {
          resetDataStates('secondary', finalHeaders);
          const detected = autoDetectColumnTypes(finalHeaders, finalRows);
          setColumnTypes(prev => {
            const next = { ...prev, ...detected };
            localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(next));
            return next;
          });
        }
      }

      setUploadProgress({
        fileType,
        stage: 'Mengindeks pencarian...',
        detail: 'Menyiapkan cache performa tinggi...',
        percent: 96,
      });
      await new Promise(r => setTimeout(r, 10));

      setAppState('loaded');
      syncDatasetToWorker(fileType, finalRows);
      updateStorageEstimate();

      setUploadProgress({
        fileType,
        stage: 'Selesai!',
        detail: `${finalRows.length.toLocaleString('id-ID')} baris berhasil dimuat.`,
        percent: 100,
      });
      await new Promise(r => setTimeout(r, 350));

      if (acceptedFileNames.length === 1) {
        toast({
          title: isReplaceAction ? 'File Berhasil Diproses' : 'Data Berhasil Ditambahkan',
          description: `${isReplaceAction ? acceptedFileNames[0] : newFileName} (${finalRows.length.toLocaleString('id-ID')} baris total).`,
        });
      } else {
        toast({
          title: isReplaceAction ? `${acceptedFileNames.length} File Berhasil Digabungkan` : `${acceptedFileNames.length} File Berhasil Ditambahkan`,
          description: `${totalAdded.toLocaleString('id-ID')} baris baru${totalUpdated > 0 ? `, ${totalUpdated.toLocaleString('id-ID')} baris diperbarui` : ''}${totalDuplicates > 0 ? `, ${totalDuplicates.toLocaleString('id-ID')} duplikat diabaikan` : ''}. Total: ${finalRows.length.toLocaleString('id-ID')} baris.`,
        });
      }
    } catch (error) {
      console.error("Kesalahan memproses file Excel:", error);
      toast({
        variant: "destructive",
        title: "Kesalahan Membaca File",
        description: `Terjadi masalah saat memproses berkas Excel.`,
      });
    } finally {
      setIsLoadingFile(false);
      setUploadProgress(null);
      if (event.target) event.target.value = "";
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingUploadData) return;
    const { rows, headers, fileType, fileName, action } = pendingUploadData;
    setIsLoadingFile(fileType);
    setUploadProgress({
      fileType,
      stage: 'Menyimpan konfirmasi data...',
      detail: 'Menulis ke IndexedDB & sinkronisasi memori...',
      percent: 90,
    });
    toast({ title: 'Memproses File...', description: `Menyimpan data ${fileName}.` });

    try {
        const existingHeaders = await get<string[]>(`${fileType}_headers`) || [];
        let finalHeaders = headers;
        let finalRows = rows;
        let isReplaced = true;

        if (action === 'append') {
            const existingRows = (await loadRowsFromStorage(fileType)) || [];
            const mergedHeaders = Array.from(new Set([...existingHeaders, ...headers]));
            const idColumn = fileType === 'primary' ? primaryAppendIdColumn : secondaryAppendIdColumn;

            const mergeState: RowMergeState = {
              rows: existingRows.slice(),
              idToIndex: new Map<string, number>(),
              idIndexColumn: '',
              rowStrings: null,
            };

            const { added, updated, duplicates } = mergeRowsIntoState(
              mergeState,
              rows,
              mergedHeaders,
              headers,
              idColumn
            );

            finalHeaders = mergedHeaders;
            finalRows = mergeState.rows;
            isReplaced = false;

            if (idColumn && mergedHeaders.includes(idColumn) && headers.includes(idColumn)) {
              toast({
                title: "Data Diperbarui",
                description: `${updated} baris diperbarui, ${added} baris baru ditambahkan (ID: ${idColumn}).`,
              });
            } else if (duplicates > 0) {
              toast({
                title: "Data Disaring",
                description: `${duplicates} baris duplikat diabaikan. ${added} baris baru ditambahkan.`,
              });
            }
        }

        await saveRowsToStorage(fileType, finalRows, (pct, detail) => {
          setUploadProgress({
            fileType,
            stage: 'Menyimpan konfirmasi data...',
            detail,
            percent: pct,
          });
        });
        await set(`${fileType}_headers`, finalHeaders);

        const prevFileName = ((await get(`${fileType}_fileName`)) as string) || '';
        const existingFileList = ((await get<string[]>(`${fileType}_fileList`)) as string[]) || (prevFileName ? [prevFileName] : []);
        const newFileList = isReplaced ? [fileName] : [...existingFileList, fileName];
        const newFileName = formatFileSummaryName(newFileList);

        await set(`${fileType}_fileName`, newFileName);
        await set(`${fileType}_fileList`, newFileList);

        if (fileType === 'primary') {
            setPrimaryDataHeaders(finalHeaders);
            setPrimaryFileName(newFileName);
            setPrimaryFileList(newFileList);
            setPrimaryRowCount(finalRows.length);
            if (isReplaced) {
                resetDataStates('primary', finalHeaders);
                const detected = autoDetectColumnTypes(finalHeaders, finalRows);
                setColumnTypes(detected);
                localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(detected));
            }
        } else {
            setSecondaryDataHeaders(finalHeaders);
            setSecondaryFileName(newFileName);
            setSecondaryFileList(newFileList);
            setSecondaryRowCount(finalRows.length);
            if (isReplaced) {
                resetDataStates('secondary', finalHeaders);
                const detected = autoDetectColumnTypes(finalHeaders, finalRows);
                setColumnTypes(prev => {
                    const next = { ...prev, ...detected };
                    localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(next));
                    return next;
                });
            }
        }

        setAppState('loaded');
        syncDatasetToWorker(fileType, finalRows);
        updateStorageEstimate();
        toast({ title: isReplaced ? 'File Berhasil Diproses' : 'Data Berhasil Ditambahkan', description: `${isReplaced ? fileName : newFileName} (${finalRows.length} baris total).` });
    } catch (error) {
        console.error("Kesalahan menyimpan file:", error);
        toast({ variant: "destructive", title: "Kesalahan Menyimpan", description: `Gagal memproses data.` });
    } finally {
        setIsLoadingFile(false);
        setUploadProgress(null);
        setPendingUploadData(null);
        setValidationMismatchInfo(null);
        setIsValidationDialogOpen(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingUploadData(null);
    setValidationMismatchInfo(null);
    setIsValidationDialogOpen(false);
  };

  const handleUploadClick = (fileType: 'primary' | 'secondary', action: 'replace' | 'append' = 'replace') => {
    fileActionRef.current = action;
    const ref = fileType === 'primary' ? primaryFileInputRef : secondaryFileInputRef;
    if (ref.current) {
      ref.current.multiple = (action === 'append');
      ref.current.click();
    }
  };

  const handleReset = async () => {
    try {
      await clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('rekonMatch_')) {
          localStorage.removeItem(key);
        }
      });
      
      setAppState('initial');
      setPrimaryDataHeaders([]);
      setPrimaryFileName('');
      setPrimaryFileList([]);
      setSecondaryDataHeaders([]);
      setSecondaryFileName('');
      setSecondaryFileList([]);
      setPrimaryRowCount(0);
      setSecondaryRowCount(0);
      setPrimaryAppendIdColumn('');
      setSecondaryAppendIdColumn('');
      resetDataStates('primary', null);
      resetDataStates('secondary', null);
      syncedDatasetsRef.current.clear();
      workerRef.current?.postMessage({ action: 'clearData' });
      updateStorageEstimate();
      toast({ title: 'Reset Berhasil', description: 'Semua data dan pengaturan lokal telah dihapus.' });
    } catch (error) {
      console.error("Gagal mereset IndexedDB:", error);
      toast({ variant: "destructive", title: "Gagal Mereset", description: "Tidak dapat menghapus data lokal." });
    }
  };

  const handleSearchToggle = (column: string, checked: boolean, type: 'primary' | 'secondary') => {
    const stateMapping = {
      primary: { setter: setSearchColumns, key: 'rekonMatch_searchColumns', criteriaSetter: setSearchCriteria, criteriaKey: 'rekonMatch_searchCriteria' },
      secondary: { setter: setSecondarySearchColumns, key: 'rekonMatch_secondarySearchColumns', criteriaSetter: setSecondarySearchCriteria, criteriaKey: 'rekonMatch_secondarySearchCriteria' }
    };
    const { setter, key, criteriaSetter, criteriaKey } = stateMapping[type];

    setter(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
        criteriaSetter(current => ({ ...current, [column]: { value: '', operator: 'contains' } }));
      } else {
        newSet.delete(column);
        criteriaSetter(current => {
          const { [column]: _, ...rest } = current;
          localStorage.setItem(criteriaKey, JSON.stringify(rest));
          return rest;
        });
      }
      localStorage.setItem(key, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleSearchColumnToggle = (column: string, checked: boolean) => handleSearchToggle(column, checked, 'primary');
  const handleSecondarySearchColumnToggle = (column: string, checked: boolean) => handleSearchToggle(column, checked, 'secondary');

  const handleSearchCriteriaChange = (column: string, value: string, isSecondary: boolean) => {
    const setter = isSecondary ? setSecondarySearchCriteria : setSearchCriteria;
    const key = isSecondary ? 'rekonMatch_secondarySearchCriteria' : 'rekonMatch_searchCriteria';
    setter(prev => {
      const newCriteria = { ...prev, [column]: { ...(prev[column] || { operator: 'contains' }), value } };
      localStorage.setItem(key, JSON.stringify(newCriteria));
      return newCriteria;
    });
  };

  const handleSearchOperatorChange = (column: string, operator: SearchOperator, isSecondary: boolean) => {
    const setter = isSecondary ? setSecondarySearchCriteria : setSearchCriteria;
    const key = isSecondary ? 'rekonMatch_secondarySearchCriteria' : 'rekonMatch_searchCriteria';
    setter(prev => {
      const newCriteria = { ...prev, [column]: { ...(prev[column] || { value: '' }), operator } };
      localStorage.setItem(key, JSON.stringify(newCriteria));
      return newCriteria;
    });
  };

  const handleDisplayColumnToggle = (column: string, checked: boolean, type: 'primary' | 'secondary' = 'primary') => {
    const setDisplayColumns = type === 'primary' ? setPrimaryDisplayColumns : setSecondaryDisplayColumns;
    
    setDisplayColumns(prev => {
      const newCols = checked ? [...prev, column] : prev.filter(c => c !== column);
      localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(newCols));
      if(!checked) {
        const newTypes = {...columnTypes}; delete newTypes[column]; setColumnTypes(newTypes);
        localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(newTypes));
        const newColors = {...columnColors}; delete newColors[column]; setColumnColors(newColors);
        localStorage.setItem('rekonMatch_columnColors', JSON.stringify(newColors));
      }
      return newCols;
    });
  };
  
  const handleSelectAllDisplayColumns = (checked: boolean, type: 'primary' | 'secondary' = 'primary') => {
    const headers = type === 'primary' ? primaryDataHeaders : secondaryDataHeaders;
    const setDisplayCols = type === 'primary' ? setPrimaryDisplayColumns : setSecondaryDisplayColumns;
    const newCols = checked ? headers : [];
    setDisplayCols(newCols);
    localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(newCols));
    if (!checked) {
        setColumnTypes({}); localStorage.removeItem('rekonMatch_columnTypes');
        setColumnColors({}); localStorage.removeItem('rekonMatch_columnColors');
    }
  };

  const moveDisplayColumn = (startIndex: number, endIndex: number, type: 'primary' | 'secondary' = 'primary') => {
    const displayColumns = type === 'primary' ? primaryDisplayColumns : secondaryDisplayColumns;
    const setDisplayColumns = type === 'primary' ? setPrimaryDisplayColumns : setSecondaryDisplayColumns;
    if (!displayColumns) return;
    const result = Array.from(displayColumns);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    setDisplayColumns(result);
    localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(result));
  };
  
  const handleColumnTypeChange = (column: string, type: ColumnType) => {
      const newTypes = {...columnTypes, [column]: type};
      setColumnTypes(newTypes);
      localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(newTypes));
  };

  const handleColumnColorChange = (column: string, color: string) => {
    const newColors = {...columnColors, [column]: color};
    setColumnColors(newColors);
    localStorage.setItem('rekonMatch_columnColors', JSON.stringify(newColors));
  };

  const handleTemplateAction = (action: 'save' | 'load' | 'delete', type: 'primary' | 'secondary', name?: string) => {
      const stateMapping = {
          primary: {
              templates: primaryDisplayTemplates,
              setTemplates: setPrimaryDisplayTemplates,
              newName: newPrimaryTemplateName,
              setNewName: setNewPrimaryTemplateName,
              displayColumns: primaryDisplayColumns,
              setDisplayColumns: setPrimaryDisplayColumns,
              key: 'rekonMatch_primaryTemplates',
              typeText: 'Utama'
          },
          secondary: {
              templates: secondaryDisplayTemplates,
              setTemplates: setSecondaryDisplayTemplates,
              newName: newSecondaryTemplateName,
              setNewName: setNewSecondaryTemplateName,
              displayColumns: secondaryDisplayColumns,
              setDisplayColumns: setSecondaryDisplayColumns,
              key: 'rekonMatch_secondaryTemplates',
              typeText: 'Sekunder'
          }
      };
  
      const { templates, setTemplates, newName, setNewName, displayColumns, setDisplayColumns, key, typeText } = stateMapping[type];
      
      if (action === 'save') {
          if (!newName.trim()) {
              toast({ variant: 'destructive', title: 'Nama Template Kosong' });
              return;
          }
          const templateData: DisplayTemplate = {
              displayColumns,
              columnTypes,
              columnColors
          };
          const updated = { ...templates, [newName]: templateData };
          setTemplates(updated);
          localStorage.setItem(key, JSON.stringify(updated));
          setNewName('');
          toast({ title: `Template ${typeText} Disimpan` });

      } else if (action === 'load' && name && templates[name]) {
          const loadedTemplate = templates[name];
          setDisplayColumns(loadedTemplate.displayColumns);
          localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(loadedTemplate.displayColumns));
          
          setColumnTypes(loadedTemplate.columnTypes);
          localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(loadedTemplate.columnTypes));
          
          setColumnColors(loadedTemplate.columnColors);
          localStorage.setItem('rekonMatch_columnColors', JSON.stringify(loadedTemplate.columnColors));
          
          toast({ title: `Template ${typeText} Dimuat` });

      } else if (action === 'delete' && name) {
          const { [name]: _, ...remaining } = templates;
          setTemplates(remaining);
          localStorage.setItem(key, JSON.stringify(remaining));
          toast({ variant: 'destructive', title: `Template ${typeText} Dihapus` });
      }
  };

  const handleIncludeEmptyRowsToggle = useCallback((checked: boolean) => {
    setIncludeEmptyRowsInResults(checked);
  }, []);
  
  const handleCopyResults = useCallback((dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => {
    if (!dataToCopy?.length || !columns.length) {
      toast({ variant: 'destructive', title: 'Tidak Ada Data untuk Disalin' });
      return;
    }

    const header = columns.join('\t');
    const rows = dataToCopy.map(row => 
      columns.map(col => {
        if (row.__isEmpty) return '';
        if (row.__isDuplicate) {
            // Display the criteria that caused the duplicate flag
            return `Duplikat untuk: ${JSON.stringify(row.__searchCriteria)}`;
        }
        const cellValue = row[col];
        const colType = row.__isNotFound ? 'text' : colTypes[col] || 'text';
        
        // Use formatted values for dates, raw values for currency
        let valueToCopy = cellValue;
        if (colType === 'date') {
          // For dates, use the formatted version as displayed in UI
          valueToCopy = formatCell(cellValue, colType);
        } else if (colType === 'currency') {
          // For currency, use raw value (not formatted with currency symbols)
          valueToCopy = cellValue;
        } else {
          // For other types, use the formatted version
          valueToCopy = formatCell(cellValue, colType);
        }
        
        return String(valueToCopy).replace(/\n/g, ' ').replace(/\t/g, ' ');
      }).join('\t')
    );
    
    const fullText = header + (rows.length > 0 ? '\n' + rows.join('\n') : '');

    // Try using the Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(fullText).then(() => {
        toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
      }).catch(err => {
        console.error('Gagal menyalin teks dengan Clipboard API: ', err);
        // Fallback to alternative method
        copyToClipboardFallback(fullText);
        toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
      });
    } else {
      // Fallback for non-secure contexts or when Clipboard API is not available
      copyToClipboardFallback(fullText);
      toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
    }
  }, [toast]);

  const handleExportExcel = useCallback((
    dataToExport: Row[] | null,
    columns: string[],
    colTypes: Record<string, ColumnType>,
    type: 'primary' | 'secondary'
  ) => {
    if (!dataToExport || dataToExport.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada baris data untuk diekspor." });
      return;
    }

    try {
      const exportRows = dataToExport.map(row => {
        const cleanRow: Record<string, any> = {};
        columns.forEach(col => {
          let val = row[col];
          const colType = colTypes[col];
          if (row.__isNotFound) {
            val = col === columns[0] ? 'TIDAK DITEMUKAN' : (val ?? '');
          } else if (row.__isDuplicate) {
            val = col === columns[0] ? 'DUPLIKAT (SUDAH PERNAH DITEMUKAN)' : '';
          } else if (colType === 'date') {
            val = formatCell(val, colType);
          } else if (colType === 'number' || colType === 'currency') {
            if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
              val = '';
            } else {
              const num = typeof val === 'number' ? val : Number(val);
              val = !isNaN(num) ? num : String(val);
            }
          } else {
            val = val !== null && val !== undefined ? String(val) : '';
          }
          cleanRow[col] = val ?? '';
        });
        return cleanRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Rekon');

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `RekonMatch_${type === 'primary' ? 'DataUtama' : 'DataSekunder'}_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Unduh Excel Berhasil",
        description: `Berkas ${fileName} (${dataToExport.length.toLocaleString('id-ID')} baris) berhasil disimpan.`,
      });
    } catch (err) {
      console.error("Gagal mengekspor data ke Excel:", err);
      toast({
        variant: "destructive",
        title: "Gagal Mengunduh Excel",
        description: "Terjadi kesalahan saat memproses berkas Excel.",
      });
    }
  }, [toast]);

  const handleClearSearchCriteria = useCallback((type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      setSearchCriteria({});
      setFilteredResults(null);
      localStorage.removeItem('rekonMatch_searchCriteria');
    } else {
      setSecondarySearchCriteria({});
      setSecondaryFilteredResults(null);
      localStorage.removeItem('rekonMatch_secondarySearchCriteria');
    }
    toast({
      title: "Kriteria Dikosongkan",
      description: `Kriteria pencarian data ${type === 'primary' ? 'utama' : 'sekunder'} berhasil dibersihkan.`,
    });
  }, [toast]);

  const handleRowClick = async (row: Row, type: 'primary' | 'secondary') => {
      const isPrimaryClick = type === 'primary';
      const linkColumn = isPrimaryClick ? primaryLinkColumn : secondaryLinkColumn;
      const targetLinkColumn = isPrimaryClick ? secondaryLinkColumn : primaryLinkColumn;
      const targetFileType = isPrimaryClick ? 'secondary' : 'primary';
      const setResults = isPrimaryClick ? setSecondaryResults : setPrimaryResults;
      const setSheetOpen = isPrimaryClick ? setIsSecondarySheetOpen : setIsPrimarySheetOpen;

      if (row.__isNotFound || !linkColumn || !targetLinkColumn || row.__isEmpty) return;

      try {
          const targetRows = await loadRowsFromStorage(targetFileType);
          if (!targetRows) {
              toast({ variant: "destructive", title: `Data ${isPrimaryClick ? 'Sekunder' : 'Utama'} Tidak Ditemukan` });
              return;
          }

          const lookupValue = row[linkColumn];
          if (lookupValue === undefined || lookupValue === null) return;
          
          setCurrentLookupValue(String(lookupValue));

          const relatedRows = targetRows.filter(targetRow => 
              String(targetRow[targetLinkColumn] ?? '').toLowerCase() === String(lookupValue).toLowerCase()
          );
          
          setResults(relatedRows);
          setSheetOpen(true);
      } catch(e) {
          console.error(`Gagal mengambil data ${isPrimaryClick ? 'sekunder' : 'utama'}:`, e);
          toast({ variant: "destructive", title: "Gagal Membuka Detail", description: "Tidak dapat mengambil data terkait dari penyimpanan lokal." });
      }
  };

  const handleConvertScientific = async () => {
    if (columnsToConvert.size === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Kolom Terpilih", description: "Pilih setidaknya satu kolom untuk dikonversi." });
      return;
    }
    
    setIsPrimaryProcessing(true);
    toast({ title: 'Memulai Konversi...', description: 'Proses ini mungkin memakan waktu.' });

    try {
        const dataRows = await loadRowsFromStorage(fileTypeToConvert);
        if (!dataRows) throw new Error("Data tidak ditemukan di IndexedDB.");
        
        let convertedCount = 0;
        const updatedRows = dataRows.map(row => {
            const newRow = { ...row };
            columnsToConvert.forEach(col => {
                const originalValue = newRow[col];
                const converted = scientificToFull(originalValue);
                if (converted !== originalValue) {
                    newRow[col] = converted;
                    convertedCount++;
                }
            });
            return newRow;
        });

        await saveRowsToStorage(fileTypeToConvert, updatedRows);
        syncDatasetToWorker(fileTypeToConvert, updatedRows);
        toast({ title: 'Konversi Selesai', description: `${convertedCount} sel telah dikonversi dan disimpan.` });
        setIsConvertDialogOpen(false);
        setColumnsToConvert(new Set());
    } catch(e) {
        console.error("Gagal mengonversi notasi ilmiah:", e);
        toast({ variant: "destructive", title: "Gagal Mengonversi", description: "Terjadi kesalahan saat memproses data." });
    } finally {
        setIsPrimaryProcessing(false);
    }
  };

  const handleConvertAllScientific = async () => {
    setIsPrimaryProcessing(true);
    setIsSecondaryProcessing(true);
    toast({ title: 'Memindai & Mengonversi Semua Data...', description: 'Ini mungkin memakan waktu cukup lama.' });

    try {
        let totalConverted = 0;
        for (const type of ['primary', 'secondary'] as const) {
            const rows = await loadRowsFromStorage(type);
            if (!rows) continue;

            const updatedRows = rows.map(row => {
                const newRow = { ...row };
                Object.keys(newRow).forEach(key => {
                    const originalValue = newRow[key];
                    const converted = scientificToFull(originalValue);
                    if (converted !== originalValue) {
                        newRow[key] = converted;
                        totalConverted++;
                    }
                });
                return newRow;
            });

            await saveRowsToStorage(type, updatedRows);
            syncDatasetToWorker(type, updatedRows);
        }
        
        toast({ title: 'Konversi Global Selesai', description: `${totalConverted} sel di semua file telah dikonversi dan disimpan.` });
        
    } catch (e) {
        console.error("Gagal mengonversi semua notasi ilmiah:", e);
        toast({ variant: "destructive", title: "Gagal Konversi Global", description: "Terjadi kesalahan saat memproses data." });
    } finally {
        setIsPrimaryProcessing(false);
        setIsSecondaryProcessing(false);
    }
};

  const handleColumnToConvertToggle = (column: string, checked: boolean) => {
    setColumnsToConvert(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(column);
      else newSet.delete(column);
      return newSet;
    });
  };
  
  useEffect(() => {
    localStorage.setItem('rekonMatch_primaryLinkColumn', JSON.stringify(primaryLinkColumn));
  }, [primaryLinkColumn]);

  useEffect(() => {
    localStorage.setItem('rekonMatch_secondaryLinkColumn', JSON.stringify(secondaryLinkColumn));
  }, [secondaryLinkColumn]);

  const handleExportBackup = useCallback(async () => {
    let gzipWriter: WritableStreamDefaultWriter<BufferSource> | null = null;
    try {
      const pHeaders = await get<string[]>('primary_headers');
      const sHeaders = await get<string[]>('secondary_headers');

      if ((!pHeaders || pHeaders.length === 0) && (!sHeaders || sHeaders.length === 0)) {
        toast({ variant: 'destructive', title: 'Tidak Ada Data', description: 'Belum ada data untuk dicadangkan.' });
        return;
      }

      setBackupProgress({
        mode: 'export',
        stage: 'Mengumpulkan metadata & pengaturan...',
        detail: 'Menyiapkan struktur cadangan...',
        percent: 2,
      });
      await new Promise(r => setTimeout(r, 10));

      const [pFileName, pFileList, sFileName, sFileList, pMeta, sMeta] = await Promise.all([
        get<string>('primary_fileName'),
        get<string[]>('primary_fileList'),
        get<string>('secondary_fileName'),
        get<string[]>('secondary_fileList'),
        get<{ totalRows: number; chunkCount: number }>('primary_rows_meta'),
        get<{ totalRows: number; chunkCount: number }>('secondary_rows_meta'),
      ]);

      const settings: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rekonMatch_')) {
          settings[key] = localStorage.getItem(key) || '';
        }
      }

      const metaLine = JSON.stringify({
        _rekonType: 'meta',
        app: 'RekonMatch',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        primary_headers: pHeaders || [],
        primary_fileName: pFileName || '',
        primary_fileList: pFileList || (pFileName ? [pFileName] : []),
        secondary_headers: sHeaders || [],
        secondary_fileName: sFileName || '',
        secondary_fileList: sFileList || (sFileName ? [sFileName] : []),
        settings,
      });

      // Stream NDJSON langsung melalui CompressionStream('gzip') agar hemat ukuran berkas & RAM
      const useGzip = typeof CompressionStream !== 'undefined';
      const encoder = useGzip ? new TextEncoder() : null;
      const outputParts: BlobPart[] = [];
      let readerDone: Promise<void> | null = null;
      let streamReadError: unknown = null;

      if (useGzip) {
        const cs = new CompressionStream('gzip');
        gzipWriter = cs.writable.getWriter();
        const gzipReader = cs.readable.getReader();
        readerDone = (async () => {
          try {
            while (true) {
              const { value, done } = await gzipReader.read();
              if (done) break;
              if (value) outputParts.push(value as unknown as BlobPart);
            }
          } catch (err) {
            streamReadError = err;
          }
        })();
      }

      const writeTextChunk = async (text: string) => {
        if (useGzip && gzipWriter && encoder) {
          await gzipWriter.write(encoder.encode(text) as unknown as BufferSource);
        } else {
          outputParts.push(new Blob([text], { type: 'application/x-ndjson' }));
        }
      };

      await writeTextChunk(metaLine + '\n');

      const SUB_CHUNK = 500;
      const BATCH_LINES_LIMIT = 4;

      const hasPrimary = Boolean(pHeaders && pHeaders.length > 0);
      const hasSecondary = Boolean(sHeaders && sHeaders.length > 0);

      const pTotal = pMeta?.totalRows || primaryRowCount || 0;
      const sTotal = sMeta?.totalRows || secondaryRowCount || 0;
      const grandTotal = pTotal + sTotal || 1;
      const primaryWeight = hasPrimary ? (hasSecondary ? Math.max(15, Math.round((pTotal / grandTotal) * 85)) : 85) : 0;
      const secondaryWeight = hasSecondary ? 85 - primaryWeight : 0;

      const appendDatasetStream = async (
        target: 'primary' | 'secondary',
        label: string,
        meta: { totalRows: number; chunkCount: number } | undefined,
        startPct: number,
        weightPct: number
      ) => {
        let batchLines: string[] = [];
        const flushBatch = async () => {
          if (batchLines.length > 0) {
            await writeTextChunk(batchLines.join(''));
            batchLines = [];
          }
        };

        const stageLabel = useGzip ? `Mengemas & mengompresi ${label}...` : `Mengemas ${label}...`;

        if (meta && typeof meta.chunkCount === 'number' && meta.chunkCount > 0) {
          for (let i = 0; i < meta.chunkCount; i++) {
            const chunk = await get<Row[]>(`${target}_rows_chunk_${i}`);
            if (chunk && Array.isArray(chunk)) {
              for (let j = 0; j < chunk.length; j += SUB_CHUNK) {
                const slice = chunk.slice(j, j + SUB_CHUNK);
                batchLines.push(JSON.stringify({ _rekonType: 'chunk', target, rows: slice }) + '\n');
                if (batchLines.length >= BATCH_LINES_LIMIT) {
                  await flushBatch();
                }
              }
            }
            await flushBatch();
            const pct = Math.min(92, Math.round(startPct + ((i + 1) / meta.chunkCount) * weightPct));
            setBackupProgress({
              mode: 'export',
              stage: stageLabel,
              detail: `Potongan ${i + 1} dari ${meta.chunkCount} (${meta.totalRows.toLocaleString('id-ID')} baris)`,
              percent: pct,
            });
            await new Promise(r => setTimeout(r, 0));
          }
        } else {
          const legacyRows = await get<Row[]>(`${target}_rows`);
          if (legacyRows && Array.isArray(legacyRows) && legacyRows.length > 0) {
            const totalSlices = Math.ceil(legacyRows.length / SUB_CHUNK);
            for (let j = 0; j < legacyRows.length; j += SUB_CHUNK) {
              const slice = legacyRows.slice(j, j + SUB_CHUNK);
              batchLines.push(JSON.stringify({ _rekonType: 'chunk', target, rows: slice }) + '\n');
              if (batchLines.length >= BATCH_LINES_LIMIT) {
                await flushBatch();
                const currentIdx = Math.floor(j / SUB_CHUNK) + 1;
                const pct = Math.min(92, Math.round(startPct + (currentIdx / totalSlices) * weightPct));
                setBackupProgress({
                  mode: 'export',
                  stage: stageLabel,
                  detail: `${Math.min(j + SUB_CHUNK, legacyRows.length).toLocaleString('id-ID')} dari ${legacyRows.length.toLocaleString('id-ID')} baris`,
                  percent: pct,
                });
                await new Promise(r => setTimeout(r, 0));
              }
            }
            await flushBatch();
          }
        }
      };

      if (hasPrimary) {
        await appendDatasetStream('primary', 'Data Utama', pMeta ?? undefined, 5, primaryWeight);
      }
      if (hasSecondary) {
        await appendDatasetStream('secondary', 'Data Sekunder', sMeta ?? undefined, 5 + primaryWeight, secondaryWeight);
      }

      if (useGzip && gzipWriter) {
        setBackupProgress({
          mode: 'export',
          stage: 'Menyelesaikan kompresi Gzip (.rekon)...',
          detail: 'Menutup aliran kompresi & menyiapkan unduhan...',
          percent: 96,
        });
        await new Promise(r => setTimeout(r, 20));
        const activeWriter = gzipWriter;
        gzipWriter = null;
        await activeWriter.close();
        await readerDone;
        if (streamReadError) throw streamReadError;
      } else {
        setBackupProgress({
          mode: 'export',
          stage: 'Menyusun berkas unduhan (.rekon)...',
          detail: 'Menggabungkan paket data ke memori unduhan...',
          percent: 96,
        });
        await new Promise(r => setTimeout(r, 20));
      }

      const finalBlob = new Blob(outputParts, {
        type: useGzip ? 'application/gzip' : 'application/x-ndjson',
      });
      const sizeMB = (finalBlob.size / (1024 * 1024)).toFixed(1);

      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `rekonmatch-backup-${dateStr}.rekon`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setBackupProgress({
        mode: 'export',
        stage: 'Selesai!',
        detail: `Berkas cadangan (${sizeMB} MB) berhasil diunduh.`,
        percent: 100,
      });
      await new Promise(r => setTimeout(r, 350));

      toast({
        title: 'Cadangan Berhasil Dibuat',
        description: `Berkas cadangan .rekon (${sizeMB} MB${useGzip ? ', terkompresi Gzip' : ''}) berhasil diunduh.`,
      });
    } catch (e: any) {
      if (gzipWriter) {
        gzipWriter.abort(e).catch(() => {});
      }
      console.error('Gagal mencadangkan data:', e);
      toast({
        variant: 'destructive',
        title: 'Gagal Cadangkan Data',
        description: e?.message || 'Terjadi kesalahan saat mengekspor data.',
      });
    } finally {
      setBackupProgress(null);
    }
  }, [primaryRowCount, secondaryRowCount, toast]);

  const handleImportBackup = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const totalMB = (file.size / (1024 * 1024)).toFixed(1);
    let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      setBackupProgress({
        mode: 'import',
        stage: 'Memeriksa format berkas cadangan...',
        detail: `0 MB / ${totalMB} MB (${file.name})`,
        percent: 2,
      });
      await new Promise(r => setTimeout(r, 10));

      const headBuf = new Uint8Array(await file.slice(0, 256).arrayBuffer());
      const isGzip = headBuf.length >= 2 && headBuf[0] === 0x1f && headBuf[1] === 0x8b;
      const headText = isGzip ? '' : new TextDecoder('utf-8').decode(headBuf);
      const isPlainStreamingV2 = !isGzip && /"_rekonType"\s*:\s*"meta"/.test(headText);

      if (isGzip || isPlainStreamingV2) {
        if (isGzip && typeof DecompressionStream === 'undefined') {
          throw new Error('Peramban Anda tidak mendukung dekompresi Gzip (DecompressionStream). Gunakan Chrome, Edge, atau Firefox versi terbaru.');
        }

        const decoder = new TextDecoder('utf-8');
        let lineBuffer = '';
        let bytesRead = 0;
        let isMetaProcessed = false;
        let lastUiUpdate = 0;

        if (isGzip) {
          const progressTransform = new TransformStream<Uint8Array, BufferSource>({
            transform(chunk, controller) {
              bytesRead += chunk.byteLength;
              controller.enqueue(chunk as unknown as BufferSource);
            },
          });
          streamReader = file
            .stream()
            .pipeThrough(progressTransform)
            .pipeThrough(new DecompressionStream('gzip'))
            .getReader();
        } else {
          streamReader = file.stream().getReader();
        }

        const buffers: Record<'primary' | 'secondary', Row[]> = { primary: [], secondary: [] };
        const chunkIndices: Record<'primary' | 'secondary', number> = { primary: 0, secondary: 0 };
        const totalRowsRestored: Record<'primary' | 'secondary', number> = { primary: 0, secondary: 0 };

        const flushTargetBuffer = async (target: 'primary' | 'secondary', forceAll = false) => {
          while (buffers[target].length >= CHUNK_ROW_SIZE || (forceAll && buffers[target].length > 0)) {
            const sliceSize = Math.min(CHUNK_ROW_SIZE, buffers[target].length);
            const idbChunk = buffers[target].splice(0, sliceSize);
            await set(`${target}_rows_chunk_${chunkIndices[target]}`, idbChunk);
            chunkIndices[target]++;
          }
        };

        const processLine = async (rawLine: string) => {
          const line = rawLine.trim();
          if (!line) return;
          const parsed = JSON.parse(line);

          if (!isMetaProcessed) {
            if (parsed._rekonType !== 'meta' || parsed.app !== 'RekonMatch') {
              throw new Error('Metadata berkas cadangan .rekon tidak valid.');
            }
            // Bersihkan sesi lama secara bersih setelah metadata tervalidasi
            await clear();
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith('rekonMatch_')) localStorage.removeItem(k);
            });

            if (parsed.primary_headers) await set('primary_headers', parsed.primary_headers);
            if (parsed.primary_fileName !== undefined) await set('primary_fileName', parsed.primary_fileName);
            if (parsed.primary_fileList) await set('primary_fileList', parsed.primary_fileList);
            if (parsed.secondary_headers) await set('secondary_headers', parsed.secondary_headers);
            if (parsed.secondary_fileName !== undefined) await set('secondary_fileName', parsed.secondary_fileName);
            if (parsed.secondary_fileList) await set('secondary_fileList', parsed.secondary_fileList);

            if (parsed.settings && typeof parsed.settings === 'object') {
              Object.entries(parsed.settings).forEach(([key, val]) => {
                if (typeof val === 'string') localStorage.setItem(key, val);
              });
            }
            isMetaProcessed = true;
            return;
          }

          if (parsed._rekonType === 'chunk' && (parsed.target === 'primary' || parsed.target === 'secondary') && Array.isArray(parsed.rows)) {
            const t = parsed.target as 'primary' | 'secondary';
            for (let r = 0; r < parsed.rows.length; r++) {
              buffers[t].push(parsed.rows[r]);
            }
            totalRowsRestored[t] += parsed.rows.length;
            if (buffers[t].length >= CHUNK_ROW_SIZE) {
              await flushTargetBuffer(t, false);
            }
          }
        };

        while (true) {
          const { value, done } = await streamReader.read();
          if (value) {
            if (!isGzip) {
              bytesRead += value.byteLength;
            }
            lineBuffer += decoder.decode(value, { stream: !done });
          } else if (done) {
            lineBuffer += decoder.decode();
          }

          let newlineIdx: number;
          while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
            const line = lineBuffer.slice(0, newlineIdx);
            lineBuffer = lineBuffer.slice(newlineIdx + 1);
            await processLine(line);
          }

          const now = Date.now();
          if (now - lastUiUpdate > 80 || done) {
            lastUiUpdate = now;
            const shownBytes = Math.min(bytesRead, file.size);
            const readMB = (shownBytes / (1024 * 1024)).toFixed(1);
            const pct = Math.min(82, Math.max(4, Math.round((shownBytes / (file.size || 1)) * 80)));
            const countSum = totalRowsRestored.primary + totalRowsRestored.secondary;
            setBackupProgress({
              mode: 'import',
              stage: isGzip ? 'Mendekompresi & memulihkan data...' : 'Memulihkan data ke penyimpanan lokal...',
              detail: `${readMB} MB / ${totalMB} MB (${countSum.toLocaleString('id-ID')} baris diproses)`,
              percent: pct,
            });
            await new Promise(r => setTimeout(r, 0));
          }

          if (done) break;
        }

        if (lineBuffer.trim()) {
          await processLine(lineBuffer);
        }

        if (!isMetaProcessed) {
          throw new Error('Berkas cadangan kosong atau tidak dikenali.');
        }

        setBackupProgress({
          mode: 'import',
          stage: 'Menyelesaikan penulisan potongan...',
          detail: 'Menyimpan metadata indeks ke IndexedDB...',
          percent: 86,
        });
        await new Promise(r => setTimeout(r, 10));

        for (const target of ['primary', 'secondary'] as const) {
          await flushTargetBuffer(target, true);
          if (totalRowsRestored[target] > 0) {
            await set(`${target}_rows_meta`, {
              totalRows: totalRowsRestored[target],
              chunkSize: CHUNK_ROW_SIZE,
              chunkCount: chunkIndices[target],
            });
          }
        }
      } else {
        // Fallback kompatibilitas berkas cadangan v1.0 (monolitik JSON)
        if (file.size > 400 * 1024 * 1024) {
          throw new Error('Berkas cadangan format v1 terlalu besar untuk memori string peramban (> 400 MB).');
        }

        setBackupProgress({
          mode: 'import',
          stage: 'Membaca berkas cadangan (v1.0)...',
          detail: `Memuat ${totalMB} MB dari disk...`,
          percent: 25,
        });
        await new Promise(r => setTimeout(r, 10));

        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed.data) {
          throw new Error('Format berkas cadangan tidak sesuai.');
        }

        const { data, settings } = parsed;

        await clear();
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('rekonMatch_')) localStorage.removeItem(k);
        });

        if (data.primary_headers) await set('primary_headers', data.primary_headers);
        if (data.primary_fileName) await set('primary_fileName', data.primary_fileName);
        if (data.primary_fileList) await set('primary_fileList', data.primary_fileList);
        if (data.secondary_headers) await set('secondary_headers', data.secondary_headers);
        if (data.secondary_fileName) await set('secondary_fileName', data.secondary_fileName);
        if (data.secondary_fileList) await set('secondary_fileList', data.secondary_fileList);

        if (data.primary_rows && Array.isArray(data.primary_rows) && data.primary_rows.length > 0) {
          await saveRowsToStorage('primary', data.primary_rows, (_pct, detail) => {
            setBackupProgress({
              mode: 'import',
              stage: 'Menyimpan Data Utama...',
              detail,
              percent: 55,
            });
          });
        }
        if (data.secondary_rows && Array.isArray(data.secondary_rows) && data.secondary_rows.length > 0) {
          await saveRowsToStorage('secondary', data.secondary_rows, (_pct, detail) => {
            setBackupProgress({
              mode: 'import',
              stage: 'Menyimpan Data Sekunder...',
              detail,
              percent: 78,
            });
          });
        }

        if (settings && typeof settings === 'object') {
          Object.entries(settings).forEach(([key, val]) => {
            if (typeof val === 'string') localStorage.setItem(key, val);
          });
        }
      }

      setBackupProgress({
        mode: 'import',
        stage: 'Menyinkronkan ke memori pencarian...',
        detail: 'Memuat ulang data & indeks Web Worker...',
        percent: 94,
      });
      await new Promise(r => setTimeout(r, 10));

      syncedDatasetsRef.current.clear();
      workerRef.current?.postMessage({ action: 'clearData' });
      await loadFromStorage(true);

      setBackupProgress({
        mode: 'import',
        stage: 'Selesai!',
        detail: 'Seluruh data & pengaturan berhasil dipulihkan.',
        percent: 100,
      });
      await new Promise(r => setTimeout(r, 300));

      toast({ title: 'Pemulihan Selesai', description: 'Semua data dan pengaturan berhasil dipulihkan.' });
    } catch (e: any) {
      if (streamReader) {
        streamReader.cancel().catch(() => {});
      }
      console.error('Gagal memulihkan cadangan:', e);
      toast({ variant: 'destructive', title: 'Gagal Memulihkan', description: e.message || 'Berkas cadangan tidak valid.' });
    } finally {
      setBackupProgress(null);
      if (event.target) event.target.value = '';
    }
  }, [loadFromStorage, toast]);


  return {
    appState,
    activeTab,
    setActiveTab,
    primaryDataHeaders,
    primaryFileName,
    primaryFileList,
    secondaryDataHeaders,
    secondaryFileName,
    secondaryFileList,
    isLoadingFile,
    primaryFileInputRef,
    secondaryFileInputRef,
    handleFileChange,
    handleUploadClick,
    handleReset,
    handleSwapFiles,
    isLinkingEnabled: primaryDataHeaders.length > 0 && secondaryDataHeaders.length > 0,
    primaryLinkColumn,
    setPrimaryLinkColumn,
    secondaryLinkColumn,
    setSecondaryLinkColumn,
    searchColumns,
    secondarySearchColumns,
    primaryDisplayColumns,
    secondaryDisplayColumns,
    searchCriteria,
    secondarySearchCriteria,
    columnTypes,
    columnColors,
    primaryDisplayTemplates,
    secondaryDisplayTemplates,
    newPrimaryTemplateName,
    setNewPrimaryTemplateName,
    newSecondaryTemplateName,
    setNewSecondaryTemplateName,
    filteredResults,
    secondaryFilteredResults,
    isProcessing,
    currentTheme,
    selectedPrimaryRow,
    primaryRowCount,
    secondaryRowCount,
    primaryAppendIdColumn,
    setPrimaryAppendIdColumn,
    secondaryAppendIdColumn,
    setSecondaryAppendIdColumn,
    setSelectedPrimaryRow,
    currentLookupValue,
    isSecondarySheetOpen,
    isPrimarySheetOpen,
    primaryResults,
    secondaryResults,
    includeEmptyRowsInResults,
    handleIncludeEmptyRowsToggle,
    handleSearchColumnToggle,
    handleSecondarySearchColumnToggle,
    handleSelectAllDisplayColumns: (checked: boolean) => handleSelectAllDisplayColumns(checked, 'primary'),
    handleSelectAllSecondaryDisplayColumns: (checked: boolean) => handleSelectAllDisplayColumns(checked, 'secondary'),
    handleDisplayColumnToggle: (column: string, checked: boolean) => handleDisplayColumnToggle(column, checked, 'primary'),
    handleSecondaryDisplayColumnToggle: (column: string, checked: boolean) => handleDisplayColumnToggle(column, checked, 'secondary'),
    moveDisplayColumn: (startIndex: number, endIndex: number) => moveDisplayColumn(startIndex, endIndex, 'primary'),
    moveSecondaryDisplayColumn: (startIndex: number, endIndex: number) => moveDisplayColumn(startIndex, endIndex, 'secondary'),
    handleColumnTypeChange,
    handleColumnColorChange,
    handleSaveTemplate: (type: 'primary' | 'secondary') => handleTemplateAction('save', type, type === 'primary' ? newPrimaryTemplateName : newSecondaryTemplateName),
    handleLoadTemplate: (name: string, type: 'primary' | 'secondary') => handleTemplateAction('load', type, name),
    handleDeleteTemplate: (name: string, type: 'primary' | 'secondary') => handleTemplateAction('delete', type, name),
    handleSearchCriteriaChange,
    handleSearchOperatorChange,
    handleClearSearchCriteria,
    handleCopyResults,
    handleExportExcel,
    handleRowClick: (row: Row) => handleRowClick(row, 'primary'),
    handleSecondaryRowClick: (row: Row) => handleRowClick(row, 'secondary'),
    setIsSecondarySheetOpen,
    setIsPrimarySheetOpen,
    formatCell,
    // Scientific Notation Converter
    isConvertDialogOpen,
    setIsConvertDialogOpen,
    columnsToConvert,
    fileTypeToConvert,
    setFileTypeToConvert,
    handleColumnToConvertToggle,
    handleConvertScientific,
    handleConvertAllScientific,
    isValidationDialogOpen,
    setIsValidationDialogOpen,
    validationMismatchInfo,
    handleConfirmUpload,
    handleCancelUpload,
    storageEstimate,
    updateStorageEstimate,
    handleExportBackup,
    handleImportBackup,
    uploadProgress,
    backupProgress,
    swapProgress,
    isRestoringStorage,
    restoreStatus,
  };
};


// Fallback function for copying to clipboard in non-secure contexts
const copyToClipboardFallback = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};


    