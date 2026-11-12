
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, AlertTriangle } from "lucide-react";

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
            <ShieldAlert className="w-6 h-6 text-primary" />
            Transparansi Arsitektur & Batasan Keamanan Data
          </DialogTitle>
          <DialogDescription>
            Penjelasan jujur dan objektif mengenai cara kerja aplikasi serta batasan keamanan pada perangkat Anda.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
            <div className="prose prose-sm dark:prose-invert space-y-6 text-foreground/90 pr-2">
                <div>
                    <h2 className="font-semibold text-lg mb-2">1. Bagaimana RekonMatch Memproses Data Anda?</h2>
                    <p>
                        Aplikasi ini dirancang murni sebagai utilitas <em>client-side</em>:
                    </p>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm">
                        <li>
                            <strong>Tanpa Server Backend</strong>: RekonMatch tidak memiliki server basis data, API penampung, atau layanan backend untuk menyimpan data Excel Anda.
                        </li>
                        <li>
                            <strong>Pemrosesan Memori Lokal</strong>: Berkas Excel dibaca dan diproses langsung di peramban komputer Anda menggunakan pustaka JavaScript (<code>xlsx</code> dan Web Worker).
                        </li>
                        <li>
                            <strong>Penyimpanan Browser (IndexedDB)</strong>: Data yang diolah disimpan pada memori internal peramban Anda agar dapat digunakan kembali tanpa perlu unggah ulang setiap saat.
                        </li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">2. Apakah Ada Data yang Dikirim ke Pihak Ketiga?</h2>
                    <p className="text-sm">
                        Secara desain kode, <strong>tidak ada telemetri, pelacak (analytics), atau pengiriman baris data ke internet</strong>. Anda bahkan dapat memutuskan sambungan internet (offline) setelah halaman termuat dan aplikasi akan tetap beroperasi normal.
                    </p>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <h2 className="font-semibold text-base mb-2 flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        3. Batasan Keamanan & Tanggung Jawab Perangkat (Penting)
                    </h2>
                    <p className="text-sm leading-relaxed text-amber-300/90 mb-2">
                        Meskipun aplikasi ini tidak mengirimkan data ke jaringan luar, <strong>kami tidak dapat menjamin data Anda 100% aman tanpa risiko</strong>. Keamanan data pada lingkungan lokal tetap memiliki kerentanan yang berada di luar kendali aplikasi ini:
                    </p>
                    <ul className="list-disc space-y-1.5 pl-5 text-xs text-amber-200/80">
                        <li>
                            <strong>Ekstensi Peramban (Browser Extensions)</strong>: Ekstensi pihak ketiga yang Anda pasang di browser (misalnya penerjemah, pengelola unduhan, atau extension tak terpercaya) sering kali memiliki izin membaca isi DOM atau penyimpanan lokal.
                        </li>
                        <li>
                            <strong>Komputer Bersama / Publik</strong>: Jika perangkat digunakan oleh banyak orang (komputer kantor bersama atau warnet), pengguna lain yang membuka browser yang sama dapat melihat data di IndexedDB.
                        </li>
                        <li>
                            <strong>Malware / Spyware Lokal</strong>: Jika komputer terinfeksi virus, pencuri data (info-stealer), atau keylogger, data di memori komputer Anda tetap berisiko disadap.
                        </li>
                        <li>
                            <strong>Langkah Pencegahan</strong>: Gunakan tombol <strong>Mulai Ulang</strong> untuk mengosongkan seluruh memori lokal setelah selesai bekerja, terutama jika menggunakan perangkat bersama.
                        </li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">4. Mengapa Data Tersimpan Bisa Hilang & Solusinya?</h2>
                    <p className="text-sm">
                        IndexedDB merupakan memori browser yang dapat dihapus secara otomatis dalam kondisi berikut:
                    </p>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm">
                        <li>
                            <strong>Mode Penyamaran (Incognito)</strong>: Seluruh memori akan langsung dihapus bersih begitu jendela peramban ditutup.
                        </li>
                        <li>
                            <strong>Pembersihan Riwayat (Clear Cache/Storage)</strong>: Menghapus riwayat atau cookies peramban akan ikut membersihkan database lokal RekonMatch.
                        </li>
                        <li>
                            <strong>Saran Praktis</strong>: Manfaatkan tombol <strong>Cadangkan</strong> (.rekon) di bagian bawah panel Sumber Data untuk mengarsipkan setelan dan data penting Anda ke berkas lokal komputer.
                        </li>
                    </ul>
                </div>

                <hr className="border-border" />
                
                <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold mb-1">Pernyataan Penafian (Disclaimer):</p>
                    <p>
                        Aplikasi RekonMatch disediakan sebagaimana adanya (<em>as is</em>) sebagai alat bantu komputasi lokal. Pengguna bertanggung jawab penuh atas keamanan fisik perangkat, kebersihan peramban dari malware/ekstensi berbahaya, serta kebijakan penanganan data rahasia masing-masing institusi.
                    </p>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Saya Mengerti & Setuju</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
