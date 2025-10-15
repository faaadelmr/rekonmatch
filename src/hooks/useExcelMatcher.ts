
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Row } from "@/lib/mock-data";

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
  
  // State for File 1 (Primary)
  const [primaryData, setPrimaryData] = useState<ExcelData | null>(null);
  const [primaryFileName, setPrimaryFileName] = useState<string>('');
  const [searchColumns, setSearchColumns] = useState<Set<string>>(new Set());
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<Record<string, SearchCriterion>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [primaryDisplayTemplates, setPrimaryDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newPrimaryTemplateName, setNewPrimaryTemplateName] = useState('');

  // State for File 2 (Secondary)
  const [secondaryData, setSecondaryData] = useState<ExcelData | null>(null);
  const [secondaryFileName, setSecondaryFileName] = useState<string>('');
  
  // Linking state
  const [primaryLinkColumn, setPrimaryLinkColumn] = useState<string>('');
  const [secondaryLinkColumn, setSecondaryLinkColumn] = useState<string>('');
  
  // Secondary results state
  const [secondaryResults, setSecondaryResults] = useState<Row[]>([]);
  const [secondaryDisplayColumns, setSecondaryDisplayColumns] = useState<string[]>([]);
  const [isSecondarySheetOpen, setIsSecondarySheetOpen] = useState(false);
  const [currentLookupValue, setCurrentLookupValue] = useState<string | number>('');
  const [selectedPrimaryRow, setSelectedPrimaryRow] = useState<Row | null>(null);
  const [secondaryDisplayTemplates, setSecondaryDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newSecondaryTemplateName, setNewSecondaryTemplateName] = useState('');

  const [isQueryInvalid, setIsQueryInvalid] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState<'primary' | 'secondary' | false>(false);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [currentTheme, setCurrentTheme] = useState('dark');

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
    const hasSearchValues = Object.values(searchCriteria).some(c => c.value.trim() !== '');
    setIsQueryInvalid(!hasSearchCols || !hasSearchValues);
  }, [searchColumns, searchCriteria]);

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

  const resetPrimaryDataStates = (data: ExcelData | null) => {
    setDisplayColumns(data ? data.headers : []);
    setSearchColumns(new Set());
    setSearchCriteria({});
    setFilteredResults(null);
    setPrimaryLinkColumn('');
    setColumnTypes({});
    setColumnColors({});
  };

  const handleSwapFiles = () => {
    if (!primaryData || !secondaryData) return;
    const tempPrimary = { data: primaryData, name: primaryFileName };
    setPrimaryData(secondaryData);
    setPrimaryFileName(secondaryFileName);
    setSecondaryData(tempPrimary.data);
    setSecondaryFileName(tempPrimary.name);

    const tempPrimaryLink = primaryLinkColumn;
    setPrimaryLinkColumn(secondaryLinkColumn);
    setSecondaryLinkColumn(tempPrimaryLink);

    resetPrimaryDataStates(secondaryData);
    toast({ title: "Data Ditukar", description: "Peran data utama dan sekunder telah berhasil ditukar." });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'primary' | 'secondary') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(fileType);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const fileContent = e.target?.result;
        if (!fileContent) throw new Error("Gagal membaca konten file.");
        
        const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true });
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

        const processedData = { headers, rows };
        
        if (fileType === 'primary') {
          setPrimaryData(processedData);
          setPrimaryFileName(file.name);
          resetPrimaryDataStates(processedData);
          setAppState('loaded');
        } else {
          setSecondaryData(processedData);
          setSecondaryFileName(file.name);
          setSecondaryLinkColumn('');
        }
        
      } catch (error) {
        console.error("Kesalahan memproses file Excel:", error);
        toast({ variant: "destructive", title: "Kesalahan Membaca File", description: "Terjadi masalah saat memproses file Excel Anda." });
      } finally {
        setIsLoadingFile(false);
        if(event.target) event.target.value = "";
      }
    };
    
    reader.onerror = () => {
        setIsLoadingFile(false);
        toast({ variant: "destructive", title: "Kesalahan Membaca File", description: "Tidak dapat membaca file yang dipilih." });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = (fileType: 'primary' | 'secondary') => {
    if (fileType === 'primary') primaryFileInputRef.current?.click();
    else secondaryFileInputRef.current?.click();
  };

  const handleReset = () => {
    setAppState('initial');
    setPrimaryData(null);
    setPrimaryFileName('');
    setSecondaryData(null);
    setSecondaryFileName('');
    resetPrimaryDataStates(null);
    setSecondaryLinkColumn('');
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
      return newSet;
    });
  };
  
  const handleSearchCriteriaChange = (column: string, value: string) => {
    setSearchCriteria(prev => ({ ...prev, [column]: { ...prev[column], value } }));
  };

  const handleSearchOperatorChange = (column: string, operator: SearchOperator) => {
    setSearchCriteria(prev => ({ ...prev, [column]: { ...prev[column], operator } }));
  };

  const handleDisplayColumnToggle = (column: string, checked: boolean) => {
    setDisplayColumns(prev => {
      if (checked) return [...prev, column];
      const newCols = prev.filter(c => c !== column);
      const { [column]: cType, ...restTypes } = columnTypes;
      setColumnTypes(restTypes);
      const { [column]: cColor, ...restColors } = columnColors;
      setColumnColors(restColors);
      return newCols;
    });
  };
  
  const handleSelectAllDisplayColumns = (checked: boolean) => {
    if (checked && primaryData) setDisplayColumns(primaryData.headers);
    else {
      setDisplayColumns([]);
      setColumnTypes({});
      setColumnColors({});
    }
  };
  
  const moveDisplayColumn = (index: number, direction: 'up' | 'down') => {
    const newDisplayColumns = [...displayColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newDisplayColumns.length) return;
    [newDisplayColumns[index], newDisplayColumns[newIndex]] = [newDisplayColumns[newIndex], newDisplayColumns[index]];
    setDisplayColumns(newDisplayColumns);
  };

  const handleColumnTypeChange = (column: string, type: ColumnType) => setColumnTypes(prev => ({...prev, [column]: type}));
  const handleColumnColorChange = (column: string, color: string) => setColumnColors(prev => ({...prev, [column]: color}));

  const handleRunQuery = useCallback(() => {
    if (!primaryData || isQueryInvalid) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const activeSearchCriteria = Object.entries(searchCriteria)
        .filter(([col, crit]) => crit && crit.value.trim() !== '' && searchColumns.has(col));
      
      if (activeSearchCriteria.length === 0) {
        setFilteredResults(primaryData.rows);
        setIsProcessing(false);
        return;
      }

      const checkMatch = (value: string, operator: SearchOperator, term: string): boolean => {
        const val = String(value ?? '').toLowerCase();
        const t = String(term ?? '').toLowerCase();
        if (!t) return false;
        switch (operator) {
          case 'contains': return val.includes(t);
          case 'equals': return val === t;
          case 'startsWith': return val.startsWith(t);
          case 'endsWith': return val.endsWith(t);
          default: return false;
        }
      };

      const parsedCriteria = activeSearchCriteria.map(([col, crit]) => ({
        col,
        terms: crit.value.split(/,|\n/).map(s => s.trim()).filter(s => s !== ''),
        operator: crit.operator
      }));

      const longestInputLength = Math.max(0, ...parsedCriteria.map(c => c.terms.length));
      
      const finalResults: Row[] = [];
      const usedDataIndicesCount = new Map<number, number>();

      for (let i = 0; i < longestInputLength; i++) {
        const termRow: Record<string, string> = {};
        let hasValueThisRow = false;

        parsedCriteria.forEach(({ col, terms }) => {
            const term = terms[i] ?? terms[terms.length - 1];
            if (term !== undefined) {
              termRow[col] = term;
              if (terms[i] !== undefined) {
                hasValueThisRow = true;
              }
            }
        });

        if (!hasValueThisRow && i >= Math.max(...parsedCriteria.map(c => c.terms.length))) continue;
        
        const availableData = primaryData.rows.map((row, index) => ({ row, originalIndex: index }));

        const foundMatches = availableData.filter(({ row }) => {
            if (!row) return false;
            return Object.entries(termRow).every(([col, term]) => {
                const cellValue = String(row[col] ?? '');
                const { operator } = searchCriteria[col];
                return checkMatch(cellValue, operator, term);
            });
        });

        if (foundMatches.length > 0) {
          foundMatches.forEach(({ row, originalIndex }) => {
            const currentCount = usedDataIndicesCount.get(originalIndex) || 0;
            if (currentCount > 0) {
                const duplicateRow: Row = { __isNotFound: true };
                Object.keys(termRow).forEach(col => {
                    duplicateRow[col] = `Data duplikasi, ${currentCount} Data sudah ada`;
                });
                finalResults.push(duplicateRow);
            } else {
                finalResults.push(row);
            }
            usedDataIndicesCount.set(originalIndex, currentCount + 1);
          });
        } else {
          const notFoundRow: Row = { __isNotFound: true };
          Object.entries(termRow).forEach(([col, term]) => {
            notFoundRow[col] = term;
          });
          finalResults.push(notFoundRow);
        }
      }
      
      setFilteredResults(finalResults);
      setIsProcessing(false);
    }, 500);
  }, [primaryData, searchCriteria, searchColumns, isQueryInvalid]);

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
        const cellValue = row[col];
        const colType = row.__isNotFound ? 'text' : colTypes[col] || 'text';
        return formatCell(cellValue, colType);
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

  const handleRowClick = (row: Row) => {
    if (row.__isNotFound || !primaryLinkColumn || !secondaryLinkColumn || !secondaryData) {
      return;
    }
    const lookupValue = row[primaryLinkColumn];
    if (lookupValue === undefined) return;
    
    setSelectedPrimaryRow(row);
    setCurrentLookupValue(lookupValue);

    const relatedRows = secondaryData.rows.filter(secondaryRow => 
      String(secondaryRow[secondaryLinkColumn] ?? '').toLowerCase() === String(lookupValue).toLowerCase()
    );

    setSecondaryResults(relatedRows);
    if (secondaryDisplayTemplates['default']) {
       setSecondaryDisplayColumns(secondaryDisplayTemplates['default']);
    } else if (relatedRows.length > 0) {
      setSecondaryDisplayColumns(secondaryData.headers);
    } else {
      setSecondaryDisplayColumns(secondaryData.headers);
    }
    setIsSecondarySheetOpen(true);
  };
  
  const handleSecondaryDisplayColumnToggle = (column: string, checked: boolean) => {
    setSecondaryDisplayColumns(prev => checked ? [...prev, column] : prev.filter(c => c !== column));
  };

  const handleSelectAllSecondaryDisplayColumns = (checked: boolean) => {
    setSecondaryDisplayColumns(checked && secondaryData ? secondaryData.headers : []);
  };

  const isLinkingEnabled = useMemo(() => !!(primaryData && secondaryData), [primaryData, secondaryData]);

  return {
    appState,
    primaryData,
    primaryFileName,
    secondaryData,
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
    displayColumns,
    searchCriteria,
    columnTypes,
    columnColors,
    primaryDisplayTemplates,
    newPrimaryTemplateName,
    setNewPrimaryTemplateName,
    filteredResults,
    isQueryInvalid,
    isProcessing,
    currentTheme,
    selectedPrimaryRow,
    currentLookupValue,
    isSecondarySheetOpen,
    secondaryResults,
    secondaryDisplayColumns,
    secondaryDisplayTemplates,
    newSecondaryTemplateName,
    setNewSecondaryTemplateName,
    handleSearchColumnToggle,
    handleSelectAllDisplayColumns,
    handleDisplayColumnToggle,
    moveDisplayColumn,
    handleColumnTypeChange,
    handleColumnColorChange,
    handleSaveTemplate,
    handleLoadTemplate,
    handleDeleteTemplate,
    handleSearchCriteriaChange,
    handleSearchOperatorChange,
    handleRunQuery,
    handleCopyResults,
    handleRowClick,
    setIsSecondarySheetOpen,
    handleSecondaryDisplayColumnToggle,
    handleSelectAllSecondaryDisplayColumns
  };
};

    
    

    