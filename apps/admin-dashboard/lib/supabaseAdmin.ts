import { createClient } from '@supabase/supabase-js';

// Fallback preventivo para evitar el error 'supabaseKey is required' en entornos de despliegue o recarga.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pluybtexgcqpgqmbbtcu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
