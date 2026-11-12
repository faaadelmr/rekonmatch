
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { type UploadProgress, type BackupProgress, type SwapProgress } from "@/hooks/useExcelMatcher";
import { Loader2, FileText, FileCheck2, ArrowRightLeft, Upload, HeartHandshake, Flower2, Link2, Fingerprint, HardDrive, Wand2, ShieldCheck, Download, UploadCloud, Layers, Files } from "lucide-react";

interface DataSourceManagerProps {
  primaryDataHeaders: string[];
  primaryFileName: string;
  primaryFileList?: string[];
  secondaryDataHeaders: string[];
  secondaryFileName: string;
  secondaryFileList?: string[];
  primaryRowCount?: number;
  secondaryRowCount?: number;
  primaryAppendIdColumn: string;
  setPrimaryAppendIdColumn: (value: string) => void;
  secondaryAppendIdColumn: string;
  setSecondaryAppendIdColumn: (value: string) => void;
  isLoadingFile: 'primary' | 'secondary' | false;
  uploadProgress?: UploadProgress | null;
  backupProgress?: BackupProgress | null;
  swapProgress?: SwapProgress | null;
  primaryFileInputRef: React.RefObject<HTMLInputElement>;
  secondaryFileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>, fileType: 'primary' | 'secondary') => void;
  handleUploadClick: (fileType: 'primary' | 'secondary', action?: 'replace' | 'append') => void;
  handleSwapFiles: () => void;
  isLinkingEnabled: boolean;
  primaryLinkColumn: string;
  setPrimaryLinkColumn: (value: string) => void;
  secondaryLinkColumn: string;
  setSecondaryLinkColumn: (value: string) => void;
  currentTheme: string;
  openConvertDialog: () => void;
  handleConvertAllScientific: () => Promise<void>;
  handleExportBackup?: () => void;
  handleImportBackup?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  storageEstimate?: {
    usageMB: number;
    quotaMB: number;
    percent: number;
    isPersisted?: boolean;
  } | null;
}

