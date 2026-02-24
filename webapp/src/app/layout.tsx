import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

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
    <html lang="es">
      <body className="min-h-screen bg-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
