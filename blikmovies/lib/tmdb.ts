// Thin wrapper around the TMDB API (https://developer.themoviedb.org/reference)
// Uses the v4 "Read Access Token" as a Bearer token, which is the auth style
// TMDB recommends over the older v3 `api_key=` query param.
//
// Required env var (server-side only, do NOT prefix with NEXT_PUBLIC_):
//   TMDB_API_KEY=<your v4 read access token>

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
}

export interface NormalizedMovie {
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
}

function assertToken() {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    throw new Error(
      'Missing TMDB_API_KEY. Add it to .env.local (see .env.example) — it must be the ' +
      'TMDB v4 "API Read Access Token", not the shorter v3 API key.'
    );
  }
  return token;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = assertToken();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
    // Cache trending/popular lookups for a bit — TMDB rate-limits aggressively.
    next: { revalidate: 60 * 30 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB request failed (${res.status} ${res.statusText}): ${body}`);
  }

  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null, size: 'w200' | 'w342' | 'w500' = 'w500') {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';
}

export function backdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'original') {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';
}

export function normalize(m: TmdbMovie): NormalizedMovie {
  return {
    tmdb_id: m.id,
    title: m.title,
    overview: m.overview,
    poster_path: posterUrl(m.poster_path, 'w500'),
    backdrop_path: backdropUrl(m.backdrop_path, 'original'),
    vote_average: Math.round((m.vote_average ?? 0) * 10) / 10,
    release_date: m.release_date || '',
  };
}

export async function getTrending(window: 'day' | 'week' = 'week'): Promise<NormalizedMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/trending/movie/${window}`);
  return data.results.map(normalize);
}

export async function getPopular(page = 1): Promise<NormalizedMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>('/movie/popular', { page: String(page) });
  return data.results.map(normalize);
}

export async function searchMovies(query: string): Promise<NormalizedMovie[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: TmdbMovie[] }>('/search/movie', { query });
  return data.results.map(normalize);
}

export async function getMovieDetails(tmdbId: number): Promise<NormalizedMovie> {
  const m = await tmdbFetch<TmdbMovie>(`/movie/${tmdbId}`);
  return normalize(m);
}
