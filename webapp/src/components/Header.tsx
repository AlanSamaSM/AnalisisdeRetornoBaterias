'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, LayoutDashboard, Sun } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-brand-600">
              DM Solar<span className="text-slate-800 ml-1.5 text-sm font-semibold">BESS</span>
            </span>
          </Link>

          {/* Nav */}
          {session && (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                Proyectos
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-sm text-slate-500">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
