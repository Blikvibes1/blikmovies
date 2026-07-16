'use client';

import { useEffect, useState } from 'react';
import { Search, Star } from 'lucide-react';
import Link from 'next/link';
import { supabase, Movie } from '@/lib/supabase';

export default function BrowsePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMovies(data as Movie[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-[-2px]">blikmovies</Link>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 pl-12 py-3 rounded-2xl text-sm focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-tight mb-10">Browse All Movies</h1>

        {loading && <p className="text-zinc-500">Loading movies...</p>}

        {!loading && filtered.length === 0 && (
          <div className="text-zinc-400">
            No movies found yet. Run <code className="text-rose-400">supabase/seed.sql</code> in your Supabase
            SQL editor to add sample movies, or add some from the{' '}
            <Link href="/admin" className="text-rose-400 underline">admin dashboard</Link>.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {filtered.map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group">
              <div className="relative aspect-[2/3] rounded-3xl overflow-hidden mb-4 bg-zinc-900">
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-black/70 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" /> {movie.vote_average}
                </div>
              </div>
              <div className="font-medium text-lg">{movie.title}</div>
              <div className="text-zinc-500 text-sm">{movie.release_date?.split('-')[0]}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
