import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getMovieDetails, getBestTrailerKey, getMovieCredits, getSimilarMovies, posterUrl, backdropUrl } from "@/lib/tmdb";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data: row } = await supabase.from("movies").select("*").or(`tmdb_id.eq.${id},id.eq.${id}`).maybeSingle();
  let movie = row;
  let trailerKey: string | null = row?.trailer_key ?? null;
  let from = "supabase";

  if (!movie) {
    try {
      const details = await getMovieDetails(id);
      movie = {
        id: details.tmdb_id,
        tmdb_id: details.tmdb_id,
        title: details.title,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        vote_average: details.vote_average,
        release_date: details.release_date,
        genres: details.genres,
        runtime: details.runtime,
      };
      from = "tmdb";
      try {
        const admin = getSupabaseAdmin();
        const key = await getBestTrailerKey(id);
        trailerKey = key;
        await admin.from("movies").upsert({
          tmdb_id: details.tmdb_id,
          title: details.title,
          overview: details.overview,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          vote_average: details.vote_average,
          release_date: details.release_date || null,
          genres: details.genres,
          runtime: details.runtime ?? null,
          trailer_key: key,
        }, { onConflict: "tmdb_id" });
      } catch {
        trailerKey = await getBestTrailerKey(id).catch(() => null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Not found";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  } else if (!trailerKey) {
    try {
      trailerKey = await getBestTrailerKey(movie.tmdb_id || id);
      if (trailerKey) {
        try {
          const admin = getSupabaseAdmin();
          await admin.from("movies").update({ trailer_key: trailerKey }).eq("tmdb_id", movie.tmdb_id || id);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  movie = { ...movie, poster_path: posterUrl(movie.poster_path), backdrop_path: backdropUrl(movie.backdrop_path) };

  let cast: unknown[] = [];
  let similar: unknown[] = [];
  try {
    const tmdbId = movie.tmdb_id || id;
    const [c, s] = await Promise.all([getMovieCredits(tmdbId), getSimilarMovies(tmdbId)]);
    cast = c;
    similar = s;
  } catch { /* optional */ }

  return NextResponse.json({
    movie,
    trailerKey,
    playUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
    cast,
    similar,
    from,
    notice: "Full feature films are not provided by TMDB. Play opens the official trailer when available.",
  });
}
