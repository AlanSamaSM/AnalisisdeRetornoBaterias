'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import KPICard from '@/components/KPICard';
import ResultadosTable from '@/components/ResultadosTable';
import InversionChart from '@/components/InversionChart';
import UploadZone from '@/components/UploadZone';
import TableDownloader from '@/components/TableDownloader';
import {
  Loader2,
  BatteryCharging,
  TrendingUp,
  DollarSign,
  Clock,
  Upload,
  Download,
  Zap,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonPage } from '@/components/Skeleton';
import EditarReciboModal, { type ReciboFormData } from '@/components/EditarReciboModal';
import EditarProyectoModal from '@/components/EditarProyectoModal';

interface Recibo {
  id: string;
  mes: string;
  anio: number;
  mesNum: number;
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
  const [consentimientoCarga, setConsentimientoCarga] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [editReciboOpen, setEditReciboOpen] = useState(false);
  const [reciboEditando, setReciboEditando] = useState<ReciboFormData | null>(null);
  const [editProyectoOpen, setEditProyectoOpen] = useState(false);

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
        const msg = `${data.recibos} recibos procesados.${
            data.errores?.length ? ` Errores: ${data.errores.join(', ')}` : ''
          }`;
        setUploadMsg(msg);
        toast.success(msg);
        if (data.resultadoFinanciero) {
          setResultados(data.resultadoFinanciero);
        }
        // Reload project
        const p = await fetch(`/api/proyectos/${id}`).then((r) => r.json());
        setProyecto(p);
      } else {
        setUploadMsg(`Error: ${data.error}`);
        toast.error(data.error || 'Error al analizar los recibos');
      }
    } catch (err: any) {
      setUploadMsg(`Error: ${err.message}`);
      toast.error(`Error: ${err.message}`);
    }

    setUploading(false);
  };

  // Recargar el proyecto desde el servidor (tras editar/agregar/eliminar)
  const recargarProyecto = async () => {
    const p = await fetch(`/api/proyectos/${id}`).then((r) => r.json());
    setProyecto(p);
    if (p.resultadosJson) {
      setResultados(JSON.parse(p.resultadosJson));
    }
  };

  // Recalcular análisis con los recibos actuales (sin tocar PDFs)
  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      const res = await fetch('/api/analizar/recalcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proyectoId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al recalcular');
        return;
      }
      setResultados(data.resultadoFinanciero);
      toast.success(`Análisis recalculado con ${data.recibos} recibos`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setRecalculando(false);
    }
  };

  const handleEliminarRecibo = async (reciboId: string, label: string) => {
    if (!confirm(`¿Eliminar el recibo de ${label}?`)) return;
    try {
      const res = await fetch(`/api/recibos/${reciboId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar');
        return;
      }
      toast.success('Recibo eliminado');
      await recargarProyecto();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const abrirEdicionRecibo = (r: Recibo) => {
    const data: ReciboFormData = {
      id: r.id,
      mes: r.mes,
      anio: r.anio,
      dias: r.dias,
      temporada: r.temporada,
      consumoPunta: r.consumoPunta,
      consumoIntermedia: r.consumoIntermedia,
      consumoBase: r.consumoBase,
      totalConsumo: r.totalConsumo,
      demandaPunta: r.demandaPunta,
      demandaIntermedia: r.demandaIntermedia,
      demandaBase: r.demandaBase,
      demandaMaxima: r.demandaMaxima,
      factorCarga: r.factorCarga,
      factorPotencia: r.factorPotencia,
      cargoCapacidadRecibo: r.cargoCapacidadRecibo,
      cargoDistribucion: r.cargoDistribucion,
      cargoEnergiaPunta: r.cargoEnergiaPunta,
      cargoEnergiaIntermedia: r.cargoEnergiaIntermedia,
      cargoEnergiaBase: r.cargoEnergiaBase,
      importeTotal: r.importeTotal,
    };
    setReciboEditando(data);
    setEditReciboOpen(true);
  };

  const abrirNuevoRecibo = () => {
    setReciboEditando(null);
    setEditReciboOpen(true);
  };

  // Download PDF report (professional multi-page)
  const handleDescargarPDF = async () => {
    if (!resultados) return;
    const { generarReportePDF } = await import('@/lib/generar-reporte-pdf');
    await generarReportePDF(proyecto, resultados);
  };

  // Download Excel report
  const handleDescargarExcel = async () => {
    if (!resultados) return;
    const { generarReporteExcel } = await import('@/lib/generar-reporte-excel');
    await generarReporteExcel(proyecto, resultados);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonPage />
        </main>
      </div>
    );
  }

  if (!proyecto) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="relative z-10 flex items-center justify-between mb-8 animate-fade-in-up">
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
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setEditProyectoOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-4 py-2.5 rounded-lg transition flex items-center gap-2 text-sm btn-press"
            >
              <Settings className="w-4 h-4" />
              Editar parámetros
            </button>
            {(proyecto.recibos?.length > 0 || resultados) && (
              <TableDownloader proyecto={proyecto} resultados={resultados} />
            )}
            {resultados && (
              <>
                <button
                  onClick={handleDescargarExcel}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm btn-press hover-lift"
                >
                  <Download className="w-4 h-4" />
                  Reporte Excel
                </button>
                <button
                  onClick={handleDescargarPDF}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm btn-press hover-lift"
                >
                  <Download className="w-4 h-4" />
                  Reporte PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 animate-fade-in-up hover-lift">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Cargar Recibos CFE
          </h2>
          <UploadZone onFilesSelected={setPdfFiles} />

          {pdfFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Consentimiento de carga */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <input
                  type="checkbox"
                  id="consentimientoCarga"
                  checked={consentimientoCarga}
                  onChange={(e) => setConsentimientoCarga(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="consentimientoCarga" className="text-xs text-amber-800 leading-relaxed">
                  Declaro bajo protesta de decir verdad que soy el{' '}
                  <strong>titular legítimo</strong> del recibo de CFE que estoy
                  cargando, o cuento con las facultades de representación legal
                  para disponer de esta información. Autorizo la extracción y
                  análisis de los datos contenidos en el PDF exclusivamente
                  para el modelado financiero BESS, conforme al{' '}
                  <a
                    href="/aviso-de-privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline font-medium"
                  >
                    Aviso de Privacidad
                  </a>.
                </label>
              </div>

              <div className="flex items-center gap-3">
              <button
                onClick={handleAnalizar}
                disabled={uploading || !consentimientoCarga}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60 flex items-center gap-2 text-sm btn-press"
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
            </div>
          )}
        </div>

        {/* Recibos: tabla editable */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-700">
              Recibos del proyecto ({proyecto.recibos?.length ?? 0})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={abrirNuevoRecibo}
                className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar recibo manual
              </button>
              {proyecto.recibos?.length > 0 && proyecto.potenciaKw > 0 && proyecto.capacidadKwh > 0 && (
                <button
                  onClick={handleRecalcular}
                  disabled={recalculando}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {recalculando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Recalcular análisis
                </button>
              )}
            </div>
          </div>

          {proyecto.recibos && proyecto.recibos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2.5 font-semibold text-slate-600">Periodo</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Consumo total</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">D. Punta</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">D. Máxima</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">F. Carga</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Importe</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 text-right w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...proyecto.recibos]
                    .sort((a: Recibo, b: Recibo) => a.anio - b.anio || a.mesNum - b.mesNum)
                    .map((r: Recibo) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2 font-medium text-slate-700">{r.mes} {r.anio}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{r.totalConsumo.toLocaleString('es-MX')}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{r.demandaPunta.toLocaleString('es-MX')}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{r.demandaMaxima.toLocaleString('es-MX')}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{r.factorCarga.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right text-slate-700 font-medium">{fmt(r.importeTotal)}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirEdicionRecibo(r)}
                              aria-label="Editar recibo"
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEliminarRecibo(r.id, `${r.mes} ${r.anio}`)}
                              aria-label="Eliminar recibo"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              Aún no hay recibos. Sube PDFs arriba o agrega uno manualmente.
            </div>
          )}
        </div>

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
            {/* Disclaimer Legal */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6 animate-fade-in-up">
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-600">Aviso:</strong> Las
                proyecciones financieras y estimaciones de ahorro presentadas
                son cálculos basados en modelos matemáticos con datos
                históricos y tarifas vigentes. No constituyen asesoría
                financiera certificada ni garantizan retornos específicos. Los
                resultados están sujetos a cambios tarifarios de CFE/CRE,
                variaciones cambiarias y condiciones operativas reales. La
                instalación de sistemas BESS requiere validación técnica en
                sitio y permisos conforme a la Ley del Sector Eléctrico
                (2025).
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 stagger-children">
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
            <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 rounded-2xl p-6 mb-8 text-white gradient-animate shadow-lg animate-fade-in-up">
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

            {/* Estructura de Costos */}
            {resultados.estructuraCostos && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand-600" />
                  Estructura Actual de Costos
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  Costo eléctrico anual:{' '}
                  <span className="font-bold text-slate-800">
                    {fmt(resultados.estructuraCostos.costoAnualTotal)} MXN
                  </span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
                  {[
                    { label: 'Capacidad',      ...resultados.estructuraCostos.capacidad,          color: 'bg-red-50 border-red-200 text-red-800' },
                    { label: 'Energía Punta',   ...resultados.estructuraCostos.energiaPunta,       color: 'bg-orange-50 border-orange-200 text-orange-800' },
                    { label: 'Energía Intermedia', ...resultados.estructuraCostos.energiaIntermedia, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                    { label: 'Energía Base',    ...resultados.estructuraCostos.energiaBase,        color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl border p-4 hover-lift transition-all duration-300 ${item.color}`}>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                        {item.label}
                      </p>
                      <p className="text-xl font-bold mt-1">{fmt(item.total)}</p>
                      <p className="text-sm font-semibold mt-0.5">{item.pct.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparativo Table */}
            <div className="mb-8 animate-fade-in-up">
              <ResultadosTable data={resultados.comparativo} />
            </div>

            {/* Desplazamiento de Carga */}
            {resultados.desplazamientoCarga && resultados.desplazamientoCarga.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Desplazamiento de Carga (kWh)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Energía desplazada de horario punta a base mediante el sistema BESS
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-600">Mes</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Base Original</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Base Nuevo</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Punta Original</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Punta Nuevo</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">$ Base Orig.</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">$ Base Nuevo</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">$ Punta Orig.</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">$ Punta Nuevo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultados.desplazamientoCarga
                        .filter((f: any) => f.periodo !== 'TOTAL ANUAL')
                        .map((f: any) => (
                          <tr key={f.periodo} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{f.periodo}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{f.consumoBaseOriginal.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{f.consumoBaseNuevo.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{f.consumoPuntaOriginal.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{f.consumoPuntaNuevo.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">{fmt(f.gastoBaseOriginal)}</td>
                            <td className="px-4 py-2.5 text-right text-blue-500">{fmt(f.gastoBaseNuevo)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">{fmt(f.gastoPuntaOriginal)}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-500">{fmt(f.gastoPuntaNuevo)}</td>
                          </tr>
                        ))}
                      {/* TOTAL ANUAL — usa la fila ya calculada por el modelo */}
                      {(() => {
                        const total = resultados.desplazamientoCarga.find((f: any) => f.periodo === 'TOTAL ANUAL');
                        if (!total) return null;
                        return (
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-4 py-2.5 text-slate-800">{total.periodo}</td>
                            <td className="px-4 py-2.5 text-right text-slate-700">{total.consumoBaseOriginal.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-blue-700">{total.consumoBaseNuevo.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-slate-700">{total.consumoPuntaOriginal.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-700">{total.consumoPuntaNuevo.toLocaleString('es-MX')}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{fmt(total.gastoBaseOriginal)}</td>
                            <td className="px-4 py-2.5 text-right text-blue-600">{fmt(total.gastoBaseNuevo)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{fmt(total.gastoPuntaOriginal)}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-600">{fmt(total.gastoPuntaNuevo)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Investment Chart */}
            <div className="mb-8 animate-fade-in-up">
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
            {/* Degradación del Sistema BESS */}
            {resultados.degradacion && resultados.degradacion.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Degradación y Recompra del Sistema BESS
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Proyección de capacidad efectiva y ahorros ajustados por degradación anual
                    {resultados.anioRecompra && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                        — Recompra sugerida: Año {resultados.anioRecompra}
                      </span>
                    )}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-600">Año</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Capacidad Efectiva (kWh)</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Degradación Acumulada</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Factor Capacidad</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Ahorro Ajustado</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Recompra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultados.degradacion.map((d: any) => (
                        <tr
                          key={d.anio}
                          className={`hover:bg-slate-50 transition ${
                            d.requiereRecompra ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-700">{d.anio}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {d.capacidadEfectiva.toLocaleString('es-MX', { maximumFractionDigits: 1 })}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {d.degradacionPct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {(d.factorCapacidad * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                            {fmt(d.ahorroAjustado)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {d.requiereRecompra ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                Sí
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Degradation note */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>Nota:</strong> La degradación es una parte natural del ciclo de vida de las baterías.
                    Estimamos que con el sistema cotizado se puede garantizar la demanda energética completa
                    durante <strong>{resultados.anioRecompra ? resultados.anioRecompra - 1 : resultados.parametros.aniosProyeccion}</strong> años.
                    {resultados.anioRecompra && (
                      <> En el año <strong>{resultados.anioRecompra}</strong>, la capacidad efectiva ya no cubre
                      el desplazamiento completo de punta y se recomienda considerar una recompra para
                      mantener los ahorros originales.</>
                    )}
                    Supuesto: {resultados.parametros.tasaDegradacion
                      ? (resultados.parametros.tasaDegradacion * 100).toFixed(0)
                      : '2'}% degradación anual,{' '}
                    {resultados.parametros.ciclosAnuales || 300} ciclos anuales.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: editar/agregar recibo */}
      <EditarReciboModal
        open={editReciboOpen}
        onClose={() => setEditReciboOpen(false)}
        proyectoId={id}
        recibo={reciboEditando}
        onSaved={recargarProyecto}
      />

      {/* Modal: editar parámetros del proyecto */}
      {proyecto && (
        <EditarProyectoModal
          open={editProyectoOpen}
          onClose={() => setEditProyectoOpen(false)}
          proyectoId={id}
          initial={{
            nombre: proyecto.nombre || '',
            cliente: proyecto.cliente,
            division: proyecto.division || 'Norte',
            potenciaKw: proyecto.potenciaKw || 0,
            capacidadKwh: proyecto.capacidadKwh || 0,
            precioUsd: proyecto.precioUsd || 0,
            tipoCambio: proyecto.tipoCambio || 18.5,
            aniosProyeccion: proyecto.aniosProyeccion || 15,
            eficiencia: proyecto.eficiencia || 0.9,
            horasCargaBase: proyecto.horasCargaBase || 6,
          }}
          onSaved={recargarProyecto}
        />
      )}
    </div>
  );
}
