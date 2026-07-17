'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Film, BarChart3, Settings, LogOut, Check, X, Trash2, RefreshCw, Zap, CloudUpload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Movie, Profile, DownloadRequest } from '@/lib/supabase';

type Tab = 'dashboard' | 'movies' | 'users' | 'settings';
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface SyncedMovie {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [authState, setAuthState] = useState<'checking' | 'denied' | 'ok'>('checking');

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadedMovies, setUploadedMovies] = useState<SyncedMovie[]>([]);
  const [selectedPages, setSelectedPages] = useState(1);

  // Legacy sync state (settings tab)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Data state
  const [movies, setMovies] = useState<Movie[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [stats, setStats] = useState({ movies: 0, users: 0, pendingRequests: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthState('denied'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      setAuthState(profile?.is_admin ? 'ok' : 'denied');
    }
    checkAdmin();
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    const [moviesRes, profilesRes, requestsRes] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('download_requests').select('*, movies(title)').order('created_at', { ascending: false }),
    ]);
    const moviesData = (moviesRes.data ?? []) as Movie[];
    const profilesData = (profilesRes.data ?? []) as Profile[];
    const requestsData = (requestsRes.data ?? []) as DownloadRequest[];
    setMovies(moviesData);
    setProfiles(profilesData);
    setRequests(requestsData);
    setStats({
      movies: moviesData.length,
      users: profilesData.length,
      pendingRequests: requestsData.filter(r => r.status === 'pending').length,
    });
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (authState === 'ok') loadData();
  }, [authState, loadData]);

  async function handleAutoUpload() {
    setUploadStatus('uploading');
    setUploadMessage('');
    setUploadedMovies([]);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/sync?pages=${selectedPages}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const body = await res.json();

    if (!res.ok) {
      setUploadStatus('error');
      setUploadMessage(body.error ?? 'Upload failed');
      return;
    }

    setUploadStatus('done');
    setUploadMessage(`✅ ${body.synced} movies uploaded with posters, ready to watch & download!`);
    setUploadedMovies(body.movies ?? []);
    loadData();
  }

  async function handleSync() {
    setSyncStatus('syncing');
    setSyncMessage('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const body = await res.json();
    if (!res.ok) {
      setSyncStatus('error');
      setSyncMessage(body.error ?? 'Sync failed');
      return;
    }
    setSyncStatus('done');
    setSyncMessage(`Synced ${body.synced} movies from TMDB.`);
    loadData();
  }

  async function handleDeleteMovie(id: number) {
    if (!confirm('Delete this movie?')) return;
    await supabase.from('movies').delete().eq('id', id);
    setMovies(prev => prev.filter(m => m.id !== id));
    setStats(prev => ({ ...prev, movies: prev.movies - 1 }));
  }

  async function handleRequestAction(id: number, status: 'approved' | 'rejected') {
    await supabase.from('download_requests').update({ status }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (status === 'approved' || status === 'rejected') {
      setStats(prev => ({ ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) }));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Checking access…</div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-3">Admin access required</h1>
          <p className="text-zinc-400 mb-6">
            Log in with an account that has <code className="text-rose-400">is_admin = true</code> in the profiles table.
          </p>
          <Link href="/login" className="text-rose-400 underline">Go to login</Link>
        </div>
      </div>
    );
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <Link href="/" className="text-2xl font-bold tracking-[-2px]">blikmovies</Link>
          <span className="px-2 py-0.5 text-xs bg-rose-600 rounded font-medium">ADMIN</span>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm ${
                activeTab === item.id
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'hover:bg-zinc-900/70 text-zinc-400'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-zinc-900 rounded-xl mt-auto text-sm transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 p-10 overflow-auto">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-4xl font-bold mb-10 tracking-tight">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { label: 'Total Movies', value: stats.movies, icon: Film, color: 'text-rose-500' },
                { label: 'Profiles', value: stats.users, icon: Users, color: 'text-indigo-400' },
                { label: 'Pending Requests', value: stats.pendingRequests, icon: BarChart3, color: 'text-amber-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                  <div className={`${stat.color} mb-4`}><stat.icon className="w-7 h-7" /></div>
                  <div className="text-5xl font-semibold tracking-tighter mb-1">{stat.value}</div>
                  <div className="text-zinc-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <h3 className="text-lg font-semibold mb-6">Recent Download Requests</h3>
              {requests.length === 0 ? (
                <p className="text-zinc-500 text-sm">No requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 5).map(req => (
                    <div key={req.id} className="flex justify-between items-center py-3 border-b border-zinc-800 last:border-0">
                      <div className="text-sm">
                        <span className="text-zinc-300">User requested download</span>
                        {req.movies && <span className="text-rose-400 ml-1">· {(req.movies as unknown as Movie).title}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{req.status}</span>
                        <span className="text-zinc-600 text-xs">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOVIES */}
        {activeTab === 'movies' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight">Movies</h1>
              <button
                onClick={loadData}
                disabled={dataLoading}
                className="flex items-center gap-2 border border-zinc-700 px-4 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* ── AUTO UPLOAD CARD ── */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/60 border border-zinc-700 rounded-3xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-rose-600/20 p-3 rounded-2xl shrink-0">
                  <CloudUpload className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Auto Upload Movies</h2>
                  <p className="text-zinc-400 text-sm">
                    Pulls movies from TMDB (Trending · Now Playing · Popular · Top Rated) with full posters.
                    Every movie can be watched and downloaded instantly.
                  </p>
                </div>
              </div>

              {/* Page selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm text-zinc-400">How many pages to fetch?</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPages(p)}
                      className={`px-4 py-1.5 rounded-xl text-sm font-medium transition border ${
                        selectedPages === p
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {p}× <span className="text-xs opacity-70">~{p * 40} movies</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAutoUpload}
                disabled={uploadStatus === 'uploading'}
                className="flex items-center gap-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-8 py-4 rounded-2xl font-semibold text-base transition"
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Uploading movies…
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Auto Upload Movies
                  </>
                )}
              </button>

              {uploadMessage && (
                <p className={`mt-4 text-sm font-medium ${uploadStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {uploadMessage}
                </p>
              )}

              {/* Live poster grid after upload */}
              {uploadedMovies.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Just uploaded</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {uploadedMovies.slice(0, 40).map(m => (
                      <Link
                        key={m.id}
                        href={`/movie/${m.id}`}
                        target="_blank"
                        title={m.title}
                        className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 hover:ring-2 hover:ring-rose-500 transition"
                      >
                        {m.poster_path ? (
                          <img
                            src={m.poster_path}
                            alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                  {uploadedMovies.length > 40 && (
                    <p className="text-zinc-500 text-xs mt-2">+{uploadedMovies.length - 40} more uploaded</p>
                  )}
                </div>
              )}
            </div>

            {/* Movie list */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <span>Poster</span><span>Title</span><span>Year</span><span>Rating</span><span>Action</span>
              </div>
              {movies.length === 0 ? (
                <div className="px-6 py-10 text-zinc-500 text-sm text-center">
                  No movies yet. Click "Auto Upload Movies" above to import.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {movies.map(movie => (
                    <div key={movie.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center">
                      <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="w-10 h-14 object-cover rounded-lg bg-zinc-800"
                      />
                      <div>
                        <div className="font-medium text-sm">{movie.title}</div>
                        <div className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{movie.overview}</div>
                      </div>
                      <span className="text-zinc-400 text-sm">{movie.release_date?.split('-')[0]}</span>
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        ★ {Number(movie.vote_average).toFixed(1)}
                      </div>
                      <button
                        onClick={() => handleDeleteMovie(movie.id)}
                        className="text-zinc-600 hover:text-red-400 transition p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight">Users & Requests</h1>
              <button
                onClick={loadData}
                disabled={dataLoading}
                className="flex items-center gap-2 border border-zinc-700 px-4 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-8">
              <div className="px-6 py-5 border-b border-zinc-800">
                <h2 className="font-semibold">Download Requests</h2>
                <p className="text-zinc-500 text-sm mt-0.5">Approve or reject user download requests</p>
              </div>
              {requests.length === 0 ? (
                <div className="px-6 py-8 text-zinc-500 text-sm text-center">No download requests yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between px-6 py-4 gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {req.movies ? (req.movies as unknown as Movie).title : `Movie #${req.movie_id}`}
                        </div>
                        <div className="text-zinc-500 text-xs mt-0.5">
                          User {req.user_id.slice(0, 8)}… · {new Date(req.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{req.status}</span>
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleRequestAction(req.id, 'approved')}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition"
                            ><Check className="w-4 h-4" /></button>
                            <button
                              onClick={() => handleRequestAction(req.id, 'rejected')}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                            ><X className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
              <div className="px-6 py-5 border-b border-zinc-800">
                <h2 className="font-semibold">All Profiles</h2>
              </div>
              {profiles.length === 0 ? (
                <div className="px-6 py-8 text-zinc-500 text-sm text-center">No profiles yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {profiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <div className="text-sm font-medium">{p.username ?? p.id.slice(0, 16) + '…'}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">
                          Joined {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {p.is_admin && <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full">Admin</span>}
                        {p.can_download && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Can Download</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="text-4xl font-bold mb-10 tracking-tight">Settings</h1>
            <div className="space-y-6 max-w-xl">
              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <h3 className="font-semibold mb-1">Quick TMDB Sync</h3>
                <p className="text-zinc-400 text-sm mb-6">Pull latest trending and popular movies into your database.</p>
                <button
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {syncStatus === 'syncing' ? 'Syncing…' : '↻ Sync from TMDB'}
                </button>
                {syncMessage && (
                  <p className={`mt-4 text-sm ${syncStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{syncMessage}</p>
                )}
              </div>
              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <h3 className="font-semibold mb-1">Account</h3>
                <p className="text-zinc-400 text-sm mb-6">Sign out of your admin session.</p>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
