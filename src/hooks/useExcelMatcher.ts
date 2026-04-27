
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Row } from "@/lib/mock-data";
import { set, get, clear } from 'idb-keyval';
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
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}


export function scientificToFull(value: any): string | number | bigint {
    let numStr = String(value);

    // Only process if it's likely scientific notation.
    if (typeof value !== 'string' && typeof value !== 'number' || !/e/i.test(numStr) || isNaN(Number(numStr))) {
        return value;
    }

    const [mantissa, exponent] = numStr.split('e');
    const [lead, decimal] = mantissa.split('.');
    const exp = parseInt(exponent, 10);

    let sign = '';
    if (lead.startsWith('-')) {
        sign = '-';
    }

    const absLead = lead.replace('-', '');
    const absDecimal = decimal || '';

    if (exp > 0) {
        if (absDecimal.length <= exp) {
            numStr = absLead + absDecimal.padEnd(exp, '0');
        } else {
            numStr = absLead + absDecimal.slice(0, exp) + '.' + absDecimal.slice(exp);
        }
    } else {
        const padding = '0'.repeat(Math.abs(exp) - absLead.length);
        numStr = '0.' + padding + absLead + absDecimal;
    }
    
    numStr = sign + numStr.replace(/\.$/, '');

    try {
        // Use BigInt for whole numbers to maintain precision
        if (!numStr.includes('.')) {
            return BigInt(numStr);
        }
    } catch (e) {
        // Fallback for any unexpected BigInt conversion error
        return numStr;
    }
    
    // For numbers with decimals, return as number or string if too large for Number type.
    const asNumber = Number(numStr);
    if (asNumber > Number.MAX_SAFE_INTEGER || asNumber < Number.MIN_SAFE_INTEGER) {
        return numStr;
    }

    return asNumber;
}


export const formatCell = (value: any, type: 'text' | 'number' | 'currency' | 'date' = 'text'): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'bigint') {
    return value.toString();
  }
  
  switch (type) {
    case 'date':
      if (typeof value === 'number') {
        return formatDateMMDDYYYY(excelSerialDateToJSDate(value));
      }
      if (typeof value === 'string') {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          return formatDateMMDDYYYY(parsedDate);
        }
      }
       try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDateMMDDYYYY(date);
        }
      } catch (e) {
        // fall through
      }
      return String(value);
    case 'number':
      const numValue = Number(String(value).replace(/[^0-9.-]+/g,""));
      if (isNaN(numValue)) return String(value);
      return String(numValue);
    case 'currency':
      const currencyValue = Number(String(value).replace(/[^0-9.-]+/g,""));
      if (isNaN(currencyValue)) return String(value);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(currencyValue);
    case 'text':
    default:
      return String(value);
  }
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

