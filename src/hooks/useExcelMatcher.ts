
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Row } from "@/lib/mock-data";
import { set, get, clear } from 'idb-keyval';

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

export const excelSerialDateToJSDate = (serial: number): Date | null => {
  if (isNaN(serial) || serial < 0) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  if (isNaN(date.getTime())) return null;
  return date;
};

export const formatCell = (value: any, type: 'text' | 'number' | 'currency' | 'date' = 'text'): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'bigint') {
    return value.toString();
  }
  
  switch (type) {
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
    case 'date':
      let date: Date | null = null;
      if (typeof value === 'number') {
        date = excelSerialDateToJSDate(value);
      } else if (typeof value === 'string') {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        } else {
           const serialFromString = Number(value);
           if(!isNaN(serialFromString)){
              date = excelSerialDateToJSDate(serialFromString);
           }
        }
      }
      
      if (date) {
        try {
          const { format: formatDate } = require('date-fns');
          const { id } = require('date-fns/locale');
          return formatDate(date, 'd MMMM yyyy', { locale: id });
        } catch (e) {
          return "Format Tanggal Salah";
        }
      }
      return "Format Tanggal Salah";
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
export type ColumnType = 'text' | 'number' | 'currency' | 'date';
export type SearchOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

export interface SearchCriterion {
  value: string;
  operator: SearchOperator;
}

