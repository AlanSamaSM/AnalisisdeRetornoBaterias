'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { SkeletonCard } from '@/components/Skeleton';
import { Plus, FolderOpen, Calendar, MapPin, Battery, Trash2, Loader2, UserX } from 'lucide-react';
import { signOut } from 'next-auth/react';
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
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/cuenta', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cuenta eliminada exitosamente');
        signOut({ callbackUrl: '/login' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar la cuenta');
      }
    } catch {
      toast.error('Error al eliminar la cuenta');
    }
    setDeletingAccount(false);
    setShowDeleteAccount(false);
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
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mis Proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/proyecto/nuevo"
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm btn-press hover-lift shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </Link>
        </div>

        {/* Project cards */}
        {proyectos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center animate-scale-in">
            <div className="animate-float inline-block">
              <FolderOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Aún no tienes proyectos
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Crea tu primer proyecto para analizar el retorno de inversión de un sistema BESS.
            </p>
            <Link
              href="/proyecto/nuevo"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm btn-press animate-pulse-glow"
            >
              <Plus className="w-4 h-4" />
              Crear Proyecto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {proyectos.map((p) => {
              const hasResults = !!p.resultadosJson;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover-lift group relative overflow-hidden"
                >
                  {/* Accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${hasResults ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-amber-500'} transition-all duration-300 group-hover:h-1.5`} />
                  <Link href={`/proyecto/${p.id}`} className="block p-5 pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors duration-200">
                        {p.nombre}
                      </h3>
                      {hasResults ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                          Analizado
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
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
                      className="text-slate-400 hover:text-red-500 transition-colors duration-200 p-1 hover:bg-red-50 rounded-md"
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

      {/* Delete Account section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t border-slate-200 pt-8 mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-600">Gestión de Cuenta</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Derecho de Cancelación (ARCO) — Eliminar su cuenta y todos los datos asociados
              </p>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account confirmation modal */}
      <Modal
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title="Eliminar cuenta y datos"
        footer={
          <>
            <button
              onClick={() => setShowDeleteAccount(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteAccount}
              disabled={deletingAccount}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-60 flex items-center gap-2"
            >
              {deletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Eliminar permanentemente
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Esta acción es <strong>irreversible</strong> y eliminará permanentemente:
          </p>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>Su cuenta de usuario e información personal</li>
            <li>Todos sus proyectos y configuraciones BESS</li>
            <li>Todos los recibos procesados y datos de consumo</li>
            <li>Todos los resultados financieros y reportes</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              Conforme a la LFPDPPP (2025) y su derecho de Cancelación (ARCO),
              todos los datos personales y patrimoniales asociados a su cuenta
              serán suprimidos de nuestra base de datos de forma irreversible.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
