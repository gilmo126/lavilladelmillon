-- =====================================================================
-- SEED SQL: La Villa del Millón 2026 (Palmira Digital)
-- Fuente de Verdad para Datos Maestros y Entorno de Desarrollo
-- =====================================================================

-- 1. Configuración de Campaña (Fiel al Dashboard "Llaves Maestras")
INSERT INTO public.configuracion_campana (id, nombre_campana, landing_slug, activa, slogan_principal, logo_url)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'La Villa del Millón 2026', 
    'villa-millon-2026', 
    true, 
    'Blindaje Legal y Transparencia: Registra tus datos para participar oficialmente.',
    'https://raw.githubusercontent.com/supabase-community/supabase-logos/main/supabase-logo-icon.png' -- Placeholder
) ON CONFLICT (id) DO UPDATE SET
    nombre_campana = EXCLUDED.nombre_campana,
    slogan_principal = EXCLUDED.slogan_principal;

-- 2. Zonas Comerciales Estratégicas
INSERT INTO public.zonas (id, nombre, descripcion) VALUES 
('44444444-4444-4444-4444-444444444444', 'Nacional / Bodega Central', 'Sede principal de distribución y gerencia administrativa.'),
('55555555-5555-5555-5555-555555555555', 'Zona 1 - Centro Histórico', 'Cobertura comercial calle 30 a 33.'),
('66666666-6666-6666-6666-666666666666', 'Zona 2 - Versalles / Norte', 'Corredor comercial AV 19.'),
('55555555-5555-5555-5555-555555555556', 'Rozo - Sector Parques', 'Distribución principal en plaza de Rozo.')
ON CONFLICT (nombre) DO UPDATE SET 
    id = EXCLUDED.id,
    descripcion = EXCLUDED.descripcion;

