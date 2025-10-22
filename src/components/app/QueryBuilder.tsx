
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ListFilter, ArrowUp, ArrowDown, Type, Palette, Save, Heart, CheckSquare, Trash2, Search, Sparkle, Filter, Wand2, Loader2 } from "lucide-react";
import { type ColumnType, type SearchOperator, type SearchCriterion } from "@/hooks/useExcelMatcher";
import { cn } from "@/lib/utils";

interface QueryBuilderProps {
  primaryDataHeaders: string[];
  secondaryDataHeaders: string[];
  searchColumns: Set<string>;
  secondarySearchColumns: Set<string>;
  displayColumns: string[];
  secondaryDisplayColumns: string[];
  columnTypes: Record<string, ColumnType>;
  columnColors: Record<string, string>;
  primaryDisplayTemplates: Record<string, string[]>;
  secondaryDisplayTemplates: Record<string, string[]>;
  newPrimaryTemplateName: string;
  newSecondaryTemplateName: string;
  searchCriteria: Record<string, SearchCriterion>;
  secondarySearchCriteria: Record<string, SearchCriterion>;
  isPrimaryQueryInvalid: boolean;
  isSecondaryQueryInvalid: boolean;
  isProcessing: boolean;
  currentTheme: string;
  includeEmptyRowsInResults: boolean;
  setIncludeEmptyRowsInResults: (checked: boolean) => void;
  handleSearchColumnToggle: (column: string, checked: boolean) => void;
  handleSecondarySearchColumnToggle: (column: string, checked: boolean) => void;
  handleSelectAllDisplayColumns: (checked: boolean) => void;
  handleSelectAllSecondaryDisplayColumns: (checked: boolean) => void;
  handleDisplayColumnToggle: (column: string, checked: boolean) => void;
  handleSecondaryDisplayColumnToggle: (column: string, checked: boolean) => void;
  moveDisplayColumn: (index: number, direction: 'up' | 'down') => void;
  moveSecondaryDisplayColumn: (index: number, direction: 'up' | 'down') => void;
  handleColumnTypeChange: (column: string, type: ColumnType) => void;
  handleColumnColorChange: (column: string, color: string) => void;
  setNewPrimaryTemplateName: (name: string) => void;
  setNewSecondaryTemplateName: (name: string) => void;
  handleSaveTemplate: (type: 'primary' | 'secondary') => void;
  handleLoadTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleDeleteTemplate: (name: string, type: 'primary' | 'secondary') => void;
  handleSearchCriteriaChange: (column: string, value: string, isSecondary: boolean) => void;
  handleSearchOperatorChange: (column: string, operator: SearchOperator, isSecondary: boolean) => void;
  handleRunPrimaryQuery: () => void;
  handleRunSecondaryQuery: () => void;
}

