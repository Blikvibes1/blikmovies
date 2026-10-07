import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { syncMoviesToSupabase } from "@/lib/sync-movies";
import { getTrending, getPopular } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceBootstrap = searchParams.get("bootstrap") === "1";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  try {
    let { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("vote_average", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message, movies: [] }, { status: 500 });

    let movies = data ?? [];
    let synced = 0;

    if (forceBootstrap || movies.length === 0) {
      try {
        const result = await syncMoviesToSupabase({
          source: forceBootstrap ? "bootstrap" : "auto-empty",
          enrichTrailers: true,
          trailerLimit: 15,
        });
        synced = result.synced;
        const refetch = await supabase.from("movies").select("*").order("vote_average", { ascending: false }).limit(100);
        movies = refetch.data ?? movies;
      } catch {
        try {
          const [trending, popular] = await Promise.all([getTrending("week"), getPopular(1)]);
          const byId = new Map<number, (typeof trending)[0]>();
          for (const m of [...trending, ...popular]) byId.set(m.tmdb_id, m);
          movies = Array.from(byId.values()).map((m) => ({
            id: m.tmdb_id,
            tmdb_id: m.tmdb_id,
            title: m.title,
            overview: m.overview,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
            genres: m.genres,
          }));
        } catch (e) {
          const message = e instanceof Error ? e.message : "TMDB fallback failed";
          return NextResponse.json({ error: message, movies: [] }, { status: 502 });
        }
      }
    }

    if (q) {
      movies = movies.filter(
        (m: { title?: string; overview?: string }) =>
          (m.title || "").toLowerCase().includes(q) || (m.overview || "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ movies, count: movies.length, synced, source: synced ? "supabase+sync" : "supabase" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, movies: [] }, { status: 500 });
  }
}
