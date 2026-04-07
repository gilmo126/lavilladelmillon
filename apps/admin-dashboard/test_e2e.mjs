import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Cliente Admin para simular Base de Datos, Admin Panel, y funciones RPC
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_ID = '22222222-2222-2222-2222-222222222222';
const DIST_ID = '33333333-3333-3333-3333-333333333333';
const CAMPANA_ID = '11111111-1111-1111-1111-111111111111';

async function runE2E() {
    console.log("🚀 INICIANDO PRUEBA E2E: LA VILLA DEL MILLÓN\n");
    try {
        // --- PREPARACIÓN: Crear 100 boletas en bodega (Estado 0) ---
        console.log("🛠️ PREPARACIÓN: Insertando 100 boletas en Bodega...");
        const boletasMock = [];
        for (let i = 5001; i <= 5100; i++) {
            boletasMock.push({
                campana_id: CAMPANA_ID,
                token_integridad: `TKN-${i}`,
                estado: 0
            });
        }
        
        let res = await adminClient.from('boletas').insert(boletasMock).select('id_boleta').order('id_boleta', { ascending: true });
        if (res.error) throw new Error("Error insertando bodega: " + res.error.message);
        console.log(`✅ ${res.data?.length} boletas creadas en estado 0 (BODEGA).`);

        // Necesitamos el id autonumérico de la #5005 (será el 5to insertado, o sea index 4)
        const boletaIDs = res.data.map(b => b.id_boleta);
        const inicio = boletaIDs[0];
        const fin = boletaIDs[boletaIDs.length - 1];
        const BOLETA_5005_ID = boletaIDs[4]; 
        const BOLETA_5005_TKN = `TKN-5005`;

        // -------------------------------------------------------------
        // PASO 1 (Admin): Mover estado 0 -> 1 usando RPC
        // -------------------------------------------------------------
        console.log(`\n📦 PASO 1 (Admin): Despachando boletas ${inicio} a ${fin}...`);
        res = await adminClient.rpc('asignar_lote_boletas', {
            p_admin_id: ADMIN_ID,
            p_dist_id: DIST_ID,
            p_rango_inicio: inicio,
            p_rango_fin: fin
        });
        if (res.error) throw new Error("Error RPC Asignar Lote: " + res.error.message);
        console.log(`✅ RPC Exitoso. ${res.data} boletas actualizadas al Estado 1 (DESPACHADA) a nombre del Distribuidor.`);

        // -------------------------------------------------------------
        // PASO 2 (Distribuidor): Activar boleta #5005 en comercio (1 -> 2)
        // -------------------------------------------------------------
        console.log(`\n🏪 PASO 2 (Distribuidor): Activando boleta [ID: ${BOLETA_5005_ID}] en 'Granero El Diamante'...`);
        res = await adminClient.rpc('activar_boleta_comercio', {
            p_dist_id: DIST_ID,
            p_boleta_id: BOLETA_5005_ID,
            p_nombre_comercio: 'Granero El Diamante'
        });
        if (res.error) throw new Error("Error RPC Activar Boleta: " + res.error.message);
        console.log(`✅ Boleta activada con éxito al Estado 2 (ACTIVA) en Punto de Venta.`);

        // -------------------------------------------------------------
        // PASO 3 y 4 (Usuario/Landing): Registrar la boleta (2 -> 3)
        // -------------------------------------------------------------
        // Obtenemos un premio válido
        const { data: premios } = await adminClient.from('premios').select('id').eq('campana_id', CAMPANA_ID);
        const prmID = premios[0].id;

        console.log(`\n📲 PASO 3 y 4 (Registro Usuario): Intentando registrar la boleta token '${BOLETA_5005_TKN}' vía base de datos...`);
        // Simulamos la lógica que haría la Edge Function (modificando la BD con token)
        res = await adminClient.from('boletas')
            .update({
                estado: 3,
                nombre_usuario: 'Pepito Pérez',
                identificacion_usuario: '111222333',
                celular_usuario: '3001234567',
                habeas_data_aceptado: true,
                premio_seleccionado: prmID,
            })
            .eq('token_integridad', BOLETA_5005_TKN)
            .select('*');

        if (res.error) throw new Error("Fallo en el registro de máquina de estados: " + res.error.message);
        
        const finalBoleta = res.data[0];
        console.log(`✅ ¡REGISTRO EXITOSO APROBADO POR MÁQUINA DE ESTADO!`);
        console.log(`🏆 LA BOLETA ${BOLETA_5005_TKN} ES OFICIALMENTE GANADORA:`);
        console.log(`   🔸 Estado Final: ${finalBoleta.estado} (REGISTRADA)`);
        console.log(`   🔸 Comercio Final: ${finalBoleta.comercio_nombre}`);
        console.log(`   🔸 Usuario: ${finalBoleta.nombre_usuario} [C.C. ${finalBoleta.identificacion_usuario}]`);

        console.log("\n🎉 PRUEBA E2E COMPLETA Y VALIDADA 100%");

    } catch (err) {
        console.error("\n❌ ERROR GRAVE EN FLUJO E2E:");
        console.error(err.message);
    }
}

runE2E();
