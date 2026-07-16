'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Movie } from '@/lib/supabase';

export default function WatchlistPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      const { data } = await supabase
        .from('watchlist')
        .select('movies(*)')
        .eq('user_id', session.user.id);

      const flattened = (data ?? []).flatMap((row: any) => row.movies ?? []);
      setMovies(flattened);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-[-2px]">blikmovies</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-tight mb-10">My List</h1>

        {loading && <p className="text-zinc-500">Loading...</p>}

        {!loading && !signedIn && (
          <div className="text-zinc-400">
            <Link href="/login" className="text-rose-400 underline">Log in</Link> to save movies to your list.
          </div>
        )}

        {!loading && signedIn && movies.length === 0 && (
          <p className="text-zinc-400">Your list is empty. Browse movies and add some!</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {movies.map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group">
              <div className="relative aspect-[2/3] rounded-3xl overflow-hidden mb-4 bg-zinc-900">
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="font-medium text-lg">{movie.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
