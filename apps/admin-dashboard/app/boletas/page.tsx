export const dynamic = 'force-dynamic'
export const runtime = 'edge';
import React from 'react';
import BoletasBrowser from '../components/BoletasBrowser';

export const metadata = {
  title: 'Boletas | Admin Dashboard'
};

export default function BoletasPage() {
  return <BoletasBrowser />;
}