export default function DataSourceManager({
  primaryDataHeaders,
  primaryFileName,
  primaryFileList = [],
  secondaryDataHeaders,
  secondaryFileName,
  secondaryFileList = [],
  primaryRowCount = 0,
  secondaryRowCount = 0,
  primaryAppendIdColumn,
  setPrimaryAppendIdColumn,
  secondaryAppendIdColumn,
  setSecondaryAppendIdColumn,
  isLoadingFile,
  uploadProgress,
  backupProgress,
  swapProgress,
  primaryFileInputRef,
  secondaryFileInputRef,
  handleFileChange,
  handleUploadClick,
  handleSwapFiles,
  isLinkingEnabled,
  primaryLinkColumn,
  setPrimaryLinkColumn,
  secondaryLinkColumn,
  setSecondaryLinkColumn,
  currentTheme,
  openConvertDialog,
  handleExportBackup,
  handleImportBackup,
  storageEstimate
}: DataSourceManagerProps) {
  const [isBackupConfirmOpen, setIsBackupConfirmOpen] = useState(false);
  const hasPrimaryData = primaryDataHeaders.length > 0;
  const hasSecondaryData = secondaryDataHeaders.length > 0;
  const isBusy = Boolean(isLoadingFile || backupProgress || swapProgress);
  const activeFooterProgress = swapProgress
    ? { ...swapProgress, badge: 'Tukar Data' }
    : backupProgress
    ? { ...backupProgress, badge: backupProgress.mode === 'export' ? 'Cadangkan Data' : 'Pulihkan Data' }
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-2xl">1. Sumber Data</CardTitle>
          <CardDescription>Unggah file, tukar peran jika perlu, dan hubungkan data Anda.</CardDescription>
        </div>
        {(hasPrimaryData || hasSecondaryData) && (
          <Button variant="outline" size="sm" onClick={openConvertDialog} className="flex items-center gap-1.5 self-start sm:self-auto">
            <Wand2 className="w-4 h-4 text-primary" />
            <span>Konversi Notasi Ilmiah</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-6">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Utama</CardTitle>
              {hasPrimaryData ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-xs text-muted-foreground font-medium truncate max-w-[170px] sm:max-w-[220px]" title={primaryFileList[0] || primaryFileName}>
                    {primaryFileList[0] || primaryFileName}
                  </span>
                  {primaryFileList.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/25 transition-colors cursor-pointer"
                          title="Klik untuk melihat daftar semua berkas yang digabungkan"
                        >
                          <Layers className="w-3 h-3" />
                          +{primaryFileList.length - 1} file lain
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 text-xs" align="start">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Files className="w-4 h-4 text-primary" /> Berkas Tergabung ({primaryFileList.length})
                          </span>
                          <span className="text-[10px] text-muted-foreground">{primaryRowCount.toLocaleString('id-ID')} baris total</span>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {primaryFileList.map((fname, idx) => (
                            <div key={`p-file-${idx}`} className="flex items-start gap-2 p-1.5 rounded bg-muted/40 text-muted-foreground">
                              <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border text-foreground/80 shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="break-all font-medium text-foreground/90 leading-tight">
                                {fname}
                                {idx === 0 && <span className="ml-1.5 text-[10px] text-primary font-normal">(Berkas Utama)</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1.5 leading-normal">
                          Data dari seluruh berkas di atas telah disatukan ke dalam memori kerja.
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}
                  <span className="text-xs text-muted-foreground">({primaryRowCount.toLocaleString('id-ID')} baris)</span>
                </div>
              ) : (
                <CardDescription className="text-xs text-muted-foreground">
                  File yang akan difilter.
                </CardDescription>
              )}
            </div>
            {hasPrimaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}
          </CardHeader>
          <CardContent>
            <input type="file" ref={primaryFileInputRef} onChange={(e) => handleFileChange(e, 'primary')} className="hidden" accept=".xlsx, .xls, .csv" />
            
            {hasPrimaryData && (
              <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="primary-append-id" className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Fingerprint className="w-3 h-3 text-primary" /> Kolom ID Update (Opsional)
                </Label>
                <Select 
                  value={primaryAppendIdColumn || "none"} 
                  onValueChange={(val) => setPrimaryAppendIdColumn(val === "none" ? "" : val)}
                >
                  <SelectTrigger id="primary-append-id" className="h-9 text-xs bg-muted/50">
                    <SelectValue placeholder="Pilih kolom ID..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa ID (Saring Baris Duplikat)</SelectItem>
                    {primaryDataHeaders.filter(h => h).map((h, i) => (
                      <SelectItem key={`p-id-${h}-${i}`} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Jika dipilih, data dengan ID yang sama akan <strong>diperbarui</strong>, bukan ditambah sebagai baris baru.
                </p>
              </div>
            )}

            {isLoadingFile === 'primary' && uploadProgress?.fileType === 'primary' ? (
              <div className="space-y-2.5 p-3.5 bg-muted/40 rounded-lg border border-border/60 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-1.5 truncate pr-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    <span className="truncate">{uploadProgress.stage}</span>
                  </span>
                  <span className="font-mono font-semibold text-primary shrink-0">{uploadProgress.percent}%</span>
                </div>
                <Progress value={uploadProgress.percent} className="h-2" />
                <p className="text-[11px] text-muted-foreground truncate">{uploadProgress.detail}</p>
              </div>
            ) : !hasPrimaryData ? (
              <Button className="w-full shadow-sm" onClick={() => handleUploadClick('primary', 'replace')} disabled={isBusy}>
                {isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}
                Pilih File Utama
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button className="w-full flex-1" variant="outline" onClick={() => handleUploadClick('primary', 'replace')} disabled={isBusy}>
                  Ganti File
                </Button>
                <Button 
                  className="w-full flex-1" 
                  onClick={() => handleUploadClick('primary', 'append')} 
                  disabled={isBusy}
                  title="Tambah data (Mendukung pemilihan banyak file Excel sekaligus dengan Ctrl/Shift)"
                >
                  {isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Tambah Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center mt-8 gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapFiles}
            disabled={!isLinkingEnabled || isBusy}
            aria-label="Tukar file utama dan sekunder"
            className={`h-12 w-12 rounded-full ${swapProgress ? 'border-primary/50 bg-primary/5' : ''}`}
          >
            {swapProgress ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ArrowRightLeft className="w-5 h-5" />}
          </Button>
          {swapProgress && (
            <span className="text-[11px] font-mono font-semibold text-primary whitespace-nowrap">
              {swapProgress.percent}%
            </span>
          )}
        </div>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Sekunder</CardTitle>
              {hasSecondaryData ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-xs text-muted-foreground font-medium truncate max-w-[170px] sm:max-w-[220px]" title={secondaryFileList[0] || secondaryFileName}>
                    {secondaryFileList[0] || secondaryFileName}
                  </span>
                  {secondaryFileList.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/25 transition-colors cursor-pointer"
                          title="Klik untuk melihat daftar semua berkas yang digabungkan"
                        >
                          <Layers className="w-3 h-3" />
                          +{secondaryFileList.length - 1} file lain
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 text-xs" align="start">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Files className="w-4 h-4 text-primary" /> Berkas Tergabung ({secondaryFileList.length})
                          </span>
                          <span className="text-[10px] text-muted-foreground">{secondaryRowCount.toLocaleString('id-ID')} baris total</span>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {secondaryFileList.map((fname, idx) => (
                            <div key={`s-file-${idx}`} className="flex items-start gap-2 p-1.5 rounded bg-muted/40 text-muted-foreground">
                              <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border text-foreground/80 shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="break-all font-medium text-foreground/90 leading-tight">
                                {fname}
                                {idx === 0 && <span className="ml-1.5 text-[10px] text-primary font-normal">(Berkas Utama)</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1.5 leading-normal">
                          Data dari seluruh berkas di atas telah disatukan ke dalam memori kerja.
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}
                  <span className="text-xs text-muted-foreground">({secondaryRowCount.toLocaleString('id-ID')} baris)</span>
                </div>
              ) : (
                <CardDescription className="text-xs text-muted-foreground">
                  File untuk data terkait.
                </CardDescription>
              )}
            </div>
            {hasSecondaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}
          </CardHeader>
          <CardContent>
            <input type="file" ref={secondaryFileInputRef} onChange={(e) => handleFileChange(e, 'secondary')} className="hidden" accept=".xlsx, .xls, .csv" />

            {hasSecondaryData && (
              <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="secondary-append-id" className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Fingerprint className="w-3 h-3 text-primary" /> Kolom ID Update (Opsional)
                </Label>
                <Select 
                  value={secondaryAppendIdColumn || "none"} 
                  onValueChange={(val) => setSecondaryAppendIdColumn(val === "none" ? "" : val)}
                >
                  <SelectTrigger id="secondary-append-id" className="h-9 text-xs bg-muted/50">
                    <SelectValue placeholder="Pilih kolom ID..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa ID (Saring Baris Duplikat)</SelectItem>
                    {secondaryDataHeaders.filter(h => h).map((h, i) => (
                      <SelectItem key={`s-id-${h}-${i}`} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Jika dipilih, data dengan ID yang sama akan diperbarui, bukan ditambah sebagai baris baru.
                </p>
              </div>
            )}

            {isLoadingFile === 'secondary' && uploadProgress?.fileType === 'secondary' ? (
              <div className="space-y-2.5 p-3.5 bg-muted/40 rounded-lg border border-border/60 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-1.5 truncate pr-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    <span className="truncate">{uploadProgress.stage}</span>
                  </span>
                  <span className="font-mono font-semibold text-primary shrink-0">{uploadProgress.percent}%</span>
                </div>
                <Progress value={uploadProgress.percent} className="h-2" />
                <p className="text-[11px] text-muted-foreground truncate">{uploadProgress.detail}</p>
              </div>
            ) : !hasSecondaryData ? (
              <Button className="w-full shadow-sm" onClick={() => handleUploadClick('secondary', 'replace')} disabled={!hasPrimaryData || isBusy}>
                {isLoadingFile === 'secondary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}
                Pilih File Sekunder
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button className="w-full flex-1" variant="outline" onClick={() => handleUploadClick('secondary', 'replace')} disabled={isBusy}>
                  Ganti File
                </Button>
                <Button 
                  className="w-full flex-1" 
                  onClick={() => handleUploadClick('secondary', 'append')} 
                  disabled={isBusy}
                  title="Tambah data (Mendukung pemilihan banyak file Excel sekaligus dengan Ctrl/Shift)"
                >
                  {isLoadingFile === 'secondary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Tambah Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>

      {isLinkingEnabled && (
        <>
          <Separator />
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {currentTheme === 'pink' ? <Flower2 className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}Hubungkan Data
            </CardTitle>
            <CardDescription>Pilih kolom kunci dari setiap file untuk menghubungkan data.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="primary-link-col">Kolom Kunci Data Utama</Label>
              <Select value={primaryLinkColumn} onValueChange={setPrimaryLinkColumn}>
                <SelectTrigger id="primary-link-col"><SelectValue placeholder="Pilih kolom..." /></SelectTrigger>
                <SelectContent>
                  {primaryDataHeaders.filter(h => h).map((h, i) => <SelectItem key={`p-link-${h}-${i}`} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="secondary-link-col">Kolom Kunci Data Sekunder</Label>
              <Select value={secondaryLinkColumn} onValueChange={setSecondaryLinkColumn}>
                <SelectTrigger id="secondary-link-col"><SelectValue placeholder="Pilih kolom..." /></SelectTrigger>
                <SelectContent>
                  {secondaryDataHeaders.filter(h => h).map((h, i) => <SelectItem key={`s-link-${h}-${i}`} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </>
      )}
      {(storageEstimate || handleExportBackup || handleImportBackup || activeFooterProgress) && (
        <>
          <Separator />
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            {activeFooterProgress ? (
              <div className="w-full space-y-2 p-3 bg-background/80 rounded-lg border border-primary/25 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate pr-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    <span className="truncate">{activeFooterProgress.stage}</span>
                  </span>
                  <span className="font-mono font-bold text-primary shrink-0">{activeFooterProgress.percent}%</span>
                </div>
                <Progress value={activeFooterProgress.percent} className="h-2" />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span className="truncate pr-2">{activeFooterProgress.detail}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 shrink-0">
                    {activeFooterProgress.badge}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {storageEstimate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HardDrive className="h-4 w-4 text-primary" /> Penggunaan Lokal (IndexedDB)
                    </span>
                    <span className="font-mono">
                      {storageEstimate.usageMB} MB / {storageEstimate.quotaMB} MB ({storageEstimate.percent}%)
                    </span>
                    {storageEstimate.isPersisted && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium" title="Penyimpanan telah dikunci permanen oleh peramban (kebal eviksi saat disk menipis).">
                        <ShieldCheck className="h-3.5 w-3.5" /> Kebal Eviksi
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-medium">
                    <HardDrive className="h-4 w-4 text-primary" /> Penyimpanan Lokal & Cadangan
                  </div>
                )}
                {(handleExportBackup || handleImportBackup) && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {handleExportBackup && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBackupConfirmOpen(true)}
                        disabled={(!hasPrimaryData && !hasSecondaryData) || isBusy}
                        className="h-8 text-xs flex items-center gap-1.5"
                        title="Unduh cadangan data dan setelan ke berkas .rekon"
                      >
                        <Download className="h-3.5 w-3.5" /> Cadangkan
                      </Button>
                    )}
                    {handleImportBackup && (
                      <label
                        className={isBusy ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        title="Pulihkan data dari berkas cadangan .rekon atau .json"
                      >
                        <input
                          type="file"
                          accept=".rekon,.json"
                          onChange={handleImportBackup}
                          disabled={isBusy}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors shadow-sm">
                          <UploadCloud className="h-3.5 w-3.5" /> Pulihkan
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <AlertDialog open={isBackupConfirmOpen} onOpenChange={setIsBackupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Konfirmasi Unduh Cadangan Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                <p>
                  Seluruh data kerja dan pengaturan Anda akan dikemas serta dikompresi (Gzip) ke dalam satu berkas cadangan <strong>.rekon</strong> lalu diunduh ke komputer Anda.
                </p>
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Data Utama:</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[240px]">
                      {hasPrimaryData
                        ? `${primaryFileList[0] || primaryFileName}${primaryFileList.length > 1 ? ` (+${primaryFileList.length - 1})` : ''} (${primaryRowCount.toLocaleString('id-ID')} baris)`
                        : 'Kosong'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Data Sekunder:</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[240px]">
                      {hasSecondaryData
                        ? `${secondaryFileList[0] || secondaryFileName}${secondaryFileList.length > 1 ? ` (+${secondaryFileList.length - 1})` : ''} (${secondaryRowCount.toLocaleString('id-ID')} baris)`
                        : 'Kosong'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Pengaturan:</span>
                    <span className="font-medium text-foreground text-right">Kriteria, tipe kolom, warna & template</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/90">
                  Proses pengemasan berjalan lokal secara bertahap agar aman untuk puluhan ribu baris. Mohon tunggu hingga unduhan dimulai.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsBackupConfirmOpen(false);
                handleExportBackup?.();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Ya, Cadangkan & Unduh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