export default function QueryBuilder({
  primaryDataHeaders,
  secondaryDataHeaders,
  searchColumns = new Set(),
  secondarySearchColumns = new Set(),
  displayColumns,
  secondaryDisplayColumns,
  columnTypes,
  columnColors,
  primaryDisplayTemplates,
  secondaryDisplayTemplates,
  newPrimaryTemplateName,
  newSecondaryTemplateName,
  searchCriteria,
  secondarySearchCriteria = {},
  isPrimaryQueryInvalid,
  isSecondaryQueryInvalid,
  isProcessing,
  currentTheme,
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
  setNewPrimaryTemplateName,
  setNewSecondaryTemplateName,
  handleSaveTemplate,
  handleLoadTemplate,
  handleDeleteTemplate,
  handleSearchCriteriaChange,
  handleSearchOperatorChange,
  handleRunPrimaryQuery,
  handleRunSecondaryQuery,
}: QueryBuilderProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Primary Data Section */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">2. Susunan Kueri (Utama)</CardTitle>
          <CardDescription>Pilih kolom, masukkan kriteria, dan jalankan kueri pada Data Utama.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2"><ListFilter className="w-5 h-5" /> Kolom</CardTitle></CardHeader>
            <CardContent className="flex-grow">
              <Accordion type="multiple" defaultValue={['search-cols', 'display-cols']} className="w-full">
                <AccordionItem value="search-cols">
                  <AccordionTrigger>Kolom Pencarian</AccordionTrigger>
                  <AccordionContent className="space-y-2 max-h-48 overflow-y-auto pr-4">
                    {primaryDataHeaders.map((col, index) => (
                      <div key={`search-${col}-${index}`} className="flex items-center space-x-2">
                        <Checkbox id={`search-${col}-${index}`} onCheckedChange={(checked) => handleSearchColumnToggle(col, !!checked)} checked={searchColumns.has(col)} />
                        <Label htmlFor={`search-${col}-${index}`} className="font-normal cursor-pointer flex-1">{col}</Label>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="display-cols">
                  <AccordionTrigger>Kolom Tampilan & Format</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox id="display-all" onCheckedChange={(checked) => handleSelectAllDisplayColumns(!!checked)} checked={primaryDataHeaders ? displayColumns.length === primaryDataHeaders.length : false} />
                      <Label htmlFor="display-all" className="font-semibold">Pilih Semua</Label>
                    </div>
                    <div className="max-h-96 overflow-y-auto pr-2 pt-2 space-y-1">
                      {primaryDataHeaders.map((col, i) => {
                        const isDisplayed = displayColumns.includes(col);
                        const index = displayColumns.indexOf(col);
                        return (
                          <div key={`display-${col}-${i}`} className={cn("p-2 rounded-md", isDisplayed && "bg-muted/50")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox id={`display-${col}-${i}`} onCheckedChange={(checked) => handleDisplayColumnToggle(col, !!checked)} checked={isDisplayed} />
                                <Label htmlFor={`display-${col}-${i}`} className={cn("font-normal cursor-pointer", !isDisplayed && "text-muted-foreground")}>{col}</Label>
                              </div>
                              {isDisplayed && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDisplayColumn(index, 'down')} disabled={index === displayColumns.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                </div>
                              )}
                            </div>
                            {isDisplayed && (
                              <div className="flex items-stretch gap-2 mt-2 pl-6">
                                <div className="flex items-center gap-2 flex-1">
                                  <Type className="h-4 w-4 text-muted-foreground"/>
                                  <Select value={columnTypes[col] || 'text'} onValueChange={(value) => handleColumnTypeChange(col, value as ColumnType)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipe Data" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Teks</SelectItem>
                                      <SelectItem value="number">Angka</SelectItem>
                                      <SelectItem value="currency">Mata Uang (Rp)</SelectItem>
                                      <SelectItem value="date">Tanggal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Palette className="h-4 w-4 text-muted-foreground" />
                                  <Input type="color" value={columnColors[col] || '#000000'} onChange={(e) => handleColumnColorChange(col, e.target.value)} className="h-8 w-10 p-1"/>
                                </div>
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
                        <Input placeholder="Nama template baru..." value={newPrimaryTemplateName} onChange={e => setNewPrimaryTemplateName(e.target.value)} />
                        <Button onClick={() => handleSaveTemplate('primary')}>
                          {currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        </Button>
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
            </CardContent>
          </div>
          <div className="flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2">{currentTheme === 'pink' ? <Sparkle className="w-5 h-5"/> : <Search className="w-5 h-5"/>}Kriteria Pencarian</CardTitle></CardHeader>
            <CardContent className="flex-grow space-y-4 overflow-y-auto pr-4">
              {Array.from(searchColumns).length > 0 ? Array.from(searchColumns).map((col, index) => (
                <div key={`criteria-${col}-${index}`} className="space-y-2">
                  <Label htmlFor={`textarea-${col}`} className="font-semibold">{col}</Label>
                  <div className="flex flex-col gap-2">
                    <Select value={searchCriteria[col]?.operator || 'contains'} onValueChange={(op) => handleSearchOperatorChange(col, op as SearchOperator, false)}>
                      <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Mengandung</SelectItem>
                        <SelectItem value="equals">Sama Dengan</SelectItem>
                        <SelectItem value="startsWith">Dimulai Dengan</SelectItem>
                        <SelectItem value="endsWith">Diakhiri Dengan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea id={`textarea-${col}`} placeholder={`Nilai dipisah koma (,) atau baris baru`} value={searchCriteria[col]?.value || ''} onChange={e => handleSearchCriteriaChange(col, e.target.value, false)} className="min-h-[100px]" />
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground pt-4 text-center">Pilih kolom pencarian untuk menambahkan kriteria.</p>}
            </CardContent>
            <Card className="bg-primary/10 border-primary/20 flex flex-col justify-center mt-4">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex items-center space-x-2 justify-center">
                  <Checkbox id="include-empty-rows-primary" checked={includeEmptyRowsInResults} onCheckedChange={setIncludeEmptyRowsInResults} />
                  <Label htmlFor="include-empty-rows-primary" className="font-normal cursor-pointer">Sertakan Baris Kosong di Hasil</Label>
                </div>
                <Button size="lg" className="w-full h-16 text-xl" onClick={handleRunPrimaryQuery} disabled={isProcessing || isPrimaryQueryInvalid}>
                  {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (currentTheme === 'pink' ? <Wand2 className="mr-2 h-6 w-6" /> : <Filter className="mr-2 h-6 w-6" />)}
                  Jalankan Filter Utama
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Data Section */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">3. Susunan Kueri (Sekunder)</CardTitle>
          <CardDescription>Pilih kolom, masukkan kriteria, dan jalankan kueri pada Data Sekunder.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2"><ListFilter className="w-5 h-5" /> Kolom</CardTitle></CardHeader>
            <CardContent className="flex-grow">
              <Accordion type="multiple" defaultValue={['secondary-search-cols', 'secondary-display-cols']} className="w-full">
                <AccordionItem value="secondary-search-cols">
                  <AccordionTrigger>Kolom Pencarian</AccordionTrigger>
                  <AccordionContent className="space-y-2 max-h-48 overflow-y-auto pr-4">
                    {secondaryDataHeaders.map((col, index) => (
                      <div key={`secondary-search-${col}-${index}`} className="flex items-center space-x-2">
                        <Checkbox id={`secondary-search-${col}-${index}`} onCheckedChange={(checked) => handleSecondarySearchColumnToggle(col, !!checked)} checked={secondarySearchColumns.has(col)} />
                        <Label htmlFor={`secondary-search-${col}-${index}`} className="font-normal cursor-pointer flex-1">{col}</Label>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="secondary-display-cols">
                  <AccordionTrigger>Kolom Tampilan & Format</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox id="secondary-display-all" onCheckedChange={(checked) => handleSelectAllSecondaryDisplayColumns(!!checked)} checked={secondaryDataHeaders ? secondaryDisplayColumns.length === secondaryDataHeaders.length : false} />
                      <Label htmlFor="secondary-display-all" className="font-semibold">Pilih Semua</Label>
                    </div>
                    <div className="max-h-96 overflow-y-auto pr-2 pt-2 space-y-1">
                      {secondaryDataHeaders.map((col, i) => {
                        const isDisplayed = secondaryDisplayColumns.includes(col);
                        const index = secondaryDisplayColumns.indexOf(col);
                        return (
                          <div key={`secondary-display-${col}-${i}`} className={cn("p-2 rounded-md", isDisplayed && "bg-muted/50")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox id={`secondary-display-${col}-${i}`} onCheckedChange={(checked) => handleSecondaryDisplayColumnToggle(col, !!checked)} checked={isDisplayed} />
                                <Label htmlFor={`secondary-display-${col}-${i}`} className={cn("font-normal cursor-pointer", !isDisplayed && "text-muted-foreground")}>{col}</Label>
                              </div>
                              {isDisplayed && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSecondaryDisplayColumn(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSecondaryDisplayColumn(index, 'down')} disabled={index === secondaryDisplayColumns.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                </div>
                              )}
                            </div>
                            {isDisplayed && (
                              <div className="flex items-stretch gap-2 mt-2 pl-6">
                                <div className="flex items-center gap-2 flex-1">
                                  <Type className="h-4 w-4 text-muted-foreground"/>
                                  <Select value={columnTypes[col] || 'text'} onValueChange={(value) => handleColumnTypeChange(col, value as ColumnType)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipe Data" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Teks</SelectItem>
                                      <SelectItem value="number">Angka</SelectItem>
                                      <SelectItem value="currency">Mata Uang (Rp)</SelectItem>
                                      <SelectItem value="date">Tanggal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Palette className="h-4 w-4 text-muted-foreground" />
                                  <Input type="color" value={columnColors[col] || '#000000'} onChange={(e) => handleColumnColorChange(col, e.target.value)} className="h-8 w-10 p-1"/>
                                </div>
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
                        <Input placeholder="Nama template baru..." value={newSecondaryTemplateName} onChange={e => setNewSecondaryTemplateName(e.target.value)} />
                        <Button onClick={() => handleSaveTemplate('secondary')}>
                          {currentTheme === 'pink' ? <Heart className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        </Button>
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
            </CardContent>
          </div>
          <div className="flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2">{currentTheme === 'pink' ? <Sparkle className="w-5 h-5"/> : <Search className="w-5 h-5"/>}Kriteria Pencarian</CardTitle></CardHeader>
            <CardContent className="flex-grow space-y-4 overflow-y-auto pr-4">
              {Array.from(secondarySearchColumns).length > 0 ? Array.from(secondarySearchColumns).map((col, index) => (
                <div key={`criteria-${col}-${index}`} className="space-y-2">
                  <Label htmlFor={`textarea-${col}`} className="font-semibold">{col}</Label>
                  <div className="flex flex-col gap-2">
                    <Select value={secondarySearchCriteria[col]?.operator || 'contains'} onValueChange={(op) => handleSearchOperatorChange(col, op as SearchOperator, true)}>
                      <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Mengandung</SelectItem>
                        <SelectItem value="equals">Sama Dengan</SelectItem>
                        <SelectItem value="startsWith">Dimulai Dengan</SelectItem>
                        <SelectItem value="endsWith">Diakhiri Dengan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea id={`textarea-${col}`} placeholder={`Nilai dipisah koma (,) atau baris baru`} value={secondarySearchCriteria[col]?.value || ''} onChange={e => handleSearchCriteriaChange(col, e.target.value, true)} className="min-h-[100px]" />
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground pt-4 text-center">Pilih kolom pencarian untuk menambahkan kriteria.</p>}
            </CardContent>
            <Card className="bg-primary/10 border-primary/20 flex flex-col justify-center mt-4">
              <CardContent className="pt-6 text-center space-y-4">
                 <div className="flex items-center space-x-2 justify-center">
                  <Checkbox id="include-empty-rows-secondary" checked={includeEmptyRowsInResults} onCheckedChange={setIncludeEmptyRowsInResults} />
                  <Label htmlFor="include-empty-rows-secondary" className="font-normal cursor-pointer">Sertakan Baris Kosong di Hasil</Label>
                </div>
                <Button size="lg" className="w-full h-16 text-xl" onClick={handleRunSecondaryQuery} disabled={isProcessing || isSecondaryQueryInvalid}>
                  {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (currentTheme === 'pink' ? <Wand2 className="mr-2 h-6 w-6" /> : <Filter className="mr-2 h-6 w-6" />)}
                  Jalankan Filter Sekunder
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
