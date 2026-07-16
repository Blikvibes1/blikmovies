import { createClient } from '@supabase/supabase-js';

// Server-only client — uses the Supabase service_role key, which bypasses
// Row Level Security. NEVER import this file from a 'use client' component
// or expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
//
// Used by admin-only API routes (e.g. /api/admin/sync) that need to write
// to tables the public anon key can't (movies only has a public SELECT
// policy — see supabase/schema.sql).

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL). ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local — find it in your Supabase ' +
      'project under Settings → API → service_role key. Keep it server-side only.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
