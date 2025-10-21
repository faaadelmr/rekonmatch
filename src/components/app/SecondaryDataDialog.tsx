
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

interface SecondaryDataDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentLookupValue: string | number;
  secondaryDataHeaders: string[];
  secondaryResults: Row[];
  secondaryDisplayColumns: string[];
  secondaryDisplayTemplates: Record<string, string[]>;
  newSecondaryTemplateName: string;
  currentTheme: string;
  handleSecondaryDisplayColumnToggle: (column: string, checked: boolean) => void;
  handleSelectAllSecondaryDisplayColumns: (checked: boolean) => void;
  setNewSecondaryTemplateName: (name: string) => void;
  handleSaveTemplate: (type: 'primary' | 'secondary') => void;
  handleLoadTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleDeleteTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleCopyResults: (dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => void;
  formatCell: (value: any, type?: ColumnType) => string;
}

export default function SecondaryDataDialog({
  isOpen,
  onOpenChange,
  currentLookupValue,
  secondaryDataHeaders,
  secondaryResults,
  secondaryDisplayColumns,
  secondaryDisplayTemplates,
  newSecondaryTemplateName,
  currentTheme,
  handleSecondaryDisplayColumnToggle,
  handleSelectAllSecondaryDisplayColumns,
  setNewSecondaryTemplateName,
  handleSaveTemplate,
  handleLoadTemplate,
  handleDeleteTemplate,
  handleCopyResults,
  formatCell
}: SecondaryDataDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              <Checkbox id="secondary-display-all" onCheckedChange={(checked) => handleSelectAllSecondaryDisplayColumns(!!checked)} checked={secondaryDataHeaders ? secondaryDisplayColumns.length === secondaryDataHeaders.length : false} />
              <Label htmlFor="secondary-display-all" className="font-semibold">Pilih Semua</Label>
            </div>
            <div className="flex-1 space-y-2 pr-2">
              {secondaryDataHeaders.map((col, index) => (
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
                        <Checkbox id="secondary-display-all-mobile" onCheckedChange={(checked) => handleSelectAllSecondaryDisplayColumns(!!checked)} checked={secondaryDataHeaders ? secondaryDisplayColumns.length === secondaryDataHeaders.length : false} />
                        <Label htmlFor="secondary-display-all-mobile" className="font-semibold">Pilih Semua</Label>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-48">
                        {secondaryDataHeaders.map((col, index) => (
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
                          <TableCell key={`s-cell-${index}-${col}-${colIndex}`}>{formatCell(row[col])}</TableCell>
                        ))}
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
  );
}
