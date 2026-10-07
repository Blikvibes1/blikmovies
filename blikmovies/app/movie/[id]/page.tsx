"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Play, Star, ArrowLeft } from "lucide-react";
import { mediaUrl } from "@/lib/media";

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

type Movie = {
  id: number;
  tmdb_id?: number;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  genres?: string[];
  runtime?: number;
};

type Cast = { id: number; name: string; character: string; profile_path: string | null };

export default function MoviePage() {
  const params = useParams();
  const id = String(params.id || "");
  const [movie, setMovie] = useState<Movie | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [cast, setCast] = useState<Cast[]>([]);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Movie not found");
        if (cancelled) return;
        setMovie(json.movie);
        setPlayUrl(json.playUrl);
        setTrailerKey(json.trailerKey);
        setCast(json.cast || []);
        setSimilar((json.similar || []).map((m: Movie & { tmdb_id: number }) => ({ ...m, id: m.tmdb_id || m.id, tmdb_id: m.tmdb_id || m.id })));
        setNotice(json.notice || "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!theater) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTheater(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [theater]);

  const backdrop = mediaUrl(movie?.backdrop_path, "backdrop");
  const poster = mediaUrl(movie?.poster_path, "poster");
  const embedUrl = useMemo(() => (trailerKey ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0` : null), [trailerKey]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Loading movie…</div>;
  if (error || !movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <p className="text-xl">{error || "Movie not found"}</p>
        <Link href="/" className="text-rose-400 underline">Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative min-h-[45vh] overflow-hidden">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/50" />
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Home</Link>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end">
            <div className="hidden w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-700 md:block">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={movie.title} className="w-full" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold md:text-5xl">{movie.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-1 text-amber-400"><Star className="h-4 w-4 fill-current" />{Number(movie.vote_average || 0).toFixed(1)}</span>
                <span>{movie.release_date ? String(movie.release_date).slice(0, 4) : ""}</span>
                {movie.runtime ? <span>{movie.runtime} min</span> : null}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base">{movie.overview}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" disabled={!playUrl && !embedUrl} onClick={() => setTheater(true)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold hover:bg-rose-500 disabled:opacity-40">
                  <Play className="h-4 w-4 fill-current" />{playUrl || embedUrl ? "Play trailer" : "No trailer available"}
                </button>
                {playUrl ? <a href={playUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm hover:border-zinc-400">Open on YouTube</a> : null}
              </div>
              {notice ? <p className="mt-3 max-w-xl text-xs text-zinc-500">{notice}</p> : null}
            </div>
          </div>
        </div>
      </div>

      {theater && (playUrl || embedUrl) ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-400">
            <span>Official trailer · {movie.title}</span>
            <button type="button" className="rounded border border-zinc-700 px-2 py-1" onClick={() => setTheater(false)}>Exit</button>
          </div>
          <div className="min-h-0 flex-1">
            {playUrl ? (
              <ReactPlayer url={playUrl} width="100%" height="100%" controls playing />
            ) : (
              <iframe title="Trailer" src={embedUrl!} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
            )}
          </div>
        </div>
      ) : null}

      {cast.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="mb-4 text-lg font-semibold">Cast</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cast.map((c) => (
              <div key={c.id} className="w-24 shrink-0 text-center">
                <div className="mx-auto mb-1 aspect-square w-20 overflow-hidden rounded-full bg-zinc-800">
                  {c.profile_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="text-[11px] font-medium line-clamp-1">{c.name}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <h2 className="mb-4 text-lg font-semibold">More like this</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {similar.slice(0, 10).map((m) => {
              const href = `/movie/${m.tmdb_id ?? m.id}`;
              const p = mediaUrl(m.poster_path, "poster");
              return (
                <Link key={href} href={href} className="overflow-hidden rounded-xl border border-zinc-800">
                  <div className="aspect-[2/3] bg-zinc-900">
                    {p ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p} alt={m.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <p className="p-2 text-xs line-clamp-1">{m.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
