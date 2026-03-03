'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { SkeletonCard } from '@/components/Skeleton';
import { Plus, FolderOpen, Calendar, MapPin, Battery, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Proyecto {
  id: string;
  nombre: string;
  cliente: string;
  estado: string;
  municipio: string;
  region: string;
  potenciaKw: number;
  capacidadKwh: number;
  resultadosJson: string | null;
  createdAt: string;
  recibos: { id: string; mes: string; anio: number }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/proyectos')
      .then((r) => r.json())
      .then((data) => {
        setProyectos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/proyectos/${deleteId}`, { method: 'DELETE' });
      setProyectos((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success('Proyecto eliminado');
    } catch {
      toast.error('Error al eliminar el proyecto');
    }
    setDeleteId(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="h-7 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mis Proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/proyecto/nuevo"
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </Link>
        </div>

        {/* Project cards */}
        {proyectos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Aún no tienes proyectos
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Crea tu primer proyecto para analizar el retorno de inversión de un sistema BESS.
            </p>
            <Link
              href="/proyecto/nuevo"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Proyecto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((p) => {
              const hasResults = !!p.resultadosJson;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group"
                >
                  <Link href={`/proyecto/${p.id}`} className="block p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition">
                        {p.nombre}
                      </h3>
                      {hasResults ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          Analizado
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>

                    {p.cliente && (
                      <p className="text-sm text-slate-500 mb-3">{p.cliente}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      {p.estado && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {p.municipio}, {p.estado}
                        </span>
                      )}
                      {p.potenciaKw > 0 && (
                        <span className="flex items-center gap-1">
                          <Battery className="w-3 h-3" />
                          {p.potenciaKw} kW / {p.capacidadKwh} kWh
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.createdAt).toLocaleDateString('es-MX')}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      {p.recibos.length} recibo{p.recibos.length !== 1 ? 's' : ''} cargados
                    </div>
                  </Link>

                  <div className="border-t border-slate-100 px-5 py-2 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(p.id);
                      }}
                      className="text-slate-400 hover:text-red-500 transition p-1"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar proyecto"
        footer={
          <>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Eliminar
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Esta acción no se puede deshacer. Se eliminarán todos los recibos y resultados asociados al proyecto.
        </p>
      </Modal>
    </div>
  );
}
