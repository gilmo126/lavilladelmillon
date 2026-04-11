import { createClient } from '@supabase/supabase-js';

// Placeholder para build-time (SUPABASE_SERVICE_ROLE_KEY es runtime secret en Cloudflare)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
