
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2 } from "lucide-react";

interface ScientificNotationConverterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProcessing: boolean;
  primaryDataHeaders: string[];
  secondaryDataHeaders: string[];
  columnsToConvert: Set<string>;
  fileTypeToConvert: 'primary' | 'secondary';
  setFileTypeToConvert: (type: 'primary' | 'secondary') => void;
  handleColumnToConvertToggle: (column: string, checked: boolean) => void;
  handleConvertScientific: () => void;
}

export default function ScientificNotationConverterDialog({
  isOpen,
  onOpenChange,
  isProcessing,
  primaryDataHeaders,
  secondaryDataHeaders,
  columnsToConvert,
  fileTypeToConvert,
  setFileTypeToConvert,
  handleColumnToConvertToggle,
  handleConvertScientific,
}: ScientificNotationConverterDialogProps) {
  const headers = fileTypeToConvert === 'primary' ? primaryDataHeaders : secondaryDataHeaders;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Konversi Notasi Ilmiah
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Pilih File untuk Dikonversi</Label>
            <RadioGroup
              value={fileTypeToConvert}
              onValueChange={(value: 'primary' | 'secondary') => setFileTypeToConvert(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="primary" id="r1" disabled={primaryDataHeaders.length === 0} />
                <Label htmlFor="r1">Data Utama</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="secondary" id="r2" disabled={secondaryDataHeaders.length === 0} />
                <Label htmlFor="r2">Data Sekunder</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Pilih Kolom untuk Dikonversi</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              {headers.length > 0 ? (
                headers.map((col, index) => (
                  <div key={`${fileTypeToConvert}-${col}-${index}`} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={`${fileTypeToConvert}-${col}-${index}`}
                      onCheckedChange={(checked) => handleColumnToConvertToggle(col, !!checked)}
                      checked={columnsToConvert.has(col)}
                    />
                    <Label htmlFor={`${fileTypeToConvert}-${col}-${index}`} className="font-normal cursor-pointer flex-1 text-sm">
                      {col}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">Pilih file terlebih dahulu.</p>
              )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Batal</Button>
          </DialogClose>
          <Button onClick={handleConvertScientific} disabled={isProcessing || columnsToConvert.size === 0}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Konversi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
