'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', empresa: '' });
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!aceptaTerminos) {
      setError('Debes aceptar el Aviso de Privacidad y los Términos de Servicio');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, aceptaTerminos }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Error al registrarse');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 px-4 relative overflow-hidden">
      {/* Aurora animated background */}
      <div className="absolute inset-0 bg-aurora pointer-events-none" aria-hidden />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sun className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-400">DM Solar</h1>
          <p className="text-slate-400 text-sm mt-1">Crear cuenta</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Empresa (opcional)
            </label>
            <input
              type="text"
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm"
            />
          </div>

          {/* Consentimiento */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="aceptaTerminos"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="aceptaTerminos" className="text-xs text-slate-500 leading-relaxed">
              He leído y acepto el{' '}
              <a
                href="/aviso-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline"
              >
                Aviso de Privacidad
              </a>{' '}
              y los{' '}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline"
              >
                Términos y Condiciones de Servicio
              </a>
              . Autorizo el tratamiento de mis datos personales conforme a
              las finalidades descritas.
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !aceptaTerminos}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear Cuenta
          </button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
