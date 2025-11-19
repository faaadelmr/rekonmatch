// src/ai/genkit.ts - VERSI OFFLINE
// Ekspor objek kosong atau fungsi dummy untuk menggantikan integrasi AI

// Definisikan tipe dasar untuk AI jika diperlukan oleh kode lain
export interface AIConfig {
  model?: string;
  // Tambahkan konfigurasi lain yang mungkin diperlukan
}

export interface GenerationOptions {
  prompt: string;
  model?: string;
  // Tambahkan opsi lain yang mungkin diperlukan
}

// Fungsi dummy untuk menggantikan integrasi AI
export const ai = {
  /**
   * Fungsi dummy untuk menggantikan fungsi generate dari Genkit
   * @param options - Opsi untuk generasi teks
   * @returns Promise yang menolak dengan error karena fungsi tidak tersedia offline
   */
  generate: async (options: GenerationOptions): Promise<string> => {
    return Promise.reject(new Error("Fungsi AI tidak tersedia dalam mode offline"));
  },
  
  /**
   * Fungsi dummy untuk menggantikan fungsi configure dari Genkit
   */
  configure: (config: AIConfig): void => {
    console.warn("Fungsi konfigurasi AI tidak tersedia dalam mode offline");
  },
  
  // Tambahkan fungsi dummy lainnya sesuai kebutuhan aplikasi
};

// Fungsi helper untuk mengecek apakah mode offline aktif
export const isOfflineMode = (): boolean => {
  // Dalam implementasi nyata, Anda mungkin ingin mengecek koneksi jaringan
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
};

// Tambahkan ekspor lain yang mungkin dibutuhkan oleh file lain
export default ai;