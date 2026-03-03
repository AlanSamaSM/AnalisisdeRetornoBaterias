'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, LayoutDashboard, Sun, Menu, X } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-md">
              <Sun className="w-5 h-5 text-white transition-transform duration-500 group-hover:rotate-90" />
            </div>
            <span className="text-lg font-bold text-brand-600 transition-colors duration-200">
              DM Solar<span className="text-slate-800 ml-1.5 text-sm font-semibold">BESS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {session && (
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="relative flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 transition-colors duration-200 py-1 group"
              >
                <LayoutDashboard className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                Proyectos
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full rounded-full" />
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-sm text-slate-500">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                aria-label="Cerrar sesión"
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {session && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="sm:hidden p-2 text-slate-600 hover:text-brand-600 transition-colors duration-200 hover:bg-brand-50 rounded-lg"
            >
              <div className="relative w-5 h-5">
                <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${menuOpen ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-75'}`} />
                <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${menuOpen ? '-rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'}`} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {session && (
        <div className={`sm:hidden border-t border-slate-100 bg-white/95 backdrop-blur-sm overflow-hidden transition-all duration-300 ease-bounce-out ${menuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs text-slate-400 px-3 py-1 uppercase tracking-wider">
              {session.user?.name}
            </p>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              Proyectos
            </Link>
            <button
              onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
