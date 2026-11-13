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
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner group-hover:scale-105 transition-transform">
                दृ
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-wider text-slate-100 group-hover:text-cyan-400 transition-colors">
                  DRISHTIRAKSHA
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  PS11 Intelligence
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="ml-3 pl-3 border-l border-slate-800 flex items-center gap-2 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  backendOnline === true
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : backendOnline === false
                    ? 'bg-rose-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
                title={
                  backendOnline === true
                    ? `Backend Online (v${health?.version || '0.1.0'})`
                    : backendOnline === false
                    ? 'Backend Disconnected (Port 8000)'
                    : 'Connecting to Backend...'
                }
              />
              <span className="text-slate-400 hidden md:inline">
                {backendOnline === true ? 'API Connected' : backendOnline === false ? 'API Offline' : 'Connecting'}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
