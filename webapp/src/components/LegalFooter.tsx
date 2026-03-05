import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} DM Solar BESS. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/aviso-de-privacidad"
              className="text-slate-500 hover:text-brand-600 transition"
            >
              Aviso de Privacidad
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/terminos"
              className="text-slate-500 hover:text-brand-600 transition"
            >
              Términos de Servicio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
