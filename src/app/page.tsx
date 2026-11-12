
"use client";

import { useState } from 'react';
import { useExcelMatcher, type Row } from '@/hooks/useExcelMatcher';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, HeartHandshake, Upload, UploadCloud, AlertTriangle, Table as TableIcon, X, Info, HardDrive } from "lucide-react";
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import DataSourceManager from '@/components/app/DataSourceManager';
import QueryBuilder from '@/components/app/QueryBuilder';
import ResultsDisplay from '@/components/app/ResultsDisplay';
import SecondaryDataDialog from '@/components/app/SecondaryDataDialog';
import PrimaryDataDialog from '@/components/app/PrimaryDataDialog';
import ScientificNotationConverterDialog from '@/components/app/ScientificNotationConverterDialog';
import AppInfoDialog from '@/components/app/AppInfoDialog';
import UploadValidationDialog from '@/components/app/UploadValidationDialog';


export default function Home() {
  const {
    appState,
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
    isProcessing,
    currentTheme,
    selectedPrimaryRow,
    primaryRowCount,
    secondaryRowCount,
    primaryAppendIdColumn,
    setPrimaryAppendIdColumn,
    secondaryAppendIdColumn,
    setSecondaryAppendIdColumn,
    currentLookupValue,
    isSecondarySheetOpen,
    isPrimarySheetOpen,
    primaryResults,
    secondaryResults,
    includeEmptyRowsInResults,
    handleIncludeEmptyRowsToggle,
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
    handleClearSearchCriteria,
    handleCopyResults,
    handleExportExcel,
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
    isValidationDialogOpen,
    setIsValidationDialogOpen,
    validationMismatchInfo,
    handleConfirmUpload,
    handleCancelUpload,
    activeTab,
    setActiveTab,
    storageEstimate,
    handleExportBackup,
    handleImportBackup,
    uploadProgress,
    backupProgress,
    swapProgress,
    isRestoringStorage,
    restoreStatus,
  } = useExcelMatcher();

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handlePrimaryDisplayColumnToggle = (column: string, checked: boolean) => {
    handleDisplayColumnToggle(column, checked);
  };

  const handleSelectAllPrimaryDisplayColumns = (checked: boolean) => {
    handleSelectAllDisplayColumns(checked);
  }

  if (isRestoringStorage) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md text-center shadow-2xl border-0 bg-card/80 dark:bg-card/50 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-3">
              <Loader2 className="w-9 h-9 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Memuat RekonMatch</CardTitle>
            <CardDescription className="text-sm text-foreground/80 font-medium pt-1 min-h-[24px]">
              {restoreStatus}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
              <div className="h-full bg-primary animate-pulse w-full rounded-full" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              <span>Memulihkan data tersimpan dari IndexedDB lokal...</span>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (appState === 'initial') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="absolute top-6 right-6 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)} aria-label="Tentang Aplikasi">
                <Info className="h-5 w-5" />
            </Button>
            <ThemeSwitcher />
        </div>
        <Card className="w-full max-w-lg text-center shadow-2xl animate-fade-in-up border-0 bg-card/80 dark:bg-card/50 backdrop-blur-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
              {currentTheme === 'pink' ? <Sparkles className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
            </div>
            <CardTitle className="text-4xl font-bold mt-2">RekonMatch</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">Ribet pake rumus vlookup, match dan lainnya? unggah file Excel mu disini untuk pencarian yang lebih mudah.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive" className="text-left bg-amber-500/10 border-amber-500/30 text-amber-200">
                <AlertTriangle className="h-4 w-4 !text-amber-500" />
                <AlertTitle className="text-amber-400 font-semibold text-sm">Penting</AlertTitle>
                <AlertDescription className="text-amber-400/80">Pastikan header atau judul kolom data Anda berada pada <strong className="font-semibold text-amber-300">baris pertama</strong> di file Excel.</AlertDescription>
            </Alert>
            <input type="file" ref={primaryFileInputRef} onChange={(e) => handleFileChange(e, 'primary')} className="hidden" accept=".xlsx, .xls, .csv" />
            {isLoadingFile === 'primary' && uploadProgress ? (
              <div className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border/60 animate-in fade-in duration-300 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    <span>{uploadProgress.stage}</span>
                  </span>
                  <span className="font-mono font-bold text-primary">{uploadProgress.percent}%</span>
                </div>
                <Progress value={uploadProgress.percent} className="h-2.5" />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="truncate pr-2">{uploadProgress.detail}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 shrink-0">Proses Lokal</span>
                </div>
              </div>
            ) : backupProgress ? (
              <div className="space-y-3 p-4 bg-muted/40 rounded-xl border border-primary/25 animate-in fade-in duration-300 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    <span>{backupProgress.stage}</span>
                  </span>
                  <span className="font-mono font-bold text-primary">{backupProgress.percent}%</span>
                </div>
                <Progress value={backupProgress.percent} className="h-2.5" />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="truncate pr-2">{backupProgress.detail}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 shrink-0">Pulihkan Cadangan</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button size="lg" className="w-full text-lg py-7" onClick={() => handleUploadClick('primary')} disabled={!!isLoadingFile || !!backupProgress}>
                  {currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-6 w-6" /> : <Upload className="mr-2 h-6 w-6" />}
                  Pilih File Excel Utama
                </Button>
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept=".rekon,.json"
                    onChange={handleImportBackup}
                    disabled={!!isLoadingFile || !!backupProgress}
                    className="hidden"
                  />
                  <span className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-medium border border-input bg-background/60 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors shadow-sm">
                    <UploadCloud className="w-4 h-4 text-primary" />
                    Pulihkan dari Berkas Cadangan (.rekon)
                  </span>
                </label>
              </div>
            )}
          </CardContent>
          <CardFooter><p className="text-xs text-muted-foreground w-full">Mendukung .xlsx, .xls, .csv, serta pemulihan cadangan .rekon. Semua proses berjalan di browser Anda.</p></CardFooter>
        </Card>
        <AppInfoDialog isOpen={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen} />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><TableIcon className="w-8 h-8 text-primary" /><h1 className="text-3xl font-bold">RekonMatch</h1></div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)} aria-label="Tentang Aplikasi">
                <Info className="h-5 w-5" />
            </Button>
            <ThemeSwitcher />
            <Button variant="outline" onClick={() => setIsResetConfirmOpen(true)}><X className="w-4 h-4 mr-2" />Mulai Ulang</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <DataSourceManager
            primaryDataHeaders={primaryDataHeaders}
            primaryFileName={primaryFileName}
            primaryFileList={primaryFileList}
            secondaryDataHeaders={secondaryDataHeaders}
            secondaryFileName={secondaryFileName}
            secondaryFileList={secondaryFileList}
            primaryRowCount={primaryRowCount}
            secondaryRowCount={secondaryRowCount}
            primaryAppendIdColumn={primaryAppendIdColumn}
            setPrimaryAppendIdColumn={setPrimaryAppendIdColumn}
            secondaryAppendIdColumn={secondaryAppendIdColumn}
            setSecondaryAppendIdColumn={setSecondaryAppendIdColumn}
            isLoadingFile={isLoadingFile}
            uploadProgress={uploadProgress}
            backupProgress={backupProgress}
            swapProgress={swapProgress}
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
            handleExportBackup={handleExportBackup}
            handleImportBackup={handleImportBackup}
            storageEstimate={storageEstimate}
          />
        </div>

        <div className="lg:col-span-3">
          <QueryBuilder
            activeTab={activeTab}
            setActiveTab={setActiveTab}
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
            isProcessing={isProcessing}
            currentTheme={currentTheme}
            includeEmptyRowsInResults={includeEmptyRowsInResults}
            handleIncludeEmptyRowsToggle={handleIncludeEmptyRowsToggle}
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
            handleClearSearchCriteria={handleClearSearchCriteria}
          />
        </div>

        <div className="lg:col-span-3">
          <ResultsDisplay
            activeTab={activeTab}
            setActiveTab={setActiveTab}
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
            handleExportExcel={handleExportExcel}
            handleRowClick={handleRowClick}
            handleSecondaryRowClick={handleSecondaryRowClick}
            isProcessing={isProcessing}
            formatCell={formatCell}
            secondaryDataHeaders={secondaryDataHeaders}
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

      <AppInfoDialog isOpen={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen} />

      <UploadValidationDialog
        isOpen={isValidationDialogOpen}
        onOpenChange={setIsValidationDialogOpen}
        mismatchInfo={validationMismatchInfo}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Hapus Semua Data & Mulai Ulang?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm">
              Tindakan ini akan menghapus <strong>seluruh data Excel utama, data sekunder, riwayat pencarian, dan penataan kolom</strong> dari penyimpanan lokal peramban Anda. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsResetConfirmOpen(false);
                handleReset();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Hapus & Mulai Ulang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
