import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
    console.log('🚀 Iniciando Renacimiento de Inventario...');

    // 1. Obtener Campaña Activa
    const { data: config, error: cErr } = await supabase.from('configuracion_campana').select('id, nombre_campana').eq('activa', true).single();
    if (cErr || !config) {
        console.error('❌ Error: No se encontró una campaña activa.', cErr);
        return;
    }
    console.log(`📡 Campaña detectada: ${config.nombre_campana} (ID: ${config.id})`);

    // 2. Limpiar inventario previo si es necesario (Opcional, pero el usuario dijo "limpieza de base de datos")
    // Aquí solo insertaremos las 100 nuevas.
    
    const boletas = [];
    const count = 100;

    for (let i = 1; i <= count; i++) {
        const paddedId = String(i).padStart(6, '0');
        boletas.push({
            id_boleta: i,
            campana_id: config.id,
            estado: 0, // En Bodega
            token_integridad: `TKN-${paddedId}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }

    console.log(`📦 Preparando ${count} boletas nuevas...`);

    const { error: iErr } = await supabase.from('boletas').upsert(boletas, { onConflict: 'id_boleta' });

    if (iErr) {
        console.error('❌ Error insertando boletas:', iErr);
    } else {
        console.log('✅ Renacimiento Exitoso: 100 boletas inyectadas en Bodega Central.');
    }
}

populate();
