import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DRISHTIRAKSHA — Misinformation & Multimodal Intelligence',
  description:
    'Investigate suspicious media, claims and online activity with genuine pretrained models and transparent evidence verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-50 text-slate-800 antialiased">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-teal-700 selection:text-white">
        <Suspense fallback={<header className="h-16 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>DRISHTIRAKSHA • Hackathon PS11 Investigation Platform</span>
            <span className="text-slate-400">Zero-Fabrication Architecture • Strict Verifiable Evidence</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
