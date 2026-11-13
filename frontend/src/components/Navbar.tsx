'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchHealth } from '@/lib/api';
import { HealthData } from '@/lib/types';

export function Navbar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchHealth()
      .then((data) => {
        if (mounted) {
          setHealth(data);
          setBackendOnline(true);
        }
      })
      .catch(() => {
        if (mounted) setBackendOnline(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'New Investigation', href: '/investigate' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center font-bold text-white text-base shadow-xs group-hover:bg-teal-900 transition-colors">
                दृ
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wider text-slate-900 group-hover:text-teal-800 transition-colors leading-tight">
                  DRISHTIRAKSHA
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Misinformation & Media Intelligence
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-slate-100 text-teal-900 border border-slate-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="ml-2 pl-3 border-l border-slate-200 flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline === true
                    ? 'bg-emerald-500 ring-2 ring-emerald-200'
                    : backendOnline === false
                    ? 'bg-rose-500 ring-2 ring-rose-200'
                    : 'bg-amber-400 animate-pulse'
                }`}
                title={
                  backendOnline === true
                    ? `System online (FastAPI backend active)`
                    : backendOnline === false
                    ? 'Connection unavailable (Check localhost:8000)'
                    : 'Connecting...'
                }
              />
              <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">
                {backendOnline === true
                  ? 'System online'
                  : backendOnline === false
                  ? 'Connection unavailable'
                  : 'Connecting...'}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
