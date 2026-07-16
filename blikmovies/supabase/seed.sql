-- Sample movies so the site has real data to show.
-- Run this in the Supabase SQL Editor AFTER running schema.sql.

INSERT INTO movies (tmdb_id, title, overview, poster_path, backdrop_path, vote_average, release_date, genres)
VALUES
  (693134, 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against those who destroyed his family.', 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9d7Z6J8w3e4vO.jpg', 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg', 8.5, '2024-03-01', ARRAY['Science Fiction','Adventure']),
  (786892, 'Furiosa: A Mad Max Saga', 'The origin story of renegade warrior Furiosa before her encounter with Mad Max.', 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg', 'https://image.tmdb.org/t/p/original/dY5rDCXpvfBKttXo2yJnwlA9Rlw.jpg', 7.6, '2024-05-24', ARRAY['Action','Adventure']),
  (653346, 'Kingdom of the Planet of the Apes', 'An ape hunter embarks on a journey that will question all that he grew up believing.', 'https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQGz4c2mL7n.jpg', 'https://image.tmdb.org/t/p/original/wJGtCa2z8AZUAOx6ITEjEIu64Nx.jpg', 7.1, '2024-05-10', ARRAY['Science Fiction','Adventure']),
  (718930, 'Challengers', 'Tennis prodigy turned coach becomes the object of rivalry between two friends.', 'https://image.tmdb.org/t/p/w500/H6vke7Yx6NEjhVCTBTpzOTt3lpq.jpg', 'https://image.tmdb.org/t/p/original/2sxsRVhAZTgqjO0v0Yeo7pWRLCG.jpg', 7.3, '2024-04-26', ARRAY['Drama','Romance'])
ON CONFLICT (tmdb_id) DO NOTHING;
