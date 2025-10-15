
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Columns, Copy } from "lucide-react";
import { type Row } from "@/lib/mock-data";
import { type ColumnType } from "@/hooks/useExcelMatcher";
import { cn } from "@/lib/utils";

interface ResultsDisplayProps {
  filteredResults: Row[] | null;
  displayColumns: string[];
  columnTypes: Record<string, ColumnType>;
  columnColors: Record<string, string>;
  isLinkingEnabled: boolean;
  primaryLinkColumn: string;
  secondaryLinkColumn: string;
  isProcessing: boolean;
  handleCopyResults: (dataToCopy: Row[] | null, columns: string[], colTypes: Record<string, ColumnType>) => void;
  handleRowClick: (row: Row) => void;
  formatCell: (value: any, type?: ColumnType) => string;
}

export default function ResultsDisplay({
  filteredResults,
  displayColumns,
  columnTypes,
  columnColors,
  isLinkingEnabled,
  primaryLinkColumn,
  secondaryLinkColumn,
  isProcessing,
  handleCopyResults,
  handleRowClick,
  formatCell
}: ResultsDisplayProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2"><Columns className="w-6 h-6" /> Hasil Kueri Utama</CardTitle>
          <CardDescription>
            {filteredResults ? `${filteredResults.filter(r => !r.__isNotFound).length} data cocok dari ${filteredResults.length} hasil.` : 'Hasil kueri Anda akan muncul di sini.'}
            {isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && ' Klik baris untuk melihat data terkait.'}
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => handleCopyResults(filteredResults, displayColumns, columnTypes)} disabled={!filteredResults || filteredResults.length === 0}>
          <Copy className="w-4 h-4 mr-2" />Salin Hasil
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
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
                      !row.__isNotFound && isLinkingEnabled && primaryLinkColumn && secondaryLinkColumn && "cursor-pointer"
                    )}
                    onClick={() => handleRowClick(row)}
                  >
                    {displayColumns.map((col, colIndex) => (
                      <TableCell key={`${index}-${col}-${colIndex}`} style={{ backgroundColor: columnColors[col] ? `${columnColors[col]}33` : undefined }}>
                        {formatCell(row[col], row.__isNotFound ? 'text' : columnTypes[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={displayColumns.length || 1} className="h-48 text-center text-muted-foreground">
                    {isProcessing ? 'Memproses...' : (filteredResults === null ? "Jalankan filter untuk melihat data Anda." : "Tidak ada hasil yang ditemukan.")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
