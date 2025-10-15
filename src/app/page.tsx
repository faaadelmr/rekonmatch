
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format as formatDate } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { type Row } from "@/lib/mock-data";
import { Sparkles, Sparkle, Table as TableIcon, X, Loader2, ListFilter, Columns, HeartHandshake, Copy, AlertTriangle, ArrowUp, ArrowDown, Heart, Trash2, CheckSquare, Flower2, FileText, FileCheck2, ArrowRightLeft, Type, Palette, Wand2, Settings, Upload, Filter, Search, Save, Link2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type AppState = 'initial' | 'loaded';
interface ExcelData {
    headers: string[];
    rows: Row[];
}
type ColumnType = 'text' | 'number' | 'currency' | 'date';
type SearchOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

interface SearchCriterion {
  value: string;
  operator: SearchOperator;
}

export default function Home() {
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
    // Function to update theme from localStorage
    const updateTheme = () => {
      const savedTheme = localStorage.getItem('rekonmatch_theme') || 'dark';
      setCurrentTheme(savedTheme);
    };

    updateTheme(); // Set initial theme

    // Listen for changes from other tabs/windows
    window.addEventListener('storage', updateTheme);

    // Create a custom event to listen for changes within the same tab
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


  const excelSerialDateToJSDate = (serial: number): Date | null => {
    if (isNaN(serial) || serial < 0) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const formatCell = (value: any, type: ColumnType = 'text'): string => {
    if (value === null || value === undefined || value === '') return '';
    
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

        // Prepare search terms for each column (supports multiple values via comma/newline)
        const columnSearchTerms = new Map<string, { operator: SearchOperator, terms: string[] }>();
        activeSearchCriteria.forEach(([col, crit]) => {
            const terms = crit.value.split(/,|\n/).map(s => s.trim().toLowerCase()).filter(s => s);
            if (terms.length > 0) {
                columnSearchTerms.set(col, { operator: crit.operator, terms });
            }
        });

        // Filter the data
        const matchedRows = primaryData.rows.filter(row => {
            // Check if the row matches ALL column criteria (AND logic)
            return Array.from(columnSearchTerms.entries()).every(([col, { operator, terms }]) => {
                const cellValue = String(row[col] ?? '').toLowerCase();
                if (cellValue === '') return false;

                // Check if the cell value matches ANY of the terms for that column (OR logic)
                return terms.some(term => {
                    switch (operator) {
                        case 'contains': return cellValue.includes(term);
                        case 'equals': return cellValue === term;
                        case 'startsWith': return cellValue.startsWith(term);
                        case 'endsWith': return cellValue.endsWith(term);
                        default: return false;
                    }
                });
            });
        });

        // Find which search terms didn't find any match to display as "not found"
        const allInputTerms = new Set<string>();
        columnSearchTerms.forEach(({ terms }) => terms.forEach(term => allInputTerms.add(term)));

        const foundTerms = new Set<string>();
        matchedRows.forEach(row => {
            columnSearchTerms.forEach((_, col) => {
                 const cellValue = String(row[col] ?? '').toLowerCase();
                 if (cellValue) {
                     foundTerms.add(cellValue); // Simplified: add the whole cell value if row matched
                 }
            });
        });
        
        const notFoundTerms: string[] = [];
        activeSearchCriteria.forEach(([col, { value }]) => {
            const inputValues = value.split(/,|\n/).map(s => s.trim()).filter(s => s);
            inputValues.forEach(inputValue => {
                const termLower = inputValue.toLowerCase();
                
                const termWasFound = matchedRows.some(row => {
                    const cellValue = String(row[col] ?? '').toLowerCase();
                    const operator = columnSearchTerms.get(col)!.operator;
                    switch (operator) {
                        case 'contains': return cellValue.includes(termLower);
                        case 'equals': return cellValue === termLower;
                        case 'startsWith': return cellValue.startsWith(termLower);
                        case 'endsWith': return cellValue.endsWith(termLower);
                        default: return false;
                    }
                });

                if (!termWasFound) {
                    notFoundTerms.push(inputValue);
                }
            });
        });

        const notFoundRows = notFoundTerms.map(term => {
            const notFoundRow: Row = { __isNotFound: true };
            Array.from(searchColumns).forEach(sc => {
                notFoundRow[sc] = term;
            });
            return notFoundRow;
        });

        setFilteredResults([...matchedRows, ...notFoundRows]);
        setIsProcessing(false);
    }, 500);
}, [primaryData, searchCriteria, searchColumns, isQueryInvalid]);
  
  
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
  }, [toast]);

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

  const isLinkingEnabled = primaryData && secondaryData;

  if (appState === 'initial') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="absolute top-6 right-6"><ThemeSwitcher /></div>
        <Card className="w-full max-w-lg text-center shadow-2xl animate-fade-in-up border-0 bg-card/80 dark:bg-card/50 backdrop-blur-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
              {currentTheme === 'pink' ? <Sparkles className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
            </div>
            <CardTitle className="text-4xl font-bold mt-2">RekonMatch</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">Unggah file Excel Anda untuk mulai memfilter dan mencocokkan data.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive" className="text-left bg-amber-500/10 border-amber-500/30 text-amber-200">
                <AlertTriangle className="h-4 w-4 !text-amber-500" />
                <AlertTitle className="text-amber-400 font-semibold text-sm">Penting</AlertTitle>
                <AlertDescription className="text-amber-400/80">Pastikan header atau judul kolom data Anda berada pada <strong className="font-semibold text-amber-300">baris pertama</strong> di file Excel.</AlertDescription>
            </Alert>
            <input type="file" ref={primaryFileInputRef} onChange={(e) => handleFileChange(e, 'primary')} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button size="lg" className="w-full text-lg py-7" onClick={() => handleUploadClick('primary')} disabled={!!isLoadingFile}>
              {isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-6 w-6" /> : <Upload className="mr-2 h-6 w-6" />)}
              Pilih File Excel Utama
            </Button>
          </CardContent>
          <CardFooter><p className="text-xs text-muted-foreground w-full">Mendukung .xlsx, .xls, .csv. Semua pemrosesan dilakukan di browser Anda.</p></CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><TableIcon className="w-8 h-8 text-primary" /><h1 className="text-3xl font-bold">RekonMatch</h1></div>
        <div className="flex items-center gap-2"><ThemeSwitcher /><Button variant="outline" onClick={handleReset}><X className="w-4 h-4 mr-2" />Mulai Ulang</Button></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
            <Card>
                <CardHeader><CardTitle className="text-2xl">1. Sumber Data</CardTitle><CardDescription>Unggah file, tukar peran jika perlu, dan hubungkan data Anda.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-6">
                    <Card className="h-full"><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Utama</CardTitle><CardDescription className="text-xs text-muted-foreground truncate" title={primaryFileName}>{primaryFileName || 'File yang akan difilter.'}</CardDescription></div>{primaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}</CardHeader><CardContent><input type="file" ref={primaryFileInputRef} onChange={(e) => handleFileChange(e, 'primary')} className="hidden" accept=".xlsx, .xls, .csv" /><Button className="w-full" onClick={() => handleUploadClick('primary')} disabled={!!isLoadingFile}>{isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}{primaryData ? 'Ganti File Utama' : 'Pilih File Utama'}</Button></CardContent></Card>
                    <div className="flex justify-center mt-8"><Button variant="outline" size="icon" onClick={handleSwapFiles} disabled={!isLinkingEnabled} aria-label="Tukar file utama dan sekunder" className="h-12 w-12 rounded-full"><ArrowRightLeft className="w-5 h-5" /></Button></div>
                    <Card className="h-full"><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Sekunder</CardTitle><CardDescription className="text-xs text-muted-foreground truncate" title={secondaryFileName}>{secondaryFileName || 'File untuk data terkait.'}</CardDescription></div>{secondaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}</CardHeader><CardContent><input type="file" ref={secondaryFileInputRef} onChange={(e) => handleFileChange(e, 'secondary')} className="hidden" accept=".xlsx, .xls, .csv" /><Button className="w-full" onClick={() => handleUploadClick('secondary')} disabled={!primaryData || !!isLoadingFile}>{isLoadingFile === 'secondary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}{secondaryData ? 'Ganti File Sekunder' : 'Pilih File Sekunder'}</Button></CardContent></Card>
                </CardContent>
                {isLinkingEnabled && (<><Separator /><CardHeader><CardTitle className="text-xl flex items-center gap-2">{currentTheme === 'pink' ? <Flower2 className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}Hubungkan Data</CardTitle><CardDescription>Pilih kolom kunci dari setiap file untuk menghubungkan data.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><Label htmlFor="primary-link-col">Kolom Kunci Data Utama</Label><Select value={primaryLinkColumn} onValueChange={setPrimaryLinkColumn}><SelectTrigger id="primary-link-col"><SelectValue placeholder="Pilih kolom..." /></SelectTrigger><SelectContent>{primaryData?.headers.filter(h => h).map((h, i) => <SelectItem key={`p-link-${h}-${i}`} value={h}>{h}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="secondary-link-col">Kolom Kunci Data Sekunder</Label><Select value={secondaryLinkColumn} onValueChange={setSecondaryLinkColumn}><SelectTrigger id="secondary-link-col"><SelectValue placeholder="Pilih kolom..." /></SelectTrigger><SelectContent>{secondaryData?.headers.filter(h => h).map((h, i) => <SelectItem key={`s-link-${h}-${i}`} value={h}>{h}</SelectItem>)}</SelectContent></Select></div></CardContent></>)}
            </Card>
        </div>

        <div className="lg:col-span-3">
            <Card><CardHeader><CardTitle className="text-2xl">2. Susunan Kueri</CardTitle><CardDescription>Pilih kolom, masukkan kriteria, dan jalankan kueri pada Data Utama.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex flex-col"><CardHeader><CardTitle className="flex items-center gap-2"><ListFilter className="w-5 h-5" /> Kolom</CardTitle></CardHeader><CardContent className="flex-grow"><Accordion type="multiple" defaultValue={['search-cols', 'display-cols']} className="w-full"><AccordionItem value="search-cols"><AccordionTrigger>Kolom Pencarian</AccordionTrigger><AccordionContent className="space-y-2 max-h-48 overflow-y-auto pr-4">{primaryData?.headers.map((col, index) => (<div key={`search-${col}-${index}`} className="flex items-center space-x-2"><Checkbox id={`search-${col}-${index}`} onCheckedChange={(checked) => handleSearchColumnToggle(col, !!checked)} checked={searchColumns.has(col)} /><Label htmlFor={`search-${col}-${index}`} className="font-normal cursor-pointer flex-1">{col}</Label></div>))}</AccordionContent></AccordionItem><AccordionItem value="display-cols"><AccordionTrigger>Kolom Tampilan & Format</AccordionTrigger><AccordionContent className="space-y-2"><div className="flex items-center space-x-2 pb-2 border-b"><Checkbox id="display-all" onCheckedChange={(checked) => handleSelectAllDisplayColumns(!!checked)} checked={primaryData ? displayColumns.length === primaryData.headers.length : false} /><Label htmlFor="display-all" className="font-semibold">Pilih Semua</Label></div><div className="max-h-96 overflow-y-auto pr-2 pt-2 space-y-1">{primaryData?.headers.map((col, i) => { const isDisplayed = displayColumns.includes(col); const index = displayColumns.indexOf(col); return (<div key={`display-${col}-${i}`} className={cn("p-2 rounded-md", isDisplayed && "bg-muted/50")}><div className="flex items-center justify-between"><div className="flex items-center space-x-2"><Checkbox id={`display-${col}-${i}`} onCheckedChange={(checked) => handleDisplayColumnToggle(col, !!checked)} checked={isDisplayed} /><Label htmlFor={`display-${col}-${i}`} className={cn("font-normal cursor-pointer", !isDisplayed && "text-muted-foreground")}>{col}</Label></div>{isDisplayed && (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'down')} disabled={index === displayColumns.length - 1}><ArrowDown className="h-4 w-4" /></Button></div>)}</div>{isDisplayed && (<div className="flex items-stretch gap-2 mt-2 pl-6"><div className="flex items-center gap-2 flex-1"><Type className="h-4 w-4 text-muted-foreground"/><Select value={columnTypes[col] || 'text'} onValueChange={(value) => handleColumnTypeChange(col, value as ColumnType)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipe Data" /></SelectTrigger><SelectContent><SelectItem value="text">Teks</SelectItem><SelectItem value="number">Angka</SelectItem><SelectItem value="currency">Mata Uang (Rp)</SelectItem><SelectItem value="date">Tanggal</SelectItem></SelectContent></Select></div><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" /><Input type="color" value={columnColors[col] || '#000000'} onChange={(e) => handleColumnColorChange(col, e.target.value)} className="h-8 w-10 p-1"/></div></div>)}</div>)})}</div>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div><Label className="font-semibold text-sm">Template Tampilan</Label><p className="text-xs text-muted-foreground">Simpan atau muat konfigurasi kolom.</p></div>
                  <div className="flex gap-2"><Input placeholder="Nama template baru..." value={newPrimaryTemplateName} onChange={e => setNewPrimaryTemplateName(e.target.value)} /><Button onClick={() => handleSaveTemplate('primary')}>{currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}</Button></div>
                  {Object.keys(primaryDisplayTemplates).length > 0 && (<div className="space-y-2">{Object.keys(primaryDisplayTemplates).map(name => (<div key={name} className="flex items-center justify-between gap-2 p-2 border rounded-md"><p className="text-sm font-medium">{name}</p><div className='flex gap-1'><Button size="sm" variant="outline" onClick={() => handleLoadTemplate(name, 'primary')}><CheckSquare className="w-4 h-4 mr-2" /> Muat</Button><Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(name, 'primary')}><Trash2 className="w-4 h-4" /></Button></div></div>))}</div>)}
                </div>
                </AccordionContent></AccordionItem></Accordion></CardContent></Card>
                <Card className="flex flex-col"><CardHeader><CardTitle className="flex items-center gap-2">{currentTheme === 'pink' ? <Sparkle className="w-5 h-5"/> : <Search className="w-5 h-5"/>}Kriteria Pencarian</CardTitle></CardHeader><CardContent className="flex-grow space-y-4 overflow-y-auto pr-4">{Array.from(searchColumns).length > 0 ? Array.from(searchColumns).map((col, index) => (<div key={`criteria-${col}-${index}`} className="space-y-2"><Label htmlFor={`textarea-${col}`} className="font-semibold">{col}</Label><div className="flex flex-col gap-2"><Select value={searchCriteria[col]?.operator || 'contains'} onValueChange={(op) => handleSearchOperatorChange(col, op as SearchOperator)}><SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contains">Mengandung</SelectItem><SelectItem value="equals">Sama Dengan</SelectItem><SelectItem value="startsWith">Dimulai Dengan</SelectItem><SelectItem value="endsWith">Diakhiri Dengan</SelectItem></SelectContent></Select><Textarea id={`textarea-${col}`} placeholder={`Nilai dipisah koma (,) atau baris baru`} value={searchCriteria[col]?.value || ''} onChange={e => handleSearchCriteriaChange(col, e.target.value)} className="min-h-[100px]" /></div></div>)) : <p className="text-sm text-muted-foreground pt-4 text-center">Pilih kolom pencarian untuk menambahkan kriteria.</p>}</CardContent></Card>
                <Card className="bg-primary/10 border-primary/20 flex flex-col justify-center"><CardContent className="pt-6 text-center"><Button size="lg" className="w-full h-16 text-xl" onClick={handleRunQuery} disabled={isProcessing || isQueryInvalid}>{isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (currentTheme === 'pink' ? <Wand2 className="mr-2 h-6 w-6" /> : <Filter className="mr-2 h-6 w-6" />)}Jalankan Filter</Button></CardContent></Card>
            </div></CardContent></Card>
        </div>

        <div className="lg:col-span-3">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle className="text-2xl flex items-center gap-2"><Columns className="w-6 h-6" /> Hasil Kueri Utama</CardTitle><CardDescription>{filteredResults ? `${filteredResults.filter(r => !r.__isNotFound).length} data cocok dari ${filteredResults.length} hasil.` : 'Hasil kueri Anda akan muncul di sini.'}{isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && ' Klik baris untuk melihat data terkait.'}</CardDescription></div>
                    <Button variant="outline" onClick={() => handleCopyResults(filteredResults, displayColumns, columnTypes)} disabled={!filteredResults || filteredResults.length === 0}><Copy className="w-4 h-4 mr-2" />Salin Hasil</Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader><TableRow>{displayColumns.map((col, index) => (<TableHead key={`header-${col}-${index}`} className="font-bold bg-muted/50" style={{backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>{col}</TableHead>))}</TableRow></TableHeader>
                            <TableBody>{filteredResults && filteredResults.length > 0 ? (filteredResults.map((row, index) => (<TableRow key={index} className={cn(row.__isNotFound && "bg-red-500/20 hover:bg-red-500/30", !row.__isNotFound && isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && "cursor-pointer")} onClick={() => handleRowClick(row)}>{displayColumns.map((col, colIndex) => (<TableCell key={`${index}-${col}-${colIndex}`} style={{backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>{formatCell(row[col], row.__isNotFound ? 'text' : columnTypes[col])}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={displayColumns.length || 1} className="h-48 text-center text-muted-foreground">{isProcessing ? 'Memproses...' : (filteredResults === null ? "Jalankan filter untuk melihat data Anda." : "Tidak ada hasil yang ditemukan.")}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isSecondarySheetOpen} onOpenChange={setIsSecondarySheetOpen}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-full max-h-full flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl">Hasil Data Sekunder</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Menampilkan data terkait untuk: <code className="bg-muted px-2 py-1 rounded-md font-semibold">{String(currentLookupValue)}</code>
            </p>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 min-h-0 overflow-hidden p-6">
            <aside className="hidden md:flex flex-col gap-4 border-r pr-6 overflow-y-auto">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5"/>Opsi Tampilan</h3>
              <Separator />
              <div className="flex items-center space-x-2">
                <Checkbox id="secondary-display-all" onCheckedChange={(checked) => handleSelectAllSecondaryDisplayColumns(!!checked)} checked={secondaryData ? secondaryDisplayColumns.length === secondaryData.headers.length : false} />
                <Label htmlFor="secondary-display-all" className="font-semibold">Pilih Semua</Label>
              </div>
              <div className="flex-1 space-y-2 pr-2">
                {secondaryData?.headers.map((col, index) => (
                  <div key={`secondary-display-${col}-${index}`} className="flex items-center space-x-2">
                    <Checkbox id={`secondary-display-${col}-${index}`} onCheckedChange={(checked) => handleSecondaryDisplayColumnToggle(col, !!checked)} checked={secondaryDisplayColumns.includes(col)} />
                    <Label htmlFor={`secondary-display-${col}-${index}`} className="font-normal cursor-pointer flex-1 text-sm">{col}</Label>
                  </div>
                ))}
              </div>
              <Separator />
               <div className="space-y-4">
                  <div><Label className="font-semibold text-sm">Template Tampilan Sekunder</Label></div>
                  <div className="flex gap-2">
                    <Input placeholder="Nama template baru..." value={newSecondaryTemplateName} onChange={e => setNewSecondaryTemplateName(e.target.value)} />
                    <Button onClick={() => handleSaveTemplate('secondary')}>{currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}</Button>
                  </div>
                  {Object.keys(secondaryDisplayTemplates).length > 0 && (
                    <div className="space-y-2">
                      {Object.keys(secondaryDisplayTemplates).map(name => (
                        <div key={name} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                          <p className="text-sm font-medium">{name}</p>
                          <div className='flex gap-1'>
                            <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(name, 'secondary')}><CheckSquare className="w-4 h-4 mr-2" /> Muat</Button>
                            <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(name, 'secondary')}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </aside>
            
            <main className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              <div className="md:hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value="settings">
                    <AccordionTrigger><Settings className="mr-2" /> Tampilkan Opsi Tampilan</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-4 pt-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="secondary-display-all-mobile" onCheckedChange={(checked) => handleSelectAllSecondaryDisplayColumns(!!checked)} checked={secondaryData ? secondaryDisplayColumns.length === secondaryData.headers.length : false} />
                          <Label htmlFor="secondary-display-all-mobile" className="font-semibold">Pilih Semua</Label>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-48">
                          {secondaryData?.headers.map((col, index) => (
                            <div key={`secondary-display-${col}-mobile-${index}`} className="flex items-center space-x-2">
                              <Checkbox id={`secondary-display-${col}-mobile-${index}`} onCheckedChange={(checked) => handleSecondaryDisplayColumnToggle(col, !!checked)} checked={secondaryDisplayColumns.includes(col)} />
                              <Label htmlFor={`secondary-display-${col}-mobile-${index}`} className="font-normal cursor-pointer flex-1 text-sm">{col}</Label>
                            </div>
                          ))}
                        </div>
                         <Separator />
                         <div className="space-y-4">
                          <div><Label className="font-semibold text-sm">Template Tampilan Sekunder</Label></div>
                          <div className="flex gap-2">
                            <Input placeholder="Nama template baru..." value={newSecondaryTemplateName} onChange={e => setNewSecondaryTemplateName(e.target.value)} />
                            <Button onClick={() => handleSaveTemplate('secondary')}>{currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}</Button>
                          </div>
                          {Object.keys(secondaryDisplayTemplates).length > 0 && (
                            <div className="space-y-2">
                              {Object.keys(secondaryDisplayTemplates).map(name => (
                                <div key={name} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                                  <p className="text-sm font-medium">{name}</p>
                                  <div className='flex gap-1'>
                                    <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(name, 'secondary')}><CheckSquare className="w-4 h-4 mr-2" /> Muat</Button>
                                    <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(name, 'secondary')}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="overflow-auto border rounded-lg flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>{secondaryDisplayColumns.map((col, index) => (<TableHead key={`s-header-${col}-${index}`} className="font-bold bg-muted/50">{col}</TableHead>))}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {secondaryResults.length > 0 ? (
                      secondaryResults.map((row, index) => (
                        <TableRow key={`s-row-${index}`}>
                          {secondaryDisplayColumns.map((col, colIndex) => (
                            <TableCell key={`s-cell-${index}-${col}-${colIndex}`}>{formatCell(row[col])}</TableCell>                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={secondaryDisplayColumns.length || 1} className="h-24 text-center">Tidak ada data terkait yang ditemukan.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </main>
          </div>

          <DialogFooter className="p-6 pt-4 border-t">
             <Button variant="outline" onClick={() => handleCopyResults(secondaryResults, secondaryDisplayColumns, {})} disabled={secondaryResults.length === 0}><Copy className="w-4 h-4 mr-2" />Salin Hasil Sekunder</Button>
             <DialogClose asChild><Button type="button" variant="secondary">Tutup</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

