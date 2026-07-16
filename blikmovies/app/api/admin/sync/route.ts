import { NextResponse } from 'next/server';
import { getTrending, getPopular } from '@/lib/tmdb';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/admin/sync
// Pulls trending + popular movies from TMDB and upserts them into the
// Supabase "movies" table (keyed on tmdb_id, see supabase/schema.sql).
//
// The admin dashboard page is only a client-side gate — that's a UI nicety,
// not security. Anyone could otherwise POST here directly, so we re-verify
// the caller is signed in AND has is_admin = true in `profiles`, using the
// service_role key server-side (never exposed to the browser).
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server misconfigured';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const [trending, popular] = await Promise.all([
      getTrending('week'),
      getPopular(1),
    ]);

    // De-dupe by tmdb_id across the two lists
    const byId = new Map<number, (typeof trending)[number]>();
    for (const m of [...trending, ...popular]) {
      byId.set(m.tmdb_id, m);
    }
    const rows = Array.from(byId.values());

    const { data, error } = await supabaseAdmin
      .from('movies')
      .upsert(rows, { onConflict: 'tmdb_id' })
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ synced: data?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
