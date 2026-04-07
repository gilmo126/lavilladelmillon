import { createClient } from '@supabase/supabase-js';

// Instancia especializada que IGNORA RLS y tiene acceso a Auth API (GoTrue admin methods).
// JAMÁS debe ser exportada al frontend "use client". Solo usar en Server Actions.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env vars for Admin Client");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
