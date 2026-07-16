import { NextResponse } from 'next/server';
import { getTrending, getPopular } from '@/lib/tmdb';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/cron/sync
// Called automatically by Vercel Cron every day at midnight UTC.
// Vercel passes Authorization: Bearer <CRON_SECRET> — we verify it so only
// Vercel's scheduler (or you manually) can trigger this.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server misconfigured';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const [trending, popular] = await Promise.all([
      getTrending('week'),
      getPopular(1),
    ]);

    // De-dupe across both lists
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

    console.log(`[cron] synced ${data?.length ?? 0} movies at ${new Date().toISOString()}`);
    return NextResponse.json({ synced: data?.length ?? 0, at: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
