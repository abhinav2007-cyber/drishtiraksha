import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DRISHTIRAKSHA — Multimodal Deepfake & Misinformation Intelligence',
  description:
    'Real-time investigation platform for multimodal deepfake detection, multilingual claim verification, and coordinated network intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
        <Suspense fallback={<header className="h-16 bg-slate-900 border-b border-slate-800" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DRISHTIRAKSHA • PS11 Intelligence Platform • YUKTIK 2026</span>
            <span className="text-slate-600">Zero-Fabrication Verifiable Architecture</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
