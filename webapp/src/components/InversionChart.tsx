'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface FilaInversion {
  anio: number;
  inversion: number;
  ahorroCfe: number;
  ahorroNetoAnual: number;
  ahorroAcumulado: number;
}

export default function InversionChart({
  data,
  roiExacto,
}: {
  data: FilaInversion[];
  roiExacto: number | null;
}) {
  const chartData = data.map((d) => ({
    name: `Año ${d.anio}`,
    acumulado: d.ahorroAcumulado,
    ahorro: d.ahorroNetoAnual,
    inversion: d.inversion,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Flujo de Caja — Inversión de Capital
        </h3>
        {roiExacto !== null && (
          <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">
            ROI: {roiExacto} años
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={Math.max(0, Math.floor(data.length / 10) - 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) =>
              `$${(v / 1_000_000).toFixed(1)}M`
            }
          />
          <Tooltip
            formatter={(value: number) =>
              `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            }
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
          <Bar dataKey="acumulado" name="Acumulado" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.acumulado >= 0 ? '#16a34a' : '#dc2626'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
