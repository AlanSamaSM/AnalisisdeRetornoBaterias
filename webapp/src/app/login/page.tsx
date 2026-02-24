'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sun, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError('Email o contraseña incorrectos');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 px-4 relative overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg className="wave-1 absolute bottom-0 left-0 w-[200%] opacity-[0.07]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#f97316" d="M0,224L60,218.7C120,213,240,203,360,208C480,213,600,235,720,229.3C840,224,960,192,1080,186.7C1200,181,1320,203,1380,213.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
        </svg>
        <svg className="wave-2 absolute bottom-0 left-0 w-[200%] opacity-[0.05]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#3b82f6" d="M0,160L48,170.7C96,181,192,203,288,202.7C384,203,480,181,576,170.7C672,160,768,160,864,176C960,192,1056,224,1152,218.7C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
        <svg className="wave-3 absolute bottom-0 left-0 w-[200%] opacity-[0.04]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#f97316" d="M0,288L80,272C160,256,320,224,480,218.7C640,213,800,235,960,245.3C1120,256,1280,256,1360,256L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sun className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-400">
            DM Solar
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de Retorno de Baterías BESS
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
              placeholder="tu@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Iniciar Sesión
          </button>

          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link
              href="/registro"
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
