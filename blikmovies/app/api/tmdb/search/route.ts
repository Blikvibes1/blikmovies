import { NextResponse } from 'next/server';
import { searchMovies } from '@/lib/tmdb';

// GET /api/tmdb/search?q=dune
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  try {
    const movies = await searchMovies(q);
    return NextResponse.json({ movies });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TMDB error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
