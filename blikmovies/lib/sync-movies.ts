import { fetchCatalogBatch, getBestTrailerKey, type NormalizedMovie } from "@/lib/tmdb";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type SyncResult = { synced: number; trailers: number; at: string; error?: string };

function toRow(m: NormalizedMovie) {
  return {
    tmdb_id: m.tmdb_id,
    title: m.title,
    overview: m.overview,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    vote_average: m.vote_average,
    release_date: m.release_date || null,
    genres: m.genres || [],
    runtime: m.runtime ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function syncMoviesToSupabase(opts?: {
  source?: string;
  enrichTrailers?: boolean;
  trailerLimit?: number;
}): Promise<SyncResult> {
  const source = opts?.source || "manual";
  const enrichTrailers = opts?.enrichTrailers ?? true;
  const trailerLimit = opts?.trailerLimit ?? 25;
  const admin = getSupabaseAdmin();
  const catalog = await fetchCatalogBatch();
  if (!catalog.length) {
    return { synced: 0, trailers: 0, at: new Date().toISOString(), error: "TMDB returned 0 movies" };
  }
  const rows = catalog.map(toRow);
  const { data, error } = await admin.from("movies").upsert(rows, { onConflict: "tmdb_id" }).select("id, tmdb_id");
  if (error) {
    return { synced: 0, trailers: 0, at: new Date().toISOString(), error: error.message };
  }
  let trailers = 0;
  if (enrichTrailers) {
    for (const m of catalog.slice(0, trailerLimit)) {
      try {
        const key = await getBestTrailerKey(m.tmdb_id);
        if (key) {
          await admin.from("movies").update({ trailer_key: key }).eq("tmdb_id", m.tmdb_id);
          trailers += 1;
        }
      } catch { /* skip */ }
    }
  }
  try {
    await admin.from("sync_runs").insert({ source, synced: data?.length ?? rows.length, detail: { trailers, catalog: catalog.length } });
  } catch { /* table may not exist yet */ }
  return { synced: data?.length ?? rows.length, trailers, at: new Date().toISOString() };
}
