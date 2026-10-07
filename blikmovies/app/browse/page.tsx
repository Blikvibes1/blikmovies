"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";

type Movie = { id: number; tmdb_id?: number | null; title: string; poster_path?: string; release_date?: string };

export default function BrowsePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/movies?bootstrap=1")
      .then((r) => r.json())
      .then((j) => {
        if (j.error && !(j.movies || []).length) throw new Error(j.error);
        setMovies(j.movies || []);
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = movies.filter((m) => !q || m.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-xs text-zinc-500 hover:text-white">← Home</Link>
            <h1 className="text-2xl font-bold">Browse</h1>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm" />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <p className="animate-pulse text-zinc-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((m) => {
              const poster = mediaUrl(m.poster_path, "poster");
              return (
                <Link key={`${m.id}-${m.tmdb_id}`} href={`/movie/${m.tmdb_id ?? m.id}`} className="overflow-hidden rounded-xl border border-zinc-800">
                  <div className="aspect-[2/3] bg-zinc-900">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt={m.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-500">{m.title}</div>
                    )}
                  </div>
                  <p className="p-2 text-sm line-clamp-1">{m.title}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
