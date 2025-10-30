
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Settings, Save, Heart, CheckSquare, Trash2 } from "lucide-react";
import { type Row } from "@/lib/mock-data";
import { type ColumnType } from "@/hooks/useExcelMatcher";

interface PrimaryDataDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentLookupValue: string | number;
  primaryDataHeaders: string[];
  primaryResults: Row[];
  primaryDisplayColumns: string[];
  primaryDisplayTemplates: Record<string, string[]>;
  newPrimaryTemplateName: string;
  currentTheme: string;
  handlePrimaryDisplayColumnToggle: (column: string, checked: boolean) => void;
  handleSelectAllPrimaryDisplayColumns: (checked: boolean) => void;
  setNewPrimaryTemplateName: (name: string) => void;
  handleSaveTemplate: (type: 'primary' | 'secondary') => void;
  handleLoadTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleDeleteTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleCopyResults: (dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => void;
  formatCell: (value: any, type?: ColumnType) => string;
  columnTypes: Record<string, ColumnType>;
}

export default function PrimaryDataDialog({
  isOpen,
  onOpenChange,
  currentLookupValue,
  primaryDataHeaders,
  primaryResults,
  primaryDisplayColumns,
  primaryDisplayTemplates,
  newPrimaryTemplateName,
  currentTheme,
  handlePrimaryDisplayColumnToggle,
  handleSelectAllPrimaryDisplayColumns,
  setNewPrimaryTemplateName,
  handleSaveTemplate,
  handleLoadTemplate,
  handleDeleteTemplate,
  handleCopyResults,
  formatCell,
  columnTypes
}: PrimaryDataDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-full max-h-full flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Hasil Data Utama</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Menampilkan data terkait untuk: <code className="bg-muted px-2 py-1 rounded-md font-semibold">{String(currentLookupValue)}</code>
          </p>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 min-h-0 overflow-hidden p-6">
          <aside className="hidden md:flex flex-col gap-4 border-r pr-6 overflow-y-auto">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5"/>Opsi Tampilan</h3>
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox id="primary-display-all" onCheckedChange={(checked) => handleSelectAllPrimaryDisplayColumns(!!checked)} checked={primaryDataHeaders ? primaryDisplayColumns.length === primaryDataHeaders.length : false} />
              <Label htmlFor="primary-display-all" className="font-semibold">Pilih Semua</Label>
            </div>
            <div className="flex-1 space-y-2 pr-2">
              {primaryDataHeaders.map((col, index) => (
                <div key={`primary-display-${col}-${index}`} className="flex items-center space-x-2">
                  <Checkbox id={`primary-display-${col}-${index}`} onCheckedChange={(checked) => handlePrimaryDisplayColumnToggle(col, !!checked)} checked={primaryDisplayColumns.includes(col)} />
                  <Label htmlFor={`primary-display-${col}-${index}`} className="font-normal cursor-pointer flex-1 text-sm">{col}</Label>
                </div>
              ))}
            </div>
            <Separator />
             <div className="space-y-4">
                <div><Label className="font-semibold text-sm">Template Tampilan Utama</Label></div>
                <div className="flex gap-2">
                  <Input placeholder="Nama template baru..." value={newPrimaryTemplateName} onChange={e => setNewPrimaryTemplateName(e.target.value)} />
                  <Button onClick={() => handleSaveTemplate('primary')}>{currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}</Button>
                </div>
                {Object.keys(primaryDisplayTemplates).length > 0 && (
                  <div className="space-y-2">
                    {Object.keys(primaryDisplayTemplates).map(name => (
                      <div key={name} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                        <p className="text-sm font-medium">{name}</p>
                        <div className='flex gap-1'>
                          <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(name, 'primary')}><CheckSquare className="w-4 h-4 mr-2" /> Muat</Button>
                          <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(name, 'primary')}><Trash2 className="w-4 h-4" /></Button>
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
                        <Checkbox id="primary-display-all-mobile" onCheckedChange={(checked) => handleSelectAllPrimaryDisplayColumns(!!checked)} checked={primaryDataHeaders ? primaryDisplayColumns.length === primaryDataHeaders.length : false} />
                        <Label htmlFor="primary-display-all-mobile" className="font-semibold">Pilih Semua</Label>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-48">
                        {primaryDataHeaders.map((col, index) => (
                          <div key={`primary-display-${col}-mobile-${index}`} className="flex items-center space-x-2">
                            <Checkbox id={`primary-display-${col}-mobile-${index}`} onCheckedChange={(checked) => handlePrimaryDisplayColumnToggle(col, !!checked)} checked={primaryDisplayColumns.includes(col)} />
                            <Label htmlFor={`primary-display-${col}-mobile-${index}`} className="font-normal cursor-pointer flex-1 text-sm">{col}</Label>
                          </div>
                        ))}
                      </div>
                       <Separator />
                       <div className="space-y-4">
                        <div><Label className="font-semibold text-sm">Template Tampilan Utama</Label></div>
                        <div className="flex gap-2">
                          <Input placeholder="Nama template baru..." value={newPrimaryTemplateName} onChange={e => setNewPrimaryTemplateName(e.target.value)} />
                          <Button onClick={() => handleSaveTemplate('primary')}>{currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}</Button>
                        </div>
                        {Object.keys(primaryDisplayTemplates).length > 0 && (
                          <div className="space-y-2">
                            {Object.keys(primaryDisplayTemplates).map(name => (
                              <div key={name} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                                <p className="text-sm font-medium">{name}</p>
                                <div className='flex gap-1'>
                                  <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(name, 'primary')}><CheckSquare className="w-4 h-4 mr-2" /> Muat</Button>
                                  <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(name, 'primary')}><Trash2 className="w-4 h-4" /></Button>
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
                  <TableRow>{primaryDisplayColumns.map((col, index) => (<TableHead key={`p-header-${col}-${index}`} className="font-bold bg-muted/50">{col}</TableHead>))}</TableRow>
                </TableHeader>
                <TableBody>
                  {primaryResults.length > 0 ? (
                    primaryResults.map((row, index) => (
                      <TableRow key={`p-row-${index}`}>
                        {primaryDisplayColumns.map((col, colIndex) => (
                          <TableCell key={`p-cell-${index}-${col}-${colIndex}`}>{formatCell(row[col], columnTypes[col])}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={primaryDisplayColumns.length || 1} className="h-24 text-center">Tidak ada data terkait yang ditemukan.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
           <Button variant="outline" onClick={() => handleCopyResults(primaryResults, primaryDisplayColumns, columnTypes)} disabled={primaryResults.length === 0}><Copy className="w-4 h-4 mr-2" />Salin Hasil Utama</Button>
           <DialogClose asChild><Button type="button" variant="secondary">Tutup</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
