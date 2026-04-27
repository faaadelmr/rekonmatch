
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, FileCheck2, ArrowRightLeft, Upload, HeartHandshake, Flower2, Link2 } from "lucide-react";

interface DataSourceManagerProps {
  primaryDataHeaders: string[];
  primaryFileName: string;
  secondaryDataHeaders: string[];
  secondaryFileName: string;
  primaryRowCount?: number;
  secondaryRowCount?: number;
  isLoadingFile: 'primary' | 'secondary' | false;
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
}

export default function DataSourceManager({
  primaryDataHeaders,
  primaryFileName,
  secondaryDataHeaders,
  secondaryFileName,
  primaryRowCount = 0,
  secondaryRowCount = 0,
  isLoadingFile,
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
  currentTheme
}: DataSourceManagerProps) {
  const hasPrimaryData = primaryDataHeaders.length > 0;
  const hasSecondaryData = secondaryDataHeaders.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">1. Sumber Data</CardTitle>
        <CardDescription>Unggah file, tukar peran jika perlu, dan hubungkan data Anda.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-6">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Utama</CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate" title={primaryFileName}>
                {primaryFileName ? `${primaryFileName} (${primaryRowCount} baris)` : 'File yang akan difilter.'}
              </CardDescription>
            </div>
            {hasPrimaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}
          </CardHeader>
          <CardContent>
            <input type="file" ref={primaryFileInputRef} onChange={(e) => handleFileChange(e, 'primary')} className="hidden" accept=".xlsx, .xls, .csv" />
            {!hasPrimaryData ? (
              <Button className="w-full" onClick={() => handleUploadClick('primary', 'replace')} disabled={!!isLoadingFile}>
                {isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}
                Pilih File Utama
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button className="w-full flex-1" variant="outline" onClick={() => handleUploadClick('primary', 'replace')} disabled={!!isLoadingFile}>
                  Ganti File
                </Button>
                <Button className="w-full flex-1" onClick={() => handleUploadClick('primary', 'append')} disabled={!!isLoadingFile}>
                  {isLoadingFile === 'primary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Tambah Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center mt-8">
          <Button variant="outline" size="icon" onClick={handleSwapFiles} disabled={!isLinkingEnabled} aria-label="Tukar file utama dan sekunder" className="h-12 w-12 rounded-full">
            <ArrowRightLeft className="w-5 h-5" />
          </Button>
        </div>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Data Sekunder</CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate" title={secondaryFileName}>
                {secondaryFileName ? `${secondaryFileName} (${secondaryRowCount} baris)` : 'File untuk data terkait.'}
              </CardDescription>
            </div>
            {hasSecondaryData && <FileCheck2 className="w-5 h-5 text-green-500" />}
          </CardHeader>
          <CardContent>
            <input type="file" ref={secondaryFileInputRef} onChange={(e) => handleFileChange(e, 'secondary')} className="hidden" accept=".xlsx, .xls, .csv" />
            {!hasSecondaryData ? (
              <Button className="w-full" onClick={() => handleUploadClick('secondary', 'replace')} disabled={!hasPrimaryData || !!isLoadingFile}>
                {isLoadingFile === 'secondary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentTheme === 'pink' ? <HeartHandshake className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}
                Pilih File Sekunder
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button className="w-full flex-1" variant="outline" onClick={() => handleUploadClick('secondary', 'replace')} disabled={!!isLoadingFile}>
                  Ganti File
                </Button>
                <Button className="w-full flex-1" onClick={() => handleUploadClick('secondary', 'append')} disabled={!!isLoadingFile}>
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
    </Card>
  );
}
