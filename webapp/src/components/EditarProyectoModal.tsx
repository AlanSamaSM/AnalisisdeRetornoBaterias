'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DIVISIONES_CFE } from '@/lib/divisiones';

export interface ProyectoFormData {
  nombre: string;
  cliente?: string | null;
  division: string;
  potenciaKw: number;
  capacidadKwh: number;
  precioUsd: number;
  tipoCambio: number;
  aniosProyeccion: number;
  eficiencia: number;
  horasCargaBase: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  proyectoId: string;
  initial: ProyectoFormData;
  onSaved: () => void;
}

export default function EditarProyectoModal({
  open,
  onClose,
  proyectoId,
  initial,
  onSaved,
}: Props) {
  const [form, setForm] = useState<ProyectoFormData>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const setNum = (key: keyof ProyectoFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, [key]: v === '' ? 0 : Number(v) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al guardar');
        return;
      }
      toast.success('Parámetros actualizados');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-1.5 rounded-md border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-200 outline-none text-sm';
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar parámetros del proyecto"
      size="2xl"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">General</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Nombre del proyecto</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>División tarifaria CFE</label>
              <select
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
                className={inputClass}
              >
                {DIVISIONES_CFE.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Sistema BESS</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Potencia (kW)</label>
              <input type="number" step="any" value={form.potenciaKw} onChange={setNum('potenciaKw')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Capacidad (kWh)</label>
              <input type="number" step="any" value={form.capacidadKwh} onChange={setNum('capacidadKwh')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Eficiencia</label>
              <input type="number" step="0.01" min="0.5" max="1" value={form.eficiencia} onChange={setNum('eficiencia')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Horas carga BASE</label>
              <input type="number" min="1" max="12" value={form.horasCargaBase} onChange={setNum('horasCargaBase')} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Inversión</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Precio USD</label>
              <input type="number" step="any" value={form.precioUsd} onChange={setNum('precioUsd')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tipo de cambio</label>
              <input type="number" step="0.01" value={form.tipoCambio} onChange={setNum('tipoCambio')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Años proyección</label>
              <input type="number" min="1" max="30" value={form.aniosProyeccion} onChange={setNum('aniosProyeccion')} className={inputClass} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
