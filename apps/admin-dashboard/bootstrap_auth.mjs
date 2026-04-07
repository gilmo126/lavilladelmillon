import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_ID = '22222222-2222-2222-2222-222222222222';
const DIST_ID = '33333333-3333-3333-3333-333333333333';

async function bootstrapAuth() {
  console.log("🛠️ Limpiando usuarios antiguos...");
  await client.from('perfiles').delete().in('id', [ADMIN_ID, DIST_ID]);
  await client.auth.admin.deleteUser(ADMIN_ID).catch(() => {});
  await client.auth.admin.deleteUser(DIST_ID).catch(() => {});

  console.log("🔐 Creando Administrador central...");
  const adminRes = await client.auth.admin.createUser({
    email: 'admin_qas@villa.com',
    password: 'password123',
    email_confirm: true,
  });

  console.log("🔐 Creando Distribuidor logístico...");
  const distRes = await client.auth.admin.createUser({
    email: 'distribuidor_qas@villa.com',
    password: 'password123',
    email_confirm: true,
  });

  if (adminRes.error || distRes.error) {
    console.error("❌ Fallo crítico GoTrue", adminRes.error || distRes.error);
    return;
  }

  const newAdminId = adminRes.data.user.id;
  const newDistId = distRes.data.user.id;

  console.log("\n📦 Forzando ID Hardcodeados en Perfiles mediante SQL...");
  
  // Como el sistema logístico ya tiene 2222... y 3333... hardcodeados, 
  // necesitamos que estos nuevos Auth Users tomen esos IDs exactos para no romper E2E.
  
  // Alternativa: Simplemente actualizamos TODOS los IDs referenciados a los nuevos generados!
  
  // 1. Actualizar configuración de la campaña (creada por seed)
  await client.from('configuracion_campana').update({ admin_id: newAdminId }).eq('admin_id', ADMIN_ID);
  
  // 2. Crear perfiles con los nuevos IDs
  await client.from('perfiles').insert([
    { id: newAdminId, nombre: 'Gerencia', rol: 'admin', zona: 'Nacional' },
    { id: newDistId, nombre: 'Distribuidor Rozo', rol: 'distribuidor', zona: 'Rozo' }
  ]);

  console.log(`✅ ¡MOCKING E2E EXITOSO!
  Admin -> ${newAdminId} [admin_qas@villa.com]
  Dist  -> ${newDistId}  [distribuidor_qas@villa.com]`);
}

bootstrapAuth();
