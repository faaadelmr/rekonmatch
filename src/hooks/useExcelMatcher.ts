"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Row } from "@/lib/mock-data";
import { set, get, clear } from 'idb-keyval';

type AppState = 'initial' | 'loaded';
export interface ExcelData {
    headers: string[];
    rows: Row[];
}
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
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [primaryDisplayTemplates, setPrimaryDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newPrimaryTemplateName, setNewPrimaryTemplateName] = useState('');

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
  const [currentLookupValue, setCurrentLookupValue] = useState<string | number>('');
  const [selectedPrimaryRow, setSelectedPrimaryRow] = useState<Row | null>(null);
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

  useEffect(() => {
    const checkDb = async () => {
      try {
        const primaryHeaders = await get('primary_headers');
        if (primaryHeaders && primaryHeaders.length > 0) {
          setPrimaryDataHeaders(primaryHeaders);
          const primaryName = await get('primary_fileName');
          setPrimaryFileName(primaryName || '');
          
          const secondaryHeaders = await get('secondary_headers');
          if (secondaryHeaders && secondaryHeaders.length > 0) {
            setSecondaryDataHeaders(secondaryHeaders);
            const secondaryName = await get('secondary_fileName');
            setSecondaryFileName(secondaryName || '');
          }
          
          const savedDisplayCols = localStorage.getItem('rekonMatch_displayColumns');
          if (savedDisplayCols) setDisplayColumns(JSON.parse(savedDisplayCols));
          else setDisplayColumns(primaryHeaders);
          
          const savedSearchCols = localStorage.getItem('rekonMatch_searchColumns');
          if(savedSearchCols) setSearchColumns(new Set(JSON.parse(savedSearchCols)));

          const savedSecondarySearchCols = localStorage.getItem('rekonMatch_secondarySearchColumns');
          if(savedSecondarySearchCols) setSecondarySearchColumns(new Set(JSON.parse(savedSecondarySearchCols)));

          const savedColTypes = localStorage.getItem('rekonMatch_columnTypes');
          if(savedColTypes) setColumnTypes(JSON.parse(savedColTypes));
          
          const savedColColors = localStorage.getItem('rekonMatch_columnColors');
          if(savedColColors) setColumnColors(JSON.parse(savedColColors));

          setAppState('loaded');
        }
      } catch (error) {
        console.error("Gagal memeriksa IndexedDB saat inisialisasi:", error);
      }
    };
    checkDb();
  }, []);


  useEffect(() => {
    const updateTheme = () => {
      const savedTheme = localStorage.getItem('rekonmatch_theme') || 'dark';
      setCurrentTheme(savedTheme);
    };
    updateTheme();
    window.addEventListener('storage', updateTheme);
    const handleThemeChange = () => updateTheme();
    window.addEventListener('themeChanged', handleThemeChange);
    return () => {
      window.removeEventListener('storage', updateTheme);
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const hasSearchCols = searchColumns.size > 0;
    const hasSearchValues = Object.values(searchCriteria).some(c => c?.value.trim() !== '');
    setIsPrimaryQueryInvalid(!hasSearchCols || !hasSearchValues);
  }, [searchColumns, searchCriteria]);

  useEffect(() => {
    const hasSearchCols = secondarySearchColumns.size > 0;
    const hasSearchValues = Object.values(secondarySearchCriteria).some(c => c?.value.trim() !== '');
    setIsSecondaryQueryInvalid(!hasSearchCols || !hasSearchValues);
  }, [secondarySearchColumns, secondarySearchCriteria]);

  useEffect(() => {
    try {
      const savedPrimaryTemplates = localStorage.getItem('rekonMatch_primaryTemplates');
      if (savedPrimaryTemplates) setPrimaryDisplayTemplates(JSON.parse(savedPrimaryTemplates));
      
      const savedSecondaryTemplates = localStorage.getItem('rekonMatch_secondaryTemplates');
      if (savedSecondaryTemplates) setSecondaryDisplayTemplates(JSON.parse(savedSecondaryTemplates));
    } catch (error) {
      console.error("Gagal memuat template dari localStorage:", error);
    }
  }, []);

  const handleSaveTemplate = (type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      if (!newPrimaryTemplateName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Template Kosong' });
        return;
      }
      const updated = { ...primaryDisplayTemplates, [newPrimaryTemplateName]: displayColumns };
      setPrimaryDisplayTemplates(updated);
      localStorage.setItem('rekonMatch_primaryTemplates', JSON.stringify(updated));
      setNewPrimaryTemplateName('');
      toast({ title: 'Template Utama Disimpan' });
    } else {
      if (!newSecondaryTemplateName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Template Kosong' });
        return;
      }
      const updated = { ...secondaryDisplayTemplates, [newSecondaryTemplateName]: secondaryDisplayColumns };
      setSecondaryDisplayTemplates(updated);
      localStorage.setItem('rekonMatch_secondaryTemplates', JSON.stringify(updated));
      setNewSecondaryTemplateName('');
      toast({ title: 'Template Sekunder Disimpan' });
    }
  };

  const handleLoadTemplate = (templateName: string, type: 'primary' | 'secondary') => {
    if (type === 'primary' && primaryDisplayTemplates[templateName]) {
      setDisplayColumns(primaryDisplayTemplates[templateName]);
      toast({ title: 'Template Utama Dimuat' });
    } else if (type === 'secondary' && secondaryDisplayTemplates[templateName]) {
      setSecondaryDisplayColumns(secondaryDisplayTemplates[templateName]);
      toast({ title: 'Template Sekunder Dimuat' });
    }
  };

  const handleDeleteTemplate = (templateName: string, type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      const { [templateName]: _, ...remaining } = primaryDisplayTemplates;
      setPrimaryDisplayTemplates(remaining);
      localStorage.setItem('rekonMatch_primaryTemplates', JSON.stringify(remaining));
      toast({ variant: 'destructive', title: 'Template Utama Dihapus' });
    } else {
      const { [templateName]: _, ...remaining } = secondaryDisplayTemplates;
      setSecondaryDisplayTemplates(remaining);
      localStorage.setItem('rekonMatch_secondaryTemplates', JSON.stringify(remaining));
      toast({ variant: 'destructive', title: 'Template Sekunder Dihapus' });
    }
  };

  const resetPrimaryDataStates = (headers: string[] | null) => {
    const newHeaders = headers || [];
    setDisplayColumns(newHeaders);
    localStorage.setItem('rekonMatch_displayColumns', JSON.stringify(newHeaders));
    setSearchColumns(new Set());
    localStorage.removeItem('rekonMatch_searchColumns');
    setSearchCriteria({});
    setFilteredResults(null);
    setPrimaryLinkColumn('');
    setColumnTypes({});
    localStorage.removeItem('rekonMatch_columnTypes');
    setColumnColors({});
    localStorage.removeItem('rekonMatch_columnColors');
  };

  const resetSecondaryDataStates = (headers: string[] | null) => {
    const newHeaders = headers || [];
    setSecondaryDisplayColumns(newHeaders);
    localStorage.setItem('rekonMatch_secondaryDisplayColumns', JSON.stringify(newHeaders));
    setSecondarySearchColumns(new Set());
    localStorage.removeItem('rekonMatch_secondarySearchColumns');
    setSecondarySearchCriteria({});
    setSecondaryFilteredResults(null);
    setSecondaryLinkColumn('');
  };

  const handleSwapFiles = async () => {
    try {
        const pHeaders = await get('primary_headers');
        const pName = await get('primary_fileName');
        const sHeaders = await get('secondary_headers');
        const sName = await get('secondary_fileName');

        if (!pHeaders || !sHeaders) {
            toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Kedua file harus ada untuk ditukar." });
            return;
        }

        const pRows = await get('primary_rows');
        const sRows = await get('secondary_rows');
        
        await set('primary_headers', sHeaders);
        await set('primary_fileName', sName);
        await set('primary_rows', sRows);

        await set('secondary_headers', pHeaders);
        await set('secondary_fileName', pName);
        await set('secondary_rows', pRows);

        setPrimaryDataHeaders(sHeaders);
        setPrimaryFileName(sName);
        setSecondaryDataHeaders(pHeaders);
        setSecondaryFileName(pName);

        const tempPrimaryLink = primaryLinkColumn;
        setPrimaryLinkColumn(secondaryLinkColumn);
        setSecondaryLinkColumn(tempPrimaryLink);

        resetPrimaryDataStates(sHeaders);
        resetSecondaryDataStates(pHeaders);
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
        const XLSX = (await import('xlsx'));
        const fileContent = await file.arrayBuffer();
        
        const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true, dense: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as (string | number)[][];
        
        if (json.length === 0) throw new Error("File Excel kosong.");

        const headers = json[0].map(String);
        const rows = json.slice(1).map(rowArray => {
          const rowObject: Row = {};
          headers.forEach((header, index) => {
            rowObject[header] = rowArray[index] ?? '';
          });
          return rowObject;
        });

        if (fileType === 'primary') {
            await set('primary_rows', rows);
            await set('primary_headers', headers);
            await set('primary_fileName', file.name);
            setPrimaryDataHeaders(headers);
            setPrimaryFileName(file.name);
            resetPrimaryDataStates(headers);
        } else {
            await set('secondary_rows', rows);
            await set('secondary_headers', headers);
            await set('secondary_fileName', file.name);
            setSecondaryDataHeaders(headers);
            resetSecondaryDataStates(headers);
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
    if (fileType === 'primary') primaryFileInputRef.current?.click();
    else secondaryFileInputRef.current?.click();
  };

  const handleReset = async () => {
    try {
      await clear();
      localStorage.removeItem('rekonMatch_displayColumns');
      localStorage.removeItem('rekonMatch_searchColumns');
      localStorage.removeItem('rekonMatch_secondarySearchColumns');
      localStorage.removeItem('rekonMatch_columnTypes');
      localStorage.removeItem('rekonMatch_columnColors');
      localStorage.removeItem('rekonMatch_primaryTemplates');
      localStorage.removeItem('rekonMatch_secondaryTemplates');

      setAppState('initial');
      setPrimaryDataHeaders([]);
      setPrimaryFileName('');
      setSecondaryDataHeaders([]);
      setSecondaryFileName('');
      resetPrimaryDataStates(null);
      resetSecondaryDataStates(null);
      toast({ title: 'Reset Berhasil', description: 'Semua data dan pengaturan lokal telah dihapus.' });
    } catch (error) {
      console.error("Gagal mereset IndexedDB:", error);
      toast({ variant: "destructive", title: "Gagal Mereset", description: "Tidak dapat menghapus data lokal." });
    }
  };

  const handleSearchColumnToggle = (column: string, checked: boolean) => {
    setSearchColumns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
        setSearchCriteria(current => ({ ...current, [column]: { value: '', operator: 'contains' } }));
      } else {
        newSet.delete(column);
        const { [column]: _, ...rest } = searchCriteria;
        setSearchCriteria(rest);
      }
      localStorage.setItem('rekonMatch_searchColumns', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleSecondarySearchColumnToggle = (column: string, checked: boolean) => {
    setSecondarySearchColumns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
        setSecondarySearchCriteria(current => ({ ...current, [column]: { value: '', operator: 'contains' } }));
      } else {
        newSet.delete(column);
        const { [column]: _, ...rest } = secondarySearchCriteria;
        setSecondarySearchCriteria(rest);
      }
      localStorage.setItem('rekonMatch_secondarySearchColumns', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };
  
  const handleSearchCriteriaChange = (column: string, value: string, isSecondary: boolean) => {
    const setSearch = isSecondary ? setSecondarySearchCriteria : setSearchCriteria;
    setSearch(prev => ({ ...prev, [column]: { ...prev[column], value } }));
  };

  const handleSearchOperatorChange = (column: string, operator: SearchOperator, isSecondary: boolean) => {
    const setSearch = isSecondary ? setSecondarySearchCriteria : setSearchCriteria;
    setSearch(prev => ({ ...prev, [column]: { ...prev[column], operator } }));
  };

  const handleDisplayColumnToggle = (column: string, checked: boolean) => {
    setDisplayColumns(prev => {
      let newCols;
      if (checked) {
        newCols = [...prev, column];
      } else {
        newCols = prev.filter(c => c !== column);
        const { [column]: cType, ...restTypes } = columnTypes;
        setColumnTypes(restTypes);
        localStorage.setItem('rekonMatch_columnTypes', JSON.stringify(restTypes));
        const { [column]: cColor, ...restColors } = columnColors;
        setColumnColors(restColors);
        localStorage.setItem('rekonMatch_columnColors', JSON.stringify(restColors));
      }
      localStorage.setItem('rekonMatch_displayColumns', JSON.stringify(newCols));
      return newCols;
    });
  };
  
  const handleSelectAllDisplayColumns = (checked: boolean) => {
    if (checked && primaryDataHeaders) {
      setDisplayColumns(primaryDataHeaders);
      localStorage.setItem('rekonMatch_displayColumns', JSON.stringify(primaryDataHeaders));
    } else {
      setDisplayColumns([]);
      localStorage.setItem('rekonMatch_displayColumns', JSON.stringify([]));
      setColumnTypes({});
      localStorage.removeItem('rekonMatch_columnTypes');
      setColumnColors({});
      localStorage.removeItem('rekonMatch_columnColors');
    }
  };
  
  const moveDisplayColumn = (index: number, direction: 'up' | 'down') => {
    const newDisplayColumns = [...displayColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newDisplayColumns.length) return;
    [newDisplayColumns[index], newDisplayColumns[newIndex]] = [newDisplayColumns[newIndex], newDisplayColumns[index]];
    setDisplayColumns(newDisplayColumns);
    localStorage.setItem('rekonMatch_displayColumns', JSON.stringify(newDisplayColumns));
  };

  const handleSecondaryDisplayColumnToggle = (column: string, checked: boolean) => {
    setSecondaryDisplayColumns(prev => checked ? [...prev, column] : prev.filter(c => c !== column));
  };

  const handleSelectAllSecondaryDisplayColumns = (checked: boolean) => {
    setSecondaryDisplayColumns(checked ? secondaryDataHeaders : []);
  };

  const moveSecondaryDisplayColumn = (index: number, direction: 'up' | 'down') => {
    const newDisplayColumns = [...secondaryDisplayColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newDisplayColumns.length) return;
    [newDisplayColumns[index], newDisplayColumns[newIndex]] = [newDisplayColumns[newIndex], newDisplayColumns[index]];
    setSecondaryDisplayColumns(newDisplayColumns);
    localStorage.setItem('rekonMatch_secondaryDisplayColumns', JSON.stringify(newDisplayColumns));
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

  const handleRunPrimaryQuery = useCallback(async () => {
    if (isPrimaryQueryInvalid) return;
    setIsProcessing(true);
    
    try {
        const primaryDataRows = await get<Row[]>('primary_rows');
        if (!primaryDataRows) {
            toast({ variant: "destructive", title: "Data Utama Tidak Ditemukan" });
            setIsProcessing(false);
            return;
        }

        const activeSearchCriteria = Object.fromEntries(
            Object.entries(searchCriteria).filter(([col, crit]) => searchColumns.has(col) && crit?.value.trim())
        );

        if (Object.keys(activeSearchCriteria).length === 0) {
            setFilteredResults([]);
            toast({ variant: "destructive", title: "Kriteria Pencarian Kosong" });
            setIsProcessing(false);
            return;
        }

        const parsedCriteria: Record<string, string[]> = {};
        let longestInputLength = 0;
        Object.entries(activeSearchCriteria).forEach(([col, crit]) => {
            const terms = crit.value.split(/,|\n/).map(t => t.trim()).filter(Boolean);
            parsedCriteria[col] = terms;
            if (terms.length > longestInputLength) {
                longestInputLength = terms.length;
            }
        });

        const finalResults: Row[] = [];

        const checkMatch = (value: string | number, operator: SearchOperator, term: string): boolean => {
            const val = String(value ?? '').toLowerCase();
            const t = term.toLowerCase();
            if (!t) return false; 
            switch (operator) {
                case 'contains': return val.includes(t);
                case 'equals': return val === t;
                case 'startsWith': return val.startsWith(t);
                case 'endsWith': return val.endsWith(t);
                default: return false;
            }
        };

        for (let i = 0; i < longestInputLength; i++) {
            const termRow: Record<string, string> = {};
            let isRowEmpty = true;
            Object.keys(activeSearchCriteria).forEach((col, idx) => {
                const terms = parsedCriteria[col] || [];
                const term = terms[i] || (terms.length > 0 ? terms[terms.length - 1] : '');
                if (term.trim()) isRowEmpty = false;
                termRow[col] = term;
            });

            if (isRowEmpty) {
                if (includeEmptyRowsInResults) finalResults.push({ __isEmpty: true });
                continue;
            }

            const foundMatches = primaryDataRows.filter(row => {
                return Object.entries(termRow).every(([col, term]) => {
                    const crit = activeSearchCriteria[col];
                    if (!crit || !term) return true;
                    const cellValue = row[col];
                    return checkMatch(cellValue, crit.operator, term);
                });
            });

            if (foundMatches.length > 0) {
                foundMatches.forEach(row => {
                    finalResults.push(row);
                });
            } else {
                const notFoundRow: Row = { __isNotFound: true };
                primaryDataHeaders.forEach(header => {
                    notFoundRow[header] = termRow[header] || 'TIDAK DITEMUKAN';
                });
                finalResults.push(notFoundRow);
            }
        }
      
      setFilteredResults(finalResults);
    } catch(e) {
      console.error("Gagal menjalankan kueri:", e);
      toast({ variant: "destructive", title: "Gagal Menjalankan Kueri", description: "Tidak dapat mengambil data dari penyimpanan lokal." });
    } finally {
      setIsProcessing(false);
    }
  }, [searchCriteria, searchColumns, isPrimaryQueryInvalid, includeEmptyRowsInResults, toast, primaryDataHeaders]);

  const handleRunSecondaryQuery = useCallback(async () => {
    if (isSecondaryQueryInvalid) return;
    setIsProcessing(true);
    
    try {
        const secondaryDataRows = await get<Row[]>('secondary_rows');
        if (!secondaryDataRows) {
            toast({ variant: "destructive", title: "Data Sekunder Tidak Ditemukan" });
            setIsProcessing(false);
            return;
        }

        const activeSearchCriteria = Object.fromEntries(
            Object.entries(secondarySearchCriteria).filter(([col, crit]) => secondarySearchColumns.has(col) && crit?.value.trim())
        );

        if (Object.keys(activeSearchCriteria).length === 0) {
            setSecondaryFilteredResults([]);
            toast({ variant: "destructive", title: "Kriteria Pencarian Kosong" });
            setIsProcessing(false);
            return;
        }

        const parsedCriteria: Record<string, string[]> = {};
        let longestInputLength = 0;
        Object.entries(activeSearchCriteria).forEach(([col, crit]) => {
            const terms = crit.value.split(/,|\n/).map(t => t.trim()).filter(Boolean);
            parsedCriteria[col] = terms;
            if (terms.length > longestInputLength) {
                longestInputLength = terms.length;
            }
        });

        const finalResults: Row[] = [];

        const checkMatch = (value: string | number, operator: SearchOperator, term: string): boolean => {
            const val = String(value ?? '').toLowerCase();
            const t = term.toLowerCase();
            if (!t) return false; 
            switch (operator) {
                case 'contains': return val.includes(t);
                case 'equals': return val === t;
                case 'startsWith': return val.startsWith(t);
                case 'endsWith': return val.endsWith(t);
                default: return false;
            }
        };

        for (let i = 0; i < longestInputLength; i++) {
            const termRow: Record<string, string> = {};
            let isRowEmpty = true;
            Object.keys(activeSearchCriteria).forEach((col, idx) => {
                const terms = parsedCriteria[col] || [];
                const term = terms[i] || (terms.length > 0 ? terms[terms.length - 1] : '');
                if (term.trim()) isRowEmpty = false;
                termRow[col] = term;
            });

            if (isRowEmpty) {
                if (includeEmptyRowsInResults) finalResults.push({ __isEmpty: true });
                continue;
            }

            const foundMatches = secondaryDataRows.filter(row => {
                return Object.entries(termRow).every(([col, term]) => {
                    const crit = activeSearchCriteria[col];
                    if (!crit || !term) return true;
                    const cellValue = row[col];
                    return checkMatch(cellValue, crit.operator, term);
                });
            });

            if (foundMatches.length > 0) {
                foundMatches.forEach(row => {
                    finalResults.push(row);
                });
            } else {
                const notFoundRow: Row = { __isNotFound: true };
                secondaryDataHeaders.forEach(header => {
                    notFoundRow[header] = termRow[header] || 'TIDAK DITEMUKAN';
                });
                finalResults.push(notFoundRow);
            }
        }
      
      setSecondaryFilteredResults(finalResults);
    } catch(e) {
      console.error("Gagal menjalankan kueri sekunder:", e);
      toast({ variant: "destructive", title: "Gagal Menjalankan Kueri Sekunder", description: "Tidak dapat mengambil data dari penyimpanan lokal." });
    } finally {
      setIsProcessing(false);
    }
  }, [secondarySearchCriteria, secondarySearchColumns, isSecondaryQueryInvalid, includeEmptyRowsInResults, toast, secondaryDataHeaders]);
  
  const { formatCell } = require('@/app/page');
  
  const handleCopyResults = useCallback((dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => {
    if (!dataToCopy || columns.length === 0 || dataToCopy.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Disalin',
      });
      return;
    }

    const header = columns.join('\t');
    const rows = dataToCopy.map(row => 
      columns.map(col => {
        if (row.__isEmpty) return '';
        const cellValue = row[col];
        const colType = row.__isNotFound ? 'text' : colTypes[col] || 'text';
        const formatted = formatCell(cellValue, colType);
        return String(formatted).replace(/\n/g, ' ').replace(/\t/g, ' ');
      }).join('\t')
    );
    
    const clipboardText = [header, ...rows].join('\n');
    navigator.clipboard.writeText(clipboardText).then(() => {
      toast({ title: 'Disalin ke Clipboard', description: `${dataToCopy.length} baris telah disalin.` });
    }).catch(err => {
      console.error('Gagal menyalin teks: ', err);
      toast({ variant: 'destructive', title: 'Gagal Menyalin' });
    });
  }, [toast, formatCell]);

  const handleRowClick = async (row: Row) => {
    if (row.__isNotFound || !primaryLinkColumn || !secondaryLinkColumn || row.__isEmpty) {
        return;
    }
    
    try {
        const secondaryDataRows = await get<Row[]>('secondary_rows');
        if (!secondaryDataRows) {
            toast({ variant: "destructive", title: "Data Sekunder Tidak Ditemukan" });
            return;
        }

        const lookupValue = row[primaryLinkColumn];
        if (lookupValue === undefined || lookupValue === null) return;
        
        setSelectedPrimaryRow(row);
        setCurrentLookupValue(String(lookupValue));

        let relatedRows = secondaryDataRows.filter(secondaryRow => 
            String(secondaryRow[secondaryLinkColumn] ?? '').toLowerCase() === String(lookupValue).toLowerCase()
        );

        const activeSecondarySearch = Object.entries(secondarySearchCriteria)
            .filter(([col, crit]) => secondarySearchColumns.has(col) && crit?.value.trim());

        if (activeSecondarySearch.length > 0) {
            const checkMatch = (value: string | number, operator: SearchOperator, term: string): boolean => {
                const val = String(value ?? '').toLowerCase();
                const t = term.toLowerCase();
                if (!t) return true;
                switch (operator) {
                    case 'contains': return val.includes(t);
                    case 'equals': return val === t;
                    case 'startsWith': return val.startsWith(t);
                    case 'endsWith': return val.endsWith(t);
                    default: return false;
                }
            };

            relatedRows = relatedRows.filter(relatedRow => {
                return activeSecondarySearch.every(([col, crit]) => {
                    if (!crit) return true;
                    const cellValue = relatedRow[col];
                    return checkMatch(cellValue, crit.operator, crit.value.trim());
                });
            });
        }
        
        setSecondaryResults(relatedRows);
        
        const savedSecondaryTemplates = localStorage.getItem('rekonMatch_secondaryTemplates');
        const templates = savedSecondaryTemplates ? JSON.parse(savedSecondaryTemplates) : {};
        if (templates['default']) {
            setSecondaryDisplayColumns(templates['default']);
        } else {
            setSecondaryDisplayColumns(secondaryDataHeaders);
        }
        
        setIsSecondarySheetOpen(true);
    } catch(e) {
        console.error("Gagal mengambil data sekunder:", e);
        toast({ variant: "destructive", title: "Gagal Membuka Detail", description: "Tidak dapat mengambil data terkait dari penyimpanan lokal." });
    }
};

  const isLinkingEnabled = useMemo(() => primaryDataHeaders.length > 0 && secondaryDataHeaders.length > 0, [primaryDataHeaders, secondaryDataHeaders]);

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
    isLinkingEnabled,
    primaryLinkColumn,
    setPrimaryLinkColumn,
    secondaryLinkColumn,
    setSecondaryLinkColumn,
    searchColumns,
    secondarySearchColumns,
    displayColumns,
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
    selectedPrimaryRow,
    currentLookupValue,
    isSecondarySheetOpen,
    secondaryResults,
    includeEmptyRowsInResults,
    setIncludeEmptyRowsInResults,
    handleSearchColumnToggle,
    handleSecondarySearchColumnToggle,
    handleSelectAllDisplayColumns,
    handleSelectAllSecondaryDisplayColumns,
    handleDisplayColumnToggle,
    handleSecondaryDisplayColumnToggle,
    moveDisplayColumn,
    moveSecondaryDisplayColumn,
    handleColumnTypeChange,
    handleColumnColorChange,
    handleSaveTemplate,
    handleLoadTemplate,
    handleDeleteTemplate,
    handleSearchCriteriaChange,
    handleSearchOperatorChange,
    handleRunPrimaryQuery,
    handleRunSecondaryQuery,
    handleCopyResults,
    handleRowClick,
    setIsSecondarySheetOpen,
  };
};