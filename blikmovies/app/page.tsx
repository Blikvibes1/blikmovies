"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Star } from "lucide-react";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";

type Movie = {
  id: number;
  tmdb_id?: number | null;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
};

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/movies?bootstrap=1");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load movies");
        if (!cancelled) {
          setMovies(json.movies || []);
          setSynced(json.synced || 0);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (movies.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % Math.min(5, movies.length)), 8000);
    return () => clearInterval(t);
  }, [movies.length]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return movies;
    return movies.filter((m) => m.title.toLowerCase().includes(query) || (m.overview || "").toLowerCase().includes(query));
  }, [movies, q]);

  const hero = filtered[heroIndex] || filtered[0] || movies[0];
  const heroBg = mediaUrl(hero?.backdrop_path || hero?.poster_path, "backdrop");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-indigo-600">▶</span>
            blikmovies
          </Link>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Link href="/browse" className="hover:text-white">Browse</Link>
            <Link href="/watchlist" className="hover:text-white">Watchlist</Link>
            <Link href="/login" className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">Sign in</Link>
          </div>
        </div>
      </nav>

      <section className="relative mt-14 min-h-[50vh] md:min-h-[60vh]">
        {heroBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={heroBg} src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-rose-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/40" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-end px-6 pb-12 pt-28">
          {loading ? (
            <p className="animate-pulse text-zinc-400">Loading catalog…</p>
          ) : error ? (
            <div className="max-w-lg rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
              <p className="font-semibold">Could not load movies</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs opacity-80">Set TMDB_API_KEY + Supabase keys, run schema.sql, refresh.</p>
            </div>
          ) : hero ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
                Auto-synced catalog{synced ? ` · imported ${synced}` : ""}
              </p>
              <h1 className="max-w-2xl text-3xl font-bold md:text-5xl">{hero.title}</h1>
              <p className="mt-3 max-w-xl text-sm text-zinc-300 line-clamp-3">{hero.overview}</p>
              <div className="mt-3 flex items-center gap-3 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-1 text-amber-400"><Star className="h-4 w-4 fill-current" />{Number(hero.vote_average || 0).toFixed(1)}</span>
                <span>{hero.release_date ? String(hero.release_date).slice(0, 4) : ""}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/movie/${hero.tmdb_id ?? hero.id}`} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold hover:bg-rose-500">
                  <Play className="h-4 w-4 fill-current" /> Watch trailer
                </Link>
                <Link href="/browse" className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm hover:border-zinc-400">Browse all</Link>
              </div>
            </>
          ) : (
            <p className="text-zinc-400">No movies yet. Set TMDB_API_KEY and refresh.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Titles</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-rose-500" />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((m) => {
              const poster = mediaUrl(m.poster_path, "poster");
              return (
                <Link key={`${m.id}-${m.tmdb_id}`} href={`/movie/${m.tmdb_id ?? m.id}`} className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-rose-500/40">
                  <div className="relative aspect-[2/3] bg-zinc-800">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt={m.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-500">{m.title}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-zinc-500">{m.release_date ? String(m.release_date).slice(0, 4) : "—"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
