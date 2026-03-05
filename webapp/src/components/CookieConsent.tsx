'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'dm-solar-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if consent hasn't been given
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 animate-fade-in-up">
      <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm leading-relaxed">
            Esta plataforma utiliza cookies estrictamente necesarias para la
            gestión de su sesión de autenticación. No utilizamos cookies
            publicitarias ni de rastreo. Consulte nuestro{' '}
            <Link
              href="/aviso-de-privacidad"
              className="text-brand-400 hover:text-brand-300 underline"
            >
              Aviso de Privacidad
            </Link>{' '}
            para más información.
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition whitespace-nowrap"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
