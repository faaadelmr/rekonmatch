import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'RekonMatch',
  description: 'Alat cerdas untuk menanyakan dan memfilter data Excel Anda.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" style={{colorScheme: 'dark'}}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <footer className="bottom-0 left-0 w-full p-4 text-center">
         <p className="text-xs text-muted-foreground">
           &copy; {new Date().getFullYear()} <a href="https://faaadelmr.pages.dev" className="font-bold text-primary hover:text-primary/80">faaadelmr</a>
         </p>
       </footer>
      </body>
    </html>
  );
}
