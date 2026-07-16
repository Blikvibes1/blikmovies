import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Movie {
  id: number;
  tmdb_id?: number | null;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  genres?: string[];
  created_at?: string;
}

export interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
  can_download: boolean;
  is_admin: boolean;
  created_at?: string;
}

export interface DownloadRequest {
  id: number;
  user_id: string;
  movie_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  movies?: Movie;
}
