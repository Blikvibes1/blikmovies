const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export interface NormalizedMovie {
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  genres: string[];
  runtime?: number | null;
  trailer_key?: string | null;
}

export type TmdbVideo = { id: string; key: string; name: string; site: string; type: string };
export type TmdbCast = { id: number; name: string; character: string; profile_path: string | null };

export const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

function assertToken() {
  const token = process.env.TMDB_API_KEY;
  if (!token) throw new Error("Missing TMDB_API_KEY (TMDB v4 API Read Access Token)");
  return token;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = assertToken();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    next: { revalidate: 60 * 30 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null | undefined, size: "w200" | "w342" | "w500" = "w500") {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

export function backdropUrl(path: string | null | undefined, size: "w780" | "w1280" | "original" = "original") {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

function genresFromMovie(m: TmdbMovie): string[] {
  if (m.genres?.length) return m.genres.map((g) => g.name);
  return (m.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean);
}

export function normalize(m: TmdbMovie): NormalizedMovie {
  return {
    tmdb_id: m.id,
    title: m.title,
    overview: m.overview || "",
    poster_path: posterUrl(m.poster_path, "w500"),
    backdrop_path: backdropUrl(m.backdrop_path, "original"),
    vote_average: Math.round((m.vote_average ?? 0) * 10) / 10,
    release_date: m.release_date || "",
    genres: genresFromMovie(m),
    runtime: m.runtime ?? null,
  };
}

export async function getTrending(window: "day" | "week" = "week") {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/trending/movie/${window}`);
  return (data.results || []).map(normalize);
}
export async function getPopular(page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/popular", { page: String(page) });
  return (data.results || []).map(normalize);
}
export async function getNowPlaying(page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/now_playing", { page: String(page) });
  return (data.results || []).map(normalize);
}
export async function getTopRated(page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/top_rated", { page: String(page) });
  return (data.results || []).map(normalize);
}
export async function searchMovies(query: string) {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/search/movie", { query });
  return (data.results || []).map(normalize);
}
export async function getMovieDetails(tmdbId: number) {
  const m = await tmdbFetch<TmdbMovie>(`/movie/${tmdbId}`);
  return normalize(m);
}
export async function getMovieVideos(id: number) {
  const data = await tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${id}/videos`);
  return (data.results || []).filter((v) => v.site === "YouTube");
}
export async function getBestTrailerKey(id: number) {
  const videos = await getMovieVideos(id);
  const trailer =
    videos.find((v) => v.type === "Trailer" && /official/i.test(v.name)) ||
    videos.find((v) => v.type === "Trailer") ||
    videos.find((v) => v.type === "Teaser") ||
    videos[0];
  return trailer?.key ?? null;
}
export async function getMovieCredits(id: number) {
  const data = await tmdbFetch<{ cast: TmdbCast[] }>(`/movie/${id}/credits`);
  return (data.cast || []).slice(0, 12);
}
export async function getSimilarMovies(id: number) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/movie/${id}/similar`);
  return (data.results || []).map(normalize);
}
export async function fetchCatalogBatch() {
  const pages = [1, 2, 3];
  const chunks = await Promise.all([
    getTrending("week"),
    getTrending("day"),
    ...pages.map((p) => getPopular(p)),
    ...pages.map((p) => getNowPlaying(p)),
    ...pages.map((p) => getTopRated(p)),
  ]);
  const byId = new Map<number, NormalizedMovie>();
  for (const list of chunks) {
    for (const m of list) {
      if (m.tmdb_id && m.title) byId.set(m.tmdb_id, m);
    }
  }
  return Array.from(byId.values());
}
