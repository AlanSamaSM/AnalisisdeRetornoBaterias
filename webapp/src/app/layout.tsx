import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import LegalFooter from '@/components/LegalFooter';
import CookieConsent from '@/components/CookieConsent';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'DM Solar — Análisis de Retorno BESS',
  description:
    'Plataforma de análisis financiero para sistemas de almacenamiento de energía con baterías (BESS) en tarifa GDMTH de CFE.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.className}>
      <body className="min-h-screen bg-slate-50 antialiased flex flex-col">
        <Providers>
          <div className="flex-1">{children}</div>
          <LegalFooter />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
