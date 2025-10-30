
"use client";

import { useExcelMatcher, type Row } from '@/hooks/useExcelMatcher';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, HeartHandshake, Upload, AlertTriangle, Table as TableIcon, X } from "lucide-react";
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import DataSourceManager from '@/components/app/DataSourceManager';
import QueryBuilder from '@/components/app/QueryBuilder';
import ResultsDisplay from '@/components/app/ResultsDisplay';
import SecondaryDataDialog from '@/components/app/SecondaryDataDialog';
import PrimaryDataDialog from '@/components/app/PrimaryDataDialog';
import ScientificNotationConverterDialog from '@/components/app/ScientificNotationConverterDialog';


export default function Home() {
  const {
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
    primaryDisplayColumns,
    secondaryDisplayColumns,
    searchCriteria,
    secondarySearchCriteria,
    columnTypes,
    columnColors,
    primaryDisplayTemplates,
    secondaryDisplayTemplates,
    newPrimaryTemplateName,
    newSecondaryTemplateName,
    setNewPrimaryTemplateName,
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
    isPrimarySheetOpen,
    primaryResults,
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
    handleSecondaryRowClick,
    setIsSecondarySheetOpen,
    setIsPrimarySheetOpen,
    formatCell,
    isConvertDialogOpen,
    setIsConvertDialogOpen,
    columnsToConvert,
    fileTypeToConvert,
    setFileTypeToConvert,
    handleColumnToConvertToggle,
    handleConvertScientific,
    handleConvertAllScientific,
  } = useExcelMatcher();

  const handlePrimaryDisplayColumnToggle = (column: string, checked: boolean) => {
    handleDisplayColumnToggle(column, checked);
  };

  const handleSelectAllPrimaryDisplayColumns = (checked: boolean) => {
    handleSelectAllDisplayColumns(checked);
  }

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
          <DataSourceManager
            primaryDataHeaders={primaryDataHeaders}
            primaryFileName={primaryFileName}
            secondaryDataHeaders={secondaryDataHeaders}
            secondaryFileName={secondaryFileName}
            isLoadingFile={isLoadingFile}
            primaryFileInputRef={primaryFileInputRef}
            secondaryFileInputRef={secondaryFileInputRef}
            handleFileChange={handleFileChange}
            handleUploadClick={handleUploadClick}
            handleSwapFiles={handleSwapFiles}
            isLinkingEnabled={isLinkingEnabled}
            primaryLinkColumn={primaryLinkColumn}
            setPrimaryLinkColumn={setPrimaryLinkColumn}
            secondaryLinkColumn={secondaryLinkColumn}
            setSecondaryLinkColumn={setSecondaryLinkColumn}
            currentTheme={currentTheme}
            openConvertDialog={() => setIsConvertDialogOpen(true)}
            handleConvertAllScientific={handleConvertAllScientific}
          />
        </div>

        <div className="lg:col-span-3">
          <QueryBuilder
            primaryDataHeaders={primaryDataHeaders}
            secondaryDataHeaders={secondaryDataHeaders}
            searchColumns={searchColumns}
            secondarySearchColumns={secondarySearchColumns}
            displayColumns={primaryDisplayColumns}
            secondaryDisplayColumns={secondaryDisplayColumns}
            columnTypes={columnTypes}
            columnColors={columnColors}
            primaryDisplayTemplates={primaryDisplayTemplates}
            secondaryDisplayTemplates={secondaryDisplayTemplates}
            newPrimaryTemplateName={newPrimaryTemplateName}
            newSecondaryTemplateName={newSecondaryTemplateName}
            searchCriteria={searchCriteria}
            secondarySearchCriteria={secondarySearchCriteria}
            isPrimaryQueryInvalid={isPrimaryQueryInvalid}
            isSecondaryQueryInvalid={isSecondaryQueryInvalid}
            isProcessing={isProcessing}
            currentTheme={currentTheme}
            includeEmptyRowsInResults={includeEmptyRowsInResults}
            setIncludeEmptyRowsInResults={setIncludeEmptyRowsInResults}
            handleSearchColumnToggle={handleSearchColumnToggle}
            handleSecondarySearchColumnToggle={handleSecondarySearchColumnToggle}
            handleSelectAllDisplayColumns={handleSelectAllDisplayColumns}
            handleSelectAllSecondaryDisplayColumns={handleSelectAllSecondaryDisplayColumns}
            handleDisplayColumnToggle={handleDisplayColumnToggle}
            handleSecondaryDisplayColumnToggle={handleSecondaryDisplayColumnToggle}
            moveDisplayColumn={moveDisplayColumn}
            moveSecondaryDisplayColumn={moveSecondaryDisplayColumn}
            handleColumnTypeChange={handleColumnTypeChange}
            handleColumnColorChange={handleColumnColorChange}
            setNewPrimaryTemplateName={setNewPrimaryTemplateName}
            setNewSecondaryTemplateName={setNewSecondaryTemplateName}
            handleSaveTemplate={handleSaveTemplate}
            handleLoadTemplate={handleLoadTemplate}
            handleDeleteTemplate={handleDeleteTemplate}
            handleSearchCriteriaChange={handleSearchCriteriaChange}
            handleSearchOperatorChange={handleSearchOperatorChange}
            handleRunPrimaryQuery={handleRunPrimaryQuery}
            handleRunSecondaryQuery={handleRunSecondaryQuery}
          />
        </div>

        <div className="lg:col-span-3">
          <ResultsDisplay
            filteredResults={filteredResults}
            secondaryFilteredResults={secondaryFilteredResults}
            displayColumns={primaryDisplayColumns}
            secondaryDisplayColumns={secondaryDisplayColumns}
            columnTypes={columnTypes}
            columnColors={columnColors}
            isLinkingEnabled={isLinkingEnabled}
            primaryLinkColumn={primaryLinkColumn}
            secondaryLinkColumn={secondaryLinkColumn}
            handleCopyResults={handleCopyResults}
            handleRowClick={handleRowClick}
            handleSecondaryRowClick={handleSecondaryRowClick}
            isProcessing={isProcessing}
            formatCell={formatCell}
          />
        </div>
      </div>
      
      <SecondaryDataDialog
        isOpen={isSecondarySheetOpen}
        onOpenChange={setIsSecondarySheetOpen}
        currentLookupValue={currentLookupValue}
        secondaryDataHeaders={secondaryDataHeaders}
        secondaryResults={secondaryResults}
        secondaryDisplayColumns={secondaryDisplayColumns}
        secondaryDisplayTemplates={secondaryDisplayTemplates}
        newSecondaryTemplateName={newSecondaryTemplateName}
        currentTheme={currentTheme}
        handleSecondaryDisplayColumnToggle={handleSecondaryDisplayColumnToggle}
        handleSelectAllSecondaryDisplayColumns={handleSelectAllSecondaryDisplayColumns}
        setNewSecondaryTemplateName={setNewSecondaryTemplateName}
        handleSaveTemplate={handleSaveTemplate}
        handleLoadTemplate={handleLoadTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        handleCopyResults={handleCopyResults}
        formatCell={formatCell}
        columnTypes={columnTypes}
      />

      <PrimaryDataDialog
        isOpen={isPrimarySheetOpen}
        onOpenChange={setIsPrimarySheetOpen}
        currentLookupValue={currentLookupValue}
        primaryDataHeaders={primaryDataHeaders}
        primaryResults={primaryResults}
        primaryDisplayColumns={primaryDisplayColumns}
        primaryDisplayTemplates={primaryDisplayTemplates}
        newPrimaryTemplateName={newPrimaryTemplateName}
        currentTheme={currentTheme}
        handlePrimaryDisplayColumnToggle={handlePrimaryDisplayColumnToggle}
        handleSelectAllPrimaryDisplayColumns={handleSelectAllPrimaryDisplayColumns}
        setNewPrimaryTemplateName={setNewPrimaryTemplateName}
        handleSaveTemplate={handleSaveTemplate}
        handleLoadTemplate={handleLoadTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        handleCopyResults={handleCopyResults}
        formatCell={formatCell}
        columnTypes={columnTypes}
      />

      <ScientificNotationConverterDialog
        isOpen={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        isProcessing={isProcessing}
        primaryDataHeaders={primaryDataHeaders}
        secondaryDataHeaders={secondaryDataHeaders}
        columnsToConvert={columnsToConvert}
        fileTypeToConvert={fileTypeToConvert}
        setFileTypeToConvert={setFileTypeToConvert}
        handleColumnToConvertToggle={handleColumnToConvertToggle}
        handleConvertScientific={handleConvertScientific}
      />
    </main>
  );
}
