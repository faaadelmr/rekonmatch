import type {NextConfig} from 'next';
// @ts-ignore
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Nonaktifkan penggunaan gambar remote untuk mode offline
  images: {
    unoptimized: true, // Gunakan gambar lokal saja, jangan optimasi dari remote
  },
  // Hapus konfigurasi serverExternalPackages untuk paket AI karena tidak digunakan dalam mode offline
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Aktifkan PWA bahkan di development untuk testing offline
  disable: false, // Ubah dari process.env.NODE_ENV === 'development'
})(nextConfig);