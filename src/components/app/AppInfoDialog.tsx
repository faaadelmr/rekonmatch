
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";

interface AppInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppInfoDialog({ isOpen, onOpenChange }: AppInfoDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Info className="w-6 h-6" />
            Keamanan & Privasi Data RekonMatch
          </DialogTitle>
          <DialogDescription>
            Penjelasan transparan mengenai bagaimana aplikasi ini menangani data rahasia Anda.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
            <div className="prose prose-sm dark:prose-invert space-y-6 text-foreground/90 pr-2">
                <div>
                    <h2 className="font-semibold text-lg mb-2">1. Apakah Proses Pengolahan Data Excel Ini Aman?</h2>
                    <p><strong className="text-primary">Ya, sangat aman.</strong></p>
                    <p>
                        Keamanan aplikasi ini didasarkan pada prinsip fundamental:{" "}
                        <strong className="font-semibold">semua pemrosesan data terjadi sepenuhnya di dalam browser web Anda, di komputer Anda sendiri.</strong>
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>
                            <strong>Tidak Ada Server</strong>: Aplikasi ini tidak memiliki komponen <em>backend</em> atau server yang menerima atau mengolah data Anda.
                        </li>
                        <li>
                            <strong>Teknologi Sisi Klien</strong>: Saat Anda "mengunggah" file Excel, file tersebut tidak dikirim ke mana pun. Browser Anda (seperti Chrome, Firefox, dll.) menggunakan pustaka JavaScript (`xlsx.js`) untuk membaca file langsung dari memori lokal komputer Anda.
                        </li>
                        <li>
                            <strong>Penyimpanan Lokal</strong>: Data yang sudah dibaca kemudian disimpan sementara di dalam penyimpanan internal browser Anda yang disebut <strong>IndexedDB</strong>. Data ini hanya dapat diakses oleh Anda di browser yang sama dan tidak dapat diakses oleh situs web lain atau oleh pihak luar.
                        </li>
                    </ul>
                    <p>Intinya, aplikasi ini berfungsi seperti aplikasi desktop tradisional (misalnya, Microsoft Excel itu sendiri), tetapi berjalan di dalam "wadah" browser Anda.</p>
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">2. Apakah Data yang Diunggah Benar-Benar Offline dan Tidak Ada Proses Upload Data ke Luar?</h2>
                    <p><strong className="font-semibold">Benar. Tidak ada data yang diunggah ke luar aplikasi.</strong></p>
                    <p>
                        Istilah "Unggah" pada tombol mungkin sedikit menimbulkan salah paham. Dalam konteks aplikasi ini, "Unggah" berarti{" "}
                        <strong>"memuat file dari disk lokal Anda ke dalam memori browser"</strong>.
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>
                            <strong>100% Offline</strong>: Setelah aplikasi dimuat untuk pertama kalinya, semua fungsi inti—termasuk memuat file, memfilter, mencari, dan menampilkan hasil—berfungsi penuh tanpa memerlukan koneksi internet.
                        </li>
                        <li>
                            <strong>Tidak Ada Komunikasi Jaringan</strong>: Saat Anda memproses file, tidak ada satu pun baris atau sel dari data Anda yang dikirim melalui jaringan internet. Anda dapat membuktikannya sendiri dengan memutuskan koneksi internet setelah aplikasi dimuat dan semua fitur akan tetap berjalan seperti biasa.
                        </li>
                    </ul>
                </div>
                
                <div>
                    <h2 className="font-semibold text-lg mb-2">3. Apakah Aplikasi Ini Mengumpulkan Data untuk Kepentingan Lain?</h2>
                    <p><strong className="font-semibold">Tidak, sama sekali tidak.</strong></p>
                    <p>
                        Aplikasi <strong>RekonMatch</strong> dirancang sebagai sebuah <em>utilitas</em> atau alat bantu murni.
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>
                            <strong>Tidak Ada Pengumpulan Data (Data Collection)</strong>: Aplikasi ini tidak mengumpulkan, menyimpan, atau mengirimkan informasi apa pun dari file Excel Anda.
                        </li>
                        <li>
                            <strong>Tidak Ada Analitik atau Pelacakan</strong>: Tidak ada kode pelacakan (seperti Google Analytics) atau mekanisme analitik lain yang memantau bagaimana Anda menggunakan aplikasi atau data apa yang Anda masukkan.
                        </li>
                        <li>
                            <strong>Fokus pada Privasi</strong>: Tujuan aplikasi ini adalah untuk menyediakan alat yang andal dan aman. Privasi data Anda adalah absolut. Apa yang ada di komputer Anda, tetap ada di komputer Anda.
                        </li>
                    </ul>
                </div>

                <hr className="border-border" />
                
                <div className="text-center text-sm text-muted-foreground">
                    <p className="font-semibold">Kesimpulan:</p>
                    <p>
                        Anda dapat menggunakan aplikasi RekonMatch dengan keyakinan penuh bahwa data rahasia Anda akan tetap rahasia. Arsitektur aplikasi ini secara inheren aman karena sifatnya yang sepenuhnya berjalan di sisi klien (<em>client-side</em>) dan offline.
                    </p>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Mengerti</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
