
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Columns, Copy, Search } from "lucide-react";
import { type Row } from "@/lib/mock-data";
import { type ColumnType } from "@/hooks/useExcelMatcher";
import { cn } from "@/lib/utils";

interface ResultsDisplayProps {
  filteredResults: Row[] | null;
  secondaryFilteredResults: Row[] | null;
  displayColumns: string[];
  secondaryDisplayColumns: string[];
  columnTypes: Record<string, ColumnType>;
  columnColors: Record<string, string>;
  isLinkingEnabled: boolean;
  primaryLinkColumn: string;
  secondaryLinkColumn: string;
  isProcessing: boolean;
  handleCopyResults: (dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => void;
  handleRowClick: (row: Row) => void;
  handleSecondaryRowClick: (row: Row) => void;
  formatCell: (value: any, type?: ColumnType) => string;
}

export default function ResultsDisplay({
  filteredResults,
  secondaryFilteredResults,
  displayColumns,
  secondaryDisplayColumns,
  columnTypes,
  columnColors,
  isLinkingEnabled,
  primaryLinkColumn,
  secondaryLinkColumn,
  isProcessing,
  handleCopyResults,
  handleRowClick,
  handleSecondaryRowClick,
  formatCell
}: ResultsDisplayProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Columns className="w-6 h-6" /> Hasil Kueri</CardTitle>
        <CardDescription>Hasil kueri Anda akan muncul di sini.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="primary">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="primary">Hasil Kueri Utama</TabsTrigger>
            <TabsTrigger value="secondary">Hasil Kueri Sekunder</TabsTrigger>
          </TabsList>
          <TabsContent value="primary">
            <div className="flex items-center justify-between my-4">
              <p className="text-sm text-muted-foreground">
                {filteredResults ? `${filteredResults.filter(r => !r.__isNotFound && !r.__isEmpty && !r.__isDuplicate).length} data cocok dari ${filteredResults.length} hasil.` : ''}
                {isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && ' Klik ikon pencarian untuk melihat data terkait.'}
              </p>
              <Button variant="outline" onClick={() => handleCopyResults(filteredResults, displayColumns, columnTypes)} disabled={!filteredResults || filteredResults.length === 0}>
                <Copy className="w-4 h-4 mr-2" />Salin Hasil Utama
              </Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    {displayColumns.map((col, index) => (
                      <TableHead key={`header-${col}-${index}`} className="font-bold bg-muted/50" style={{ backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults && filteredResults.length > 0 ? (
                    filteredResults.map((row, index) => (
                      <TableRow
                        key={index}
                        className={cn(
                          row.__isNotFound && "bg-red-500/20 hover:bg-red-500/30",
                          row.__isDuplicate && "bg-blue-500/20 hover:bg-blue-500/30"
                        )}
                      >
                        <TableCell>
                          {!row.__isNotFound && !row.__isEmpty && !row.__isDuplicate && isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && (
                            <Button variant="ghost" size="icon" onClick={() => handleRowClick(row)}>
                              <Search className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                        {displayColumns.map((col, colIndex) => (
                          <TableCell key={`${index}-${col}-${colIndex}`} style={{ backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>
                            {row.__isDuplicate ? (colIndex === 0 ? row[col] : 'Hasil sudah ditampilkan') : formatCell(row[col], row.__isNotFound ? 'text' : columnTypes[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={displayColumns.length + 1 || 2} className="h-48 text-center text-muted-foreground">
                        {isProcessing ? 'Memproses...' : (filteredResults === null ? "Jalankan filter untuk melihat data Anda." : "Tidak ada hasil yang ditemukan.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="secondary">
            <div className="flex items-center justify-between my-4">
              <p className="text-sm text-muted-foreground">
                {secondaryFilteredResults ? `${secondaryFilteredResults.filter(r => !r.__isNotFound && !r.__isEmpty && !r.__isDuplicate).length} data cocok dari ${secondaryFilteredResults.length} hasil.` : ''}
              </p>
              <Button variant="outline" onClick={() => handleCopyResults(secondaryFilteredResults, secondaryDisplayColumns, columnTypes)} disabled={!secondaryFilteredResults || secondaryFilteredResults.length === 0}>
                <Copy className="w-4 h-4 mr-2" />Salin Hasil Sekunder
              </Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    {secondaryDisplayColumns.map((col, index) => (
                      <TableHead key={`header-secondary-${col}-${index}`} className="font-bold bg-muted/50" style={{ backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secondaryFilteredResults && secondaryFilteredResults.length > 0 ? (
                    secondaryFilteredResults.map((row, index) => (
                      <TableRow
                        key={index}
                        className={cn(
                          row.__isNotFound && "bg-red-500/20 hover:bg-red-500/30",
                          row.__isDuplicate && "bg-blue-500/20 hover:bg-blue-500/30"
                        )}
                      >
                        <TableCell>
                          {!row.__isNotFound && !row.__isEmpty && !row.__isDuplicate && isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && (
                            <Button variant="ghost" size="icon" onClick={() => handleSecondaryRowClick(row)}>
                              <Search className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                        {secondaryDisplayColumns.map((col, colIndex) => (
                           <TableCell key={`secondary-${index}-${col}-${colIndex}`} style={{ backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>
                            {row.__isDuplicate ? (colIndex === 0 ? row[col] : 'Hasil sudah ditampilkan') : formatCell(row[col], row.__isNotFound ? 'text' : columnTypes[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={secondaryDisplayColumns.length + 1 || 2} className="h-48 text-center text-muted-foreground">
                        {isProcessing ? 'Memproses...' : (secondaryFilteredResults === null ? "Jalankan filter untuk melihat data Anda." : "Tidak ada hasil yang ditemukan.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    