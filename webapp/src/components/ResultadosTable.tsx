'use client';

interface ComparativoRow {
  periodo: string;
  cargoSinBess: number;
  cargoConBess: number;
  ahorroCapacidad: number;
  costoCargaBase: number;
  ahorroNeto: number;
  pctAhorroNeto: number;
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResultadosTable({ data }: { data: ComparativoRow[] }) {
  const filas = data.filter((d) => d.periodo !== 'TOTAL ANUAL');
  const total = data.find((d) => d.periodo === 'TOTAL ANUAL');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">
          Comparativo de Recibos — Capacidad + Carga BASE
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">Periodo</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cap s/BESS</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cap c/BESS</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Ahorro Cap</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Costo Carga</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Ahorro Neto</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition">
                <td className="px-4 py-2.5 font-medium text-slate-700">{row.periodo}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.cargoSinBess)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.cargoConBess)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{fmt(row.ahorroCapacidad)}</td>
                <td className="px-4 py-2.5 text-right text-red-600">{fmt(row.costoCargaBase)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">{fmt(row.ahorroNeto)}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{row.pctAhorroNeto.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
          {total && (
            <tfoot>
              <tr className="bg-slate-800 text-white font-semibold">
                <td className="px-4 py-3">{total.periodo}</td>
                <td className="px-4 py-3 text-right">{fmt(total.cargoSinBess)}</td>
                <td className="px-4 py-3 text-right">{fmt(total.cargoConBess)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{fmt(total.ahorroCapacidad)}</td>
                <td className="px-4 py-3 text-right text-red-300">{fmt(total.costoCargaBase)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{fmt(total.ahorroNeto)}</td>
                <td className="px-4 py-3 text-right">{total.pctAhorroNeto.toFixed(0)}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
