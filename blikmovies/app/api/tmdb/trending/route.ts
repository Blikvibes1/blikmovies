import { NextResponse } from 'next/server';
import { getTrending } from '@/lib/tmdb';

// GET /api/tmdb/trending?window=day|week
// Server-side only — keeps TMDB_API_KEY out of the browser bundle.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get('window') === 'day' ? 'day' : 'week';

  try {
    const movies = await getTrending(window);
    return NextResponse.json({ movies });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TMDB error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