-- 3. Catálogo de Premios (Los 4 Grandes)
INSERT INTO public.premios (id, campana_id, nombre_premio, descripcion, cantidad_disponible, imagen_url)
VALUES 
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Carro Kia Sportage 0km', 'El gran premio final para dinamizar tu vida.', 1, 'https://images.unsplash.com/photo-1632243193741-b308fd45167a?auto=format&fit=crop&q=80&w=800'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Moto Yamaha MT-09', 'Siente el poder de la velocidad Palmira.', 2, 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800'),
('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Bono de $1 Millón COP', 'Válido en comercios aliados de la ciudad.', 50, 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&q=80&w=800'),
('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Viaje a San Andrés', 'Paquete todo incluido para 2 personas.', 5, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800')
ON CONFLICT (id) DO NOTHING;

-- 4. Territorios Palmira (Barrios y Corregimientos)
INSERT INTO public.territorios (nombre, tipo) VALUES 
-- Comuna 1
('Zamorano', 'Barrio'), ('Harold Éder', 'Barrio'), ('Coronado', 'Barrio'), ('Los Caimitos', 'Barrio'), 
('Villa del Rosario', 'Barrio'), ('20 de Julio', 'Barrio'), ('Camilo Torres', 'Barrio'), 
('La Vega', 'Barrio'), ('Villa Diana', 'Barrio'), ('Simón Bolívar', 'Barrio'), 
('Ignacio Torres', 'Barrio'), ('Molinos 100', 'Barrio'), ('Brisas del Norte', 'Barrio'), 
('Bosques del Edén', 'Barrio'), ('Urbanización Los Mangos', 'Barrio'),
-- Comuna 2
('Berlín', 'Barrio'), ('Santa María del Palmar', 'Barrio'), ('La Orlidia', 'Barrio'), 
('Juan Pablo II', 'Barrio'), ('Estonia', 'Barrio'), ('Versalles', 'Barrio'), 
('Mirriñao', 'Barrio'), ('Villa Claudia', 'Barrio'), ('Santa Teresita', 'Barrio'), 
('Altamira', 'Barrio'), ('Cristales', 'Barrio'),
-- Comuna 3
('El Prado', 'Barrio'), ('La Emilia', 'Barrio'), ('Llanogrande', 'Barrio'), 
('Fray Luis Amigó', 'Barrio'), ('Santa Ana', 'Barrio'), ('Olímpico', 'Barrio'), 
('Jorge Eliécer Gaitán (C3)', 'Barrio'), ('Brisas del Bolo', 'Barrio'), 
('La Concordia', 'Barrio'), ('Las Acacias', 'Barrio'), ('Pomona', 'Barrio'), 
('Santa Bárbara', 'Barrio'), ('Rivera Escobar', 'Barrio'), 
('Urbanización Villa de las Palmas', 'Barrio'), ('Alicanto', 'Barrio'),
-- Comuna 4
('Colombia', 'Barrio'), ('Jorge Eliécer Gaitán (C4)', 'Barrio'), ('Loreto', 'Barrio'), 
('Alfonso López', 'Barrio'), ('Bizerta', 'Barrio'), ('Uribe Uribe', 'Barrio'), 
('Obrero', 'Barrio'), ('San Cayetano', 'Barrio'), ('Chapinero Sur', 'Barrio'), 
('Santa Rita', 'Barrio'),
-- Comuna 5
('San Pedro', 'Barrio'), ('Primero de Mayo', 'Barrio'), ('Danubio', 'Barrio'), 
('La Libertad', 'Barrio'), ('San Carlos', 'Barrio'), ('Providencia', 'Barrio'), 
('El Campestre', 'Barrio'), ('San Jorge', 'Barrio'), ('Palmeras de Oriente', 'Barrio'), 
('Siete de Agosto', 'Barrio'), ('El Jardín', 'Barrio'), ('El Bosque', 'Barrio'), 
('María Cano', 'Barrio'), ('Popular Modelo', 'Barrio'), ('Municipal', 'Barrio'), 
('Los Sauces', 'Barrio'), ('San José', 'Barrio'), ('José Antonio Galán', 'Barrio'), 
('Prados de Oriente', 'Barrio'), ('Palmeras de Marsella', 'Barrio'),
-- Comuna 6
('Caicelandia', 'Barrio'), ('Fátima', 'Barrio'), ('El Triunfo', 'Barrio'), 
('Ciudadela Palmira', 'Barrio'), ('Urbanización Las Flores', 'Barrio'), 
('Central', 'Barrio'), ('Colombina', 'Barrio'), ('Libertadores', 'Barrio'), 
('Urbanización El Paraíso', 'Barrio'), ('La Trinidad', 'Barrio'),
-- Comuna 7
('La Italia', 'Barrio'), ('Tulipanes de la Italia', 'Barrio'), ('Brisas de la Italia', 'Barrio'), 
('Reserva de la Italia', 'Barrio'), ('Luis Carlos Galán', 'Barrio'), ('Barrio Nuevo', 'Barrio'), 
('Las Delicias', 'Barrio'), ('El Recreo', 'Barrio'), ('Santa Clara', 'Barrio'), 
('Urbanización Petruc', 'Barrio'),
-- Corregimientos
('Rozo', 'Corregimiento'), ('Amaime', 'Corregimiento'), ('El Bolo', 'Corregimiento'), 
('Tienda Nueva', 'Corregimiento'), ('Palmaseca', 'Corregimiento'), ('Guanabanal', 'Corregimiento'), 
('La Acequia', 'Corregimiento'), ('La Torre', 'Corregimiento'), ('Tablones', 'Corregimiento'),
('OTRO', 'Municipio')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Identidades QA (IAM)
-- Admite: admin_qas@villa.com, distribuidor_qas@villa.com, operativo_qas@villa.com (Pass: password123)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, 
    email_change, email_change_token_new, recovery_token
) VALUES 
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin_qas@villa.com', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'distribuidor_qas@villa.com', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'operativo_qas@villa.com', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) 
VALUES 
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', format('{"sub":"22222222-2222-2222-2222-222222222222","email":"%s"}', 'admin_qas@villa.com')::jsonb, 'email', NOW(), NOW(), NOW(), '22222222-2222-2222-2222-222222222222'),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', format('{"sub":"33333333-3333-3333-3333-333333333333","email":"%s"}', 'distribuidor_qas@villa.com')::jsonb, 'email', NOW(), NOW(), NOW(), '33333333-3333-3333-3333-333333333333'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', format('{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"%s"}', 'operativo_qas@villa.com')::jsonb, 'email', NOW(), NOW(), NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT DO NOTHING;

-- 6. Perfiles QAS (Base de Datos)
INSERT INTO public.perfiles (id, nombre, rol, zona_id, cedula, movil) VALUES 
('22222222-2222-2222-2222-222222222222', 'Gerencia Palmira 2026', 'admin', '44444444-4444-4444-4444-444444444444', '11111111', '3001111111'),
('33333333-3333-3333-3333-333333333333', 'Distribuidor Rozo', 'distribuidor', '55555555-5555-5555-5555-555555555556', '33333333', '3103333333'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operativo Logístico', 'operativo', '44444444-4444-4444-4444-444444444444', '99999999', '3209999999')
ON CONFLICT (id) DO NOTHING;

-- 7. Inventario Inicial (Boletas en Bodega)
INSERT INTO public.boletas (id_boleta, estado, token_integridad, campana_id) 
SELECT 
    i, 
    0, 
    'TKN-' || LPAD(i::TEXT, 6, '0'), 
    '11111111-1111-1111-1111-111111111111'
FROM generate_series(1, 100) AS i
ON CONFLICT DO NOTHING;
