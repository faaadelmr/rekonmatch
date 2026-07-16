"use client";

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
import { AlertCircle, PlusCircle, MinusCircle } from "lucide-react";

interface UploadValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mismatchInfo: {
    missing: string[];
    added: string[];
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UploadValidationDialog({
  isOpen,
  onOpenChange,
  mismatchInfo,
  onConfirm,
  onCancel,
}: UploadValidationDialogProps) {
  if (!mismatchInfo) return null;

  const { missing, added } = mismatchInfo;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-6 w-6" />
            <AlertDialogTitle className="text-xl">Perbedaan Struktur Kolom</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm">
            Berkas Excel baru yang Anda unggah memiliki perbedaan susunan kolom dibandingkan dengan data saat ini di penyimpanan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-4 max-h-60 overflow-y-auto pr-2">
          {missing.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                <MinusCircle className="h-4 w-4" /> Kolom Hilang ({missing.length})
              </span>
              <ul className="text-xs list-disc pl-5 text-muted-foreground space-y-0.5">
                {missing.map((col) => (
                  <li key={`missing-${col}`}>{col}</li>
                ))}
              </ul>
            </div>
          )}

          {added.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <PlusCircle className="h-4 w-4" /> Kolom Baru ({added.length})
              </span>
              <ul className="text-xs list-disc pl-5 text-muted-foreground space-y-0.5">
                {added.map((col) => (
                  <li key={`added-${col}`}>{col}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <AlertDialogDescription className="text-xs border-t pt-3 text-amber-500 font-medium">
          * Melanjutkan aksi ini akan memperbarui skema. Pencarian aktif serta template kolom yang merujuk pada kolom yang hilang mungkin tidak akan berfungsi lagi.
        </AlertDialogDescription>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Lanjutkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
