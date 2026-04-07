export const dynamic = 'force-dynamic'
import React from 'react';
import SorteosClient from './SorteosClient';

export default function SorteosPage() {
  return (
    <div className="flex-1 bg-admin-dark overflow-y-auto">
      <SorteosClient />
    </div>
  );
}
