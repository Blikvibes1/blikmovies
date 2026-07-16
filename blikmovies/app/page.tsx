'use client';

import { useState, useEffect } from 'react';
import { Search, Play, Star } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Movie } from '@/lib/supabase';

const mockMovies: Movie[] = [
  {
    id: 1,
    title: "Dune: Part Two",
    poster_path: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9d7Z6J8w3e4vO.jpg",
    backdrop_path: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against his enemies.",
    vote_average: 8.5,
    release_date: "2024-03-01",
  },
  {
    id: 2,
    title: "Furiosa: A Mad Max Saga",
    poster_path: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
    backdrop_path: "https://image.tmdb.org/t/p/original/dY5rDCXpvfBKttXo2yJnwlA9Rlw.jpg",
    overview: "The origin story of renegade warrior Furiosa before her encounter with Mad Max.",
    vote_average: 7.8,
    release_date: "2024-05-24",
  },
  {
    id: 3,
    title: "Kingdom of the Planet of the Apes",
    poster_path: "https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQGz4c2mL7n.jpg",
    backdrop_path: "https://image.tmdb.org/t/p/original/wJGtCa2z8AZUAOx6ITEjEIu64Nx.jpg",
    overview: "An ape hunter embarks on a journey that will question all that he grew up believing.",
    vote_average: 7.1,
    release_date: "2024-05-10",
  },
  {
    id: 4,
    title: "Challengers",
    poster_path: "https://image.tmdb.org/t/p/w500/H6vke7Yx6NEjhVCTBTpzOTt3lpq.jpg",
    backdrop_path: "https://image.tmdb.org/t/p/original/2sxsRVhAZTgqjO0v0Yeo7pWRLCG.jpg",
    overview: "Tennis prodigy turned coach turns into the object of rivalry between two friends.",
    vote_average: 7.3,
    release_date: "2024-04-26",
  },
];

export default function BlikmoviesHome() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadMovies() {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        setMovies(data as Movie[]);
        setHeroMovie(data[0] as Movie);
      } else {
        setMovies(mockMovies);
        setHeroMovie(mockMovies[0]);
      }
    }

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    }

    loadMovies();
    checkSession();
  }, []);

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-base shadow-lg">
                ▶
              </div>
              <div className="text-2xl font-bold tracking-[-2px]">blikmovies</div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="text-white">Home</Link>
              <Link href="/browse" className="text-zinc-400 hover:text-white transition-colors">Browse</Link>
              <Link href="/watchlist" className="text-zinc-400 hover:text-white transition-colors">My List</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-rose-500 w-52 transition"
              />
            </div>
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link href="/admin" className="text-sm text-zinc-400 hover:text-white transition">Admin</Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-zinc-200 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      {heroMovie && (
        <div className="relative h-[85vh] overflow-hidden pt-16">
          <img
            src={heroMovie.backdrop_path}
            alt={heroMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />

          <div className="absolute bottom-20 left-10 max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-rose-600/80 text-white px-3 py-1 rounded-full font-medium">Featured</span>
              <span className="flex items-center gap-1 text-yellow-400 text-sm">
                <Star className="w-3.5 h-3.5 fill-current" />
                {heroMovie.vote_average}
              </span>
              <span className="text-zinc-400 text-sm">{heroMovie.release_date?.split('-')[0]}</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">{heroMovie.title}</h1>
            <p className="text-zinc-300 text-base leading-relaxed mb-8 line-clamp-3">{heroMovie.overview}</p>
            <div className="flex gap-4">
              <Link
                href={`/movie/${heroMovie.id}`}
                className="flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-2xl font-semibold hover:scale-105 transition"
              >
                <Play className="w-5 h-5 fill-current" /> Watch Now
              </Link>
              <Link
                href="/browse"
                className="flex items-center gap-2 border border-white/40 px-8 py-3.5 rounded-2xl font-semibold hover:bg-white/10 transition"
              >
                Browse All
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Movies Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">
            {searchQuery ? `Results for "${searchQuery}"` : 'Trending Movies'}
          </h2>
          <Link href="/browse" className="text-sm text-rose-400 hover:text-rose-300 transition">
            View all →
          </Link>
        </div>

        {filteredMovies.length === 0 && (
          <p className="text-zinc-500">No movies found.</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredMovies.map(movie => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900">
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-2.5 right-2.5 bg-black/70 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" /> {movie.vote_average}
                </div>
              </div>
              <div className="font-medium text-sm">{movie.title}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{movie.release_date?.split('-')[0]}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black py-10 border-t border-zinc-900 text-center text-sm text-zinc-600">
        Blikmovies © 2026 · Built with Next.js + Supabase
      </footer>
    </div>
  );
}
