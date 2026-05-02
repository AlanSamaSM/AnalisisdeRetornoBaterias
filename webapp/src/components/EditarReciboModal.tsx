'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface ReciboFormData {
  id?: string;
  mes: string;
  anio: number;
  dias: number;
  temporada: string;
  consumoPunta: number;
  consumoIntermedia: number;
  consumoBase: number;
  totalConsumo: number;
  demandaPunta: number;
  demandaIntermedia: number;
  demandaBase: number;
  demandaMaxima: number;
  factorCarga: number;
  factorPotencia: number;
  cargoCapacidadRecibo: number;
  cargoDistribucion: number;
  cargoEnergiaPunta: number;
  cargoEnergiaIntermedia: number;
  cargoEnergiaBase: number;
  importeTotal: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  proyectoId: string;
  /** Si está presente, modo edición. Si no, modo crear nuevo. */
  recibo?: ReciboFormData | null;
  /** Llamado tras guardar OK. La página padre debe recargar el proyecto. */
  onSaved: () => void;
}

const emptyForm: ReciboFormData = {
  mes: 'Enero',
  anio: new Date().getFullYear(),
  dias: 30,
  temporada: 'INVIERNO',
  consumoPunta: 0,
  consumoIntermedia: 0,
  consumoBase: 0,
  totalConsumo: 0,
  demandaPunta: 0,
  demandaIntermedia: 0,
  demandaBase: 0,
  demandaMaxima: 0,
  factorCarga: 0,
  factorPotencia: 0,
  cargoCapacidadRecibo: 0,
  cargoDistribucion: 0,
  cargoEnergiaPunta: 0,
  cargoEnergiaIntermedia: 0,
  cargoEnergiaBase: 0,
  importeTotal: 0,
};

export default function EditarReciboModal({
  open,
  onClose,
  proyectoId,
  recibo,
  onSaved,
}: Props) {
  const isEdit = !!recibo?.id;
  const [form, setForm] = useState<ReciboFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Reset form when opening / switching recibo
  useEffect(() => {
    if (open) {
      setForm(recibo ? { ...recibo } : { ...emptyForm });
    }
  }, [open, recibo]);

  const setField = (key: keyof ReciboFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNum = (key: keyof ReciboFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setField(key, v === '' ? 0 : Number(v));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/recibos/${recibo!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch('/api/recibos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proyectoId, ...form }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al guardar el recibo');
        return;
      }
      toast.success(isEdit ? 'Recibo actualizado' : 'Recibo agregado');
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
      title={isEdit ? `Editar recibo — ${recibo?.mes} ${recibo?.anio}` : 'Agregar recibo manual'}
      size="3xl"
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
            {isEdit ? 'Guardar cambios' : 'Agregar recibo'}
          </button>
        </>
      }
    >
      {/* Periodo */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Periodo</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Mes</label>
            <select
              value={form.mes}
              onChange={(e) => setField('mes', e.target.value)}
              disabled={isEdit}
              className={inputClass + (isEdit ? ' bg-slate-50' : '')}
            >
              {MESES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Año</label>
            <input
              type="number"
              value={form.anio}
              onChange={setNum('anio')}
              disabled={isEdit}
              className={inputClass + (isEdit ? ' bg-slate-50' : '')}
            />
          </div>
          <div>
            <label className={labelClass}>Días</label>
            <input type="number" value={form.dias} onChange={setNum('dias')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Temporada</label>
            <select
              value={form.temporada}
              onChange={(e) => setField('temporada', e.target.value)}
              className={inputClass}
            >
              <option value="VERANO">Verano</option>
              <option value="INVIERNO">Invierno</option>
            </select>
          </div>
        </div>
      </div>

      {/* Consumos */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Consumos (kWh)</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Punta</label>
            <input type="number" value={form.consumoPunta} onChange={setNum('consumoPunta')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Intermedia</label>
            <input type="number" value={form.consumoIntermedia} onChange={setNum('consumoIntermedia')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Base</label>
            <input type="number" value={form.consumoBase} onChange={setNum('consumoBase')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total</label>
            <input type="number" value={form.totalConsumo} onChange={setNum('totalConsumo')} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Demandas */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Demandas (kW)</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Punta</label>
            <input type="number" value={form.demandaPunta} onChange={setNum('demandaPunta')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Intermedia</label>
            <input type="number" value={form.demandaIntermedia} onChange={setNum('demandaIntermedia')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Base</label>
            <input type="number" value={form.demandaBase} onChange={setNum('demandaBase')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Máxima</label>
            <input type="number" value={form.demandaMaxima} onChange={setNum('demandaMaxima')} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Factores */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Factores (%)</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Factor de Carga</label>
            <input type="number" step="0.01" value={form.factorCarga} onChange={setNum('factorCarga')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Factor de Potencia</label>
            <input type="number" step="0.01" value={form.factorPotencia} onChange={setNum('factorPotencia')} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Cargos del recibo */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Importes del recibo CFE ($)</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Capacidad</label>
            <input type="number" step="0.01" value={form.cargoCapacidadRecibo} onChange={setNum('cargoCapacidadRecibo')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Distribución</label>
            <input type="number" step="0.01" value={form.cargoDistribucion} onChange={setNum('cargoDistribucion')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Energía Punta</label>
            <input type="number" step="0.01" value={form.cargoEnergiaPunta} onChange={setNum('cargoEnergiaPunta')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Energía Intermedia</label>
            <input type="number" step="0.01" value={form.cargoEnergiaIntermedia} onChange={setNum('cargoEnergiaIntermedia')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Energía Base</label>
            <input type="number" step="0.01" value={form.cargoEnergiaBase} onChange={setNum('cargoEnergiaBase')} className={inputClass} />
          </div>
          <div className="col-span-3">
            <label className={labelClass}>Importe Total</label>
            <input type="number" step="0.01" value={form.importeTotal} onChange={setNum('importeTotal')} className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
