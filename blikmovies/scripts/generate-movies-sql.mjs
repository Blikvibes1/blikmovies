// Fetches 300+ movies from TMDB and writes INSERT SQL to movies-seed.sql
// Run: node scripts/generate-movies-sql.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const TOKEN = envFile.match(/TMDB_API_KEY=(.+)/)?.[1]?.trim();

if (!TOKEN) {
  console.error('TMDB_API_KEY not found in .env.local');
  process.exit(1);
}

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

async function fetchPage(endpoint, page) {
  const res = await fetch(
    `https://api.themoviedb.org/3${endpoint}?language=en-US&page=${page}`,
    { headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`TMDB ${endpoint} page ${page}: ${res.status}`);
  return res.json();
}

function escape(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function normalize(m) {
  return {
    tmdb_id: m.id,
    title: m.title || m.name || 'Unknown',
    overview: m.overview || '',
    poster_path: m.poster_path ? `${IMAGE_BASE}/w500${m.poster_path}` : '',
    backdrop_path: m.backdrop_path ? `${IMAGE_BASE}/original${m.backdrop_path}` : '',
    vote_average: Math.round((m.vote_average ?? 0) * 10) / 10,
    release_date: m.release_date || null,
    genres: (m.genre_ids ?? []).map(id => GENRE_MAP[id]).filter(Boolean),
  };
}

async function main() {
  const seen = new Map();
  const endpoints = [
    '/movie/popular',
    '/movie/top_rated',
    '/movie/now_playing',
    '/trending/movie/week',
    '/trending/movie/day',
  ];

  console.log('Fetching movies from TMDB...');

  for (const endpoint of endpoints) {
    for (let page = 1; page <= 8; page++) {
      try {
        const data = await fetchPage(endpoint, page);
        for (const m of data.results ?? []) {
          if (!seen.has(m.id) && m.poster_path && m.overview) {
            seen.set(m.id, normalize(m));
          }
          if (seen.size >= 300) break;
        }
        process.stdout.write(`\r${seen.size} movies collected...`);
        if (seen.size >= 300) break;
        await new Promise(r => setTimeout(r, 250)); // rate limit buffer
      } catch (e) {
        console.warn(`\nSkipped ${endpoint} p${page}: ${e.message}`);
      }
    }
    if (seen.size >= 300) break;
  }

  console.log(`\n\nTotal: ${seen.size} movies. Generating SQL...`);

  const movies = Array.from(seen.values()).slice(0, 300);

  const rows = movies.map(m => {
    const genres = m.genres.length
      ? `ARRAY[${m.genres.map(g => `'${escape(g)}'`).join(',')}]`
      : 'ARRAY[]::TEXT[]';
    const releaseDate = m.release_date ? `'${m.release_date}'` : 'NULL';
    return `  (${m.tmdb_id}, '${escape(m.title)}', '${escape(m.overview)}', '${escape(m.poster_path)}', '${escape(m.backdrop_path)}', ${m.vote_average}, ${releaseDate}, ${genres})`;
  });

  const sql = `-- ${movies.length} movies from TMDB — paste into Supabase SQL Editor and Run
-- Generated ${new Date().toISOString()}
-- Every movie can be watched at: https://vidsrc.to/embed/movie/{tmdb_id}
-- Every movie can be downloaded at: https://dl.vidsrc.vip/movie/{tmdb_id}

INSERT INTO movies (tmdb_id, title, overview, poster_path, backdrop_path, vote_average, release_date, genres)
VALUES
${rows.join(',\n')}
ON CONFLICT (tmdb_id) DO UPDATE SET
  title = EXCLUDED.title,
  overview = EXCLUDED.overview,
  poster_path = EXCLUDED.poster_path,
  backdrop_path = EXCLUDED.backdrop_path,
  vote_average = EXCLUDED.vote_average,
  release_date = EXCLUDED.release_date,
  genres = EXCLUDED.genres;

SELECT COUNT(*) AS total_movies FROM movies;
`;

  const outPath = path.join(__dirname, '../supabase/movies-seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`\nSQL written to: supabase/movies-seed.sql`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
  console.log(`\nPaste the contents of that file into Supabase SQL Editor and click Run.`);
}

main().catch(console.error);
