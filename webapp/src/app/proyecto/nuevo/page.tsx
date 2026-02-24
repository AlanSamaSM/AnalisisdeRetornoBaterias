'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

export default function NuevoProyectoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    cliente: '',
    region: 'NORTE',
    potenciaKw: '',
    capacidadKwh: '',
    precioUsd: '',
    tipoCambio: '18.50',
    aniosProyeccion: '15',
    eficiencia: '0.90',
    horasCargaBase: '6',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        cliente: form.cliente,
        region: form.region,
        potenciaKw: parseFloat(form.potenciaKw) || 0,
        capacidadKwh: parseFloat(form.capacidadKwh) || 0,
        precioUsd: parseFloat(form.precioUsd) || 0,
        tipoCambio: parseFloat(form.tipoCambio) || 18.5,
        aniosProyeccion: parseInt(form.aniosProyeccion) || 15,
        eficiencia: parseFloat(form.eficiencia) || 0.9,
        horasCargaBase: parseInt(form.horasCargaBase) || 6,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/proyecto/${data.id}`);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition text-sm';

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          Nuevo Proyecto
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8"
        >
          {/* General */}
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Información General
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Nombre del proyecto *
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputClass}
                  placeholder="Mi Proyecto BESS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className={inputClass}
                  placeholder="Empresa del cliente"
                />
              </div>
            </div>
          </section>

          {/* BESS System */}
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Sistema de Almacenamiento (BESS)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Potencia (kW) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={form.potenciaKw}
                  onChange={(e) => setForm({ ...form, potenciaKw: e.target.value })}
                  className={inputClass}
                  placeholder="250"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Capacidad (kWh) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={form.capacidadKwh}
                  onChange={(e) => setForm({ ...form, capacidadKwh: e.target.value })}
                  className={inputClass}
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Región
                </label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className={inputClass}
                >
                  <option value="NORTE">Norte</option>
                  <option value="CENTRAL">Central</option>
                  <option value="BAJA CALIFORNIA SUR">Baja California Sur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Eficiencia
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={form.eficiencia}
                  onChange={(e) => setForm({ ...form, eficiencia: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Horas de carga BASE
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.horasCargaBase}
                  onChange={(e) => setForm({ ...form, horasCargaBase: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Investment */}
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Inversión
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Precio del sistema (USD) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={form.precioUsd}
                  onChange={(e) => setForm({ ...form, precioUsd: e.target.value })}
                  className={inputClass}
                  placeholder="150000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Tipo de cambio (MXN/USD)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.tipoCambio}
                  onChange={(e) => setForm({ ...form, tipoCambio: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Años de proyección
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.aniosProyeccion}
                  onChange={(e) => setForm({ ...form, aniosProyeccion: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60 flex items-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Proyecto
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
