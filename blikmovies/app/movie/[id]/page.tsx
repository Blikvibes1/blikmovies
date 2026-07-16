'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Download, ArrowLeft, Star, Heart, HeartOff, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Movie } from '@/lib/supabase';

// Streaming embed — uses the movie's TMDB ID for real content
function embedUrl(tmdbId: number) {
  return `https://vidsrc.to/embed/movie/${tmdbId}`;
}

function downloadUrl(tmdbId: number) {
  return `https://dl.vidsrc.vip/movie/${tmdbId}`;
}

export default function MoviePage() {
  const params = useParams();
  const id = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const numId = Number(id);

      let movieData: Movie | null = null;
      const { data: byId } = await supabase
        .from('movies')
        .select('*')
        .eq('id', numId)
        .maybeSingle();

      if (byId) {
        movieData = byId as Movie;
      } else {
        const { data: byTmdb } = await supabase
          .from('movies')
          .select('*')
          .eq('tmdb_id', numId)
          .maybeSingle();
        movieData = byTmdb as Movie | null;
      }

      if (!movieData) {
        try {
          const res = await fetch(`/api/tmdb/movie/${numId}`);
          if (res.ok) {
            const json = await res.json();
            movieData = json.movie as Movie;
          }
        } catch (_) {}
      }

      setMovie(movieData);

      if (movieData) {
        const { data: similarData } = await supabase
          .from('movies')
          .select('*')
          .neq('id', movieData.id)
          .order('vote_average', { ascending: false })
          .limit(5);
        setSimilar((similarData ?? []) as Movie[]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session && movieData) {
        setUserId(session.user.id);
        const { data: wl } = await supabase
          .from('watchlist')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('movie_id', movieData.tmdb_id ?? movieData.id)
          .maybeSingle();
        setInWatchlist(!!wl);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleWatchlist() {
    if (!userId || !movie) return;
    setWatchlistLoading(true);
    const movieId = movie.tmdb_id ?? movie.id;

    if (inWatchlist) {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('movie_id', movieId);
      setInWatchlist(false);
    } else {
      await supabase
        .from('watchlist')
        .insert({ user_id: userId, movie_id: movieId });
      setInWatchlist(true);
    }
    setWatchlistLoading(false);
  }

  // Lock body scroll when player is open
  useEffect(() => {
    document.body.style.overflow = playing ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [playing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-lg animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">Movie not found</p>
          <Link href="/" className="text-rose-400 underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const tmdbId = movie.tmdb_id ?? movie.id;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative h-[70vh] overflow-hidden">
        <img
          src={movie.backdrop_path}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm bg-black/50 hover:bg-black/70 px-4 py-2 rounded-full backdrop-blur transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="absolute bottom-10 left-10 right-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 text-sm px-3 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-current" />
              {movie.vote_average?.toFixed(1)}
            </div>
            <span className="text-zinc-400 text-sm">{movie.release_date?.split('-')[0]}</span>
            {movie.genres?.slice(0, 2).map(g => (
              <span key={g} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">{g}</span>
            ))}
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 max-w-2xl">{movie.title}</h1>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setPlaying(true)}
              className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transition"
            >
              <Play className="fill-current w-5 h-5" /> WATCH NOW
            </button>
            <a
              href={downloadUrl(tmdbId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 border-2 border-white/70 px-8 py-4 rounded-2xl font-semibold hover:bg-white hover:text-black transition"
            >
              <Download className="w-5 h-5" /> DOWNLOAD
            </a>
            {userId ? (
              <button
                onClick={toggleWatchlist}
                disabled={watchlistLoading}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold border-2 transition disabled:opacity-50 ${
                  inWatchlist
                    ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
                    : 'border-white/70 hover:bg-white hover:text-black'
                }`}
              >
                {inWatchlist ? <HeartOff className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                {inWatchlist ? 'Remove from List' : 'Add to List'}
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-3 border-2 border-white/40 px-8 py-4 rounded-2xl font-semibold text-zinc-300 hover:border-white/70 transition"
              >
                <Heart className="w-5 h-5" /> Sign in to save
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen Video Player */}
      {playing && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/80 shrink-0">
            <span className="text-white font-semibold text-lg truncate">{movie.title}</span>
            <button
              onClick={() => setPlaying(false)}
              className="flex items-center gap-2 text-white hover:text-rose-400 transition text-sm font-medium"
            >
              <X className="w-5 h-5" /> Close
            </button>
          </div>

          {/* Embed iframe */}
          <div className="flex-1 relative">
            <iframe
              src={embedUrl(tmdbId)}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              referrerPolicy="origin"
              title={movie.title}
            />
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="max-w-4xl mx-auto px-8 py-14">
        <h2 className="text-xl font-semibold mb-4 text-zinc-300">Overview</h2>
        <p className="text-xl text-zinc-300 leading-relaxed">{movie.overview}</p>
      </div>

      {/* More like this */}
      {similar.length > 0 && (
        <div className="max-w-7xl mx-auto px-8 pb-20">
          <div className="border-t border-zinc-800 pt-14">
            <h3 className="text-2xl font-semibold mb-8 tracking-tight">More like this</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {similar.map(m => (
                <Link key={m.id} href={`/movie/${m.id}`} className="group">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900">
                    <img
                      src={m.poster_path}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" /> {m.vote_average}
                    </div>
                  </div>
                  <div className="font-medium text-sm">{m.title}</div>
                  <div className="text-zinc-500 text-xs">{m.release_date?.split('-')[0]}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