export const useExcelMatcher = () => {
  const [appState, setAppState] = useState<AppState>('initial');
  
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
  
  const [secondaryResults, setSecondaryResults] = useState<Row[]>([]);
  const [isSecondarySheetOpen, setIsSecondarySheetOpen] = useState(false);
  const [isPrimarySheetOpen, setIsPrimarySheetOpen] = useState(false);
  const [primaryResults, setPrimaryResults] = useState<Row[]>([]);
  const [currentLookupValue, setCurrentLookupValue] = useState<string | number>('');
  
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [primaryDisplayTemplates, setPrimaryDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newPrimaryTemplateName, setNewPrimaryTemplateName] = useState('');
  const [secondaryDisplayTemplates, setSecondaryDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newSecondaryTemplateName, setNewSecondaryTemplateName] = useState('');
  
  const [isPrimaryQueryInvalid, setIsPrimaryQueryInvalid] = useState(true);
  const [isSecondaryQueryInvalid, setIsSecondaryQueryInvalid] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState<'primary' | 'secondary' | false>(false);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [includeEmptyRowsInResults, setIncludeEmptyRowsInResults] = useState(true);

  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [columnsToConvert, setColumnsToConvert] = useState<Set<string>>(new Set());
  const [fileTypeToConvert, setFileTypeToConvert] = useState<'primary' | 'secondary'>('primary');

  const loadFromStorage = useCallback(async () => {
    try {
      const pHeaders = await get<string[]>('primary_headers');
      if (pHeaders?.length) {
        setPrimaryDataHeaders(pHeaders);
        setPrimaryFileName(await get('primary_fileName') || '');
        const sHeaders = await get<string[]>('secondary_headers');
        if (sHeaders?.length) {
          setSecondaryDataHeaders(sHeaders);
          setSecondaryFileName(await get('secondary_fileName') || '');
        }

        const getFromLocalStorage = (key: string, setter: (value: any) => void, isSet = false, defaultVal: any = []) => {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            setter(isSet ? new Set(parsed) : parsed);
          } else if(isSet) {
            setter(new Set(defaultVal));
          } else {
            setter(defaultVal);
          }
        };

        getFromLocalStorage('rekonMatch_primaryDisplayColumns', setPrimaryDisplayColumns, false, pHeaders);
        getFromLocalStorage('rekonMatch_secondaryDisplayColumns', setSecondaryDisplayColumns, false, await get<string[]>('secondary_headers') || []);
        getFromLocalStorage('rekonMatch_searchColumns', setSearchColumns, true);
        getFromLocalStorage('rekonMatch_secondarySearchColumns', setSecondarySearchColumns, true);
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

  useEffect(() => {
    const validateQuery = (cols: Set<string>, criteria: Record<string, SearchCriterion>) => {
      if (cols.size === 0) return true;
      const activeCriteria = Object.fromEntries(
        Object.entries(criteria).filter(([col, crit]) => cols.has(col) && crit?.value.trim())
      );
      return Object.keys(activeCriteria).length === 0;
    };
    setIsPrimaryQueryInvalid(validateQuery(searchColumns, searchCriteria));
    setIsSecondaryQueryInvalid(validateQuery(secondarySearchColumns, secondarySearchCriteria));
  }, [searchColumns, searchCriteria, secondarySearchColumns, secondarySearchCriteria]);


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
    setFilteredRes(null);
    setLinkCol('');
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
        setSecondaryDataHeaders(pHeaders);
        setSecondaryFileName(pName || '');

        setPrimaryLinkColumn(secondaryLinkColumn);
        setSecondaryLinkColumn(primaryLinkColumn);

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
        const XLSX = await import('xlsx');
        const fileContent = await file.arrayBuffer();
        
        const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true, dense: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as (string | number | boolean)[][];
        
        if (!json || json.length < 1 || !json[0] || json[0].length === 0) {
          toast({ variant: "destructive", title: "File Kosong atau Format Salah", description: "Pastikan file Excel Anda tidak kosong dan memiliki header." });
          return;
        }
  
        const headers = json[0].map(String);
        const rows: Row[] = json.slice(1).map(rowArray => {
            const rowObject: Row = {};
            headers.forEach((header, index) => {
                rowObject[header] = rowArray[index] ?? '';
            });
            return rowObject;
        });
  
        await set(`${fileType}_rows`, rows);
        await set(`${fileType}_headers`, headers);
        await set(`${fileType}_fileName`, file.name);

        if (fileType === 'primary') {
            setPrimaryDataHeaders(headers);
            setPrimaryFileName(file.name);
            resetDataStates('primary', headers);
        } else {
            setSecondaryDataHeaders(headers);
            setSecondaryFileName(file.name);
            resetDataStates('secondary', headers);
        }
        
        setAppState('loaded');
        toast({ title: 'File Berhasil Diproses', description: `${file.name} (${rows.length} baris) telah disimpan di browser Anda.` });
  
    } catch (error) {
        console.error("Kesalahan memproses file Excel:", error);
        toast({ variant: "destructive", title: "Kesalahan Membaca File", description: `Terjadi masalah saat memproses ${file.name}.` });
    } finally {
        setIsLoadingFile(false);
        if(event.target) event.target.value = "";
    }
  };

  const handleUploadClick = (fileType: 'primary' | 'secondary') => {
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
      primary: { setter: setSearchColumns, key: 'rekonMatch_searchColumns', criteriaSetter: setSearchCriteria },
      secondary: { setter: setSecondarySearchColumns, key: 'rekonMatch_secondarySearchColumns', criteriaSetter: setSecondarySearchCriteria }
    };
    const { setter, key, criteriaSetter } = stateMapping[type];

    setter(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
        criteriaSetter(current => ({ ...current, [column]: { value: '', operator: 'contains' } }));
      } else {
        newSet.delete(column);
        criteriaSetter(current => {
          const { [column]: _, ...rest } = current;
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
    setter(prev => ({ ...prev, [column]: { ...prev[column], value } }));
  };

  const handleSearchOperatorChange = (column: string, operator: SearchOperator, isSecondary: boolean) => {
    const setter = isSecondary ? setSecondarySearchCriteria : setSearchCriteria;
    setter(prev => ({ ...prev, [column]: { ...prev[column], operator } }));
  };

  const handleDisplayColumnToggle = (column: string, checked: boolean, type: 'primary' | 'secondary' = 'primary') => {
    const setDisplayColumns = type === 'primary' ? setPrimaryDisplayColumns : setSecondaryDisplayColumns;
    
    setDisplayColumns(prev => {
      const newCols = checked ? [...prev, column] : prev.filter(c => c !== column);
      localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(newCols));
      if(type === 'primary' && !checked) {
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
    if (type === 'primary' && !checked) {
        setColumnTypes({}); localStorage.removeItem('rekonMatch_columnTypes');
        setColumnColors({}); localStorage.removeItem('rekonMatch_columnColors');
    }
  };

  const moveDisplayColumn = (index: number, direction: 'up' | 'down', type: 'primary' | 'secondary' = 'primary') => {
    const displayColumns = type === 'primary' ? primaryDisplayColumns : secondaryDisplayColumns;
    const setDisplayColumns = type === 'primary' ? setPrimaryDisplayColumns : setSecondaryDisplayColumns;
    if (!displayColumns) return;
    const newDisplayColumns = [...displayColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newDisplayColumns.length) return;
    [newDisplayColumns[index], newDisplayColumns[newIndex]] = [newDisplayColumns[newIndex], newDisplayColumns[index]];
    setDisplayColumns(newDisplayColumns);
    localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(newDisplayColumns));
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
        const updated = { ...templates, [newName]: displayColumns };
        setTemplates(updated);
        localStorage.setItem(key, JSON.stringify(updated));
        setNewName('');
        toast({ title: `Template ${typeText} Disimpan` });
    } else if (action === 'load' && name && templates[name]) {
        setDisplayColumns(templates[name]);
        localStorage.setItem(`rekonMatch_${type}DisplayColumns`, JSON.stringify(templates[name]));
        toast({ title: `Template ${typeText} Dimuat` });
    } else if (action === 'delete' && name) {
        const { [name]: _, ...remaining } = templates;
        setTemplates(remaining);
        localStorage.setItem(key, JSON.stringify(remaining));
        toast({ variant: 'destructive', title: `Template ${typeText} Dihapus` });
    }
  };

  const runQuery = useCallback(async (type: 'primary' | 'secondary') => {
    const isPrimary = type === 'primary';
    const criteria = isPrimary ? searchCriteria : secondarySearchCriteria;
    const searchCols = isPrimary ? searchColumns : secondarySearchColumns;
    const headers = isPrimary ? primaryDataHeaders : secondaryDataHeaders;
    const isInvalid = isPrimary ? isPrimaryQueryInvalid : isSecondaryQueryInvalid;
    const setResults = isPrimary ? setFilteredResults : setSecondaryFilteredResults;

    if (isInvalid) return;
    setIsProcessing(true);

    try {
        const dataRows = await get<Row[]>(`${type}_rows`);
        if (!dataRows) {
            toast({ variant: "destructive", title: `Data ${isPrimary ? 'Utama' : 'Sekunder'} Tidak Ditemukan` });
            return;
        }

        const activeCriteria = Object.fromEntries(
            Object.entries(criteria).filter(([col, crit]) => searchCols.has(col) && crit?.value.trim())
        );

        if (Object.keys(activeCriteria).length === 0) {
            setResults([]);
            toast({ variant: "destructive", title: "Kriteria Pencarian Kosong" });
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

        const parsedCriteriaByRow: Record<string, string>[] = [];
        const criteriaValuesByCol = Object.entries(activeCriteria).reduce((acc, [col, crit]) => {
            acc[col] = crit.value.split(/\r\n|\n|\r/).map(t => t.trim());
            return acc;
        }, {} as Record<string, string[]>);

        const maxLen = Math.max(0, ...Object.values(criteriaValuesByCol).map(v => v.length));
        
        for (let i = 0; i < maxLen; i++) {
            const rowCriteria: Record<string, string> = {};
            for (const col of Object.keys(activeCriteria)) {
                rowCriteria[col] = criteriaValuesByCol[col]?.[i];
            }
            parsedCriteriaByRow.push(rowCriteria);
        }
        
        const finalResults: Row[] = [];
        const foundRowsTracker = new Set<string>();
        const processedTerms = new Set<string>();

        for (const termRow of parsedCriteriaByRow) {
            const isRowEffectivelyEmpty = Object.values(termRow).every(term => term === '' || term === undefined);

            if (isRowEffectivelyEmpty) {
                if (includeEmptyRowsInResults) {
                    finalResults.push({ __isEmpty: true });
                }
                continue;
            }

            const termKey = JSON.stringify(Object.entries(termRow).sort(([a], [b]) => a.localeCompare(b)));

            if (processedTerms.has(termKey)) {
                const duplicateRow: Row = { __isDuplicate: true };
                 headers.forEach(header => {
                    duplicateRow[header] = termRow[header] || 'Hasil sudah ditampilkan';
                });
                finalResults.push(duplicateRow);
                continue;
            }

            const foundMatches = dataRows.filter(dataRow => 
                Object.entries(termRow).every(([col, term]) => {
                    if (term === '' || term === undefined) return true;
                    return checkMatch(dataRow[col], activeCriteria[col].operator, term);
                })
            );

            if (foundMatches.length > 0) {
                processedTerms.add(termKey);
                foundMatches.forEach(match => {
                    const rowId = JSON.stringify(Object.entries(match).sort(([a], [b]) => a.localeCompare(b)));
                    if (!foundRowsTracker.has(rowId)) {
                        finalResults.push(match);
                        foundRowsTracker.add(rowId);
                    }
                });
            } else {
                const notFoundRow: Row = { __isNotFound: true };
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
  }, [searchCriteria, secondarySearchCriteria, searchColumns, secondarySearchColumns, primaryDataHeaders, secondaryDataHeaders, isPrimaryQueryInvalid, isSecondaryQueryInvalid, includeEmptyRowsInResults, toast]);

  const handleRunPrimaryQuery = () => runQuery('primary');
  const handleRunSecondaryQuery = () => runQuery('secondary');
  
  const handleCopyResults = useCallback((dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => {
    if (!dataToCopy?.length || !columns.length) {
      toast({ variant: 'destructive', title: 'Tidak Ada Data untuk Disalin' });
      return;
    }

    const header = columns.join('\t');
    const rows = dataToCopy.map(row => 
      columns.map(col => {
        if (row.__isEmpty) return '';
        if (row.__isDuplicate) return 'Hasil sudah ditampilkan';
        const cellValue = row[col];
        const colType = row.__isNotFound ? 'text' : colTypes[col] || 'text';
        let formatted = formatCell(cellValue, colType);
        
        return String(formatted).replace(/\n/g, ' ').replace(/\t/g, ' ');
      }).join('\t')
    );
    
    navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => {
      toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
    }).catch(err => {
      console.error('Gagal menyalin teks: ', err);
      toast({ variant: 'destructive', title: 'Gagal Menyalin' });
    });
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

  return {
    appState,
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
    isPrimaryQueryInvalid,
    isSecondaryQueryInvalid,
    isProcessing,
    currentTheme,
    currentLookupValue,
    isSecondarySheetOpen,
    isPrimarySheetOpen,
    primaryResults,
    secondaryResults,
    includeEmptyRowsInResults,
    setIncludeEmptyRowsInResults,
    handleSearchColumnToggle,
    handleSecondarySearchColumnToggle,
    handleSelectAllDisplayColumns: (checked: boolean) => handleSelectAllDisplayColumns(checked, 'primary'),
    handleSelectAllSecondaryDisplayColumns: (checked: boolean) => handleSelectAllDisplayColumns(checked, 'secondary'),
    handleDisplayColumnToggle: (column: string, checked: boolean) => handleDisplayColumnToggle(column, checked, 'primary'),
    handleSecondaryDisplayColumnToggle: (column: string, checked: boolean) => handleDisplayColumnToggle(column, checked, 'secondary'),
    moveDisplayColumn: (index: number, direction: 'up' | 'down') => moveDisplayColumn(index, direction, 'primary'),
    moveSecondaryDisplayColumn: (index: number, direction: 'up' | 'down') => moveDisplayColumn(index, direction, 'secondary'),
    handleColumnTypeChange,
    handleColumnColorChange,
    handleSaveTemplate: (type: 'primary' | 'secondary') => handleTemplateAction('save', type, type === 'primary' ? newPrimaryTemplateName : newSecondaryTemplateName),
    handleLoadTemplate: (name: string, type: 'primary' | 'secondary') => handleTemplateAction('load', type, name),
    handleDeleteTemplate: (name: string, type: 'primary' | 'secondary') => handleTemplateAction('delete', type, name),
    handleSearchCriteriaChange,
    handleSearchOperatorChange,
    handleRunPrimaryQuery,
    handleRunSecondaryQuery,
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

    