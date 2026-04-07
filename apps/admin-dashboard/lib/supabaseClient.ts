import { createClient } from '@supabase/supabase-js';

// Fallback vacío para evitar crash durante module evaluation en build de Cloudflare.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

console.log('¿URL de Supabase detectada?:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('¿Anon Key detectada?:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Cliente Frontend público para Admin Dashboard (usa ANON_KEY)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
