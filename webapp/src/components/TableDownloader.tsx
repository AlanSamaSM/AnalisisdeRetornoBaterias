'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Check,
} from 'lucide-react';
import {
  TABLAS_DISPONIBLES,
  exportarCSV,
  exportarExcel,
  type TablaId,
} from '@/lib/exportar-tablas';
import type { ResultadoFinanciero } from '@/lib/modelo-financiero';
import type { DatosProyecto } from '@/lib/generar-reporte-pdf';
import { toast } from 'sonner';

interface TableDownloaderProps {
  proyecto: DatosProyecto;
  resultados: ResultadoFinanciero | null;
}

export default function TableDownloader({ proyecto, resultados }: TableDownloaderProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<TablaId>>(new Set());
  const [formato, setFormato] = useState<'excel' | 'csv'>('excel');

  const tablasDisponibles = TABLAS_DISPONIBLES.filter((t) =>
    t.disponible(proyecto, resultados),
  );

  const toggleTabla = (id: TablaId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tablasDisponibles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tablasDisponibles.map((t) => t.id)));
    }
  };

  const handleDescargar = async () => {
    if (selected.size === 0 || !resultados) {
      toast.error('Selecciona al menos una tabla');
      return;
    }

    const ids = Array.from(selected);
    try {
      if (formato === 'excel') {
        await exportarExcel(ids, proyecto, resultados);
      } else {
        exportarCSV(ids, proyecto, resultados);
      }
      toast.success(
        `${ids.length} tabla${ids.length > 1 ? 's' : ''} descargada${ids.length > 1 ? 's' : ''} en ${formato.toUpperCase()}`,
      );
    } catch (err: any) {
      toast.error(`Error al descargar: ${err.message}`);
    }
  };

  if (tablasDisponibles.length === 0) return null;

  const allSelected = selected.size === tablasDisponibles.length;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
      >
        <Download className="w-4 h-4" />
        Descargar Tablas
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl border border-slate-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">
              Selecciona tablas a descargar
            </p>
          </div>

          {/* Table list */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* Select all */}
            <button
              onClick={toggleAll}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition text-left border-b border-slate-50"
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'bg-brand-600 border-brand-600'
                    : 'border-slate-300'
                }`}
              >
                {allSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium text-slate-700">
                Seleccionar todas
              </span>
            </button>

            {tablasDisponibles.map((tabla) => {
              const isSelected = selected.has(tabla.id);
              return (
                <button
                  key={tabla.id}
                  onClick={() => toggleTabla(tabla.id)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left"
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {tabla.label}
                    </p>
                    <p className="text-xs text-slate-400 leading-snug">
                      {tabla.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Format + Download */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {/* Format toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setFormato('excel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  formato === 'excel'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                onClick={() => setFormato('csv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  formato === 'csv'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>

            {/* Download button */}
            <button
              onClick={handleDescargar}
              disabled={selected.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {selected.size > 0
                ? `Descargar (${selected.size})`
                : 'Descargar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
