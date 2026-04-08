import { createClient } from '@supabase/supabase-js';

// Usamos placeholders para evitar el error 'supabaseKey is required' durante la fase de compilación o evaluación inicial.
// Las variables reales se inyectan en tiempo de ejecución desde .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pluybtexgcqpgqmbbtcu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
