'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Loader2, ChevronDown, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

/** Collapsible form section */
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </section>
  );
}

/** Label with optional tooltip */
function Label({
  text,
  required,
  tooltip,
}: {
  text: string;
  required?: boolean;
  tooltip?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1">
      {text}
      {required && <span className="text-brand-500">*</span>}
      {tooltip && (
        <span className="group relative">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-10 text-center leading-relaxed">
            {tooltip}
          </span>
        </span>
      )}
    </label>
  );
}

export default function NuevoProyectoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    region: 'NORTE',
    potenciaKw: '',
    capacidadKwh: '',
    precioUsd: '',
    tipoCambio: '18.50',
    aniosProyeccion: '15',
    eficiencia: '0.90',
    horasCargaBase: '6',
    // Especificaciones del equipo
    marcaBess: '',
    modeloBess: '',
    tecnologiaBess: 'LFP',
    vidaUtilAnios: '15',
    garantiaAnios: '5',
    // Información del reporte
    capacidadContratada: '',
    integrador: '',
    preparadoPor: '',
    // Degradación
    tasaDegradacion: '2',
    ciclosAnuales: '300',
    umbralRecompra: '70',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        region: form.region,
        potenciaKw: parseFloat(form.potenciaKw) || 0,
        capacidadKwh: parseFloat(form.capacidadKwh) || 0,
        precioUsd: parseFloat(form.precioUsd) || 0,
        tipoCambio: parseFloat(form.tipoCambio) || 18.5,
        aniosProyeccion: parseInt(form.aniosProyeccion) || 15,
        eficiencia: parseFloat(form.eficiencia) || 0.9,
        horasCargaBase: parseInt(form.horasCargaBase) || 6,
        marcaBess: form.marcaBess,
        modeloBess: form.modeloBess,
        tecnologiaBess: form.tecnologiaBess,
        vidaUtilAnios: parseInt(form.vidaUtilAnios) || 15,
        garantiaAnios: parseInt(form.garantiaAnios) || 5,
        capacidadContratada: parseFloat(form.capacidadContratada) || 0,
        integrador: form.integrador,
        preparadoPor: form.preparadoPor,
        tasaDegradacion: (parseFloat(form.tasaDegradacion) || 2) / 100,
        ciclosAnuales: parseInt(form.ciclosAnuales) || 300,
        umbralRecompra: (parseFloat(form.umbralRecompra) || 70) / 100,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success('Proyecto creado exitosamente');
      router.push(`/proyecto/${data.id}`);
    } else {
      toast.error(data.error || 'Error al crear el proyecto');
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
          className="space-y-4"
        >
          {/* General */}
          <Section title="Información General">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label text="Nombre del proyecto" required />
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputClass}
                  placeholder="Mi Proyecto BESS"
                />
              </div>
            </div>
          </Section>

          {/* BESS System */}
          <Section title="Sistema de Almacenamiento (BESS)">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Potencia (kW)" required tooltip="Potencia nominal de descarga del sistema BESS" />
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
                <Label text="Capacidad (kWh)" required tooltip="Energía total que puede almacenar el sistema" />
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
                <Label text="Región" tooltip="Región tarifaria CFE que aplica a este suministro" />
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
                <Label text="Eficiencia" tooltip="Eficiencia round-trip del sistema (0.85 – 0.95 típico)" />
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
                <Label text="Horas de carga BASE" tooltip="Horas durante periodo base para carga completa" />
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
          </Section>

          {/* Investment */}
          <Section title="Inversión">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Precio del sistema (USD)" required />
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
                <Label text="Tipo de cambio (MXN/USD)" tooltip="Tipo de cambio para convertir USD a MXN" />
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
                <Label text="Años de proyección" tooltip="Periodo del análisis financiero (1–30 años)" />
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
          </Section>

          {/* Especificaciones del Equipo */}
          <Section title="Especificaciones del Equipo" defaultOpen={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Marca" />
                <input
                  type="text"
                  value={form.marcaBess}
                  onChange={(e) => setForm({ ...form, marcaBess: e.target.value })}
                  className={inputClass}
                  placeholder="GOTION"
                />
              </div>
              <div>
                <Label text="Modelo" />
                <input
                  type="text"
                  value={form.modeloBess}
                  onChange={(e) => setForm({ ...form, modeloBess: e.target.value })}
                  className={inputClass}
                  placeholder="ESD1331-05P5015"
                />
              </div>
              <div>
                <Label text="Tecnología" />
                <select
                  value={form.tecnologiaBess}
                  onChange={(e) => setForm({ ...form, tecnologiaBess: e.target.value })}
                  className={inputClass}
                >
                  <option value="LFP">LFP (Litio Ferro Fosfato)</option>
                  <option value="NMC">NMC (Níquel Manganeso Cobalto)</option>
                  <option value="LTO">LTO (Titanato de Litio)</option>
                  <option value="NaS">NaS (Sodio-Azufre)</option>
                </select>
              </div>
              <div>
                <Label text="Vida útil (años)" />
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.vidaUtilAnios}
                  onChange={(e) => setForm({ ...form, vidaUtilAnios: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label text="Garantía (años)" />
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={form.garantiaAnios}
                  onChange={(e) => setForm({ ...form, garantiaAnios: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label text="Capacidad contratada CFE (kW)" tooltip="Demanda máxima contratada con CFE" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.capacidadContratada}
                  onChange={(e) => setForm({ ...form, capacidadContratada: e.target.value })}
                  className={inputClass}
                  placeholder="1720"
                />
              </div>
            </div>
          </Section>

          {/* Información del Reporte */}
          <Section title="Información del Reporte" defaultOpen={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Integrador" />
                <input
                  type="text"
                  value={form.integrador}
                  onChange={(e) => setForm({ ...form, integrador: e.target.value })}
                  className={inputClass}
                  placeholder="Sistemas Solares del Bajío S.A. de C.V."
                />
              </div>
              <div>
                <Label text="Preparado por" />
                <input
                  type="text"
                  value={form.preparadoPor}
                  onChange={(e) => setForm({ ...form, preparadoPor: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre – Cargo"
                />
              </div>
            </div>
          </Section>

          {/* Degradación */}
          <Section title="Parámetros de Degradación" defaultOpen={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Tasa de degradación anual (%)" tooltip="Porcentaje de capacidad que pierde la batería cada año" />
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.tasaDegradacion}
                  onChange={(e) => setForm({ ...form, tasaDegradacion: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label text="Ciclos anuales" tooltip="Número esperado de ciclos completos de carga/descarga por año" />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.ciclosAnuales}
                  onChange={(e) => setForm({ ...form, ciclosAnuales: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label text="Umbral de recompra (%)" tooltip="Cuando la capacidad cae por debajo de este %, se sugiere reemplazo" />
                <input
                  type="number"
                  min="50"
                  max="95"
                  step="1"
                  value={form.umbralRecompra}
                  onChange={(e) => setForm({ ...form, umbralRecompra: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          <div className="flex justify-end gap-3 pt-4">
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
