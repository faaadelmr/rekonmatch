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
  images: {
    unoptimized: true, // Gunakan gambar lokal saja, jangan optimasi dari remote
  },
  // Hapus referensi ke paket AI karena tidak digunakan dalam mode offline
};

const isDev = process.env.NODE_ENV === 'development';

export default isDev 
  ? nextConfig 
  : withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
    })(nextConfig);
