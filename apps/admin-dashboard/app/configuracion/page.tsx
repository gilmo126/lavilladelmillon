export const dynamic = 'force-dynamic'
export const runtime = 'edge';
import React from 'react';
import ConfiguracionManager from '../components/ConfiguracionManager';

export const metadata = {
  title: 'ConfiguraciÃ³n | Admin Dashboard'
};

export default function ConfiguracionPage() {
  return <ConfiguracionManager />;
}
