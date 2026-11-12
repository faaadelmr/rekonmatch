import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'RekonMatch',
  description: 'Alat cerdas untuk menanyakan dan memfilter data Excel Anda.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('rekonmatch_theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else if (theme === 'pink') {
                  document.documentElement.classList.add('pink');
                  document.documentElement.style.colorScheme = 'light';
                } else {
                  document.documentElement.classList.remove('dark', 'pink');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <footer className="w-full py-4 px-4 font-mono text-xs">
          <div className="max-w-4xl mx-auto rounded-lg border border-border/50 bg-card/90 backdrop-blur shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 gap-3">
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
              </div>
              <div className="flex items-center gap-2 truncate text-muted-foreground text-[11px] sm:text-xs">
                <span className="text-yellow-500 dark:text-yellow-400 font-bold">➜</span>
                <span className="text-primary font-semibold">~</span>
                <span className="text-foreground font-medium">hostnamectl</span>
                <span className="opacity-40">•</span>
                <span className="truncate">&copy; {new Date().getFullYear()} <span className="text-foreground font-semibold">RekonMatch</span></span>
                <span className="opacity-40">•</span>
                <span className="truncate">
                  Crafted by{' '}
                  <a
                    href="https://faaadelmr.pages.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold transition-colors"
                  >
                    faaadelmr
                  </a>
                </span>
              </div>
              <div className="hidden sm:block text-[10px] text-muted-foreground/60 shrink-0 select-none">bash</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
