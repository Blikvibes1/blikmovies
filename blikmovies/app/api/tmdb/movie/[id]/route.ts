import { NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';

// GET /api/tmdb/movie/693134
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: 'Invalid movie id' }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(tmdbId);
    return NextResponse.json({ movie });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TMDB error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