export const useExcelMatcher = () => {
  const [appState, setAppState] = useState<AppState>('initial');
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  
  const [primaryDataHeaders, setPrimaryDataHeaders] = useState<string[]>([]);
  const [primaryFileName, setPrimaryFileName] = useState<string>('');
  const [searchColumns, setSearchColumns] = useState<Set<string>>(new Set());
  const [primaryDisplayColumns, setPrimaryDisplayColumns] = useState<string[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  
  const [secondaryDataHeaders, setSecondaryDataHeaders] = useState<string[]>([]);
  const [secondaryFileName, setSecondaryFileName] = useState<string>('');
  const [secondarySearchColumns, setSecondarySearchColumns] = useState<Set<string>>(new Set());
  const [secondaryDisplayColumns, setSecondaryDisplayColumns] = useState<string[]>([]);
  const [secondarySearchCriteria, setSecondarySearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [secondaryFilteredResults, setSecondaryFilteredResults] = useState<Row[] | null>(null);
  
  const [primaryLinkColumn, setPrimaryLinkColumn] = useState<string>('');
  const [secondaryLinkColumn, setSecondaryLinkColumn] = useState<string>('');
  
  const [primaryRowCount, setPrimaryRowCount] = useState<number>(0);
  const [secondaryRowCount, setSecondaryRowCount] = useState<number>(0);
  
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
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState<'primary' | 'secondary' | false>(false);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const fileActionRef = useRef<'replace' | 'append'>('replace');
  const { toast } = useToast();
  
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [includeEmptyRowsInResults, setIncludeEmptyRowsInResults] = useState(true);

  const [selectedPrimaryRow, setSelectedPrimaryRow] = useState<Row | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [columnsToConvert, setColumnsToConvert] = useState<Set<string>>(new Set());
  const [fileTypeToConvert, setFileTypeToConvert] = useState<'primary' | 'secondary'>('primary');
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadFromStorage = useCallback(async () => {
    try {
      const pHeaders = await get<string[]>('primary_headers');
      if (pHeaders && pHeaders.length > 0) {
        setPrimaryDataHeaders(pHeaders);
        setPrimaryFileName(await get('primary_fileName') || '');
        const pRows = await get<Row[]>('primary_rows');
        if (pRows) setPrimaryRowCount(pRows.length);
        
        const sHeaders = await get<string[]>('secondary_headers');
        if (sHeaders && sHeaders.length > 0) {
          setSecondaryDataHeaders(sHeaders);
          setSecondaryFileName(await get('secondary_fileName') || '');
          const sRows = await get<Row[]>('secondary_rows');
          if (sRows) setSecondaryRowCount(sRows.length);
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

        getFromLocalStorage('rekonMatch_primaryDisplayColumns', setPrimaryDisplayColumns, false, pHeaders);
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
        
        setAppState('loaded');
      }
    } catch (error) {
      console.error("Gagal memeriksa IndexedDB saat inisialisasi:", error);
    }
  }, []);
  
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const updateTheme = () => setCurrentTheme(localStorage.getItem('rekonmatch_theme') || 'dark');
    updateTheme();
    window.addEventListener('themeChanged', updateTheme);
    return () => window.removeEventListener('themeChanged', updateTheme);
  }, []);

  const runQuery = useCallback(async (type: 'primary' | 'secondary') => {
    const isPrimary = type === 'primary';
    const criteria = isPrimary ? searchCriteria : secondarySearchCriteria;
    const searchCols = isPrimary ? searchColumns : secondarySearchColumns;
    const headers = isPrimary ? primaryDataHeaders : secondaryDataHeaders;
    const setResults = isPrimary ? setFilteredResults : setSecondaryFilteredResults;
  
    const activeCriteria = Object.fromEntries(
        Object.entries(criteria).filter(([col, crit]) => searchCols.has(col) && crit?.value.trim())
    );
    const isQueryInvalid = searchCols.size === 0 || Object.keys(activeCriteria).length === 0;
  
    if (isQueryInvalid) {
        setResults([]);
        return;
    }
    
    setIsProcessing(true);
  
    try {
        const dataRows = await get<Row[]>(`${type}_rows`);
        if (!dataRows) {
            toast({ variant: "destructive", title: `Data ${isPrimary ? 'Utama' : 'Sekunder'} Tidak Ditemukan` });
            return;
        }
  
        const checkMatch = (value: any, operator: SearchOperator, term: string): boolean => {
            const val = String(value ?? '').toLowerCase();
            const t = term.toLowerCase();
            if (t === '') return false;
            switch (operator) {
                case 'contains': return val.includes(t);
                case 'equals': return val === t;
                case 'startsWith': return val.startsWith(t);
                case 'endsWith': return val.endsWith(t);
                default: return false;
            }
        };
        
        const criteriaValuesByCol = Object.entries(activeCriteria).reduce((acc, [col, crit]) => {
            acc[col] = crit.value.split(/\r\n|\n|\r/).map(t => t.trim());
            return acc;
        }, {} as Record<string, string[]>);
        
        const maxLen = Math.max(0, ...Object.values(criteriaValuesByCol).map(v => v.length));
        
        const parsedCriteriaByRow: Record<string, string>[] = [];
        for (let i = 0; i < maxLen; i++) {
            const rowCriteria: Record<string, string> = {};
            for (const col of Object.keys(activeCriteria)) {
                rowCriteria[col] = criteriaValuesByCol[col]?.[i];
            }
            parsedCriteriaByRow.push(rowCriteria);
        }
  
        const finalResults: Row[] = [];
        const processedCriteria = new Set<string>();
        const foundRowsTracker = new Set<string>();
  
        for (const termRow of parsedCriteriaByRow) {
            const termKey = JSON.stringify(Object.entries(termRow).sort());
            const isRowEffectivelyEmpty = Object.values(termRow).every(term => term === '' || term === undefined);
  
            if (isRowEffectivelyEmpty) {
                if (includeEmptyRowsInResults) {
                    finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
                }
                continue;
            }
  
            if (processedCriteria.has(termKey)) {
                if (includeEmptyRowsInResults) {
                    finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
                }
                continue;
            }
            
            processedCriteria.add(termKey);
  
            const foundMatches = dataRows.filter(dataRow => 
                Object.entries(termRow).every(([col, term]) => {
                    if (term === '' || term === undefined) return true;
                    return checkMatch(dataRow[col], activeCriteria[col].operator, term);
                })
            );
  
            if (foundMatches.length > 0) {
                let newMatchesFound = 0;
                foundMatches.forEach(match => {
                    const uniqueKey = JSON.stringify(match);
                    if (!foundRowsTracker.has(uniqueKey)) {
                        foundRowsTracker.add(uniqueKey);
                        finalResults.push({ ...match, __searchCriteria: termRow });
                        newMatchesFound++;
                    }
                });
  
                if (newMatchesFound === 0 && includeEmptyRowsInResults) {
                    finalResults.push({ __isEmpty: true, __searchCriteria: termRow });
                }
            } else {
                const notFoundRow: Row = { __isNotFound: true, __searchCriteria: termRow };
                headers.forEach(header => {
                    notFoundRow[header] = termRow[header] || '';
                });
                finalResults.push(notFoundRow);
            }
        }
        setResults(finalResults);
    } catch(e) {
        console.error(`Gagal menjalankan kueri ${type}:`, e);
        toast({ variant: "destructive", title: "Gagal Menjalankan Kueri", description: "Tidak dapat mengambil data dari penyimpanan lokal." });
    } finally {
        setIsProcessing(false);
    }
  }, [searchCriteria, secondarySearchCriteria, searchColumns, secondarySearchColumns, primaryDataHeaders, secondaryDataHeaders, includeEmptyRowsInResults, toast]);


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


  const resetDataStates = (type: 'primary' | 'secondary', headers: string[] | null) => {
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
    setLinkCol('');
    localStorage.removeItem(`rekonMatch_${type}LinkColumn`);

    if (type === 'primary') {
      setColumnTypes({});
      localStorage.removeItem('rekonMatch_columnTypes');
      setColumnColors({});
      localStorage.removeItem('rekonMatch_columnColors');
    }
  };
  
  const handleSwapFiles = async () => {
    try {
        const pHeaders = await get<string[]>('primary_headers');
        const pName = await get('primary_fileName');
        const sHeaders = await get<string[]>('secondary_headers');
        const sName = await get('secondary_fileName');

        if (!pHeaders?.length || !sHeaders?.length) {
            toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Kedua file harus ada untuk ditukar." });
            return;
        }

        const pRows = await get('primary_rows');
        const sRows = await get('secondary_rows');
        
        await Promise.all([
          set('primary_headers', sHeaders), set('primary_fileName', sName), set('primary_rows', sRows),
          set('secondary_headers', pHeaders), set('secondary_fileName', pName), set('secondary_rows', pRows)
        ]);

        setPrimaryDataHeaders(sHeaders);
        setPrimaryFileName(sName || '');
        setPrimaryRowCount(sRows ? sRows.length : 0);
        setSecondaryDataHeaders(pHeaders);
        setSecondaryFileName(pName || '');
        setSecondaryRowCount(pRows ? pRows.length : 0);

        const newPrimaryLink = secondaryLinkColumn;
        const newSecondaryLink = primaryLinkColumn;
        setPrimaryLinkColumn(newPrimaryLink);
        setSecondaryLinkColumn(newSecondaryLink);
        localStorage.setItem('rekonMatch_primaryLinkColumn', JSON.stringify(newPrimaryLink));
        localStorage.setItem('rekonMatch_secondaryLinkColumn', JSON.stringify(newSecondaryLink));

        resetDataStates('primary', sHeaders);
        resetDataStates('secondary', pHeaders);
        toast({ title: "Data Ditukar", description: "Peran data utama dan sekunder telah berhasil ditukar." });
    } catch(e) {
        console.error("Gagal menukar file:", e);
        toast({ variant: "destructive", title: "Gagal Menukar", description: "Terjadi kesalahan saat menukar data." });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'primary' | 'secondary') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(fileType);
    toast({ title: 'Memproses File...', description: `Membaca ${file.name}. Ini mungkin memakan waktu untuk file besar.` });

    try {
        // XLSX sekarang tersedia dari impor statis di atas
        const fileContent = await file.arrayBuffer();
        
        const workbook = XLSX.read(fileContent, { type: 'array', cellDates: false, dense: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, rawNumbers: true, defval: '' }) as (string | number | boolean)[][];
        
        if (!json || json.length < 1 || !json[0] || json[0].length === 0) {
          toast({ variant: "destructive", title: "File Kosong atau Format Salah", description: "Pastikan file Excel Anda tidak kosong dan memiliki header." });
          return;
        }
  
        const headers = json[0].map(String);
        const rows: Row[] = json.slice(1).map(rowArray => {
            const rowObject: Row = {};
            headers.forEach((header, index) => {
                const value = rowArray[index];
                // Convert boolean values to string representation
                if (typeof value === 'boolean') {
                    rowObject[header] = value.toString();
                } else {
                    rowObject[header] = value ?? '';
                }
            });
            return rowObject;
        });
  
        let finalHeaders = headers;
        let finalRows = rows;
        let isReplaced = true;
        let action = fileActionRef.current;

        if (action === 'append') {
            const existingHeaders = await get<string[]>(`${fileType}_headers`);
            if (existingHeaders && existingHeaders.length > 0) {
                const headersMatch = headers.length === existingHeaders.length && 
                                     headers.every(h => existingHeaders.includes(h));
                
                if (headersMatch) {
                    const existingRows = await get<Row[]>(`${fileType}_rows`) || [];
                    
                    const existingRowStrings = new Set(existingRows.map(r => {
                         return existingHeaders.map(h => String(r[h] || '')).join('|||');
                    }));
                    
                    let duplicateCount = 0;
                    const uniqueNewRows = rows.filter(r => {
                         const str = existingHeaders.map(h => String(r[h] || '')).join('|||');
                         if (existingRowStrings.has(str)) {
                             duplicateCount++;
                             return false;
                         }
                         existingRowStrings.add(str);
                         return true;
                    });
                    
                    if (duplicateCount > 0) {
                        toast({ title: "Data Disaring", description: `${duplicateCount} baris duplikat diabaikan. ${uniqueNewRows.length} baris baru ditambahkan.` });
                    }
                    
                    finalHeaders = existingHeaders;
                    finalRows = [...existingRows, ...uniqueNewRows];
                    isReplaced = false;
                } else {
                    toast({ variant: "destructive", title: "Kolom Berbeda", description: "Kolom pada file tidak sama. Data diganti seluruhnya." });
                }
            }
        }
  
        await set(`${fileType}_rows`, finalRows);
        await set(`${fileType}_headers`, finalHeaders);
        
        const prevFileName = (await get(`${fileType}_fileName`)) as string || '';
        const newFileName = isReplaced ? file.name : (prevFileName.includes('(+') ? prevFileName : `${prevFileName} (+ file lain)`);
        await set(`${fileType}_fileName`, newFileName);

        if (fileType === 'primary') {
            setPrimaryDataHeaders(finalHeaders);
            setPrimaryFileName(newFileName);
            setPrimaryRowCount(finalRows.length);
            if (isReplaced) resetDataStates('primary', finalHeaders);
        } else {
            setSecondaryDataHeaders(finalHeaders);
            setSecondaryFileName(newFileName);
            setSecondaryRowCount(finalRows.length);
            if (isReplaced) resetDataStates('secondary', finalHeaders);
        }
        
        setAppState('loaded');
        toast({ title: isReplaced ? 'File Berhasil Diproses' : 'Data Berhasil Ditambahkan', description: `${isReplaced ? file.name : newFileName} (${finalRows.length} baris total).` });
  
    } catch (error) {
        console.error("Kesalahan memproses file Excel:", error);
        toast({ variant: "destructive", title: "Kesalahan Membaca File", description: `Terjadi masalah saat memproses ${file.name}.` });
    } finally {
        setIsLoadingFile(false);
        if(event.target) event.target.value = "";
    }
  };

  const handleUploadClick = (fileType: 'primary' | 'secondary', action: 'replace' | 'append' = 'replace') => {
    fileActionRef.current = action;
    const ref = fileType === 'primary' ? primaryFileInputRef : secondaryFileInputRef;
    ref.current?.click();
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
      setSecondaryDataHeaders([]);
      setSecondaryFileName('');
      setPrimaryRowCount(0);
      setSecondaryRowCount(0);
      resetDataStates('primary', null);
      resetDataStates('secondary', null);
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
    
    // Try using the Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => {
        toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
      }).catch(err => {
        console.error('Gagal menyalin teks dengan Clipboard API: ', err);
        // Fallback to alternative method
        copyToClipboardFallback([header, ...rows].join('\n'));
        toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
      });
    } else {
      // Fallback for non-secure contexts or when Clipboard API is not available
      copyToClipboardFallback([header, ...rows].join('\n'));
      toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
    }
  }, [toast]);

  const handleRowClick = async (row: Row, type: 'primary' | 'secondary') => {
      const isPrimaryClick = type === 'primary';
      const linkColumn = isPrimaryClick ? primaryLinkColumn : secondaryLinkColumn;
      const targetLinkColumn = isPrimaryClick ? secondaryLinkColumn : primaryLinkColumn;
      const targetRowsKey = isPrimaryClick ? 'secondary_rows' : 'primary_rows';
      const setResults = isPrimaryClick ? setSecondaryResults : setPrimaryResults;
      const setSheetOpen = isPrimaryClick ? setIsSecondarySheetOpen : setIsPrimarySheetOpen;

      if (row.__isNotFound || !linkColumn || !targetLinkColumn || row.__isEmpty) return;

      try {
          const targetRows = await get<Row[]>(targetRowsKey);
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
    
    setIsProcessing(true);
    toast({ title: 'Memulai Konversi...', description: 'Proses ini mungkin memakan waktu.' });

    try {
        const rowsKey = `${fileTypeToConvert}_rows`;
        const dataRows = await get<Row[]>(rowsKey);
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

        await set(rowsKey, updatedRows);
        toast({ title: 'Konversi Selesai', description: `${convertedCount} sel telah dikonversi dan disimpan.` });
        setIsConvertDialogOpen(false);
        setColumnsToConvert(new Set());
    } catch(e) {
        console.error("Gagal mengonversi notasi ilmiah:", e);
        toast({ variant: "destructive", title: "Gagal Mengonversi", description: "Terjadi kesalahan saat memproses data." });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConvertAllScientific = async () => {
    setIsProcessing(true);
    toast({ title: 'Memindai & Mengonversi Semua Data...', description: 'Ini mungkin memakan waktu cukup lama.' });

    try {
        let totalConverted = 0;
        for (const type of ['primary', 'secondary'] as const) {
            const rows = await get<Row[]>(`${type}_rows`);
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

            await set(`${type}_rows`, updatedRows);
        }
        
        toast({ title: 'Konversi Global Selesai', description: `${totalConverted} sel di semua file telah dikonversi dan disimpan.` });
        
    } catch (e) {
        console.error("Gagal mengonversi semua notasi ilmiah:", e);
        toast({ variant: "destructive", title: "Gagal Konversi Global", description: "Terjadi kesalahan saat memproses data." });
    } finally {
        setIsProcessing(false);
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


  return {
    appState,
    activeTab,
    setActiveTab,
    primaryDataHeaders,
    primaryFileName,
    secondaryDataHeaders,
    secondaryFileName,
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
    handleCopyResults,
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


    