'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import KPICard from '@/components/KPICard';
import ResultadosTable from '@/components/ResultadosTable';
import InversionChart from '@/components/InversionChart';
import UploadZone from '@/components/UploadZone';
import {
  Loader2,
  BatteryCharging,
  TrendingUp,
  DollarSign,
  Clock,
  Upload,
  Download,
  Zap,
} from 'lucide-react';

interface Recibo {
  id: string;
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
  factorCarga: number;
}

function fmt(n: number): string {
  return (
    '$' +
    n.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(n) >= 1_000) {
    return '$' + (n / 1_000).toFixed(1) + 'K';
  }
  return '$' + n.toFixed(2);
}

export default function ProyectoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [proyecto, setProyecto] = useState<any>(null);
  const [resultados, setResultados] = useState<any>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Load project
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/proyectos/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setProyecto(data);
        if (data.resultadosJson) {
          setResultados(JSON.parse(data.resultadosJson));
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/dashboard');
      });
  }, [status, id, router]);

  // Upload PDFs and run analysis
  const handleAnalizar = async () => {
    if (pdfFiles.length === 0) return;
    setUploading(true);
    setUploadMsg('Procesando recibos...');

    const formData = new FormData();
    formData.append('proyectoId', id);
    pdfFiles.forEach((f) => formData.append('pdfs', f));

    try {
      const res = await fetch('/api/analizar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      // Always capture the log
      if (data.log) {
        setDebugLog(data.log);
        setShowLog(true);
      }

      if (res.ok) {
        setUploadMsg(
          `${data.recibos} recibos procesados.${
            data.errores?.length ? ` Errores: ${data.errores.join(', ')}` : ''
          }`,
        );
        if (data.resultadoFinanciero) {
          setResultados(data.resultadoFinanciero);
        }
        // Reload project
        const p = await fetch(`/api/proyectos/${id}`).then((r) => r.json());
        setProyecto(p);
      } else {
        setUploadMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setUploadMsg(`Error: ${err.message}`);
    }

    setUploading(false);
  };

  // Download CSV of parsed receipts
  const handleDescargarCSV = () => {
    if (!proyecto?.recibos || proyecto.recibos.length === 0) return;

    const headers = [
      'Estado', 'Municipio', 'Año', 'Mes', 'Días',
      'Horario (Invierno/Verano)',
      'Consumo punta', 'Unidades', 'Consumo intermedio', 'Unidades',
      'Consumo base', 'Unidades', 'Total de consumo', 'Unidades',
      'Demanda Punta', 'Unidades', 'Demanda Intermedia', 'Unidades',
      'Demanda base', 'Unidades', 'Demanda Maxima', 'Unidades',
      'Factor de carga', 'Unidades',
    ];

    const fmtNum = (n: number) =>
      n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const rows = proyecto.recibos.map((r: Recibo) => [
      proyecto.estado || '',
      proyecto.municipio || '',
      r.anio,
      r.mes,
      r.dias,
      r.temporada,
      `"${fmtNum(r.consumoPunta)}"`, 'kWh',
      `"${fmtNum(r.consumoIntermedia)}"`, 'kWh',
      `"${fmtNum(r.consumoBase)}"`, 'kWh',
      `"${fmtNum(r.totalConsumo)}"`, 'kWh',
      r.demandaPunta, 'kW',
      r.demandaIntermedia, 'kW',
      r.demandaBase, 'kW',
      r.demandaPunta > r.demandaIntermedia
        ? r.demandaPunta
        : r.demandaIntermedia,
      'kW',
      r.factorCarga, '%',
    ]);

    const csvContent =
      '\uFEFF' +
      headers.join(',') +
      '\n' +
      rows.map((row: any[]) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proyecto.nombre.replace(/\s+/g, '_')}_consumos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download PDF report
  const handleDescargarPDF = async () => {
    if (!resultados) return;

    // Dynamic import jsPDF
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const p = proyecto;
    const r = resultados;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(19, 40, 87);
    doc.text('BESS Analyzer — Reporte Financiero', 14, 22);

    // System info
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Proyecto: ${p.nombre}`, 14, 35);
    doc.text(
      `Sistema: ${r.parametros.potenciaKw} kW / ${r.parametros.capacidadKwh} kWh`,
      14,
      42,
    );
    doc.text(
      `Inversión: ${fmtCompact(r.inversionMxn)} MXN (${fmt(
        r.parametros.precioUsd,
      )} USD)`,
      14,
      49,
    );
    doc.text(`Región: ${r.parametros.region}`, 14, 56);

    // KPIs
    let y = 68;
    doc.setFontSize(14);
    doc.setTextColor(19, 40, 87);
    doc.text('Resumen de Resultados', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(50);
    const kpis = [
      ['Ahorro Neto Anual', fmt(r.totales.ahorroNeto) + ' MXN'],
      ['Ahorro Capacidad (PUNTA)', fmt(r.totales.ahorroCapacidad) + ' MXN'],
      ['Costo Carga BESS (BASE)', '-' + fmt(r.totales.costoCargaBase) + ' MXN'],
      ['% Ahorro vs CFE', r.totales.pctAhorroNeto.toFixed(0) + '%'],
      ['Retorno de Inversión', r.roiExacto ? `${r.roiExacto} años` : 'N/A'],
      [
        'Ahorro Total Vida Útil',
        fmt(r.ahorroTotalVidaUtil) + ' MXN',
      ],
    ];
    kpis.forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 14, y);
      y += 6;
    });

    // Comparativo table
    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(19, 40, 87);
    doc.text('Comparativo Mensual', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Periodo',
          'Cap s/BESS',
          'Cap c/BESS',
          'Ahorro Cap',
          'Costo Carga',
          'Ahorro Neto',
          '%',
        ],
      ],
      body: r.comparativo.map((c: any) => [
        c.periodo,
        fmt(c.cargoSinBess),
        fmt(c.cargoConBess),
        fmt(c.ahorroCapacidad),
        fmt(c.costoCargaBase),
        fmt(c.ahorroNeto),
        c.pctAhorroNeto.toFixed(0) + '%',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [19, 40, 87] },
    });

    // Investment table
    const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
    if (finalY > 240) doc.addPage();
    const startY2 = finalY > 240 ? 20 : finalY + 12;

    doc.setFontSize(14);
    doc.setTextColor(19, 40, 87);
    doc.text('Inversión de Capital', 14, startY2);

    autoTable(doc, {
      startY: startY2 + 4,
      head: [
        ['Año', 'Inversión', 'Ahorro CFE', 'Ahorro Neto', 'Acumulado'],
      ],
      body: r.tablaInversion.map((f: any) => [
        f.anio,
        f.inversion ? fmt(f.inversion) : '',
        f.ahorroCfe ? fmt(f.ahorroCfe) : '',
        f.ahorroNetoAnual ? fmt(f.ahorroNetoAnual) : '',
        fmt(f.ahorroAcumulado),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [19, 40, 87] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `BESS Analyzer — ${new Date().toLocaleDateString('es-MX')} — Página ${i}/${pageCount}`,
        14,
        290,
      );
    }

    doc.save(`${p.nombre.replace(/\s+/g, '_')}_reporte_BESS.pdf`);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!proyecto) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {proyecto.nombre}
            </h1>
            {proyecto.cliente && (
              <p className="text-sm text-slate-500 mt-0.5">
                {proyecto.cliente}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {proyecto.recibos && proyecto.recibos.length > 0 && (
              <button
                onClick={handleDescargarCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar CSV Consumos
              </button>
            )}
            {resultados && (
              <button
                onClick={handleDescargarPDF}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Cargar Recibos CFE
          </h2>
          <UploadZone onFilesSelected={setPdfFiles} />

          {pdfFiles.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleAnalizar}
                disabled={uploading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60 flex items-center gap-2 text-sm"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Analizar Recibos
              </button>
              {uploadMsg && (
                <p className="text-sm text-slate-500">{uploadMsg}</p>
              )}
            </div>
          )}
        </div>

        {/* Recibos loaded */}
        {proyecto.recibos && proyecto.recibos.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">
              Recibos cargados ({proyecto.recibos.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {proyecto.recibos.map((r: Recibo) => (
                <span
                  key={r.id}
                  className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600"
                >
                  {r.mes} {r.anio}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Debug Log Panel */}
        {debugLog.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-sm mb-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Log de Análisis ({debugLog.length} entradas)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(debugLog.join('\n'));
                    alert('Log copiado al portapapeles');
                  }}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition"
                >
                  Copiar Log
                </button>
                <button
                  onClick={() => setShowLog(!showLog)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition"
                >
                  {showLog ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {showLog && (
              <div className="p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {debugLog.map((line, i) => {
                    let color = 'text-green-400';
                    if (line.includes('❌')) color = 'text-red-400';
                    else if (line.includes('⚠️')) color = 'text-amber-400';
                    else if (line.includes('===')) color = 'text-cyan-400 font-bold';
                    else if (line.includes('---')) color = 'text-blue-400';
                    return (
                      <span key={i} className={color}>
                        {line}
                        {'\n'}
                      </span>
                    );
                  })}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {resultados && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <KPICard
                label="Ahorro Neto Anual"
                value={fmtCompact(resultados.totales.ahorroNeto) + ' MXN'}
                variant="positive"
                icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              />
              <KPICard
                label="Retorno de Inversión"
                value={
                  resultados.roiExacto
                    ? `${resultados.roiExacto} años`
                    : 'N/A'
                }
                variant="highlight"
                icon={<Clock className="w-5 h-5 text-brand-600" />}
              />
              <KPICard
                label="Inversión Total"
                value={fmtCompact(resultados.inversionMxn) + ' MXN'}
                subtitle={fmt(resultados.parametros.precioUsd) + ' USD'}
                icon={<DollarSign className="w-5 h-5 text-slate-600" />}
              />
              <KPICard
                label="Sistema BESS"
                value={`${resultados.parametros.potenciaKw} kW`}
                subtitle={`${resultados.parametros.capacidadKwh} kWh LFP`}
                icon={<BatteryCharging className="w-5 h-5 text-brand-600" />}
              />
            </div>

            {/* Propose summary */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-6 mb-8 text-white">
              <h3 className="text-lg font-bold mb-4">Propuesta Óptima</h3>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-brand-200 text-xs uppercase tracking-wide">
                    % Ahorro vs CFE
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {resultados.totales.pctAhorroNeto.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-brand-200 text-xs uppercase tracking-wide">
                    Ahorro Total ({resultados.parametros.aniosProyeccion} años)
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {fmtCompact(resultados.ahorroTotalVidaUtil)}
                  </p>
                </div>
                <div>
                  <p className="text-brand-200 text-xs uppercase tracking-wide">
                    Crecimiento Tarifario
                  </p>
                  <p className="text-3xl font-bold mt-1">8% anual</p>
                </div>
              </div>
            </div>

            {/* Comparativo Table */}
            <div className="mb-8">
              <ResultadosTable data={resultados.comparativo} />
            </div>

            {/* Investment Chart */}
            <div className="mb-8">
              <InversionChart
                data={resultados.tablaInversion}
                roiExacto={resultados.roiExacto}
              />
            </div>

            {/* Investment Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">
                  Tabla de Inversión de Capital —{' '}
                  {resultados.parametros.aniosProyeccion} años
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Año
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Inversión
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Ahorro CFE
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Ahorro Neto
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultados.tablaInversion.map((f: any) => (
                      <tr
                        key={f.anio}
                        className={`hover:bg-slate-50 transition ${
                          f.ahorroAcumulado >= 0 && f.anio > 0
                            ? 'bg-emerald-50/30'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {f.anio}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-600">
                          {f.inversion !== 0 ? fmt(f.inversion) : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">
                          {f.ahorroCfe ? fmt(f.ahorroCfe) : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">
                          {f.ahorroNetoAnual ? fmt(f.ahorroNetoAnual) : ''}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-semibold ${
                            f.ahorroAcumulado >= 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {fmt(f.ahorroAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
