import { createClient } from '@supabase/supabase-js';

// Fallback vacío para evitar crash durante module evaluation en build de Cloudflare.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

// Cliente Frontend público - Únicamente podrá ver Campañas activas (RLS limit)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
