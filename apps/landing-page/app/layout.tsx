import type { Metadata } from 'next';
export const runtime = 'edge';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'La Villa del Millón | Dinamización Comercial',
  description: 'Activa tu boleta y participa por increíbles premios. Palmera de Gala & Gana.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-marca-darker text-white`}>{children}</body>
    </html>
  );
}
