import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Resonai',
  description:
    'Resonai  a local-first voice feminization trainer with live mic visualization and gentle, science-backed guidance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <a href="/" className="font-semibold">Resonai</a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-muted-foreground hover:text-foreground">Home</a>
              <a href="/listen" className="text-muted-foreground hover:text-foreground">Listen</a>
              <a href="/practice" className="text-muted-foreground hover:text-foreground">Practice</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
