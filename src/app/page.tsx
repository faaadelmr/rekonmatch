"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
import { Textarea } from "@/components/ui/textarea";
import { type Row } from "@/lib/mock-data";
import { FileUp, Search, Table as TableIcon, X, Loader2, ListFilter, Columns, Upload, Copy, AlertTriangle, ArrowUp, ArrowDown, Save, Trash2, CheckSquare } from "lucide-react";
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

export default function Home() {
  const [appState, setAppState] = useState<AppState>('initial');
  const [data, setData] = useState<ExcelData | null>(null);
  const [searchColumns, setSearchColumns] = useState<Set<string>>(new Set());
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<Record<string, string>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [displayTemplates, setDisplayTemplates] = useState<Record<string, string[]>>({});
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('rekonMatch_displayTemplates');
      if (savedTemplates) {
        setDisplayTemplates(JSON.parse(savedTemplates));
      }
    } catch (error) {
      console.error("Gagal memuat template dari localStorage:", error);
    }
  }, []);

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nama Template Kosong',
        description: 'Harap masukkan nama untuk template Anda.',
      });
      return;
    }
    const updatedTemplates = { ...displayTemplates, [newTemplateName]: displayColumns };
    setDisplayTemplates(updatedTemplates);
    localStorage.setItem('rekonMatch_displayTemplates', JSON.stringify(updatedTemplates));
    setNewTemplateName('');
    toast({
      title: 'Template Disimpan',
      description: `Template "${newTemplateName}" telah berhasil disimpan.`,
    });
  };

  const handleLoadTemplate = (templateName: string) => {
    if (displayTemplates[templateName]) {
      setDisplayColumns(displayTemplates[templateName]);
      toast({
        title: 'Template Dimuat',
        description: `Template "${templateName}" telah diterapkan.`,
      });
    }
  };

  const handleDeleteTemplate = (templateName: string) => {
    const { [templateName]: _, ...remainingTemplates } = displayTemplates;
    setDisplayTemplates(remainingTemplates);
    localStorage.setItem('rekonMatch_displayTemplates', JSON.stringify(remainingTemplates));
    toast({
      variant: 'destructive',
      title: 'Template Dihapus',
      description: `Template "${templateName}" telah dihapus.`,
    });
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result;
        if (!fileContent) {
          throw new Error("Gagal membaca konten file.");
        }
        const workbook = XLSX.read(fileContent, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];
        
        if (json.length === 0) {
            throw new Error("File Excel kosong.");
        }

        const headers = json[0].map(String);
        const rows = json.slice(1).map(rowArray => {
          const rowObject: Row = {};
          headers.forEach((header, index) => {
            rowObject[header] = rowArray[index] ?? '';
          });
          return rowObject;
        });

        const processedData = { headers, rows };
        
        setData(processedData);
        setDisplayColumns(processedData.headers);
        setSearchColumns(new Set());
        setSearchCriteria({});
        setFilteredResults(null);
        setAppState('loaded');
      } catch (error) {
        console.error("Kesalahan memproses file Excel:", error);
        toast({
          variant: "destructive",
          title: "Kesalahan Membaca File",
          description: "Terjadi masalah saat memproses file Excel Anda. Pastikan formatnya valid.",
        });
      } finally {
        setIsLoadingFile(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = () => {
        setIsLoadingFile(false);
        toast({
            variant: "destructive",
            title: "Kesalahan Membaca File",
            description: "Tidak dapat membaca file yang dipilih.",
        });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setAppState('initial');
    setData(null);
    setSearchColumns(new Set());
    setDisplayColumns([]);
    setSearchCriteria({});
    setFilteredResults(null);
  };

  const handleSearchColumnToggle = (column: string, checked: boolean) => {
    setSearchColumns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
      } else {
        newSet.delete(column);
        setSearchCriteria(currentCriteria => {
          const newCriteria = {...currentCriteria};
          delete newCriteria[column];
          return newCriteria;
        });
      }
      return newSet;
    });
  };

  const handleDisplayColumnToggle = (column: string, checked: boolean) => {
    setDisplayColumns(prev => {
      if (checked) {
        // Add column if it's not already there
        return prev.includes(column) ? prev : [...prev, column];
      } else {
        // Remove column
        return prev.filter(c => c !== column);
      }
    });
  };
  
  const handleSelectAllDisplayColumns = (checked: boolean) => {
    if (checked && data) {
      setDisplayColumns(data.headers);
    } else {
      setDisplayColumns([]);
    }
  };
  
  const moveDisplayColumn = (index: number, direction: 'up' | 'down') => {
    const newDisplayColumns = [...displayColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newDisplayColumns.length) return;

    const temp = newDisplayColumns[index];
    newDisplayColumns[index] = newDisplayColumns[newIndex];
    newDisplayColumns[newIndex] = temp;
    setDisplayColumns(newDisplayColumns);
  };

  const handleRunQuery = useCallback(() => {
    if (!data) return;
    setIsProcessing(true);
    
    setTimeout(() => {
        const activeSearchCols = Array.from(searchColumns).filter(
            (col) => searchCriteria[col]?.trim()
        );

        if (activeSearchCols.length === 0) {
            setFilteredResults(data.rows);
            setIsProcessing(false);
            return;
        }

        const searchTermsByCol: Record<string, string[]> = {};
        let longestSearchListCol: string | null = null;
        let maxTerms = 0;
        let mainSearchTerms: string[] = [];

        // Determine the column with the most search terms to use as the primary loop
        activeSearchCols.forEach(col => {
            const terms = searchCriteria[col].split('\n').map(t => t.trim()).filter(Boolean);
            searchTermsByCol[col] = terms;
            if (terms.length > maxTerms) {
                maxTerms = terms.length;
                longestSearchListCol = col;
                mainSearchTerms = terms;
            }
        });
        
        if (!longestSearchListCol) {
            // Handle case where there are search criteria but they are all empty strings
            setFilteredResults(data.rows);
            setIsProcessing(false);
            return;
        }

        const results: Row[] = [];
        const foundRowsTracker = new Set<Row>();
        
        mainSearchTerms.forEach((term, termIndex) => {
            const termLower = term.toLowerCase();
            let matchFoundForTerm = false;

            const matchingRows = data.rows.filter(row => {
                if (foundRowsTracker.has(row)) return false;

                const primaryColValue = String(row[longestSearchListCol!]).toLowerCase();
                if (!primaryColValue.startsWith(termLower)) {
                    return false;
                }

                return activeSearchCols.every(col => {
                    if (col === longestSearchListCol) return true;
                    
                    const otherColTerms = searchTermsByCol[col];
                    if (otherColTerms.length === 0) return true;
                    if (otherColTerms.length <= termIndex) return true;

                    const rowValue = String(row[col]).toLowerCase();
                    const otherTermToMatch = otherColTerms[termIndex]?.toLowerCase();

                    return otherTermToMatch ? rowValue.startsWith(otherTermToMatch) : true;
                });
            });

            if (matchingRows.length > 0) {
                matchingRows.forEach(row => {
                    if (!foundRowsTracker.has(row)) {
                        results.push(row);
                        foundRowsTracker.add(row);
                    }
                });
                matchFoundForTerm = true;
            } 
            
            if (!matchFoundForTerm) {
                const notFoundRow: Row = { __isNotFound: 1 };
                data.headers.forEach(header => {
                    if (header === longestSearchListCol) {
                        notFoundRow[header] = term;
                    } else if (searchCriteria[header]) {
                       const otherTerms = searchCriteria[header].split('\n');
                       notFoundRow[header] = otherTerms[termIndex] || 'data tidak ditemukan';
                    } else {
                        notFoundRow[header] = 'data tidak ditemukan';
                    }
                });
                results.push(notFoundRow);
            }
        });

        setFilteredResults(results);
        setIsProcessing(false);
    }, 500);
  }, [data, searchCriteria, searchColumns]);
  
  const orderedDisplayColumns = useMemo(() => {
    if (!data) return [];
    // This is now just the displayColumns array itself, since it's ordered.
    return displayColumns;
  }, [displayColumns, data]);

  const handleCopyResults = useCallback(() => {
    if (!filteredResults || orderedDisplayColumns.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Disalin',
        description: 'Tidak ada data di tabel hasil untuk disalin.',
      });
      return;
    }

    if (filteredResults.length === 0) {
       toast({
        title: 'Tidak Ada Data untuk Disalin',
        description: 'Tabel hasil kosong.',
      });
      return;
    }

    const header = orderedDisplayColumns.join('\t');
    const rows = filteredResults.map(row => 
      orderedDisplayColumns.map(col => {
        if (row.__isNotFound) {
            return String(row[col] ?? 'data tidak ditemukan');
        }
        return String(row[col] ?? '');
      }).join('\t')
    );
    
    const clipboardText = [header, ...rows].join('\n');

    navigator.clipboard.writeText(clipboardText).then(() => {
      toast({
        title: 'Disalin ke Clipboard',
        description: `${filteredResults.length} baris telah disalin.`,
      });
    }).catch(err => {
      console.error('Gagal menyalin teks: ', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Menyalin',
        description: 'Tidak dapat menyalin data ke clipboard. Lihat konsol untuk detail.',
      });
    });
  }, [filteredResults, orderedDisplayColumns, toast]);


  if (appState === 'initial') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="absolute top-6 right-6">
          <ThemeSwitcher />
        </div>
        <Card className="w-full max-w-lg text-center shadow-2xl animate-fade-in-up border-0 bg-card/80 dark:bg-card/50 backdrop-blur-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
               <FileUp className="w-10 h-10" />
            </div>
            <CardTitle className="text-4xl font-bold mt-2">RekonMatch</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              Unggah file Excel Anda untuk mulai memfilter multiple data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive" className="text-left bg-amber-500/10 border-amber-500/30 text-amber-200">
                <AlertTriangle className="h-4 w-4 !text-amber-500" />
                <AlertTitle className="text-amber-400 font-semibold text-sm">Penting</AlertTitle>
                <AlertDescription className="text-amber-400/80">
                    Pastikan header atau judul kolom data Anda berada pada <strong className="font-semibold text-amber-300">baris pertama</strong> di file Excel.
                </AlertDescription>
            </Alert>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button size="lg" className="w-full text-lg py-7" onClick={handleUploadClick} disabled={isLoadingFile}>
              {isLoadingFile ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <Upload className="mr-2 h-6 w-6" />
              )}
              Pilih File Excel
            </Button>
          </CardContent>
          <CardFooter>
             <p className="text-xs text-muted-foreground w-full">
              Mendukung .xlsx, .xls, .csv. Semua pemrosesan dilakukan di browser Anda.
            </p>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TableIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">RekonMatch</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button variant="outline" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            Mulai Ulang
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Susunan Kueri</CardTitle>
                    <CardDescription>Pilih kolom, masukkan kriteria, dan jalankan kueri Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListFilter className="w-5 h-5" /> Kolom</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Accordion type="multiple" defaultValue={['search-cols', 'display-cols']} className="w-full">
                                    <AccordionItem value="search-cols">
                                        <AccordionTrigger>Kolom Pencarian</AccordionTrigger>
                                        <AccordionContent className="space-y-2 max-h-48 overflow-y-auto pr-4">
                                            {data?.headers.map(col => (
                                                <div key={`search-${col}`} className="flex items-center space-x-2">
                                                    <Checkbox id={`search-${col}`} onCheckedChange={(checked) => handleSearchColumnToggle(col, !!checked)} checked={searchColumns.has(col)} />
                                                    <Label htmlFor={`search-${col}`} className="font-normal cursor-pointer flex-1">{col}</Label>
                                                </div>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="display-cols">
                                        <AccordionTrigger>Kolom Tampilan</AccordionTrigger>
                                        <AccordionContent className="space-y-2">
                                            <div className="flex items-center space-x-2 pb-2 border-b">
                                                <Checkbox id="display-all" onCheckedChange={(checked) => handleSelectAllDisplayColumns(!!checked)} checked={displayColumns.length === data?.headers.length} />
                                                <Label htmlFor="display-all" className="font-semibold">Pilih Semua</Label>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto pr-2 pt-2 space-y-2">
                                                {data?.headers.map((col) => {
                                                  const isDisplayed = displayColumns.includes(col);
                                                  const index = displayColumns.indexOf(col);
                                                  return (
                                                    <div key={`display-${col}`} className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                          <Checkbox id={`display-${col}`} onCheckedChange={(checked) => handleDisplayColumnToggle(col, !!checked)} checked={isDisplayed} />
                                                          <Label htmlFor={`display-${col}`} className={cn("font-normal cursor-pointer", !isDisplayed && "text-muted-foreground")}>{col}</Label>
                                                        </div>
                                                        {isDisplayed && (
                                                            <div className="flex items-center gap-1">
                                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'up')} disabled={index === 0}>
                                                                  <ArrowUp className="h-4 w-4" />
                                                              </Button>
                                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'down')} disabled={index === displayColumns.length - 1}>
                                                                  <ArrowDown className="h-4 w-4" />
                                                              </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                  )
                                                })}
                                            </div>
                                            <Separator className="my-4" />
                                            <div className="space-y-4">
                                              <div>
                                                <Label className="font-semibold text-sm">Template Tampilan</Label>
                                                <p className="text-xs text-muted-foreground">Simpan atau muat konfigurasi kolom.</p>
                                              </div>

                                              <div className="flex gap-2">
                                                <Input 
                                                  placeholder="Nama template baru..." 
                                                  value={newTemplateName}
                                                  onChange={e => setNewTemplateName(e.target.value)}
                                                />
                                                <Button onClick={handleSaveTemplate}><Save className="w-4 h-4" /></Button>
                                              </div>

                                              {Object.keys(displayTemplates).length > 0 && (
                                                <div className="space-y-2">
                                                {Object.keys(displayTemplates).map(templateName => (
                                                  <div key={templateName} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                                                    <p className="text-sm font-medium">{templateName}</p>
                                                    <div className='flex gap-1'>
                                                      <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(templateName)}>
                                                        <CheckSquare className="w-4 h-4 mr-2" /> Muat
                                                      </Button>
                                                      <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(templateName)}>
                                                        <Trash2 className="w-4 h-4" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                              )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5"/>Kriteria Pencarian</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4 overflow-y-auto">
                                {Array.from(searchColumns).length > 0 ? Array.from(searchColumns).map(col => (
                                    <div key={`criteria-${col}`} className="space-y-2">
                                        <Label htmlFor={`textarea-${col}`} className="font-semibold">{col}</Label>
                                        <Textarea
                                            id={`textarea-${col}`}
                                            placeholder={`Masukkan nilai untuk ${col}, satu per baris...`}
                                            value={searchCriteria[col] || ''}
                                            onChange={e => setSearchCriteria(prev => ({ ...prev, [col]: e.target.value }))}
                                            className="h-24 resize-y"
                                        />
                                    </div>
                                )) : <p className="text-sm text-muted-foreground pt-4 text-center">Pilih kolom pencarian untuk menambahkan kriteria.</p>}
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-primary/10 border-primary/20 flex flex-col justify-center">
                            <CardContent className="pt-6 text-center">
                                <Button size="lg" className="w-full h-16 text-xl" onClick={handleRunQuery} disabled={isProcessing}>
                                    {isProcessing ? (
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-6 w-6" />
                                    )}
                                    Jalankan Kueri
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>


        <div className="xl:col-span-3">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2"><Columns className="w-6 h-6" /> Hasil</CardTitle>
                        <CardDescription>
                            {filteredResults ? `${filteredResults.length} data yang cocok ditemukan.` : 'Hasil kueri Anda akan muncul di sini.'}
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleCopyResults} disabled={!filteredResults || filteredResults.length === 0}>
                        <Copy className="w-4 h-4 mr-2" />
                        Salin Hasil
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {orderedDisplayColumns.map(col => (
                                        <TableHead key={`header-${col}`} className="font-bold bg-muted/50">{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults && filteredResults.length > 0 ? (
                                    filteredResults.map((row, index) => (
                                        <TableRow key={index} className={cn(row.__isNotFound && "bg-red-500/20 hover:bg-red-500/30")}>
                                            {orderedDisplayColumns.map(col => (
                                                <TableCell key={`${index}-${col}`}>{String(row[col] ?? '')}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={orderedDisplayColumns.length || 1} className="h-48 text-center text-muted-foreground">
                                            {filteredResults === null ? "Jalankan kueri untuk melihat data Anda." : "Tidak ada hasil yang ditemukan."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
