import { createClient } from '@supabase/supabase-js';

// Fallback vacío para evitar crash durante module evaluation en build de Cloudflare.
// En runtime, las variables reales de process.env estarán disponibles.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
