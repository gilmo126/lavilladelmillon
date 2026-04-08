import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pluybtexgcqpgqmbbtcu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXlidGV4Z2NxcGdxbWJidGN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU3NTkxNSwiZXhwIjoyMDkxMTUxOTE1fQ.tK2CpOdF9ZTdTuRfyxVXdCwVyh9ebSAoG_pxcptsAyM';

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const usersToCreate = [
  { email: 'admin_v2@villa.com', password: 'password123', nombre: 'Gerencia Palmira 2026', rol: 'admin', zona_id: '44444444-4444-4444-4444-444444444444' },
  { email: 'distribuidor_v2@villa.com', password: 'password123', nombre: 'Distribuidor Rozo', rol: 'distribuidor', zona_id: '55555555-5555-5555-5555-555555555556' },
  { email: 'operativo_v2@villa.com', password: 'password123', nombre: 'Operativo Logístico', rol: 'operativo', zona_id: '44444444-4444-4444-4444-444444444444' }
];

async function syncAuth() {
  console.log("🚀 Iniciando Sincronización v2 (Nuevos Correos + IDs Generados)...");

  for (const userConfig of usersToCreate) {
    console.log(`\n--- 👤 Procesando: ${userConfig.email} ---`);
    
    // 1. Limpieza de Auth User por email (si existe)
    const { data: listRes } = await client.auth.admin.listUsers();
    const existing = listRes?.users.find(u => u.email === userConfig.email);
    if (existing) {
        console.log(`🧹 Eliminando registro previo para ${userConfig.email}`);
        await client.auth.admin.deleteUser(existing.id).catch(() => {});
        await client.from('perfiles').delete().eq('id', existing.id).catch(() => {});
    }

    // 2. Creación con ID Generado (Garantizado por Supabase Cloud)
    console.log("✨ Creando Auth User...");
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: userConfig.email,
      password: userConfig.password,
      email_confirm: true
    });

    if (authError) {
      console.error(`❌ Error Auth: ${authError.message}`);
      continue;
    }
    
    const newId = authData.user.id;
    console.log(`✅ Auth User creado con ID: ${newId}`);

    // 3. Sincronización Perfil
    console.log(`📦 Insertando Perfil para ${userConfig.nombre}...`);
    const { error: profileError } = await client.from('perfiles').insert({
      id: newId,
      nombre: userConfig.nombre,
      rol: userConfig.rol,
      zona_id: userConfig.zona_id
    });

    if (profileError) console.error(`❌ Error Perfil: ${profileError.message}`);
    else console.log("✅ Perfil sincronizado.");
  }

  console.log("\n🏁 Sincronización v2 completada.");
}

syncAuth();
