import { NextResponse } from 'next/server';
import { getTrending, getPopular, NormalizedMovie } from '@/lib/tmdb';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Fetch top-rated from TMDB directly
async function getTopRated(page = 1): Promise<NormalizedMovie[]> {
  const token = process.env.TMDB_API_KEY;
  if (!token) return [];
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=${page}`,
    { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const { normalize } = await import('@/lib/tmdb');
  return (data.results ?? []).map(normalize);
}

async function getNowPlaying(): Promise<NormalizedMovie[]> {
  const token = process.env.TMDB_API_KEY;
  if (!token) return [];
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1`,
    { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const { normalize } = await import('@/lib/tmdb');
  return (data.results ?? []).map(normalize);
}

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

  // How many pages to fetch (1 page = ~20 movies)
  const url = new URL(request.url);
  const pages = Math.min(Number(url.searchParams.get('pages') ?? 1), 5);

  try {
    const fetches: Promise<NormalizedMovie[]>[] = [
      getTrending('week'),
      getNowPlaying(),
    ];
    for (let p = 1; p <= pages; p++) {
      fetches.push(getPopular(p));
      fetches.push(getTopRated(p));
    }

    const results = await Promise.all(fetches);
    const byId = new Map<number, NormalizedMovie>();
    for (const list of results) {
      for (const m of list) byId.set(m.tmdb_id, m);
    }
    const rows = Array.from(byId.values());

    const { data, error } = await supabaseAdmin
      .from('movies')
      .upsert(rows, { onConflict: 'tmdb_id' })
      .select('id, tmdb_id, title, poster_path, vote_average, release_date');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ synced: data?.length ?? 0, movies: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
