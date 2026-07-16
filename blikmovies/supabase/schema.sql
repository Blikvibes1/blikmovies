-- Blikmovies Supabase Schema

-- Enable RLS
ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
  id BIGSERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average NUMERIC,
  release_date DATE,
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users extended profile
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  can_download BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  movie_id INTEGER REFERENCES movies(tmdb_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Download requests
CREATE TABLE IF NOT EXISTS download_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  movie_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_requests ENABLE ROW LEVEL SECURITY;

-- Public read for movies
CREATE POLICY "Movies public read" ON movies FOR SELECT USING (true);

-- Users can only see own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Similar for other tables...

-- Admin role (add custom claims or separate check)
-- For full admin, use Supabase auth roles or row level policies with metadata.

-- Profiles row is only created automatically if you wire up a trigger on
-- auth.users; until then, insert one manually after your first sign-in:
--   insert into profiles (id, is_admin) values ('<your-auth-user-id>', true)
--   on conflict (id) do update set is_admin = true;
-- Find <your-auth-user-id> under Supabase → Authentication → Users.
