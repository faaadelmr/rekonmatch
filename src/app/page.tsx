"use client";

import { useState, useMemo, useCallback, useRef } from 'react';
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
import { FileUp, Search, Table as TableIcon, X, Loader2, ListFilter, Columns, Upload, Copy } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type AppState = 'initial' | 'loaded';
interface ExcelData {
    headers: string[];
    rows: Row[];
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('initial');
  const [data, setData] = useState<ExcelData | null>(null);
  const [searchColumns, setSearchColumns] = useState<Set<string>>(new Set());
  const [displayColumns, setDisplayColumns] = useState<Set<string>>(new Set());
  const [searchCriteria, setSearchCriteria] = useState<Record<string, string>>({});
  const [filteredResults, setFilteredResults] = useState<Row[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result;
        if (!fileContent) {
          throw new Error("Failed to read file content.");
        }
        const workbook = XLSX.read(fileContent, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];
        
        if (json.length === 0) {
            throw new Error("Excel file is empty.");
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
        setDisplayColumns(new Set(processedData.headers));
        setSearchColumns(new Set());
        setSearchCriteria({});
        setFilteredResults(null);
        setAppState('loaded');
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Error Reading File",
          description: "There was a problem processing your Excel file. Please ensure it's a valid format.",
        });
      } finally {
        setIsLoadingFile(false);
        // Reset file input to allow re-uploading the same file
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = () => {
        setIsLoadingFile(false);
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
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
    setDisplayColumns(new Set());
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
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
      } else {
        newSet.delete(column);
      }
      return newSet;
    });
  };
  
  const handleSelectAllDisplayColumns = (checked: boolean) => {
    if (checked && data) {
      setDisplayColumns(new Set(data.headers));
    } else {
      setDisplayColumns(new Set());
    }
  };

  const handleRunQuery = useCallback(() => {
    if (!data) return;

    setIsProcessing(true);
    setTimeout(() => {
        const activeSearchCols = Object.keys(searchCriteria).filter(
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

        activeSearchCols.forEach(col => {
            const terms = searchCriteria[col].split('\n').map(t => t.trim()).filter(Boolean);
            searchTermsByCol[col] = terms;
            if (terms.length > maxTerms) {
                maxTerms = terms.length;
                longestSearchListCol = col;
            }
        });
        
        if (!longestSearchListCol) {
            setFilteredResults(data.rows);
            setIsProcessing(false);
            return;
        }

        const primarySearchTerms = searchTermsByCol[longestSearchListCol];
        const results: Row[] = [];

        primarySearchTerms.forEach(term => {
            const termLower = term.toLowerCase();
            const matchingRows = data.rows.filter(row => {
                // Check if the row matches the primary term
                const primaryColValue = String(row[longestSearchListCol!]).toLowerCase();
                if (!primaryColValue.startsWith(termLower)) {
                    return false;
                }

                // Check if the row also matches all other search criteria for the same "line" (optional)
                // This simplified version only filters based on the primary column term.
                // A more complex logic could try to match other columns based on index, but that's ambiguous.
                
                // For now, let's also check if other column criteria are met if they exist
                 const otherCols = activeSearchCols.filter(c => c !== longestSearchListCol);
                 return otherCols.every(col => {
                    const otherColTerms = searchCriteria[col].split('\n').map(t => t.trim().toLowerCase()).filter(Boolean);
                    const rowValue = String(row[col]).toLowerCase();
                    // If there are search terms for this other column, check if any of them match.
                    if (otherColTerms.length > 0) {
                        return otherColTerms.some(otherTerm => rowValue.startsWith(otherTerm));
                    }
                    // If no search terms for this other col, it's a match for this column
                    return true;
                 });
            });

            if (matchingRows.length > 0) {
                results.push(...matchingRows);
            } else {
                const notFoundRow: Row = { __isNotFound: 1 };
                data.headers.forEach(header => {
                    if (header === longestSearchListCol) {
                        notFoundRow[header] = term;
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
  }, [data, searchCriteria]);
  
  const orderedDisplayColumns = useMemo(() => {
    if (!data) return [];
    return data.headers.filter(h => displayColumns.has(h));
  }, [displayColumns, data]);

  const handleCopyResults = useCallback(() => {
    if (!filteredResults || orderedDisplayColumns.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Copy',
        description: 'There is no data in the results table to copy.',
      });
      return;
    }

    if (filteredResults.length === 0) {
       toast({
        title: 'No Data to Copy',
        description: 'The results table is empty.',
      });
      return;
    }

    const header = orderedDisplayColumns.join('\t');
    const rows = filteredResults.map(row => 
      orderedDisplayColumns.map(col => {
        // We no longer need to check for __isNotFound here.
        // We just get the value, or an empty string if it's null/undefined.
        return String(row[col] ?? '');
      }).join('\t')
    );
    
    const clipboardText = [header, ...rows].join('\n');

    navigator.clipboard.writeText(clipboardText).then(() => {
      toast({
        title: 'Copied to Clipboard',
        description: `${filteredResults.length} rows have been copied.`,
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy data to clipboard. See console for details.',
      });
    });
  }, [filteredResults, orderedDisplayColumns, toast]);


  if (appState === 'initial') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-slate-100 dark:to-slate-900">
        <Card className="w-full max-w-md text-center shadow-2xl animate-fade-in-up">
          <CardHeader>
            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
               <FileUp className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-bold mt-4">Excel Query Tool</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              Upload your Excel file to start querying and filtering your data instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
            <Button size="lg" className="w-full text-lg" onClick={handleUploadClick} disabled={isLoadingFile}>
              {isLoadingFile ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              Upload Excel File
            </Button>
          </CardContent>
          <CardFooter>
             <p className="text-xs text-muted-foreground w-full">
              Supports .xlsx, .xls, and .csv files. All processing is done in your browser.
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
          <h1 className="text-3xl font-bold">Excel Query Tool</h1>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <X className="w-4 h-4 mr-2" />
          Start Over
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Configuration Section */}
        <div className="xl:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Query Builder</CardTitle>
                    <CardDescription>Select columns, input criteria, and run your query.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListFilter className="w-5 h-5" /> Search &amp; Display</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Accordion type="multiple" defaultValue={['search-cols', 'display-cols']} className="w-full">
                                    <AccordionItem value="search-cols">
                                        <AccordionTrigger>Search Columns</AccordionTrigger>
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
                                        <AccordionTrigger>Display Columns</AccordionTrigger>
                                        <AccordionContent className="space-y-2">
                                            <div className="flex items-center space-x-2 pb-2 border-b">
                                                <Checkbox id="display-all" onCheckedChange={(checked) => handleSelectAllDisplayColumns(!!checked)} checked={displayColumns.size === data?.headers.length} />
                                                <Label htmlFor="display-all" className="font-semibold">Select All</Label>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto pr-4 pt-2">
                                                {data?.headers.map(col => (
                                                    <div key={`display-${col}`} className="flex items-center space-x-2 mb-2">
                                                        <Checkbox id={`display-${col}`} onCheckedChange={(checked) => handleDisplayColumnToggle(col, !!checked)} checked={displayColumns.has(col)} />
                                                        <Label htmlFor={`display-${col}`} className="font-normal cursor-pointer flex-1">{col}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5"/>Search Criteria</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4 overflow-y-auto">
                                {Array.from(searchColumns).length > 0 ? Array.from(searchColumns).map(col => (
                                    <div key={`criteria-${col}`} className="space-y-2">
                                        <Label htmlFor={`textarea-${col}`} className="font-semibold">{col}</Label>
                                        <Textarea
                                            id={`textarea-${col}`}
                                            placeholder={`Enter values for ${col}, one per line...`}
                                            value={searchCriteria[col] || ''}
                                            onChange={e => setSearchCriteria(prev => ({ ...prev, [col]: e.target.value }))}
                                            className="h-24 resize-y"
                                        />
                                    </div>
                                )) : <p className="text-sm text-muted-foreground pt-4 text-center">Select a search column to add criteria.</p>}
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
                                    Run Query
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>


        {/* Results Section */}
        <div className="xl:col-span-3">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2"><Columns className="w-6 h-6" /> Results</CardTitle>
                        <CardDescription>
                            {filteredResults ? `${filteredResults.length} matching records found.` : 'Your query results will appear here.'}
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleCopyResults} disabled={!filteredResults || filteredResults.length === 0}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Results
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {orderedDisplayColumns.map(col => (
                                        <TableHead key={`header-${col}`} className="font-bold">{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults && filteredResults.length > 0 ? (
                                    filteredResults.map((row, index) => (
                                        <TableRow key={index} className={cn(row.__isNotFound && "bg-red-500/20 hover:bg-red-500/30")}>
                                            {orderedDisplayColumns.map(col => (
                                                <TableCell key={`${index}-${col}`}>{String(row[col])}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={orderedDisplayColumns.length || 1} className="h-48 text-center text-muted-foreground">
                                            {filteredResults === null ? "Run a query to see your data." : "No results found."}
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
