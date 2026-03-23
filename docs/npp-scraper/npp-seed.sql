-- Now Playing Podcast — MANTL Seed
-- Generated: 2026-03-03T08:43:53.235Z
-- 994 episodes, 229 series

DO $$
DECLARE cid uuid; sid uuid;
BEGIN
  SELECT id INTO cid FROM community_pages WHERE slug = 'nowplaying';
  IF cid IS NULL THEN RAISE EXCEPTION 'nowplaying community not found'; END IF;

  -- ═══ SERIES (229 total) ═══
  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Comic Book Movies', 10, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Marvel', 20, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Stephen King', 30, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Video Game Series', 40, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Comics Series', 50, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Avengers', 60, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'James Bond', 70, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Spider-Man', 80, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Batman', 90, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Superman', 100, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Extended Movie Universe', 110, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Team Series', 120, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'X-Men', 130, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Star Trek', 140, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Halloween', 150, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Hulk', 160, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Universal Monsters', 170, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nick Fury', 180, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Captain America', 190, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nolan', 200, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Children of the Corn', 210, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Iron Man', 220, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'David Lynch', 230, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Conjuring', 240, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Black Widow', 250, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Philip K. Dick', 260, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Friday the 13th', 270, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'King Kong', 280, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Saw', 290, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Rocky', 300, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'John Carpenter', 310, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wolverine', 320, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Predator', 330, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Transformers', 340, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Fast and Furious', 350, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wonder Woman', 360, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Robocop', 370, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Avengers - Some Assembly Required', 380, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Mission: Impossible', 390, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Board Game Series', 400, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Teenage Mutant Ninja Turtles', 410, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Thor', 420, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Texas Chainsaw Massacre', 430, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Resident Evil', 440, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Viral Outbreak', 450, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Karate Kid', 460, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Final Destination', 470, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Death Race', 480, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Godzilla', 490, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Martin Scorsese / Leonardo DiCaprio', 500, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Scream', 510, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Pixar', 520, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Justice League', 530, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Terminator', 540, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Rob Zombie', 550, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Star Wars', 560, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Death Wish', 570, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Bourne', 580, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wes Craven', 590, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Hitmen', 600, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Silent Night Deadly Night', 610, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'John Wick', 620, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wolf Man', 630, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Venom', 640, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dracula', 650, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Mad Max', 660, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'MonsterVerse', 670, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Flash', 680, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ant-Man', 690, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Underworld', 700, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Toy Story', 710, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Tremors', 720, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Rambo', 730, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Pokemon', 740, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Die Hard', 750, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nightmare on Elm St', 760, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Fantastic Four', 770, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Species', 780, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dungeons and Dragons', 790, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nosferatu', 800, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Sonic The Hedgehog', 810, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dark Horse Comics', 820, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Hellboy', 830, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Aquaman', 840, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Daredevil and Elektra', 850, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Guardians of the Galaxy', 860, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Black Panther', 870, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Doctor Strange', 880, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Blade', 890, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'G.I. Joe', 900, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Tom Clancy', 910, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Jack Ryan', 920, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Charlie''s Angels', 930, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Insidious', 940, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Transporter', 950, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Carrie', 960, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Marvel Misfits', 970, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Hannibal Lecter', 980, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Frankenstein', 990, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Silent Hill', 1000, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Darkman', 1010, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Knives Out', 1020, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Avatar', 1030, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Robert Langdon', 1040, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Green Lantern', 1050, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Bad Boys', 1060, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Kingsman', 1070, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dune', 1080, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'French Connection', 1090, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Maze Runner', 1100, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Captain Marvel', 1110, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Pet Sematary', 1120, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Shazam', 1130, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Fletch', 1140, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Suicide Squad', 1150, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Mortal Kombat', 1160, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Joker', 1170, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Shining', 1180, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'House of 1000 Corpses', 1190, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Deadpool', 1200, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Tomb Raider', 1210, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Creepshow', 1220, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Blair Witch', 1230, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Different Seasons', 1240, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Human Centipede', 1250, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Before', 1260, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ocean''s 11', 1270, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Sometimes They Come Back', 1280, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Mangler', 1290, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Salem''s Lot', 1300, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Riddick', 1310, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Heroes', 1320, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Punisher', 1330, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Lost Boys', 1340, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Back to the Future', 1350, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Edgar Wright', 1360, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Running Man', 1370, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Tron', 1380, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Rose Red', 1390, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nobody', 1400, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Jack Reacher', 1410, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ouija Series', 1420, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Gladiator', 1430, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Twister', 1440, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Speed', 1450, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Fugitive', 1460, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Chinatown', 1470, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Basic Instinct', 1480, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Nightmares and Dreamscapes', 1490, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'American Psycho', 1500, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'The Haunting', 1510, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Straw Dogs', 1520, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dead Rising', 1530, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Coming to America', 1540, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'The Stand', 1550, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Bloodrayne', 1560, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, '48 Hours', 1570, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'The Craft', 1580, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Manchurian Candidate', 1590, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Escape From', 1600, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Andromeda Strain', 1610, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dungeon Siege', 1620, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'It', 1630, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Angry Birds', 1640, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Hitman', 1650, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wreck-It Ralph', 1660, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Incredibles', 1670, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Stephen Spielberg', 1680, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Pacific Rim', 1690, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Street Fighter', 1700, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'The Room Tommy Wiseau', 1710, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Blade Runner', 1720, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Trainspotting', 1730, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Twin Peaks', 1740, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Sinister', 1750, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Short Circuit', 1760, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'The Spirit', 1770, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Machete', 1780, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Maniac', 1790, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Trucks', 1800, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Lawnmower Man', 1810, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'David Fincher', 1820, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Night Shift', 1830, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Gremlins', 1840, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Swamp Thing', 1850, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Fright Night', 1860, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Kick-Ass', 1870, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'RED', 1880, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ghost Rider', 1890, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'X-Files', 1900, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Alien', 1910, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, '300', 1920, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Five Nights at Freddy''s', 1930, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Universe', 1940, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Minecraft', 1950, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Battleship', 1960, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Thanksgiving', 1970, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Town That Dreaded Sundown', 1980, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'DC Superpets', 1990, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Uncharted', 2000, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'My Bloody Valentine', 2010, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Shang-Chi', 2020, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Army of the Dead', 2030, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Bill & Ted', 2040, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Doom', 2050, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Happy Death Day', 2060, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'House of the Dead', 2070, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Warcraft', 2080, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Teen Titans', 2090, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Need for Speed', 2100, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Alone in the Dark', 2110, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wing Commander', 2120, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Prince of Persia', 2130, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Final Fantasy', 2140, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Rampage', 2150, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ready Player One', 2160, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Mario', 2170, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Total Recall', 2180, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dark Tower', 2190, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Wild at Heart', 2200, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Ferris Bueller', 2210, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Tales From the Darkside', 2220, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Cujo', 2230, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Watchmen', 2240, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'He-Man', 2250, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Firestarter', 2260, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Dead Zone', 2270, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, 'Big Hero 6', 2280, 'filmography')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)
  VALUES (gen_random_uuid(), cid, '2001 and 2010', 2290, 'filmography')
  ON CONFLICT DO NOTHING;


  -- Comic Book Movies (168 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Comic Book Movies' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman and the Mole Men', 1951, 'film', 41800, '/9b41Aa3hS2DJ1DhzLmtMcAswlys.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1966)', 1966, 'film', 1133654, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Original Wonder Woman (1975)', 1975, 'film', NULL, NULL, 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man', 1977, 'film', 225914, '/jNxRHZ2cxVkNRtxgHuCtv7GY4JP.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk (1977)', 1977, 'film', NULL, NULL, 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman', 1978, 'film', 1924, '/d7px1FQxW4tngdACVRsCSaZq0Xl.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Legends of the Superheroes', 1979, 'film', NULL, NULL, 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America II: Death Too Soon', 1979, 'film', 197481, '/pocmh0P8Ddf5w33pP3Vuqm0JRP9.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1979)', 1979, 'film', NULL, NULL, 90, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman II', 1980, 'film', 8536, '/3xk5cno9BHcnwc97XO9k21aI1Zi.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: The Dragon''s Challenge', 1981, 'film', 225938, '/wBmtFmSikG5u08FdGLRsF0Py59V.jpg', 110, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Swamp Thing', 1982, 'film', 17918, '/7BGaE9A7UeyxH29aeFbQfzEmIi0.jpg', 120, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman III', 1983, 'film', 9531, '/icE00hFNg86z3OrWyyRop7khwii.jpg', 130, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Supergirl', 1984, 'film', 9651, '/o49a2RDChZkry84LomEORCPDWfk.jpg', 140, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Howard the Duck', 1986, 'film', 10658, '/eU0dWo8PJgsSAZFbcyHiUpuLSyW.jpg', 150, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (1987)', 1987, 'film', NULL, NULL, 160, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman IV: The Quest for Peace', 1987, 'film', 11411, '/vhs3P0JwqzlgfBqhjnCWDEOtDmS.jpg', 170, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk Returns', 1988, 'film', 26881, '/dw7eBKL26HEkA89BKvNVsjx7gGL.jpg', 180, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Return of Swamp Thing', 1989, 'film', 19142, '/5sm1Yi1hgj805b9o2a1uC6BXhqw.jpg', 190, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1989)', 1989, 'film', NULL, NULL, 200, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Trial of the Incredible Hulk', 1989, 'film', 26883, '/jaaeLvonWry3TdTXaGSu2VveNEG.jpg', 210, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (1989)', 1989, 'film', NULL, NULL, 220, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Flash (1990)', 1990, 'film', NULL, NULL, 230, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles (1990)', 1990, 'film', 1498, '/shfAU6xIIEAEtsloIT3n9Fscz2E.jpg', 240, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1990)', 1990, 'film', NULL, NULL, 250, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles II: The Secret of the Ooze', 1991, 'film', 1497, '/Hyvvz9Z3le1is8a0EeFJQm0aSC.jpg', 260, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Death of the Incredible Hulk', 1991, 'film', 19593, '/6q6CviMLR97ssODmKhxgyxQuoYp.jpg', 270, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Returns', 1992, 'film', 364, '/jKBjeXM7iBBV9UkUcOXx3m7FSHY.jpg', 280, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles III', 1993, 'film', 1499, '/fwX5RdPDBFsbEAXc46DrvRz5Bca.jpg', 290, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman : Mask of the Phantasm', 1993, 'film', 14919, '/hT4ehUteagUrhUOHAtmYiY7mp5l.jpg', 300, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four', 1994, 'film', 22059, '/avJpIDOjyfdoOLINYficKvW9dEa.jpg', 310, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tank Girl', 1995, 'film', 9067, '/dpX63vJd6k5fMTudLaEOw9ffX8h.jpg', 320, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Forever', 1995, 'film', 414, '/i0fJS8M5UKoETjjJ0zwUiKaR8tr.jpg', 330, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Generation X', 1996, 'film', 26623, '/oaM0RTIkhw0lCK9JowsIvdsJ1Pn.jpg', 340, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 350, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Steel', 1997, 'film', 8854, '/ufA7d5LT2rGj58KaZErPhcMkJ4U.jpg', 360, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nick Fury: Agent of S.H.I.E.L.D.', 1998, 'film', 27460, '/4T0YjvnBaMASZkkRKxMIe6IoWO0.jpg', 370, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade', 1998, 'film', 36647, '/hx0sdduAsr4rq03RZKZzglR25z7.jpg', 380, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gen 13', 2000, 'film', 15993, '/wIVQV5ELcY2nwPf5NkYXqGx7RXe.jpg', 390, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men', 2000, 'film', 36657, '/bRDAc4GogyS9ci3ow7UnInOcriN.jpg', 400, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Road to Perdition', 2002, 'film', 4147, '/loSpBeirRfTPJ3cMIqpQArstGhh.jpg', 410, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man (2002)', 2002, 'film', 557, '/kjdJntyBeEvqm9w97QGBdxPptzj.jpg', 420, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade II', 2002, 'film', 36586, '/yDHwo3eWcMiy5LnnEnlGV9iLu9k.jpg', 430, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'American Splendor', 2003, 'film', 2771, '/rPLMxuk82AiqDiwEUVJ6E7WpjYs.jpg', 440, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The League of Extraordinary Gentlemen', 2003, 'film', 8698, '/kdAuVFP63XXxnb983ry2pLCKd9S.jpg', 450, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Daredevil', 2003, 'film', 9480, '/oCDBwSkntYamuw8VJIxMRCtDBmi.jpg', 460, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy', 2004, 'film', 1487, '/lbaTEneOofwvAyg77R8HbFML2zT.jpg', 470, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Catwoman', 2004, 'film', 314, '/pvnPgukFyEKgCzyOxyLiwyZ8T1C.jpg', 480, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 2', 2004, 'film', 558, '/eg8XHjA7jkM3ulBLnfGTczR9ytI.jpg', 490, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (2004)', 2004, 'film', NULL, NULL, 500, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade: Trinity', 2004, 'film', 36648, '/6f7iXvPOnf83MaLB1JmPzUor1rr.jpg', 510, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A History of Violence', 2005, 'film', 59, '/3qnO72NHmUgs9JZXAmu4aId9QDl.jpg', 520, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Constantine', 2005, 'film', 561, '/vPYgvd2MwHlxTamAOjwVQp4qs1W.jpg', 530, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Begins', 2005, 'film', 272, '/sPX89Td70IDDjVr85jdSBb4rWGr.jpg', 540, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Elektra', 2005, 'film', 9947, '/Z4dAOxjAHTUZO6DJ2WVAsxzwe3.jpg', 550, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four', 2005, 'film', 9738, '/8HLQLILZLhDQWO6JDpvY6XJLH75.jpg', 560, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man-Thing', 2005, 'film', 18882, '/kfPPnOygXSGaBFpsCUyu7xQdkoO.jpg', 570, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'V For Vendetta', 2006, 'film', 752, '/piZOwjyk1g51oPHonc7zaQY3WOv.jpg', 580, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman Returns', 2006, 'film', 1452, '/385XwTQZDpRX2d3kxtnpiLrjBXw.jpg', 590, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: The Last Stand', 2006, 'film', 36668, '/a2xicU8DpKtRizOHjQLC1JyCSRS.jpg', 600, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'TMNT', 2007, 'film', 1273, '/6ZCWn7BGpDLBDigtdiuGyBdEqab.jpg', 610, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 3', 2007, 'film', 559, '/qFmwhVUoUSXjkKRmca5yGDEXBIj.jpg', 620, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider', 2007, 'film', 1250, '/1pyU94dAY7npDQCKuxCSyX9KthN.jpg', 630, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four: Rise of the Silver Surfer', 2007, 'film', 1979, '/1rxTraSO45jbvTrCeSvJ6RmOu1b.jpg', 640, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy II: The Golden Army', 2008, 'film', 11253, '/zO0Wdrxnhx3KoJEvychSmnY3urC.jpg', 650, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (2008)', 2008, 'film', 14092, '/5ngIhoA0b4aGBoPFPURAbDwCKT7.jpg', 660, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight', 2008, 'film', 155, '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 670, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk', 2008, 'film', 1724, '/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', 680, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man', 2008, 'film', 1726, '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 690, '{"up": 2, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Punisher: War Zone', 2008, 'film', 13056, '/oOvKJgYUIpfswGHAdW6159bPbvM.jpg', 700, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Watchmen', 2009, 'film', 13183, '/u0ROjy3KPzMDTipqCrwD8LwkKSQ.jpg', 710, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men Origins: Wolverine', 2009, 'film', 2080, '/yj8LbTju1p7CUJg7US2unSBk33s.jpg', 720, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED', 2010, 'film', 39514, '/8eeK3OB5PeSRQD7BpZcGZKkehG.jpg', 730, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Losers', 2010, 'film', 34813, '/b9dVH0n7YnBqLmW2c5AzftxhhpH.jpg', 740, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jonah Hex', 2010, 'film', 20533, '/b1BLIXEe9zzaFvuWdYGoeuhuh75.jpg', 750, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 760, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass', 2010, 'film', 23483, '/iHMbrTHJwocsNvo5murCBw0CwTo.jpg', 770, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The First Avenger', 2011, 'film', 1771, '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg', 780, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider: Spirit of Vengeance', 2011, 'film', 71676, '/fDtIZXLNreDHk3mOskJYABrQNOQ.jpg', 790, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: First Class', 2011, 'film', 49538, '/hNEokmUke0dazoBhttFN0o3L7Xv.jpg', 800, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight Rises', 2012, 'film', 49026, '/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg', 810, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 820, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: The Dark World', 2013, 'film', 76338, '/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg', 830, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass 2', 2013, 'film', 59859, '/1go2A3gdQjaMuHWquybgoJlQRcX.jpg', 840, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolverine', 2013, 'film', 76170, '/t2wVAcoRlKvEIVSbiYDb8d0QqqS.jpg', 850, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED 2', 2013, 'film', 146216, '/tbksijr6g340yFWRgI4JfwrtM9h.jpg', 860, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 870, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 880, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 3', 2013, 'film', 68721, '/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg', 890, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Secret Service', 2014, 'film', 207703, '/r6q9wZK5a2K51KFj4LWVID6Ja1r.jpg', 900, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Big Hero 6', 2014, 'film', 177572, '/2mxS4wUimwlLmI1xp6QW6NSU361.jpg', 910, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles (2014)', 2014, 'film', NULL, NULL, 920, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Guardians of the Galaxy', 2014, 'film', 118340, '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', 930, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Days of Future Past', 2014, 'film', 127585, '/tYfijzolzgoMOtegh1Y7j2Enorg.jpg', 940, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man 2', 2014, 'film', 102382, '/dGjoPttcbKR5VWg1jQuNFB247KL.jpg', 950, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 960, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man', 2015, 'film', 102899, '/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg', 970, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 980, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Strange', 2016, 'film', 284052, '/xf8PbyQcR5ucXErmZNzdKR0s8ya.jpg', 990, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 1000, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles: Out of the Shadows', 2016, 'film', 308531, '/euVaCiCWz3AALcQXHT6aUqdGUo6.jpg', 1010, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Apocalypse', 2016, 'film', 246655, '/ikA8UhYdTGpqbatFa93nIf6noSr.jpg', 1020, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 1030, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 1040, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 1050, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 1060, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool', 2016, 'film', 293660, '/3E53WEZJqP6aM84D8CckXx4pIHw.jpg', 1070, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 1080, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Ragnarok', 2017, 'film', 284053, '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 1090, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Golden Circle', 2017, 'film', 343668, '/34xBL6BXNYFqtHO9zhcgoakS4aP.jpg', 1100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inhumans', 2017, 'film', 474227, '/cIvgEUM9DjTcgttmDkfi0sk6oxQ.jpg', 1110, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Homecoming', 2017, 'film', 315635, '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', 1120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Logan', 2017, 'film', 263115, '/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg', 1130, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman', 2018, 'film', 297802, '/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg', 1140, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Into the Spider-Verse', 2018, 'film', 324857, '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', 1150, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom', 2018, 'film', 335983, '/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg', 1160, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teen Titans GO! To the Movies', 2018, 'film', 474395, '/mFHihhE9hlvJEk2f1AqdLRaYHd6.jpg', 1170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man And The Wasp', 2018, 'film', 363088, '/cFQEO687n1K6umXbInzocxcnAQz.jpg', 1180, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool 2', 2018, 'film', 383498, '/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg', 1190, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 1200, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther', 2018, 'film', 284054, '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', 1210, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Joker', 2019, 'film', 475557, '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 1220, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Kitchen', 2019, 'film', 487680, '/l3smhHvnczXg8E2WzysRVKIXSYJ.jpg', 1230, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dark Phoenix', 2019, 'film', 320288, '/cCTJPelKGLhALq3r51A9uMonxKj.jpg', 1240, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 1250, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy (2019)', 2019, 'film', 456740, '/bk8LyaMqUtaQ9hUShuvFznQYQKR.jpg', 1260, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam!', 2019, 'film', 287947, '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg', 1270, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain Marvel', 2019, 'film', 299537, '/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 1280, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wonder Woman 1984', 2020, 'film', 464052, '/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', 1290, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Mutants', 2020, 'film', 340102, '/xiDGcXJTvu1lazFRYip6g1eLt9c.jpg', 1300, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Birds of Prey', 2020, 'film', 495764, '/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg', 1310, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hawkeye', 2021, 'film', 132769, '/sM5meMPMjr6nmw9bu17Jq0zga9s.jpg', 1320, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 1330, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Eternals', 2021, 'film', 524434, '/lFByFSLV5WDJEv3KabbdAF959F2.jpg', 1340, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: Let There Be Carnage', 2021, 'film', 580489, '/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg', 1350, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shang Chi and the Legend of the Ten Rings', 2021, 'film', 566525, '/d08HqqeBQSwN8i8MEvpsZ8Cb438.jpg', 1360, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Suicide Squad', 2021, 'film', 436969, '/q61qEyssk2ku3okWICKArlAdhBn.jpg', 1370, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Widow', 2021, 'film', 497698, '/7JPpIjhD2V0sKyFvhB9khUMa30d.jpg', 1380, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Falcon and the Winter Soldier', 2021, 'film', NULL, NULL, 1390, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 1400, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'WandaVision', 2021, 'film', NULL, NULL, 1410, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'DMZ', 2022, 'film', 540550, '/tDiBM0Lav9RxSyquQZ1No1JpRhy.jpg', 1420, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Hulk: Attorney at Law', 2022, 'film', 1026208, '/yhFN7yvskzm1Tsknkg46eQbQr9w.jpg', 1430, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ms. Marvel', 2022, 'film', 979160, '/aolMYjs6QWonQFlnRGvU3o5zeQH.jpg', 1440, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Guardians of the Galaxy Holiday Special', 2022, 'film', 774752, '/8dqXyslZ2hv49Oiob9UjlGSHSTR.jpg', 1450, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther: Wakanda Forever', 2022, 'film', 505642, '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', 1460, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Adam', 2022, 'film', 436270, '/rCtreCr4xiYEWDQTebybolIh6Xe.jpg', 1470, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'DC League of Super-Pets', 2022, 'film', 539681, '/qpPMewlugFaejXjz4YNDnpTniFX.jpg', 1480, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Love and Thunder', 2022, 'film', 616037, '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', 1490, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Moon Knight', 2022, 'film', 964943, '/dM6Y4uLzeF4rqbmKBzR0wAsTxby.jpg', 1500, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Morbius', 2022, 'film', 526896, '/Av8Z2jZhEm1FLkFzMThzz9hndJF.jpg', 1510, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Batman', 2022, 'film', 414906, '/74xTEgt7R36Fpooo50r9T25onhq.jpg', 1520, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Loki: Season 2', 2023, 'film', 1192825, '/fa4HvgQO1sLQTobjJR10kDOJzWB.jpg', 1530, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman and the Lost Kingdom', 2023, 'film', 572802, '/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg', 1540, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 1550, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Secret Invasion', 2023, 'film', 1165500, '/8YDNwj9gsAQlcHQALPtjJipoGx8.jpg', 1560, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blue Beetle', 2023, 'film', 565770, '/mXLOHHc1Zeuwsl4xYKjKh2280oL.jpg', 1570, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles: Mutant Mayhem', 2023, 'film', 614930, '/gyh0eECE2IqrW8GWl3KoHBfc45j.jpg', 1580, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Across The Spider-Verse', 2023, 'film', 569094, '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 1590, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 1600, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man and the Wasp: Quantumania', 2023, 'film', 640146, '/qnqGbB22YJ7dSs4o6M7exTpNxPz.jpg', 1610, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kraven the Hunter', 2024, 'film', 539972, '/1GvBhRxY6MELDfxFrete6BNhBB5.jpg', 1620, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: The Last Dance', 2024, 'film', 912649, '/1RaSkWakWBxxYOWRrqmwo2my5zg.jpg', 1630, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy: The Crooked Man', 2024, 'film', 1087822, '/iz2GabtToVB05gLTVSH7ZvFtsMM.jpg', 1640, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Madame Web', 2024, 'film', 634492, '/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg', 1650, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four: First Steps', 2025, 'film', 1516738, '/z7wI0jpec9gz2IwVciND1nbRBy0.jpg', 1660, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman (2025)', 2025, 'film', NULL, NULL, 1670, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Brave New World', 2025, 'film', 822119, '/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg', 1680, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Marvel (96 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Marvel' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man', 1977, 'film', 225914, '/jNxRHZ2cxVkNRtxgHuCtv7GY4JP.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk (1977)', 1977, 'film', NULL, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America II: Death Too Soon', 1979, 'film', 197481, '/pocmh0P8Ddf5w33pP3Vuqm0JRP9.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1979)', 1979, 'film', NULL, NULL, 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: The Dragon''s Challenge', 1981, 'film', 225938, '/wBmtFmSikG5u08FdGLRsF0Py59V.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Howard the Duck', 1986, 'film', 10658, '/eU0dWo8PJgsSAZFbcyHiUpuLSyW.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk Returns', 1988, 'film', 26881, '/dw7eBKL26HEkA89BKvNVsjx7gGL.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Trial of the Incredible Hulk', 1989, 'film', 26883, '/jaaeLvonWry3TdTXaGSu2VveNEG.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (1989)', 1989, 'film', NULL, NULL, 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1990)', 1990, 'film', NULL, NULL, 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Death of the Incredible Hulk', 1991, 'film', 19593, '/6q6CviMLR97ssODmKhxgyxQuoYp.jpg', 110, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four', 1994, 'film', 22059, '/avJpIDOjyfdoOLINYficKvW9dEa.jpg', 120, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Generation X', 1996, 'film', 26623, '/oaM0RTIkhw0lCK9JowsIvdsJ1Pn.jpg', 130, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nick Fury: Agent of S.H.I.E.L.D.', 1998, 'film', 27460, '/4T0YjvnBaMASZkkRKxMIe6IoWO0.jpg', 140, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade', 1998, 'film', 36647, '/hx0sdduAsr4rq03RZKZzglR25z7.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men', 2000, 'film', 36657, '/bRDAc4GogyS9ci3ow7UnInOcriN.jpg', 160, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man (2002)', 2002, 'film', 557, '/kjdJntyBeEvqm9w97QGBdxPptzj.jpg', 170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade II', 2002, 'film', 36586, '/yDHwo3eWcMiy5LnnEnlGV9iLu9k.jpg', 180, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Daredevil', 2003, 'film', 9480, '/oCDBwSkntYamuw8VJIxMRCtDBmi.jpg', 190, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 2', 2004, 'film', 558, '/eg8XHjA7jkM3ulBLnfGTczR9ytI.jpg', 200, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (2004)', 2004, 'film', NULL, NULL, 210, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade: Trinity', 2004, 'film', 36648, '/6f7iXvPOnf83MaLB1JmPzUor1rr.jpg', 220, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Elektra', 2005, 'film', 9947, '/Z4dAOxjAHTUZO6DJ2WVAsxzwe3.jpg', 230, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four', 2005, 'film', 9738, '/8HLQLILZLhDQWO6JDpvY6XJLH75.jpg', 240, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man-Thing', 2005, 'film', 18882, '/kfPPnOygXSGaBFpsCUyu7xQdkoO.jpg', 250, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: The Last Stand', 2006, 'film', 36668, '/a2xicU8DpKtRizOHjQLC1JyCSRS.jpg', 260, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 3', 2007, 'film', 559, '/qFmwhVUoUSXjkKRmca5yGDEXBIj.jpg', 270, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider', 2007, 'film', 1250, '/1pyU94dAY7npDQCKuxCSyX9KthN.jpg', 280, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four: Rise of the Silver Surfer', 2007, 'film', 1979, '/1rxTraSO45jbvTrCeSvJ6RmOu1b.jpg', 290, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk', 2008, 'film', 1724, '/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', 300, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man', 2008, 'film', 1726, '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 310, '{"up": 2, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Punisher: War Zone', 2008, 'film', 13056, '/oOvKJgYUIpfswGHAdW6159bPbvM.jpg', 320, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men Origins: Wolverine', 2009, 'film', 2080, '/yj8LbTju1p7CUJg7US2unSBk33s.jpg', 330, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 340, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass', 2010, 'film', 23483, '/iHMbrTHJwocsNvo5murCBw0CwTo.jpg', 350, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The First Avenger', 2011, 'film', 1771, '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg', 360, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider: Spirit of Vengeance', 2011, 'film', 71676, '/fDtIZXLNreDHk3mOskJYABrQNOQ.jpg', 370, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: First Class', 2011, 'film', 49538, '/hNEokmUke0dazoBhttFN0o3L7Xv.jpg', 380, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 390, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: The Dark World', 2013, 'film', 76338, '/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg', 400, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass 2', 2013, 'film', 59859, '/1go2A3gdQjaMuHWquybgoJlQRcX.jpg', 410, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolverine', 2013, 'film', 76170, '/t2wVAcoRlKvEIVSbiYDb8d0QqqS.jpg', 420, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 3', 2013, 'film', 68721, '/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg', 430, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Secret Service', 2014, 'film', 207703, '/r6q9wZK5a2K51KFj4LWVID6Ja1r.jpg', 440, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Big Hero 6', 2014, 'film', 177572, '/2mxS4wUimwlLmI1xp6QW6NSU361.jpg', 450, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Guardians of the Galaxy', 2014, 'film', 118340, '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', 460, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Days of Future Past', 2014, 'film', 127585, '/tYfijzolzgoMOtegh1Y7j2Enorg.jpg', 470, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man 2', 2014, 'film', 102382, '/dGjoPttcbKR5VWg1jQuNFB247KL.jpg', 480, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 490, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man', 2015, 'film', 102899, '/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg', 500, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 510, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Strange', 2016, 'film', 284052, '/xf8PbyQcR5ucXErmZNzdKR0s8ya.jpg', 520, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Apocalypse', 2016, 'film', 246655, '/ikA8UhYdTGpqbatFa93nIf6noSr.jpg', 530, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 540, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool', 2016, 'film', 293660, '/3E53WEZJqP6aM84D8CckXx4pIHw.jpg', 550, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Ragnarok', 2017, 'film', 284053, '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 560, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Golden Circle', 2017, 'film', 343668, '/34xBL6BXNYFqtHO9zhcgoakS4aP.jpg', 570, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inhumans', 2017, 'film', 474227, '/cIvgEUM9DjTcgttmDkfi0sk6oxQ.jpg', 580, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Homecoming', 2017, 'film', 315635, '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', 590, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Logan', 2017, 'film', 263115, '/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg', 600, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Into the Spider-Verse', 2018, 'film', 324857, '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', 610, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom', 2018, 'film', 335983, '/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg', 620, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man And The Wasp', 2018, 'film', 363088, '/cFQEO687n1K6umXbInzocxcnAQz.jpg', 630, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool 2', 2018, 'film', 383498, '/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg', 640, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 650, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther', 2018, 'film', 284054, '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', 660, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dark Phoenix', 2019, 'film', 320288, '/cCTJPelKGLhALq3r51A9uMonxKj.jpg', 670, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 680, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain Marvel', 2019, 'film', 299537, '/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 690, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Mutants', 2020, 'film', 340102, '/xiDGcXJTvu1lazFRYip6g1eLt9c.jpg', 700, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hawkeye', 2021, 'film', 132769, '/sM5meMPMjr6nmw9bu17Jq0zga9s.jpg', 710, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 720, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Eternals', 2021, 'film', 524434, '/lFByFSLV5WDJEv3KabbdAF959F2.jpg', 730, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: Let There Be Carnage', 2021, 'film', 580489, '/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg', 740, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shang Chi and the Legend of the Ten Rings', 2021, 'film', 566525, '/d08HqqeBQSwN8i8MEvpsZ8Cb438.jpg', 750, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Widow', 2021, 'film', 497698, '/7JPpIjhD2V0sKyFvhB9khUMa30d.jpg', 760, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Falcon and the Winter Soldier', 2021, 'film', NULL, NULL, 770, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'WandaVision', 2021, 'film', NULL, NULL, 780, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Hulk: Attorney at Law', 2022, 'film', 1026208, '/yhFN7yvskzm1Tsknkg46eQbQr9w.jpg', 790, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ms. Marvel', 2022, 'film', 979160, '/aolMYjs6QWonQFlnRGvU3o5zeQH.jpg', 800, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Guardians of the Galaxy Holiday Special', 2022, 'film', 774752, '/8dqXyslZ2hv49Oiob9UjlGSHSTR.jpg', 810, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther: Wakanda Forever', 2022, 'film', 505642, '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', 820, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Love and Thunder', 2022, 'film', 616037, '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', 830, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Moon Knight', 2022, 'film', 964943, '/dM6Y4uLzeF4rqbmKBzR0wAsTxby.jpg', 840, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Morbius', 2022, 'film', 526896, '/Av8Z2jZhEm1FLkFzMThzz9hndJF.jpg', 850, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Loki: Season 2', 2023, 'film', 1192825, '/fa4HvgQO1sLQTobjJR10kDOJzWB.jpg', 860, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 870, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Secret Invasion', 2023, 'film', 1165500, '/8YDNwj9gsAQlcHQALPtjJipoGx8.jpg', 880, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Across The Spider-Verse', 2023, 'film', 569094, '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 890, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man and the Wasp: Quantumania', 2023, 'film', 640146, '/qnqGbB22YJ7dSs4o6M7exTpNxPz.jpg', 900, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kraven the Hunter', 2024, 'film', 539972, '/1GvBhRxY6MELDfxFrete6BNhBB5.jpg', 910, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: The Last Dance', 2024, 'film', 912649, '/1RaSkWakWBxxYOWRrqmwo2my5zg.jpg', 920, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Madame Web', 2024, 'film', 634492, '/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg', 930, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four: First Steps', 2025, 'film', 1516738, '/z7wI0jpec9gz2IwVciND1nbRBy0.jpg', 940, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thunderbolts*', 2025, 'film', 986056, '/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg', 950, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Brave New World', 2025, 'film', 822119, '/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg', 960, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Stephen King (81 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Stephen King' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (1976)', 1976, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shining (1980)', 1980, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow', 1982, 'film', 16281, '/4SoyTCEpsgLjX6yAyMsx3AsAyRQ.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Christine', 1983, 'film', 8769, '/mMtUJke2TtIoT6JB9hkvERmsSu8.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Cujo', 1983, 'film', 10489, '/uNBt2YxrQdyOjnm2rDQ5QiCmQ0K.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dead Zone', 1983, 'film', 11336, '/9yTVaeS8eIkOpbwIycVFm7EQrgF.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Firestarter', 1984, 'film', 11495, '/2ux5lqNuibd8eOkwwUhzfzAJBqD.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (1984)', 1984, 'film', NULL, NULL, 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silver Bullet', 1985, 'film', 17898, '/52CvWYuJyWcMTPvsfcmsxaVHi7f.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Cat''s Eye', 1985, 'film', 10552, '/AtSRmjEYUASsXfrEJrqF2oYEbFe.jpg', 100, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Stand by Me', 1986, 'film', 235, '/vz0w9BSehcqjDcJOjRaCk7fgJe7.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maximum Overdrive', 1986, 'film', 9980, '/8pGYesuatPnMS8lhS4NvwiDjKbG.jpg', 120, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow 2', 1987, 'film', 16288, '/bbanIymLuTYmQGis9nlCkFlT1eg.jpg', 130, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Running Man (1987)', 1987, 'film', NULL, NULL, 140, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Return to Salem''s Lot', 1987, 'film', 27740, '/sc3jWWodUIaofc176PlYUQzUslj.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary', 1989, 'film', 8913, '/a1gIACZb04bL8EvLqMpofW2Eqeo.jpg', 160, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Misery', 1990, 'film', 1700, '/klPO5oh1LOxiPpdDXZo1ADgpKcw.jpg', 170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tales from the Darkside: The Movie', 1990, 'film', 20701, '/5q8WK4gW45Knxhpb29IVOCbbfI7.jpg', 180, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Graveyard Shift', 1990, 'film', 19158, '/jrb0BhhtzwM3K55Vo0kLdtDqJks.jpg', 190, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Golden Years', 1991, 'film', 36560, '/bO2jXElkXGkEWPHRToQqcXGc3xS.jpg', 200, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back', 1991, 'film', 27769, '/cJc0hUhtWmZzIeWc1k8CVpJFVbm.jpg', 210, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sleepwalkers', 1992, 'film', 11428, '/iiwplv5pET2HgMog6otunohIiSr.jpg', 220, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn II: The Final Sacrifice', 1992, 'film', 25748, '/5UaH4zhfKT1taJGHUwPxm29ZENf.jpg', 230, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Lawnmower Man', 1992, 'film', 10163, '/aDACpFww9vkeyYOj5xrfJuxoQdK.jpg', 240, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Needful Things', 1993, 'film', 10657, '/9RxE6kd1ky4689WxqX6CHEpIWya.jpg', 250, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Half', 1993, 'film', 10349, '/uTzi0no438AjKELtJgTbipNxWGu.jpg', 260, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shawshank Redemption', 1994, 'film', 278, '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg', 270, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Stand', 1994, 'film', 235, '/vz0w9BSehcqjDcJOjRaCk7fgJe7.jpg', 280, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dolores Claiborne', 1995, 'film', 11929, '/iQuwx3UAyXbE9tzdM3jLqtbogc4.jpg', 290, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn III: Urban Harvest', 1995, 'film', 25749, '/xTNGI3MGTlOTiYU9ucfWd79kV2k.jpg', 300, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler', 1995, 'film', 13559, '/vwRZOUzIX17luLM69sCC9meM9od.jpg', 310, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thinner', 1996, 'film', 10280, '/nXqHqsQXA0jJpCaUsyre1Yw18oV.jpg', 320, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn IV: The Gathering', 1996, 'film', 25750, '/tRjeV9AZgCXGTqyvlp7Ui55Yb3l.jpg', 330, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lawnmower Man 2: Beyond Cyberspace', 1996, 'film', 11525, '/aP8eGsCyZVCHgSMxhDa4KiC7H9B.jpg', 340, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back...Again', 1996, 'film', 27770, '/mBYsbLOpJP7MBapOy7gECD1ePlz.jpg', 350, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Quicksilver Highway', 1997, 'film', 26215, '/ktKeyB6yNo81wD60NxZvb7f1nZz.jpg', 360, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shining (1997)', 1997, 'film', NULL, NULL, 370, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Apt Pupil', 1998, 'film', 9445, '/pU3fvfSvrs5pZFdODPCzoLk95Ws.jpg', 380, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn V: Fields of Terror', 1998, 'film', 25751, '/uC6wip2EXdCYQwDDs9FnoakUZQL.jpg', 390, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back...for More', 1998, 'film', 27771, '/rQNVWiT6yoEZ2SNa29pXGdh3mK2.jpg', 400, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Storm of the Century', 1999, 'film', 1096624, '/aN7WiR2exEaL9OHgNgQvQOukWv1.jpg', 410, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Green Mile', 1999, 'film', 497, '/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg', 420, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn 666: Isaac''s Return', 1999, 'film', 25752, '/3c0HiaAAljaWRHWkgNp0uM6sFRD.jpg', 430, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Rage: Carrie 2', 1999, 'film', 7341, '/jJmIf22gwwQPAFJfZ6Tr1MwSpRg.jpg', 440, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Trucks', 2000, 'film', 1122766, '/mKy0O9kizS0k00woeEgdlYAHAha.jpg', 450, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hearts in Atlantis', 2001, 'film', 11313, '/qPTEh8vutS5FSCDoR16MWVGHqTm.jpg', 460, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Revelation', 2001, 'film', 25753, '/sL3ZaPFwgkfn9KuIsh861zsPX0Y.jpg', 470, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler 2', 2001, 'film', 27345, '/eD7yhqDlVY53JA5eV0XbDI9Tbv2.jpg', 480, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rose Red', 2002, 'film', 1368089, '/4ob9XDtA0xrR79ua0F7UeVDCxMY.jpg', 490, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (2002)', 2002, 'film', NULL, NULL, 500, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Diary of Ellen Rimbauer', 2003, 'film', 16175, '/fjTzrF9m2hC8OF4Q1umM5CPoeK9.jpg', 510, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dreamcatcher', 2003, 'film', 6171, '/lLhvwLNU4pLgvaNREVFaQ4n3lCf.jpg', 520, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Secret Window', 2004, 'film', 1586, '/hvzw4wufKZkDCTPVeG71Z7pGfZh.jpg', 530, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler Reborn', 2005, 'film', 28660, '/3PGZbMTXafsnG1xIykCkyYWAPPm.jpg', 540, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Desperation', 2006, 'film', 10004, '/sVVTUA9SBaGlkZcj3XIJq077dQB.jpg', 550, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nightmares & Dreamscapes', 2006, 'film', NULL, NULL, 560, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow 3', 2006, 'film', 16304, '/qvJSdbruD4e5cUxruoUFUkJrsqt.jpg', 570, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mist', 2007, 'film', 5876, '/1CvJ6diBACKPVGOpcWuY4XPQdqX.jpg', 580, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (2009)', 2009, 'film', 25754, '/y9sFEgoTkjfy8i0CQzLADxFC0Hf.jpg', 590, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bag of Bones', 2011, 'film', 512411, '/nAgPMQ2PXOXRJFkrNkg1jPO0Zli.jpg', 600, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Genesis', 2011, 'film', 70575, '/qZvAcvZyT4Duvi5kaPoNoJg2TT9.jpg', 610, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (2013)', 2013, 'film', NULL, NULL, 620, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mercy', 2014, 'film', 505353, '/ratP1qdeatCfdZwUoD9nVtVIXG8.jpg', 630, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gerald''s Game', 2017, 'film', 343674, '/32dippiypDdaKv7XFEfUlQ7kPup.jpg', 640, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'It (2017)', 2017, 'film', 662365, '/obgf4HSkIkYZnrjLCKiWTeDwj8p.jpg', 650, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Tower', 2017, 'film', 353491, '/i9GUSgddIqrroubiLsvvMRYyRy0.jpg', 660, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Runaway', 2018, 'film', 445710, '/6PHzwnvTYLMdIHzJaMx9jUJlWXh.jpg', 670, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Sleep', 2019, 'film', 501170, '/p69QzIBbN06aTYqRRiCOY1emNBh.jpg', 680, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary (2019)', 2019, 'film', NULL, NULL, 690, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Stand (2020)', 2020, 'film', NULL, NULL, 700, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary: Bloodlines', 2023, 'film', 830764, '/yqnNLn24shYnZ6kqGpbwuB3NJ0D.jpg', 710, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Boogeyman', 2023, 'film', 532408, '/pYwZdnXVnVxAr7dx4MEK7tTK9gI.jpg', 720, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (2023)', 2023, 'film', NULL, NULL, 730, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Running Man (2025)', 2025, 'film', NULL, NULL, 740, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Long Walk', 2025, 'film', 604079, '/wobVTa99eW0ht6c1rNNzLkazPtR.jpg', 750, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Monkey', 2025, 'film', 1124620, '/yYa8Onk9ow7ukcnfp2QWVvjWYel.jpg', 760, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Langoliers', 2026, 'film', NULL, NULL, 770, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Tommyknockers', 2026, 'film', 926682, '/tsjkYkj9SJPD5iE8AYIBROYpzrE.jpg', 780, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'It (1990)', 2026, 'film', 61755, '/w8s5YdbaXmlaXYaumDxbsuCL3c0.jpg', 790, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '''Salem''s Lot (2004)', 2026, 'film', NULL, NULL, 800, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Salem''s Lot (1979)', 2026, 'film', NULL, NULL, 810, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Video Game Series (69 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Video Game Series' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Super Mario Bros.', 1993, 'film', 9607, '/yt5bbMfKpg1nRr4k5edxs7tPK2m.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Street Fighter', 1994, 'film', 11667, '/6yh95dD2Y6uWAlPfWCZZygBM1ec.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Double Dragon', 1994, 'film', 2436, '/9ZTYSD8ZesYMKqLRbmVfZUW1FiE.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat', 1995, 'film', 9312, '/fcK7tzSSXMYiMN8E9KlZJL1BYyp.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat: Annihilation', 1997, 'film', 9823, '/ttryglcY2osWZE3sRYBf3ewTZsW.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: The First Movie (Mewtwo Strikes Back)', 1998, 'film', 10228, '/xPW3AeK3iQi1Zd9dCbdNLijE48o.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: The Movie 2000 (The Power of One)', 1999, 'film', 12599, '/6u65C8aG4krAVyHsTjAMF7ucTDH.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wing Commander', 1999, 'film', 10350, '/e3p2vkA4mnFaBlyAIntkZWkzOJW.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon 4Ever (Celebi – Voice of the Forest)', 2001, 'film', 12600, '/thz83PS9twtVBEEAM59J1bh75nU.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Fantasy: The Spirits Within', 2001, 'film', 2114, '/47b1EwFqqSWxYna7NtUM7iML4oT.jpg', 100, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lara Croft: Tomb Raider', 2001, 'film', 1995, '/ye5h6fhfz8TkKV4QeuTucvFzxB9.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon Heroes (Latios and Latias)', 2002, 'film', 33875, '/eySv5rdYLW1k6LxepxCNl8ND26R.jpg', 120, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil', 2002, 'film', 1576, '/1UKNef590A0ZaMnxsscIcWuK1Em.jpg', 130, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'House of the Dead', 2003, 'film', 11059, '/4x337Nt4cq6OO1Rb3HDvUofT9F0.jpg', 140, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lara Croft: Tomb Raider - The Cradle of Life', 2003, 'film', 1996, '/ylIEGeAr2ygSClK4FDj9mi2Ah22.jpg', 150, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Apocalypse', 2004, 'film', 1577, '/way9dOm4dM2sm9UMcu2PEXMTX0q.jpg', 160, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bloodrayne', 2005, 'film', 168705, '/1Xy9uu5INNMnyF7W6BTEQkkGOZC.jpg', 170, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Alone in the Dark', 2005, 'film', 12142, '/bSxrbVCyWW077zhtpuYlo3zgyug.jpg', 180, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Hill', 2006, 'film', 588, '/r0bEDWO2w4a43K2xTNSF284qOsc.jpg', 190, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'In the Name of the King: A Dungeon Siege Tale', 2007, 'film', 2312, '/bbN1lmDk1PT0GsTFCy179sk5nIF.jpg', 200, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hitman', 2007, 'film', 1620, '/h69UJOOKlrHcvhl5H2LY74N61DQ.jpg', 210, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Postal', 2007, 'film', 2728, '/gfU7ZYQEOVI06eZBjTAMnrzTLL.jpg', 220, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The King of Kong: A Fistful of Quarters', 2007, 'film', 13958, '/wACtXGiO08EBbJhqsD2nUzPsrKe.jpg', 230, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Extinction', 2007, 'film', 7737, '/6yaLr7Ymg5cvbtSVi5hHwBKx35I.jpg', 240, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Far Cry', 2008, 'film', 7916, '/fOMM5tHlY6eBNnRYVttq9dU9Sqi.jpg', 250, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Max Payne', 2008, 'film', 13051, '/3cWnCG5NyXJYARO2hmNqfbbgrMA.jpg', 260, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Street Fighter: The Legend of Chun-Li', 2009, 'film', 15268, '/lbNemoc9bRIAIVck0e2cv1cgftN.jpg', 270, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bloodrayne: The Third Reich', 2010, 'film', 12685, '/kS48eBvmVXtNJGXWW5QMQmm1JbO.jpg', 280, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The King of Fighters', 2010, 'film', 44571, '/qDI6PbIjeEdLUoPHGaZqDMV9Fdx.jpg', 290, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Prince of Persia: The Sands of Time', 2010, 'film', 9543, '/siNGMLdOUNYLEGtlsnmQcpO2XZX.jpg', 300, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Afterlife', 2010, 'film', 35791, '/nYPc4sJdCZLY7YFYUmqXXYt3luH.jpg', 310, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'In the Name of the King 2: Two Worlds', 2011, 'film', 80410, '/kM9hjeGLtPZi9ExuBVwIFYrQbx0.jpg', 320, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ace Attorney', 2012, 'film', 91694, '/j2QcDHN7nScDSLsnuS3tCXOl2SN.jpg', 330, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Hill: Revelation', 2012, 'film', 61012, '/9ZDOzeSzjurGnQYokbRI0hJnmk6.jpg', 340, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Retribution', 2012, 'film', 71679, '/ohdUDWVlcbuWphaLu6wS91xdJ73.jpg', 350, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Company of Heroes', 2013, 'film', 168676, '/sWeDlrWPETZpvf04j0Wt0r3I0QJ.jpg', 360, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fatal Frame', 2014, 'film', 297186, '/b21MIHLMhidIrZpTZlvHNhGGrAz.jpg', 370, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Need For Speed', 2014, 'film', 136797, '/45D153Bk0bNwonV1w5IBBvqssPV.jpg', 380, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dead Rising: Watchtower', 2015, 'film', 293771, '/95gMn5GwR6rPHmmHfDyEs0pO2U7.jpg', 390, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pixels', 2015, 'film', 257344, '/d26S5EfVXLNxRXqyFy1yyl3qRq3.jpg', 400, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hitman: Agent 47', 2015, 'film', 249070, '/cx9AOBOv9Qf5ufZYQMbfTV7w7VY.jpg', 410, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dead Rising: Endgame', 2016, 'film', 400605, '/yQZCTiMWnXNTeKtnBAOmGdUT0rf.jpg', 420, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ratchet & Clank', 2016, 'film', 234004, '/649xP2LST4VIrZ5cLPw7Ys9movF.jpg', 430, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Angry Birds Movie', 2016, 'film', 153518, '/iOH0fEFtV9z9rZp9zmBFGGeWicv.jpg', 440, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Warcraft', 2016, 'film', 68735, '/nZIIOs06YigBnvmlJ2hxZeA8eTO.jpg', 450, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: The Final Chapter', 2016, 'film', 173897, '/7glPlA0xPpxPxBu0TnY4ulQVCV1.jpg', 460, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dead Trigger', 2017, 'film', 462115, '/uI2c30FyDEeBaa7Ka7tZYH344tC.jpg', 470, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rampage', 2018, 'film', 427641, '/MGADip4thVSErP34FAAfzFBTZ5.jpg', 480, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tomb Raider', 2018, 'film', 338970, '/s4Qn5LF6OwK4rIifmthIDtbqDSs.jpg', 490, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Detention', 2019, 'film', 870383, '/1TFPxMplmKNId1oWWwHSiZYv987.jpg', 500, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doom: Annihilation', 2019, 'film', 520901, '/b7pEmwnayMZCVlnSq33izWcOlPI.jpg', 510, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Angry Birds Movie 2', 2019, 'film', 454640, '/fKk4bfnouKEY5iPzYDMcVmtgDEy.jpg', 520, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: Detective Pikachu', 2019, 'film', 447404, '/uhWvnFgg3BNlcUz0Re1HfQqIcCD.jpg', 530, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Monster Hunter', 2020, 'film', 458576, '/1UCOF11QCw8kcqvce8LKOO6pimh.jpg', 540, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog', 2020, 'film', 454626, '/aQvJ5WPzZgYVDrxLX4R6cLJCEaQ.jpg', 550, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Werewolves Within', 2021, 'film', 800497, '/5CGgbgyvmE39Yoqa80GKsgClbQm.jpg', 560, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Welcome To Raccoon City', 2021, 'film', 460458, '/bArhvjRHl535XMaSh9VjInF2mSZ.jpg', 570, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat (2021)', 2021, 'film', 460465, '/ybrX94xQm8lXYpZAPRmwD9iIbWP.jpg', 580, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog 2', 2022, 'film', 675353, '/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg', 590, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Uncharted', 2022, 'film', 335787, '/rJHC1RUORuUhtfNb4Npclx0xnOf.jpg', 600, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gran Turismo', 2023, 'film', 980489, '/51tqzRtKMMZEYUpSYkrUE7v9ehm.jpg', 610, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tetris', 2023, 'film', 726759, '/4F2QwCOYHJJjecSvdOjStuVLkpu.jpg', 620, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog 3', 2024, 'film', 939243, '/d8Ryb8AunYAuycVKDp5HpdWPKgC.jpg', 630, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Borderlands', 2024, 'film', 365177, '/4JGoZu1ZKFpMJTWAP35PCfkMgu8.jpg', 640, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Knuckles', 2024, 'film', 675353, '/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg', 650, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Five Nights at Freddy''s 2', 2025, 'film', 1228246, '/udAxQEORq2I5wxI97N2TEqdhzBE.jpg', 660, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Until Dawn', 2025, 'film', 1232546, '/bLY5yN4MKVynZ2HMZWElTOGBgBe.jpg', 670, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Minecraft Movie', 2025, 'film', 950387, '/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg', 680, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Return to Silent Hill', 2026, 'film', 680493, '/fqAGFN2K2kDL0EHxvJaXzaMUkkt.jpg', 690, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Comics Series (62 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Comics Series' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman and the Mole Men', 1951, 'film', 41800, '/9b41Aa3hS2DJ1DhzLmtMcAswlys.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1966)', 1966, 'film', 1133654, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Original Wonder Woman (1975)', 1975, 'film', NULL, NULL, 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman', 1978, 'film', 1924, '/d7px1FQxW4tngdACVRsCSaZq0Xl.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Legends of the Superheroes', 1979, 'film', NULL, NULL, 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman II', 1980, 'film', 8536, '/3xk5cno9BHcnwc97XO9k21aI1Zi.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Swamp Thing', 1982, 'film', 17918, '/7BGaE9A7UeyxH29aeFbQfzEmIi0.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman III', 1983, 'film', 9531, '/icE00hFNg86z3OrWyyRop7khwii.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Supergirl', 1984, 'film', 9651, '/o49a2RDChZkry84LomEORCPDWfk.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (1987)', 1987, 'film', NULL, NULL, 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman IV: The Quest for Peace', 1987, 'film', 11411, '/vhs3P0JwqzlgfBqhjnCWDEOtDmS.jpg', 110, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Return of Swamp Thing', 1989, 'film', 19142, '/5sm1Yi1hgj805b9o2a1uC6BXhqw.jpg', 120, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1989)', 1989, 'film', NULL, NULL, 130, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Flash (1990)', 1990, 'film', NULL, NULL, 140, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Returns', 1992, 'film', 364, '/jKBjeXM7iBBV9UkUcOXx3m7FSHY.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman : Mask of the Phantasm', 1993, 'film', 14919, '/hT4ehUteagUrhUOHAtmYiY7mp5l.jpg', 160, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tank Girl', 1995, 'film', 9067, '/dpX63vJd6k5fMTudLaEOw9ffX8h.jpg', 170, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Forever', 1995, 'film', 414, '/i0fJS8M5UKoETjjJ0zwUiKaR8tr.jpg', 180, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 190, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Steel', 1997, 'film', 8854, '/ufA7d5LT2rGj58KaZErPhcMkJ4U.jpg', 200, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gen 13', 2000, 'film', 15993, '/wIVQV5ELcY2nwPf5NkYXqGx7RXe.jpg', 210, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Road to Perdition', 2002, 'film', 4147, '/loSpBeirRfTPJ3cMIqpQArstGhh.jpg', 220, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'American Splendor', 2003, 'film', 2771, '/rPLMxuk82AiqDiwEUVJ6E7WpjYs.jpg', 230, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The League of Extraordinary Gentlemen', 2003, 'film', 8698, '/kdAuVFP63XXxnb983ry2pLCKd9S.jpg', 240, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Catwoman', 2004, 'film', 314, '/pvnPgukFyEKgCzyOxyLiwyZ8T1C.jpg', 250, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A History of Violence', 2005, 'film', 59, '/3qnO72NHmUgs9JZXAmu4aId9QDl.jpg', 260, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Constantine', 2005, 'film', 561, '/vPYgvd2MwHlxTamAOjwVQp4qs1W.jpg', 270, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Begins', 2005, 'film', 272, '/sPX89Td70IDDjVr85jdSBb4rWGr.jpg', 280, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'V For Vendetta', 2006, 'film', 752, '/piZOwjyk1g51oPHonc7zaQY3WOv.jpg', 290, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman Returns', 2006, 'film', 1452, '/385XwTQZDpRX2d3kxtnpiLrjBXw.jpg', 300, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (2008)', 2008, 'film', 14092, '/5ngIhoA0b4aGBoPFPURAbDwCKT7.jpg', 310, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight', 2008, 'film', 155, '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 320, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Watchmen', 2009, 'film', 13183, '/u0ROjy3KPzMDTipqCrwD8LwkKSQ.jpg', 330, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED', 2010, 'film', 39514, '/8eeK3OB5PeSRQD7BpZcGZKkehG.jpg', 340, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Losers', 2010, 'film', 34813, '/b9dVH0n7YnBqLmW2c5AzftxhhpH.jpg', 350, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jonah Hex', 2010, 'film', 20533, '/b1BLIXEe9zzaFvuWdYGoeuhuh75.jpg', 360, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight Rises', 2012, 'film', 49026, '/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg', 370, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED 2', 2013, 'film', 146216, '/tbksijr6g340yFWRgI4JfwrtM9h.jpg', 380, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 390, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 400, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 410, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 420, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 430, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 440, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 450, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman', 2018, 'film', 297802, '/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg', 460, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teen Titans GO! To the Movies', 2018, 'film', 474395, '/mFHihhE9hlvJEk2f1AqdLRaYHd6.jpg', 470, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Joker', 2019, 'film', 475557, '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 480, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Kitchen', 2019, 'film', 487680, '/l3smhHvnczXg8E2WzysRVKIXSYJ.jpg', 490, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam!', 2019, 'film', 287947, '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg', 500, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wonder Woman 1984', 2020, 'film', 464052, '/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', 510, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Birds of Prey', 2020, 'film', 495764, '/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg', 520, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Suicide Squad', 2021, 'film', 436969, '/q61qEyssk2ku3okWICKArlAdhBn.jpg', 530, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 540, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'DMZ', 2022, 'film', 540550, '/tDiBM0Lav9RxSyquQZ1No1JpRhy.jpg', 550, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Adam', 2022, 'film', 436270, '/rCtreCr4xiYEWDQTebybolIh6Xe.jpg', 560, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'DC League of Super-Pets', 2022, 'film', 539681, '/qpPMewlugFaejXjz4YNDnpTniFX.jpg', 570, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Batman', 2022, 'film', 414906, '/74xTEgt7R36Fpooo50r9T25onhq.jpg', 580, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman and the Lost Kingdom', 2023, 'film', 572802, '/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg', 590, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blue Beetle', 2023, 'film', 565770, '/mXLOHHc1Zeuwsl4xYKjKh2280oL.jpg', 600, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 610, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman (2025)', 2025, 'film', NULL, NULL, 620, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Avengers (49 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Avengers' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk (1977)', 1977, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America II: Death Too Soon', 1979, 'film', 197481, '/pocmh0P8Ddf5w33pP3Vuqm0JRP9.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1979)', 1979, 'film', NULL, NULL, 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk Returns', 1988, 'film', 26881, '/dw7eBKL26HEkA89BKvNVsjx7gGL.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Trial of the Incredible Hulk', 1989, 'film', 26883, '/jaaeLvonWry3TdTXaGSu2VveNEG.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1990)', 1990, 'film', NULL, NULL, 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Death of the Incredible Hulk', 1991, 'film', 19593, '/6q6CviMLR97ssODmKhxgyxQuoYp.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nick Fury: Agent of S.H.I.E.L.D.', 1998, 'film', 27460, '/4T0YjvnBaMASZkkRKxMIe6IoWO0.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk', 2008, 'film', 1724, '/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man', 2008, 'film', 1726, '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 100, '{"up": 2, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The First Avenger', 2011, 'film', 1771, '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg', 120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 130, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: The Dark World', 2013, 'film', 76338, '/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg', 140, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 3', 2013, 'film', 68721, '/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Guardians of the Galaxy', 2014, 'film', 118340, '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', 160, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man', 2015, 'film', 102899, '/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg', 180, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 190, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Strange', 2016, 'film', 284052, '/xf8PbyQcR5ucXErmZNzdKR0s8ya.jpg', 200, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 210, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Ragnarok', 2017, 'film', 284053, '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 220, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inhumans', 2017, 'film', 474227, '/cIvgEUM9DjTcgttmDkfi0sk6oxQ.jpg', 230, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Homecoming', 2017, 'film', 315635, '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', 240, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man And The Wasp', 2018, 'film', 363088, '/cFQEO687n1K6umXbInzocxcnAQz.jpg', 250, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 260, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther', 2018, 'film', 284054, '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', 270, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 280, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain Marvel', 2019, 'film', 299537, '/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 290, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hawkeye', 2021, 'film', 132769, '/sM5meMPMjr6nmw9bu17Jq0zga9s.jpg', 300, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 310, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Eternals', 2021, 'film', 524434, '/lFByFSLV5WDJEv3KabbdAF959F2.jpg', 320, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shang Chi and the Legend of the Ten Rings', 2021, 'film', 566525, '/d08HqqeBQSwN8i8MEvpsZ8Cb438.jpg', 330, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Widow', 2021, 'film', 497698, '/7JPpIjhD2V0sKyFvhB9khUMa30d.jpg', 340, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Falcon and the Winter Soldier', 2021, 'film', NULL, NULL, 350, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'WandaVision', 2021, 'film', NULL, NULL, 360, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Hulk: Attorney at Law', 2022, 'film', 1026208, '/yhFN7yvskzm1Tsknkg46eQbQr9w.jpg', 370, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ms. Marvel', 2022, 'film', 979160, '/aolMYjs6QWonQFlnRGvU3o5zeQH.jpg', 380, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Guardians of the Galaxy Holiday Special', 2022, 'film', 774752, '/8dqXyslZ2hv49Oiob9UjlGSHSTR.jpg', 390, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther: Wakanda Forever', 2022, 'film', 505642, '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', 400, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Love and Thunder', 2022, 'film', 616037, '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', 410, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Moon Knight', 2022, 'film', 964943, '/dM6Y4uLzeF4rqbmKBzR0wAsTxby.jpg', 420, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Loki: Season 2', 2023, 'film', 1192825, '/fa4HvgQO1sLQTobjJR10kDOJzWB.jpg', 430, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 440, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Secret Invasion', 2023, 'film', 1165500, '/8YDNwj9gsAQlcHQALPtjJipoGx8.jpg', 450, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man and the Wasp: Quantumania', 2023, 'film', 640146, '/qnqGbB22YJ7dSs4o6M7exTpNxPz.jpg', 460, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four: First Steps', 2025, 'film', 1516738, '/z7wI0jpec9gz2IwVciND1nbRBy0.jpg', 470, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thunderbolts*', 2025, 'film', 986056, '/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg', 480, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Brave New World', 2025, 'film', 822119, '/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg', 490, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- James Bond (26 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'James Bond' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dr. No', 1962, 'film', 646, '/f9HsemSsBEHN5eoMble1bj6fDxs.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'From Russia With Love', 1963, 'film', 657, '/zx4V17FP8oclNvOpTgs2iCCtiYk.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Goldfinger', 1964, 'film', 658, '/aKNFzaqQgPzsGXnsMc4kJH5hFIV.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thunderball', 1965, 'film', 660, '/wCc4qllaTDsQN8zgGkAgQrKO6N9.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'You Only Live Twice', 1967, 'film', 667, '/fdRbvRcEXcf2rC4ghLFZzCWPSmB.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Casino Royale (1967)', 1967, 'film', 12208, '/9wdw5H018bgIM8bK2HuDvh8BwOh.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'On Her Majesty''s Secret Service', 1969, 'film', 668, '/m3KfbxvqaiAvRJ6MpguA3GuLdDQ.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Diamonds Are Forever', 1971, 'film', 681, '/uajiHcFX5sOhYB2tBuWkmizbtuU.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Live and Let Die', 1973, 'film', 253, '/39qkrjqMZs6utwNmihVImC3ghas.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Man With the Golden Gun', 1974, 'film', 682, '/xVkbKwGnBVNQ122GN5bCTMyPbWz.jpg', 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spy Who Loved Me', 1977, 'film', 691, '/3ZxHKFxMYvAko680DsRgAZKWcLi.jpg', 110, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Moonraker', 1979, 'film', 698, '/6LrJdXNmu5uHOVALZxVYd44Lva0.jpg', 120, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'For Your Eyes Only', 1981, 'film', 699, '/xV4Nnr6DjjERlqNikqDQX8LUgua.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Never Say Never Again', 1983, 'film', 36670, '/zhoAL4o1STGgLbLxJ9r1ijfyHC9.jpg', 140, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Octopussy', 1983, 'film', 700, '/yoosZitM9igSk3Sd0sBXIhKlAh1.jpg', 150, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A View to a Kill', 1985, 'film', 707, '/arJF829RP9cYvh0NU70dC5TtXSa.jpg', 160, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Living Daylights', 1987, 'film', 708, '/1oRlmWX9hewpn2B44wawBjHd7dx.jpg', 170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Goldeneye', 1995, 'film', 710, '/z0ljRnNxIO7CRBhLEO0DvLgAFPR.jpg', 180, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tomorrow Never Dies', 1997, 'film', 714, '/gZm002w7q9yLOkltxT76TWGfdZX.jpg', 190, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The World Is Not Enough', 1999, 'film', 36643, '/wCb2msgoZPK01WIqry24M4xsM73.jpg', 200, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Die Another Day', 2002, 'film', 36669, '/bZmGqOhMhaLn8AoFMvFDct4tbrL.jpg', 210, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Casino Royale (2006)', 2006, 'film', 711246, '/hJsiNIn1YWQsSW88tNhJwgeDXJn.jpg', 220, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Quantum of Solace', 2008, 'film', 10764, '/e3DXXLJHGqMx9yYpXsql1XNljmM.jpg', 230, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Skyfall', 2012, 'film', 37724, '/d0IVecFQvsGdSbnMAHqiYsNYaJT.jpg', 240, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spectre', 2015, 'film', 206647, '/zj8ongFhtWNsVlfjOGo8pSr7PQg.jpg', 250, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'No Time to Die', 2021, 'film', 370172, '/iUgygt3fscRoKWCV1d0C7FbM9TP.jpg', 260, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Spider-Man (19 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Spider-Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man', 1977, 'film', 225914, '/jNxRHZ2cxVkNRtxgHuCtv7GY4JP.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: The Dragon''s Challenge', 1981, 'film', 225938, '/wBmtFmSikG5u08FdGLRsF0Py59V.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man (2002)', 2002, 'film', 557, '/kjdJntyBeEvqm9w97QGBdxPptzj.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 2', 2004, 'film', 558, '/eg8XHjA7jkM3ulBLnfGTczR9ytI.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 3', 2007, 'film', 559, '/qFmwhVUoUSXjkKRmca5yGDEXBIj.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Amazing Spider-Man 2', 2014, 'film', 102382, '/dGjoPttcbKR5VWg1jQuNFB247KL.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Homecoming', 2017, 'film', 315635, '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Into the Spider-Verse', 2018, 'film', 324857, '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom', 2018, 'film', 335983, '/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg', 100, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 130, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: Let There Be Carnage', 2021, 'film', 580489, '/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg', 140, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Morbius', 2022, 'film', 526896, '/Av8Z2jZhEm1FLkFzMThzz9hndJF.jpg', 150, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Across The Spider-Verse', 2023, 'film', 569094, '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 160, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kraven the Hunter', 2024, 'film', 539972, '/1GvBhRxY6MELDfxFrete6BNhBB5.jpg', 170, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: The Last Dance', 2024, 'film', 912649, '/1RaSkWakWBxxYOWRrqmwo2my5zg.jpg', 180, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Madame Web', 2024, 'film', 634492, '/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg', 190, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Batman (18 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Batman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1966)', 1966, 'film', 1133654, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Legends of the Superheroes', 1979, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman (1989)', 1989, 'film', NULL, NULL, 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Returns', 1992, 'film', 364, '/jKBjeXM7iBBV9UkUcOXx3m7FSHY.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman : Mask of the Phantasm', 1993, 'film', 14919, '/hT4ehUteagUrhUOHAtmYiY7mp5l.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Forever', 1995, 'film', 414, '/i0fJS8M5UKoETjjJ0zwUiKaR8tr.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Catwoman', 2004, 'film', 314, '/pvnPgukFyEKgCzyOxyLiwyZ8T1C.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Begins', 2005, 'film', 272, '/sPX89Td70IDDjVr85jdSBb4rWGr.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight', 2008, 'film', 155, '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight Rises', 2012, 'film', 49026, '/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 140, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Joker', 2019, 'film', 475557, '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 160, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 170, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Batman', 2022, 'film', 414906, '/74xTEgt7R36Fpooo50r9T25onhq.jpg', 180, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Superman (17 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Superman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman and the Mole Men', 1951, 'film', 41800, '/9b41Aa3hS2DJ1DhzLmtMcAswlys.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman', 1978, 'film', 1924, '/d7px1FQxW4tngdACVRsCSaZq0Xl.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman II', 1980, 'film', 8536, '/3xk5cno9BHcnwc97XO9k21aI1Zi.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman III', 1983, 'film', 9531, '/icE00hFNg86z3OrWyyRop7khwii.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Supergirl', 1984, 'film', 9651, '/o49a2RDChZkry84LomEORCPDWfk.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman IV: The Quest for Peace', 1987, 'film', 11411, '/vhs3P0JwqzlgfBqhjnCWDEOtDmS.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Steel', 1997, 'film', 8854, '/ufA7d5LT2rGj58KaZErPhcMkJ4U.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman Returns', 2006, 'film', 1452, '/385XwTQZDpRX2d3kxtnpiLrjBXw.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 140, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 150, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Adam', 2022, 'film', 436270, '/rCtreCr4xiYEWDQTebybolIh6Xe.jpg', 160, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman (2025)', 2025, 'film', NULL, NULL, 170, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Extended Movie Universe (17 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Extended Movie Universe' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man of Steel', 2013, 'film', 49521, '/8GFtkImmK0K1VaUChR0n9O61CFU.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman', 2018, 'film', 297802, '/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam!', 2019, 'film', 287947, '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wonder Woman 1984', 2020, 'film', 464052, '/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Birds of Prey', 2020, 'film', 495764, '/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Suicide Squad', 2021, 'film', 436969, '/q61qEyssk2ku3okWICKArlAdhBn.jpg', 120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Adam', 2022, 'film', 436270, '/rCtreCr4xiYEWDQTebybolIh6Xe.jpg', 140, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman and the Lost Kingdom', 2023, 'film', 572802, '/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg', 150, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blue Beetle', 2023, 'film', 565770, '/mXLOHHc1Zeuwsl4xYKjKh2280oL.jpg', 160, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 170, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Team Series (17 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Team Series' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gen 13', 2000, 'film', 15993, '/wIVQV5ELcY2nwPf5NkYXqGx7RXe.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The League of Extraordinary Gentlemen', 2003, 'film', 8698, '/kdAuVFP63XXxnb983ry2pLCKd9S.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Watchmen', 2009, 'film', 13183, '/u0ROjy3KPzMDTipqCrwD8LwkKSQ.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman', 2018, 'film', 297802, '/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg', 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Kitchen', 2019, 'film', 487680, '/l3smhHvnczXg8E2WzysRVKIXSYJ.jpg', 110, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam!', 2019, 'film', 287947, '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg', 120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Birds of Prey', 2020, 'film', 495764, '/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Suicide Squad', 2021, 'film', 436969, '/q61qEyssk2ku3okWICKArlAdhBn.jpg', 140, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 150, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman and the Lost Kingdom', 2023, 'film', 572802, '/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg', 160, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 170, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- X-Men (15 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'X-Men' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Generation X', 1996, 'film', 26623, '/oaM0RTIkhw0lCK9JowsIvdsJ1Pn.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men', 2000, 'film', 36657, '/bRDAc4GogyS9ci3ow7UnInOcriN.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: The Last Stand', 2006, 'film', 36668, '/a2xicU8DpKtRizOHjQLC1JyCSRS.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men Origins: Wolverine', 2009, 'film', 2080, '/yj8LbTju1p7CUJg7US2unSBk33s.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: First Class', 2011, 'film', 49538, '/hNEokmUke0dazoBhttFN0o3L7Xv.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolverine', 2013, 'film', 76170, '/t2wVAcoRlKvEIVSbiYDb8d0QqqS.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Days of Future Past', 2014, 'film', 127585, '/tYfijzolzgoMOtegh1Y7j2Enorg.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Apocalypse', 2016, 'film', 246655, '/ikA8UhYdTGpqbatFa93nIf6noSr.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool', 2016, 'film', 293660, '/3E53WEZJqP6aM84D8CckXx4pIHw.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Logan', 2017, 'film', 263115, '/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool 2', 2018, 'film', 383498, '/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dark Phoenix', 2019, 'film', 320288, '/cCTJPelKGLhALq3r51A9uMonxKj.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Mutants', 2020, 'film', 340102, '/xiDGcXJTvu1lazFRYip6g1eLt9c.jpg', 130, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'WandaVision', 2021, 'film', NULL, NULL, 140, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 150, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Star Trek (14 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Star Trek' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: The Motion Picture', 1979, 'film', 152, '/wfiAfNwH6CMKxz4vRaW8CPTabtk.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek II: The Wrath of Khan', 1982, 'film', 154, '/uPyLsKl8Z0LOoxeaFXsY5MxhR5s.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek III: The Search For Spock', 1984, 'film', 157, '/yqEj0oPfKBMCz7YcCARHDgH7VFm.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek IV: The Voyage Home', 1986, 'film', 168, '/xY5TzGXJOB3L9rhZ1MbbPyVlW5J.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek V: The Final Frontier', 1989, 'film', 172, '/uiXr41VLYsuug3CZbFrKLSNahuZ.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek VI: The Undiscovered Country', 1991, 'film', 174, '/tvTOJD7Gz668GLy2nNdLRQvpPsv.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: Generations', 1994, 'film', 193, '/gh0ZZRwSmlzEZTIZee3ZCN9Jssx.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: First Contact', 1996, 'film', 199, '/iqhHe893Vcf07jNkNQ31tu85dKG.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: Insurrection', 1998, 'film', 200, '/xQCMAHeg5M9HpDIqanYbWdr4brB.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: Nemesis', 2002, 'film', 201, '/cldAwhvBmOv9jrd3bXWuqRHoXyq.jpg', 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek (2009)', 2009, 'film', NULL, NULL, 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek Into Darkness', 2013, 'film', 54138, '/Aim3kVNh1MPIxPEFeJrl9e9Uf1a.jpg', 120, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek Beyond', 2016, 'film', 188927, '/m7SHlvcGfCkbzk2xP7XHDOI6o93.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Trek: Section 31', 2025, 'film', 1114894, '/fNu6P4jYU55Cb3CC2SndtAKvois.jpg', 140, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Halloween (13 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Halloween' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (1978)', 1978, 'film', 948, '/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween II (1981)', 1981, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween III: Season of the Witch', 1982, 'film', 10676, '/WABfdeaThFYXCySGIOvRNv2sSW.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween 4: The Return of Michael Myers', 1988, 'film', 11357, '/eFSOkXF9n9hsfGv45MDsPixiOyx.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween 5: The Revenge of Michael Myers', 1989, 'film', 11361, '/rYvP6yMXCIVHnkVtwGaAXFmpzkB.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween: The Curse of Michael Myers', 1995, 'film', 10987, '/noCnM8nEI2bEDSdKHh0RKbwBwbC.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween H20: 20 Years Later', 1998, 'film', 11675, '/lqLXUm3oK59sGJKRH2Zjj2m3iMg.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween: Resurrection', 2002, 'film', 11442, '/1mlKwbNzJCGzqe4i0ZEJtUUL290.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (2007)', 2007, 'film', 2082, '/cD8JrfSEI4j7WVnKM1GdiYzMoUh.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween II (2009)', 2009, 'film', 24150, '/vSHPM4LQDpWdQrD5KZWK6wNqSOD.jpg', 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (2018)', 2018, 'film', 1630586, '/dbJ08Ih9OiYMUM0kMdAUvYeHHbO.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween Kills', 2021, 'film', 610253, '/4CclCDyQXBBgz62Qtp3CoflQE5g.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween Ends', 2022, 'film', 616820, '/q06saepaXeBdkMibuN4R2fXmgIw.jpg', 130, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Hulk (12 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Hulk' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk (1977)', 1977, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk Returns', 1988, 'film', 26881, '/dw7eBKL26HEkA89BKvNVsjx7gGL.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Trial of the Incredible Hulk', 1989, 'film', 26883, '/jaaeLvonWry3TdTXaGSu2VveNEG.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Death of the Incredible Hulk', 1991, 'film', 19593, '/6q6CviMLR97ssODmKhxgyxQuoYp.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk', 2008, 'film', 1724, '/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Ragnarok', 2017, 'film', 284053, '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Hulk: Attorney at Law', 2022, 'film', 1026208, '/yhFN7yvskzm1Tsknkg46eQbQr9w.jpg', 110, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Brave New World', 2025, 'film', 822119, '/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg', 120, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Universal Monsters (12 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Universal Monsters' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Werewolf of London', 1935, 'film', 27970, '/78kD3Fpvgd8qubKMbhS5dKofjR8.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bride of Frankenstein', 1935, 'film', 229, '/5241zUwe7rC17MNc2QpCBKKdp1N.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Son of Frankenstein', 1939, 'film', 3077, '/oefhX4T3iWo2XFvaOunR7azWAo3.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolf Man', 1941, 'film', 13666, '/tyEke5KSZa02l4MAAQsWu7clHrb.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Son of Dracula', 1943, 'film', 32023, '/pQTLdJ46WXPIix05EkcHAMDKUIw.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Wolf of London', 1946, 'film', 45322, '/3H1JNJS8eIJPd502sPgbEfyhtDG.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolfman', 2010, 'film', 7978, '/fQqPoAHvHicie1ttuiV2q0yv9V7.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dracula Untold', 2014, 'film', 49017, '/m5h3NtZ2ZfryIHl1MvatmANvIqQ.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Last Voyage of the Demeter', 2023, 'film', 635910, '/nrtbv6Cew7qC7k9GsYSf5uSmuKh.jpg', 90, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Renfield', 2023, 'film', 649609, '/p6yUjhvNGQpFZilKwOKbxQ1eHlo.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Abigail', 2024, 'film', 1111873, '/5gKKSoD3iezjoL7YqZONjmyAiRA.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wolf Man', 2025, 'film', 710295, '/wpSDzTBfF0Eeo5lzu2w9FTujGqd.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nick Fury (12 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nick Fury' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nick Fury: Agent of S.H.I.E.L.D.', 1998, 'film', 27460, '/4T0YjvnBaMASZkkRKxMIe6IoWO0.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man', 2008, 'film', 1726, '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 20, '{"up": 2, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The First Avenger', 2011, 'film', 1771, '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain Marvel', 2019, 'film', 299537, '/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 100, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 110, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Secret Invasion', 2023, 'film', 1165500, '/8YDNwj9gsAQlcHQALPtjJipoGx8.jpg', 120, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Captain America (11 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Captain America' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America II: Death Too Soon', 1979, 'film', 197481, '/pocmh0P8Ddf5w33pP3Vuqm0JRP9.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1979)', 1979, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1990)', 1990, 'film', NULL, NULL, 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The First Avenger', 2011, 'film', 1771, '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Falcon and the Winter Soldier', 2021, 'film', NULL, NULL, 100, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Brave New World', 2025, 'film', 822119, '/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nolan (11 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nolan' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Following', 1999, 'film', 11660, '/3bX6VVSMf0dvzk5pMT4ALG5A92d.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Insomnia', 2002, 'film', 320, '/riVXh3EimGO0y5dgQxEWPRy5Itg.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman Begins', 2005, 'film', 272, '/sPX89Td70IDDjVr85jdSBb4rWGr.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Prestige', 2006, 'film', 1124, '/Ag2B2KHKQPukjH7WutmgnnSNurZ.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight', 2008, 'film', 155, '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inception', 2010, 'film', 27205, '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Knight Rises', 2012, 'film', 49026, '/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Interstellar', 2014, 'film', 157336, '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dunkirk', 2017, 'film', 374720, '/b4Oe15CGLL61Ped0RAS9JpqdmCt.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tenet', 2020, 'film', 577922, '/aCIFMriQh8rvhxpN1IWGgvH0Tlg.jpg', 100, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Oppenheimer', 2023, 'film', 872585, '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Children of the Corn (11 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Children of the Corn' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (1984)', 1984, 'film', NULL, NULL, 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn II: The Final Sacrifice', 1992, 'film', 25748, '/5UaH4zhfKT1taJGHUwPxm29ZENf.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn III: Urban Harvest', 1995, 'film', 25749, '/xTNGI3MGTlOTiYU9ucfWd79kV2k.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn IV: The Gathering', 1996, 'film', 25750, '/tRjeV9AZgCXGTqyvlp7Ui55Yb3l.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn V: Fields of Terror', 1998, 'film', 25751, '/uC6wip2EXdCYQwDDs9FnoakUZQL.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn 666: Isaac''s Return', 1999, 'film', 25752, '/3c0HiaAAljaWRHWkgNp0uM6sFRD.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Revelation', 2001, 'film', 25753, '/sL3ZaPFwgkfn9KuIsh861zsPX0Y.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (2009)', 2009, 'film', 25754, '/y9sFEgoTkjfy8i0CQzLADxFC0Hf.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Genesis', 2011, 'film', 70575, '/qZvAcvZyT4Duvi5kaPoNoJg2TT9.jpg', 90, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn: Runaway', 2018, 'film', 445710, '/6PHzwnvTYLMdIHzJaMx9jUJlWXh.jpg', 100, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of the Corn (2023)', 2023, 'film', NULL, NULL, 110, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Iron Man (11 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Iron Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk', 2008, 'film', 1724, '/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man', 2008, 'film', 1726, '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 20, '{"up": 2, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 3', 2013, 'film', 68721, '/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: Homecoming', 2017, 'film', 315635, '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther: Wakanda Forever', 2022, 'film', 505642, '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', 110, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- David Lynch (11 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'David Lynch' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Eraserhead', 1978, 'film', 985, '/mxveW3mGVc0DzLdOmtkZsgd7c3B.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Elephant Man', 1980, 'film', 1955, '/u0wpPYjuSt8DIe1Y3Vapnh8jcKE.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blue Velvet', 1986, 'film', 793, '/tzXuURjPzCqtA6eL0Cswq9wzFx0.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wild at Heart', 1990, 'film', 483, '/uLUFI5sJIfWrBUWB2Y1dEuyvvVy.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twin Peaks', 1990, 'film', 1062861, '/1JhPNmu1cmkqltUnkQll5o1YmPy.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twin Peaks: Fire Walk with Me', 1992, 'film', 1923, '/mxsGXqetGnirf99qapYd5MMY1VL.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hotel Room', 1993, 'film', 1238920, '/qA7aGETXDZXA6RBdaWgVFFv7Aos.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lost Highway', 1997, 'film', 638, '/fdTtij6H0sX9AzIjUeynh5zbfm7.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Straight Story', 1999, 'film', 404, '/tT9cMiVDdtlcdZxOoFy3VRmEoKk.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mulholland Dr', 2001, 'film', 1018, '/x7A59t6ySylr1L7aubOQEA480vM.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inland Empire', 2006, 'film', 1730, '/s5f0FbVAABEnJYKaApWORTxhiFC.jpg', 110, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Conjuring (10 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Conjuring' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Conjuring', 2013, 'film', 138843, '/wVYREutTvI2tmxr6ujrHT704wGF.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Annabelle', 2014, 'film', 250546, '/yLsuU2P2SpDYFwtZQ7dtfVAf6TE.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Conjuring 2', 2016, 'film', 259693, '/zEqyD0SBt6HL7W9JQoWwtd5Do1T.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Annabelle: Creation', 2017, 'film', 396422, '/tb86j8jVCVsdZnzf8I6cIi65IeM.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Nun', 2018, 'film', 439079, '/sFC1ElvoKGdHJIWRpNB3xWJ9lJA.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Annabelle Comes Home', 2019, 'film', 521029, '/qWsHMrbg9DsBY3bCMk9jyYCRVRs.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Curse of La Llorona', 2019, 'film', 480414, '/hETrPpoKs6BwoilK64YJ7Z5GcRT.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Conjuring: The Devil Made Me Do It', 2021, 'film', 423108, '/rQfX2xx8TUoNvyk892yKWNikJaM.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Nun II', 2023, 'film', 968051, '/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', 90, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Conjuring: Last Rites', 2025, 'film', 1038392, '/byWgphT74ClOVa8EOGzYDkl8DVL.jpg', 100, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Black Widow (10 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Black Widow' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Iron Man 2', 2010, 'film', 10138, '/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: The Winter Soldier', 2014, 'film', 100402, '/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hawkeye', 2021, 'film', 132769, '/sM5meMPMjr6nmw9bu17Jq0zga9s.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Widow', 2021, 'film', 497698, '/7JPpIjhD2V0sKyFvhB9khUMa30d.jpg', 90, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thunderbolts*', 2025, 'film', 986056, '/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Philip K. Dick (10 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Philip K. Dick' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade Runner', 1982, 'film', 78, '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Screamers', 1995, 'film', 9102, '/eqgBf791rMZG7ywHfObpXeMpiRf.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Impostor', 2001, 'film', 4965, '/7Uy4JbalP0mEyKnFW2IorQDmbBa.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Minority Report', 2002, 'film', 180, '/ccqpHq5tk5W4ymbSbuoy4uYOxFI.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Paycheck', 2003, 'film', 9620, '/icoa6KslkhXKnxLreZ6vXnDimpQ.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Scanner Darkly', 2006, 'film', 3509, '/lUKudOpHICDj6A6SO7DdaZM4W48.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Radio Free Albemuth', 2010, 'film', 139406, '/2fKuc3aTXkQSn0WzkDJC31ycDej.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Adjustment Bureau', 2011, 'film', 38050, '/5ZzeR8iz1nEFLp94OBnbakLZawo.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Total Recall (2012)', 2012, 'film', NULL, NULL, 90, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade Runner 2049', 2017, 'film', 335984, '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', 100, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Friday the 13th (10 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Friday the 13th' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th (1980)', 1980, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th Part II', 1982, 'film', 9728, '/9kukTSlgFgXnQGdpcHvHcpTDiUc.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th: The Final Chapter', 1984, 'film', 9730, '/1J7zudfR3VLPwAf9lK5YPfSu0n6.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th: A New Beginning', 1985, 'film', 9731, '/ewnIs4aCuWnKQ13Eaj8f3ybrQc8.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th Part VI: Jason Lives', 1986, 'film', 10225, '/6vdUpHvkspQonXBdWcLWW5ciEPJ.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th Part VII--The New Blood', 1988, 'film', 10281, '/rUzk9Qnyz2FZGxHMBrq6DYIQZkO.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th Part VIII: Jason Takes Manhattan', 1989, 'film', 10283, '/6ezOsZ9UzqGnbDokaatxdOWP6e9.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jason Goes to Hell: The Final Friday', 1993, 'film', 10285, '/Aacq05foqiWdXqetFv02HBvMoJy.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jason X', 2001, 'film', 11470, '/ggOND0hfoE0f3K857joSzEeIchb.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Friday the 13th (2009)', 2009, 'film', NULL, NULL, 100, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- King Kong (9 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'King Kong' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong (1933)', 1933, 'film', 1528416, '/onMrZ0upoTvIDAb10TqmwMwrE0C.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong vs. Godzilla', 1963, 'film', 1680, '/dmCfyzUl0Ylk8Rpi6dYyWuBrnNr.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong Escapes', 1967, 'film', 39276, '/1Z2fL5ycdVGs83i4iPdliDZVeVM.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong (1976)', 1976, 'film', 10730, '/paYKhEwUaxKA05vmOfU7FlleTln.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong Lives', 1986, 'film', 31947, '/gI37vg2otF348OHxsx97hWCVvNI.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong (2005)', 2005, 'film', 254, '/6a2HY6UmD7XiDD3NokgaBAXEsD2.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kong: Skull Island', 2017, 'film', 293167, '/r2517Vz9EhDhj88qwbDVj8DCRZN.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla vs. Kong', 2021, 'film', 399566, '/pgqgaUx1cJb5oZQQ5v0tNARCeBp.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla x Kong: The New Empire', 2024, 'film', 823464, '/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg', 90, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Saw (9 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Saw' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw II', 2005, 'film', 215, '/gTnaTysN8HsvVQqTRUh8m35mmUA.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw III', 2006, 'film', 214, '/4iO9n24Rb10peXV0JH2EldIOrAp.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw IV', 2007, 'film', 663, '/ku1QdCXOU4ckz3zxLLlis8MIJVm.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw V', 2008, 'film', 11917, '/rKl79KqLXg60KFyKsLe4wSSjQ08.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw VI', 2009, 'film', 22804, '/9JtluosCbioSXJSABZByaODyPpa.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw 3D', 2010, 'film', 41439, '/qHCZ6LjtmqWDfXXN28TlIC9OppK.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jigsaw', 2017, 'film', 298250, '/7RwHxhdUNS996JPFNB9a7CJtlwR.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spiral: From the Book of Saw', 2021, 'film', 602734, '/cTvSDfBuXTZTdRCNduGMANd7VEP.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Saw X', 2023, 'film', 951491, '/u7Lp1Hi8aBS73jv4KRMIv5aK4ax.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Rocky (9 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Rocky' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky', 1976, 'film', 1366, '/hEjK9A9BkNXejFW4tfacVAEHtkn.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky II', 1979, 'film', 1367, '/nMaiiu0CzT77U4JZkUYV7KqdAjK.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky III', 1982, 'film', 1371, '/9jS3wG3cNSEu8sVUFAFQ8exyaaH.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky IV', 1985, 'film', 1374, '/2MHUit4H6OK5adcOjnCN6suCKOl.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky V', 1990, 'film', 1375, '/qCARerjCFZOEeLiVdomhwRYlDSn.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rocky Balboa', 2006, 'film', 1246, '/byBlJvZwCqgtIwrZNv0pyE974jC.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creed', 2015, 'film', 312221, '/1BfTsk5VWuw8FCocAhCyqnRbEzq.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creed II', 2018, 'film', 480530, '/v3QyboWRoA4O9RbcsqH8tJMe8EB.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creed III', 2023, 'film', 677179, '/cvsXj3I9Q2iyyIo95AecSd1tad7.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- John Carpenter (9 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'John Carpenter' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (1978)', 1978, 'film', 948, '/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Escape from New York', 1981, 'film', 1103, '/vH9llaphjAssRGi0k7e75tD40Ce.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween II (1981)', 1981, 'film', NULL, NULL, 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween III: Season of the Witch', 1982, 'film', 10676, '/WABfdeaThFYXCySGIOvRNv2sSW.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'They Live', 1988, 'film', 8337, '/ngnybFTuopfbfmmEeX9jjBQQmF6.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Escape from L.A.', 1996, 'film', 10061, '/3L9lL2eUsmLNNfENPwNOc82Hzpw.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (2018)', 2018, 'film', 1630586, '/dbJ08Ih9OiYMUM0kMdAUvYeHHbO.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween Kills', 2021, 'film', 610253, '/4CclCDyQXBBgz62Qtp3CoflQE5g.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween Ends', 2022, 'film', 616820, '/q06saepaXeBdkMibuN4R2fXmgIw.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wolverine (9 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wolverine' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men', 2000, 'film', 36657, '/bRDAc4GogyS9ci3ow7UnInOcriN.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: The Last Stand', 2006, 'film', 36668, '/a2xicU8DpKtRizOHjQLC1JyCSRS.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men Origins: Wolverine', 2009, 'film', 2080, '/yj8LbTju1p7CUJg7US2unSBk33s.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: First Class', 2011, 'film', 49538, '/hNEokmUke0dazoBhttFN0o3L7Xv.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolverine', 2013, 'film', 76170, '/t2wVAcoRlKvEIVSbiYDb8d0QqqS.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Days of Future Past', 2014, 'film', 127585, '/tYfijzolzgoMOtegh1Y7j2Enorg.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men: Apocalypse', 2016, 'film', 246655, '/ikA8UhYdTGpqbatFa93nIf6noSr.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Logan', 2017, 'film', 263115, '/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool 2', 2018, 'film', 383498, '/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg', 90, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Predator (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Predator' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Predator', 1987, 'film', 106, '/k3mW4qfJo6SKqe6laRyNGnbB9n5.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Predator 2', 1990, 'film', 169, '/83X4VwY9sdSJykskmsplIVG0a4h.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'AVP: Alien vs. Predator', 2004, 'film', 395, '/ySWu5bCnnmgV1cVacvFnFIhgOjp.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aliens vs. Predator: Requiem', 2007, 'film', 440, '/5iTwPDNtvK6ZZF607BHBbU3HO0B.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Predators', 2010, 'film', 34851, '/wdniP8NDaJIydi1hMxhpbJMUfr6.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Predator', 2018, 'film', 346910, '/a3eWGF6YPF7No5Rbtjc8QpDvz7l.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Predator: Badlands', 2025, 'film', 1242898, '/erTRAi241eYF4K8KoGGOI8kFPox.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Predator: Killer of Killers', 2025, 'film', 1376434, '/2XDQa6EmFHSA37j1t0w88vpWqj9.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Transformers (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Transformers' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers', 2007, 'film', 1858, '/4N4sipl8T72tNE4earcctQa2Kw2.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers: Revenge of the Fallen', 2009, 'film', 8373, '/pLBb0whOzVDtJvyD4DPeQyQNOqp.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers: Dark of the Moon', 2011, 'film', 38356, '/28YlCLrFhONteYSs9hKjD1Km0Cj.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers: Age of Extinction', 2014, 'film', 91314, '/jyzrfx2WaeY60kYZpPYepSjGz4S.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers: The Last Knight', 2017, 'film', 335988, '/s5HQf2Gb3lIO2cRcFwNL9sn1o1o.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bumblebee', 2018, 'film', 424783, '/fw02ONlDhrYjTSZV8XO6hhU3ds3.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers: Rise of the Beasts', 2023, 'film', 667538, '/gPbM0MK8CP8A174rmUwGsADNYKD.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transformers One', 2024, 'film', 698687, '/iRCgqpdVE4wyLQvGYU3ZP7pAtUc.jpg', 80, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Fast and Furious (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Fast and Furious' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fast and the Furious', 2001, 'film', 9799, '/gqY0ITBgT7A82poL9jv851qdnIb.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '2 Fast 2 Furious', 2003, 'film', 584, '/6nDZExrDKIXvSAghsFKVFRVJuSf.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fast and the Furious: Tokyo Drift', 2006, 'film', 9615, '/46xqGOwHbh2TH2avWSw3SMXph4E.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fast Five', 2011, 'film', 51497, '/gEfQjjQwY7fh5bI4GlG0RrBu7Pz.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Furious 7', 2015, 'film', 168259, '/ktofZ9Htrjiy0P6LEowsDaxd3Ri.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fate Of The Furious', 2017, 'film', 337339, '/dImWM7GJqryWJO9LHa3XQ8DD5NH.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fast & Furious Presents: Hobbs & Shaw', 2019, 'film', 384018, '/qRyy2UmjC5ur9bDi3kpNNRCc5nc.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fast X', 2023, 'film', 385687, '/fiVW06jE7z9YnO4trhaMEdclSiC.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wonder Woman (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wonder Woman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The New Original Wonder Woman (1975)', 1975, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wonder Woman 1984', 2020, 'film', 464052, '/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 80, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Robocop (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Robocop' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop (1987)', 1987, 'film', 5548, '/esmAU0fCO28FbS6bUBKLAzJrohZ.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop 2', 1990, 'film', 5549, '/nhqBxhOJXUJeFsyLxTFkctH9H5F.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop 3', 1993, 'film', 5550, '/ppLSSwCuC5ERRWbu9H3R8SPL9AM.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop: Prime Directives - Crash and Burn', 2001, 'film', NULL, NULL, 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop: Prime Directives - Resurrection', 2001, 'film', NULL, NULL, 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop: Prime Directives - Meltdown', 2001, 'film', NULL, NULL, 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop: Prime Directives - Dark Justice', 2001, 'film', NULL, NULL, 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Robocop (2014)', 2014, 'film', 97020, '/gM5ql3BKYmHG3WtZ0buKXN7xY8O.jpg', 80, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Avengers - Some Assembly Required (8 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Avengers - Some Assembly Required' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk (1977)', 1977, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America II: Death Too Soon', 1979, 'film', 197481, '/pocmh0P8Ddf5w33pP3Vuqm0JRP9.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1979)', 1979, 'film', NULL, NULL, 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredible Hulk Returns', 1988, 'film', 26881, '/dw7eBKL26HEkA89BKvNVsjx7gGL.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Trial of the Incredible Hulk', 1989, 'film', 26883, '/jaaeLvonWry3TdTXaGSu2VveNEG.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America (1990)', 1990, 'film', NULL, NULL, 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Death of the Incredible Hulk', 1991, 'film', 19593, '/6q6CviMLR97ssODmKhxgyxQuoYp.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nick Fury: Agent of S.H.I.E.L.D.', 1998, 'film', 27460, '/4T0YjvnBaMASZkkRKxMIe6IoWO0.jpg', 80, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Mission: Impossible (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Mission: Impossible' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible', 1996, 'film', 954, '/l5uxY5m5OInWpcExIpKG6AR3rgL.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible II', 2000, 'film', 955, '/hfnrual76gPeNFduhD4xzHWpfTw.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible III', 2006, 'film', 956, '/vKGYCpmQyV9uHybWDzXuII8Los5.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible - Ghost Protocol', 2011, 'film', 56292, '/eRZTGx7GsiKqPch96k27LK005ZL.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'MIssion: Impossible - Rogue Nation', 2015, 'film', 177677, '/fRJLXQBHK2wyznK5yZbO7vmsuVK.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible - Dead Reckoning Part One', 2023, 'film', 575264, '/NNxYkU70HPurnNCSiCjYAmacwm.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mission: Impossible - The Final Reckoning', 2025, 'film', 575265, '/z53D72EAOxGRqdr7KXXWp9dJiDe.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Board Game Series (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Board Game Series' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mazes and Monsters', 1982, 'film', 27348, '/4i0ISVGGZczwl3RaTIAa8BMu6Df.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: Wrath of the Dragon God', 2005, 'film', 9288, '/n5PV0sV4Nd0eCZMcRfipeNhTpmz.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: The Book of Vile Darkness', 2012, 'film', 135858, '/n3eezeLwKTQwgkqbySs0v74nXeP.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Battleship', 2012, 'film', 44833, '/9b0Im7SfedHiajTwzSL9zGyBI7M.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ouija', 2014, 'film', 242512, '/gwjHlGjK2xXKpjd65BWyAMwzTWC.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ouija: Origin of Evil', 2016, 'film', 335796, '/gwynHc2RrOFaplYMMpQRpr3TIA4.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: Honor Among Thieves', 2023, 'film', 493529, '/v7UF7ypAqjsFZFdjksjQ7IUpXdn.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Teenage Mutant Ninja Turtles (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Teenage Mutant Ninja Turtles' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles (1990)', 1990, 'film', 1498, '/shfAU6xIIEAEtsloIT3n9Fscz2E.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles II: The Secret of the Ooze', 1991, 'film', 1497, '/Hyvvz9Z3le1is8a0EeFJQm0aSC.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles III', 1993, 'film', 1499, '/fwX5RdPDBFsbEAXc46DrvRz5Bca.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'TMNT', 2007, 'film', 1273, '/6ZCWn7BGpDLBDigtdiuGyBdEqab.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles (2014)', 2014, 'film', NULL, NULL, 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles: Out of the Shadows', 2016, 'film', 308531, '/euVaCiCWz3AALcQXHT6aUqdGUo6.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teenage Mutant Ninja Turtles: Mutant Mayhem', 2023, 'film', 614930, '/gyh0eECE2IqrW8GWl3KoHBfc45j.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Thor (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Thor' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Avengers', 2012, 'film', 24428, '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: The Dark World', 2013, 'film', 76338, '/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Age of Ultron', 2015, 'film', 99861, '/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Ragnarok', 2017, 'film', 284053, '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Love and Thunder', 2022, 'film', 616037, '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', 70, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Texas Chainsaw Massacre (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Texas Chainsaw Massacre' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Texas Chain Saw Massacre (1974)', 1974, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Texas Chainsaw Massacre 2', 1986, 'film', 16337, '/cO1Dvg7k87lHSPOdumn3ddJEKdX.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Leatherface: The Texas Chainsaw Massacre III', 1990, 'film', 25018, '/4Vhv0vRqirhvbudRcNctFgxoFtI.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Texas Chainsaw Massacre (2003)', 2003, 'film', NULL, NULL, 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Texas Chainsaw Massacre: The Beginning', 2006, 'film', 10781, '/hTBueN0Ru3R7brwtONenDyEMNYe.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Texas Chainsaw 3D', 2013, 'film', 76617, '/qaPvvHP1kKlQaUAXQZQAWitqBOT.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Texas Chainsaw Massacre (2022)', 2022, 'film', 632727, '/7sKiGNWFM15WNyY7LYd5vmb3brO.jpg', 70, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Resident Evil (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Resident Evil' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil', 2002, 'film', 1576, '/1UKNef590A0ZaMnxsscIcWuK1Em.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Apocalypse', 2004, 'film', 1577, '/way9dOm4dM2sm9UMcu2PEXMTX0q.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Extinction', 2007, 'film', 7737, '/6yaLr7Ymg5cvbtSVi5hHwBKx35I.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Afterlife', 2010, 'film', 35791, '/nYPc4sJdCZLY7YFYUmqXXYt3luH.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Retribution', 2012, 'film', 71679, '/ohdUDWVlcbuWphaLu6wS91xdJ73.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: The Final Chapter', 2016, 'film', 173897, '/7glPlA0xPpxPxBu0TnY4ulQVCV1.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Resident Evil: Welcome To Raccoon City', 2021, 'film', 460458, '/bArhvjRHl535XMaSh9VjInF2mSZ.jpg', 70, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Viral Outbreak (7 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Viral Outbreak' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Panic in the Streets', 1950, 'film', 32078, '/79jfETdOonIFL8UEjBxptPS27yo.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Satan Bug', 1965, 'film', 27709, '/jMqA1ooDaqQqaifI5hnU7tw9hf2.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Andromeda Strain (1971)', 1971, 'film', NULL, NULL, 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Warning Sign', 1985, 'film', 34028, '/bcwnXp1fESWS4oMnEgSgT7weEWC.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Outbreak', 1995, 'film', 6950, '/4KymNvlWR0XF0sqX2BWRd9Z3yXR.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Andromeda Strain (2008)', 2008, 'film', NULL, NULL, 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Contagion', 2011, 'film', 39538, '/qL0IooP0bjXy0KXl9KEyPo22ll0.jpg', 70, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Karate Kid (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Karate Kid' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Karate Kid (1984)', 1984, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Karate Kid Part II', 1986, 'film', 8856, '/k0OwgRR6PNu7h3SiqpCbRdZWNaG.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Karate Kid Part III', 1989, 'film', 10495, '/lVZ3r0iDwGejlCvFEvXGzhQB9ds.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Next Karate Kid', 1994, 'film', 11231, '/wI3gCi9w1cuUJCiwhviAy46we9Q.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Karate Kid (2010)', 2010, 'film', NULL, NULL, 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Karate Kid: Legends', 2025, 'film', 1011477, '/c90Lt7OQGsOmhv6x4JoFdoHzw5l.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Final Destination (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Final Destination' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Destination', 2000, 'film', 9532, '/1mXhlQMnlfvJ2frxTjZSQNnA9Vp.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Destination 2', 2003, 'film', 9358, '/vnFgxRlLTA9fDNcGXLiHmgwmIEo.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Destination 3', 2006, 'film', 9286, '/p7ARuNKUGPGvkBiDtIDvAzYzonX.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Final Destination', 2009, 'film', 19912, '/5vxXrr1MqGsT4NNeRITpfDnl4Rq.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Destination 5', 2011, 'film', 55779, '/Akx1Po4ZLetOWfYJhQf75tbhTtK.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Destination: Bloodlines', 2025, 'film', 574475, '/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Death Race (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Death Race' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race 2000', 1975, 'film', 13282, '/kwM8kkNGtv62gfPWVhD6qFxjDzg.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race', 2008, 'film', 10483, '/5A79GeOb3uChQ0l0ZDjDyODKQp3.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race 2', 2010, 'film', 51620, '/80mBFNVvak2bA9TJN1MD0yM7Lfi.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race: Inferno', 2013, 'film', 156717, '/aRV4oC61nmBqypSaXtMXOk99dOM.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race 2050', 2017, 'film', 401544, '/5mI8yqZZBlZpvd0aT5YXbR8oEvT.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Race: Beyond Anarchy', 2018, 'film', 401478, '/1PrlKvPUbDQAqFQBCyyt68hLLl.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Godzilla (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Godzilla' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'King Kong vs. Godzilla', 1963, 'film', 1680, '/dmCfyzUl0Ylk8Rpi6dYyWuBrnNr.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla (2014)', 2014, 'film', 124905, '/tphkjmQq8WebuVwNXelmjLUXuPJ.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kong: Skull Island', 2017, 'film', 293167, '/r2517Vz9EhDhj88qwbDVj8DCRZN.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla: King of the Monsters', 2019, 'film', 373571, '/mzOHg7Q5q9yUmY0b9Esu8Qe6Nnm.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla vs. Kong', 2021, 'film', 399566, '/pgqgaUx1cJb5oZQQ5v0tNARCeBp.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla x Kong: The New Empire', 2024, 'film', 823464, '/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Martin Scorsese / Leonardo DiCaprio (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Martin Scorsese / Leonardo DiCaprio' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gangs of New York', 2002, 'film', 3131, '/lemqKtcCuAano5aqrzxYiKC8kkn.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Aviator', 2004, 'film', 2567, '/lx4kWcZc3o9PaNxlQpEJZM17XUI.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Departed', 2006, 'film', 1422, '/nT97ifVT2J1yMQmeq20Qblg61T.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shutter Island', 2010, 'film', 11324, '/nrmXQ0zcZUL8jFLrakWc90IR8z9.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolf of Wall Street', 2013, 'film', 106646, '/kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Killers of the Flower Moon', 2023, 'film', 466420, '/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Scream (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Scream' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream', 1996, 'film', 4232, '/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 2', 1997, 'film', 4233, '/dORlVasiaDkJXTqt9bdH7nFNs6C.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 3', 2000, 'film', 4234, '/qpH8ToZVlFD1bakL04LkEKodyDI.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 4', 2011, 'film', 41446, '/tcrI37K98TVopLbcZBa55mWhLT1.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream (2022)', 2022, 'film', 1494121, '/goGV2TjekEA8fr4WQpIYx6fcaf8.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream VI', 2023, 'film', 934433, '/wDWwtvkRRlgTiUr6TyLSMX8FCuZ.jpg', 60, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Pixar (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Pixar' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story', 1995, 'film', 862, '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 2', 1999, 'film', 863, '/yFWQkz2ynjwsazT6xQiIXEUsyuh.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredibles', 2004, 'film', 9806, '/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 3', 2010, 'film', 10193, '/AbbXspMOwdvwWZgVN0nabZq03Ec.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 4', 2019, 'film', 301528, '/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lightyear', 2022, 'film', 718789, '/b9t3w1loraDh7hjdWmpc9ZsaYns.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Justice League (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Justice League' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Batman v Superman: Dawn of Justice', 2016, 'film', 209112, '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Terminator (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Terminator' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator 2: Judgment Day', 1991, 'film', 280, '/jFTVD4XoWQTcg7wdyJKa8PEds5q.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator', 1991, 'film', 280, '/jFTVD4XoWQTcg7wdyJKa8PEds5q.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator 3: Rise of the Machines', 2003, 'film', 296, '/vvevzdYIrk2636maNW4qeWmlPFG.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator Salvation', 2009, 'film', 534, '/gw6JhlekZgtKUFlDTezq3j5JEPK.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator: Genisys', 2015, 'film', 87101, '/oZRVDpNtmHk8M1VYy1aeOWUXgbC.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Terminator: Dark Fate', 2019, 'film', 290859, '/vqzNJRH4YyquRiWxCCOH0aXggHI.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Rob Zombie (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Rob Zombie' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'House of 1000 Corpses', 2003, 'film', 2662, '/29c2qgXmSREosLBevOILEuMWzQC.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Devil''s Rejects', 2005, 'film', 1696, '/drZz4AuI7trq6BxlH9Xa4v4O0Pb.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween (2007)', 2007, 'film', 2082, '/cD8JrfSEI4j7WVnKM1GdiYzMoUh.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Halloween II (2009)', 2009, 'film', 24150, '/vSHPM4LQDpWdQrD5KZWK6wNqSOD.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Lords of Salem', 2012, 'film', 104755, '/nqZ6CGGZpQWt139YioekSYHvvkU.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '3 From Hell', 2019, 'film', 489064, '/iaURDnsqwTpFdg7RuizUp0nI2I4.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Star Wars (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Star Wars' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Star Wars', 1977, 'film', 11, '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Empire Strikes Back', 1980, 'film', 1891, '/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Return of the Jedi', 1983, 'film', 1892, '/jQYlydvHm3kUix1f8prMucrplhm.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ewoks: The Battle for Endor', 1985, 'film', 10372, '/ntgKdekb7xMKscyh2Hei706LBLf.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rogue One - A Star Wars Story', 2016, 'film', 330459, '/i0yw1mFbB7sNGHCs7EXZPzFkdA1.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Solo: A Star Wars Story', 2018, 'film', 348350, '/4oD6VEccFkorEBTEDXtpLAaz0Rl.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Death Wish (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Death Wish' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Wish (1974)', 1974, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Wish II', 1982, 'film', 14373, '/3iX2nI3Cs9Q864SxA35RE6Hnl5p.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Wish 3', 1985, 'film', 24873, '/mc33TytXxkC9cSKyztDJzwF3lbn.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Wish 4: The Crackdown', 1987, 'film', 26263, '/r8HwJQJyKRyJ2JypwiVR5p0ZV84.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Wish V: The Face of Death', 1994, 'film', 34746, '/5gcpHxQh93M6CKTIMpngErxxq0D.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Death Sentence', 2007, 'film', 11835, '/3rdEAMh4a3pc7GO6fSkJwpt7BWX.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Bourne (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Bourne' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bourne Identity (1988)', 1988, 'film', NULL, NULL, 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bourne Identity (2002)', 2002, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bourne Supremacy', 2004, 'film', 2502, '/7IYGiDrquvX3q7e9PV6Pejs6b2g.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bourne Ultimatum', 2007, 'film', 2503, '/15rMz5MRXFp7CP4VxhjYw4y0FUn.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bourne Legacy', 2012, 'film', 49040, '/1aExL5DTGHj25ZfIC3dDwS84RWi.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jason Bourne', 2016, 'film', 324668, '/xA7N41glw17MBQtcWSm2eBlBRuG.jpg', 60, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wes Craven (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wes Craven' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Swamp Thing', 1982, 'film', 17918, '/7BGaE9A7UeyxH29aeFbQfzEmIi0.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Nightmare on Elm Street 3: Dream Warriors', 1987, 'film', 10072, '/qbtZewU6EGvxi8yFVzwZ31NijLX.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream', 1996, 'film', 4232, '/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 2', 1997, 'film', 4233, '/dORlVasiaDkJXTqt9bdH7nFNs6C.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 3', 2000, 'film', 4234, '/qpH8ToZVlFD1bakL04LkEKodyDI.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Scream 4', 2011, 'film', 41446, '/tcrI37K98TVopLbcZBa55mWhLT1.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Hitmen (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Hitmen' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Road to Perdition', 2002, 'film', 4147, '/loSpBeirRfTPJ3cMIqpQArstGhh.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A History of Violence', 2005, 'film', 59, '/3qnO72NHmUgs9JZXAmu4aId9QDl.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'V For Vendetta', 2006, 'film', 752, '/piZOwjyk1g51oPHonc7zaQY3WOv.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED', 2010, 'film', 39514, '/8eeK3OB5PeSRQD7BpZcGZKkehG.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Losers', 2010, 'film', 34813, '/b9dVH0n7YnBqLmW2c5AzftxhhpH.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED 2', 2013, 'film', 146216, '/tbksijr6g340yFWRgI4JfwrtM9h.jpg', 60, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Silent Night Deadly Night (6 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Silent Night Deadly Night' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night, Deadly Night', 1984, 'film', 27414, '/ypj2JwAN4vWcc4zSqFCTgUwMbJV.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night, Deadly Night Part 2', 1987, 'film', 50719, '/bg2wBjg5zNoVxZnt7RarVQBxUuj.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night, Deadly Night 3: Better Watch Out!', 1989, 'film', 42709, '/8lLDhF1hlXeM37TLGsFZyw1LLAY.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night, Deadly Night 4: Initiation', 1990, 'film', 59762, '/1Oc6wObXYHThbBGsozL7WuilqOS.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night, Deadly Night 5: The Toy Maker', 1991, 'film', 70984, '/dSA5fLdk14CglFluKVMohrjo7L4.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Night', 2012, 'film', 139455, '/ippySSXam9UHw6j8g3aH8WxC9LU.jpg', 60, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- John Wick (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'John Wick' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'John Wick', 2014, 'film', 245891, '/wXqWR7dHncNRbxoEGybEy7QTe9h.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'John Wick: Chapter 2', 2017, 'film', 324552, '/hXWBc0ioZP3cN4zCu6SN3YHXZVO.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Continental: From the World of John Wick', 2023, 'film', NULL, NULL, 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'John Wick: Chapter 4', 2023, 'film', 603692, '/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ballerina', 2025, 'film', 541671, '/2VUmvqsHb6cEtdfscEA6fqqVzLg.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wolf Man (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wolf Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Werewolf of London', 1935, 'film', 27970, '/78kD3Fpvgd8qubKMbhS5dKofjR8.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolf Man', 1941, 'film', 13666, '/tyEke5KSZa02l4MAAQsWu7clHrb.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Wolf of London', 1946, 'film', 45322, '/3H1JNJS8eIJPd502sPgbEfyhtDG.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Wolfman', 2010, 'film', 7978, '/fQqPoAHvHicie1ttuiV2q0yv9V7.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wolf Man', 2025, 'film', 710295, '/wpSDzTBfF0Eeo5lzu2w9FTujGqd.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Venom (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Venom' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man 3', 2007, 'film', 559, '/qFmwhVUoUSXjkKRmca5yGDEXBIj.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom', 2018, 'film', 335983, '/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: Let There Be Carnage', 2021, 'film', 580489, '/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Venom: The Last Dance', 2024, 'film', 912649, '/1RaSkWakWBxxYOWRrqmwo2my5zg.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dracula (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dracula' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Son of Dracula', 1943, 'film', 32023, '/pQTLdJ46WXPIix05EkcHAMDKUIw.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dracula Untold', 2014, 'film', 49017, '/m5h3NtZ2ZfryIHl1MvatmANvIqQ.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Last Voyage of the Demeter', 2023, 'film', 635910, '/nrtbv6Cew7qC7k9GsYSf5uSmuKh.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Renfield', 2023, 'film', 649609, '/p6yUjhvNGQpFZilKwOKbxQ1eHlo.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Abigail', 2024, 'film', 1111873, '/5gKKSoD3iezjoL7YqZONjmyAiRA.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Mad Max (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Mad Max' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mad Max', 1979, 'film', 9659, '/5LrI4GiCSrChgkdskVZiwv643Kg.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mad Max 2: The Road Warrior', 1981, 'film', 8810, '/l1KVEhkGDpWRzQ0VqIhZqDDuOim.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mad Max: Beyond Thunderdome', 1985, 'film', 9355, '/jJlxcEVVUHnrUeEkQ0077VeHQpb.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mad Max: Fury Road', 2015, 'film', 76341, '/hA2ple9q4qnwxp3hKVNhroipsir.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Furiosa: A Mad Max Saga', 2024, 'film', 786892, '/iADOJ8Zymht2JPMoy3R7xceZprc.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- MonsterVerse (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'MonsterVerse' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla (2014)', 2014, 'film', 124905, '/tphkjmQq8WebuVwNXelmjLUXuPJ.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kong: Skull Island', 2017, 'film', 293167, '/r2517Vz9EhDhj88qwbDVj8DCRZN.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla: King of the Monsters', 2019, 'film', 373571, '/mzOHg7Q5q9yUmY0b9Esu8Qe6Nnm.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla vs. Kong', 2021, 'film', 399566, '/pgqgaUx1cJb5oZQQ5v0tNARCeBp.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Godzilla x Kong: The New Empire', 2024, 'film', 823464, '/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Flash (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Flash' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Legends of the Superheroes', 1979, 'film', NULL, NULL, 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Flash (1990)', 1990, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ant-Man (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ant-Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man', 2015, 'film', 102899, '/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man And The Wasp', 2018, 'film', 363088, '/cFQEO687n1K6umXbInzocxcnAQz.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ant-Man and the Wasp: Quantumania', 2023, 'film', 640146, '/qnqGbB22YJ7dSs4o6M7exTpNxPz.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Underworld (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Underworld' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Underworld', 2003, 'film', 277, '/zsnQ41UZ3jo1wEeemF0eA9cAIU0.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Underworld: Evolution', 2006, 'film', 834, '/oJaQG353uOzOqffQ5K2hg03k4Vp.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Underworld: Rise of the Lycans', 2009, 'film', 12437, '/yW9gF7rGn8EoV8B8rxOx1xjxVZf.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Underworld: Awakening', 2012, 'film', 52520, '/jN0uuc8U6M3sTg9zEaliJV60Stf.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Underworld: Blood Wars', 2016, 'film', 346672, '/v1ciDCWMG47gdT4kMyjyQbnLQQn.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Toy Story (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Toy Story' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story', 1995, 'film', 862, '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 2', 1999, 'film', 863, '/yFWQkz2ynjwsazT6xQiIXEUsyuh.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 3', 2010, 'film', 10193, '/AbbXspMOwdvwWZgVN0nabZq03Ec.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Toy Story 4', 2019, 'film', 301528, '/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lightyear', 2022, 'film', 718789, '/b9t3w1loraDh7hjdWmpc9ZsaYns.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Tremors (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Tremors' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tremors 3: Back to Perfection', 2001, 'film', 10829, '/mnMryfLgC2fuW3nfY36QfWx0hBL.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tremors 4: The Legend Begins', 2004, 'film', 10891, '/yhh1zMGoy6nYSXMgrsYoNRbclJn.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tremors 5: Bloodlines', 2015, 'film', 339530, '/xGoCQeYGW63Is0iaAxVEcpCFNwY.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tremors: A Cold Day In Hell', 2018, 'film', 496704, '/aFOdiHaRjeTmHG67e5B7md2Q1cq.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tremors: Shrieker Island', 2020, 'film', 670266, '/46qwaON7l11M407rqh8lD4vXcAR.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Rambo (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Rambo' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'First Blood', 1982, 'film', 1368, '/dR5fbo0ry5TsC7euEXFUkx2QzVk.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rambo: First Blood Part II', 1985, 'film', 1369, '/pzPdwOitmTleVE3YPMfIQgLh84p.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rambo III', 1988, 'film', 1370, '/uycbt9iVlAnKkQIisqUWuO8hVcm.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rambo', 2008, 'film', 7555, '/3mInub5c8o00H7EJ1TrjAqOzIuc.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rambo: Last Blood', 2019, 'film', 522938, '/kTQ3J8oTTKofAVLYnds2cHUz9KO.jpg', 50, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Pokemon (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Pokemon' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: The First Movie (Mewtwo Strikes Back)', 1998, 'film', 10228, '/xPW3AeK3iQi1Zd9dCbdNLijE48o.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: The Movie 2000 (The Power of One)', 1999, 'film', 12599, '/6u65C8aG4krAVyHsTjAMF7ucTDH.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon 4Ever (Celebi – Voice of the Forest)', 2001, 'film', 12600, '/thz83PS9twtVBEEAM59J1bh75nU.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon Heroes (Latios and Latias)', 2002, 'film', 33875, '/eySv5rdYLW1k6LxepxCNl8ND26R.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pokemon: Detective Pikachu', 2019, 'film', 447404, '/uhWvnFgg3BNlcUz0Re1HfQqIcCD.jpg', 50, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Die Hard (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Die Hard' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Detective', 1968, 'film', 42636, '/sMUJzLhzFotnJdi7WA9fE9xv5Te.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Die Hard', 1988, 'film', 562, '/7Bjd8kfmDSOzpmhySpEhkUyK2oH.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Die Hard with a Vengeance', 1995, 'film', 1572, '/buqmCdFQEWwEpL3agGgg2GVjN2d.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Live Free or Die Hard', 2007, 'film', 1571, '/31TT47YjBl7a7uvJ3ff1nrirXhP.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Good Day to Die Hard', 2013, 'film', 47964, '/qJ0csDXAVFMsNn0cRcjy6W6PxAK.jpg', 50, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nightmare on Elm St (5 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nightmare on Elm St' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Nightmare on Elm Street Part 2: Freddy''s Revenge', 1985, 'film', 10014, '/53kxYw0G3o55yJ23K7s7KMaOyAM.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Nightmare on Elm Street 3: Dream Warriors', 1987, 'film', 10072, '/qbtZewU6EGvxi8yFVzwZ31NijLX.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Nightmare on Elm Street 4: The Dream Master', 1988, 'film', 10131, '/boStYG7jKdoIZTduiOOsUVknD13.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Freddy''s Dead: The Final Nightmare', 1991, 'film', 11284, '/e4qh58n2WaG4Gyh9VhjOUeN9Mhv.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Nightmare on Elm Street (2010)', 2010, 'film', NULL, NULL, 50, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Fantastic Four (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Fantastic Four' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four', 1994, 'film', 22059, '/avJpIDOjyfdoOLINYficKvW9dEa.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four', 2005, 'film', 9738, '/8HLQLILZLhDQWO6JDpvY6XJLH75.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fantastic Four: Rise of the Silver Surfer', 2007, 'film', 1979, '/1rxTraSO45jbvTrCeSvJ6RmOu1b.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fantastic Four: First Steps', 2025, 'film', 1516738, '/z7wI0jpec9gz2IwVciND1nbRBy0.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Species (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Species' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Species', 1995, 'film', 9348, '/cT5wdyo8kT7dycqjrolJ2sHWkFx.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Species II', 1998, 'film', 10216, '/8LSBi0bHACZtIiVErUBQ2UXNYLA.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Species III', 2004, 'film', 9711, '/8BelHo8qmaurZjPS9hipSQ79Rr6.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Species: The Awakening', 2007, 'film', 15212, '/wPsu2NM0eUpoqycgjjnRJIwxK13.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dungeons and Dragons (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dungeons and Dragons' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mazes and Monsters', 1982, 'film', 27348, '/4i0ISVGGZczwl3RaTIAa8BMu6Df.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: Wrath of the Dragon God', 2005, 'film', 9288, '/n5PV0sV4Nd0eCZMcRfipeNhTpmz.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: The Book of Vile Darkness', 2012, 'film', 135858, '/n3eezeLwKTQwgkqbySs0v74nXeP.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dungeons & Dragons: Honor Among Thieves', 2023, 'film', 493529, '/v7UF7ypAqjsFZFdjksjQ7IUpXdn.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nosferatu (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nosferatu' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nosferatu the Vampyre', 1979, 'film', 6404, '/jHKzGYwf7P34vz8MhJBTN6cnaYD.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shadow of the Vampire', 2000, 'film', 10873, '/nWm7DWi8X4D87XkM5qr9BhTJHq6.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nosferatu: A Symphony of Horror', 2023, 'film', 394151, '/dD9B9Z9YoW1mrtmHPQ26LlhApka.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nosferatu (2024)', 2024, 'film', NULL, NULL, 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Sonic The Hedgehog (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Sonic The Hedgehog' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog', 2020, 'film', 454626, '/aQvJ5WPzZgYVDrxLX4R6cLJCEaQ.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog 2', 2022, 'film', 675353, '/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sonic the Hedgehog 3', 2024, 'film', 939243, '/d8Ryb8AunYAuycVKDp5HpdWPKgC.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Knuckles', 2024, 'film', 675353, '/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dark Horse Comics (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dark Horse Comics' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy', 2004, 'film', 1487, '/lbaTEneOofwvAyg77R8HbFML2zT.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy II: The Golden Army', 2008, 'film', 11253, '/zO0Wdrxnhx3KoJEvychSmnY3urC.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy (2019)', 2019, 'film', 456740, '/bk8LyaMqUtaQ9hUShuvFznQYQKR.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy: The Crooked Man', 2024, 'film', 1087822, '/iz2GabtToVB05gLTVSH7ZvFtsMM.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Hellboy (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Hellboy' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy', 2004, 'film', 1487, '/lbaTEneOofwvAyg77R8HbFML2zT.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy II: The Golden Army', 2008, 'film', 11253, '/zO0Wdrxnhx3KoJEvychSmnY3urC.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy (2019)', 2019, 'film', 456740, '/bk8LyaMqUtaQ9hUShuvFznQYQKR.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hellboy: The Crooked Man', 2024, 'film', 1087822, '/iz2GabtToVB05gLTVSH7ZvFtsMM.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Aquaman (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Aquaman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League', 2017, 'film', 141052, '/eifGNCSDuxJeS1loAXil5bIGgvC.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman', 2018, 'film', 297802, '/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aquaman and the Lost Kingdom', 2023, 'film', 572802, '/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Daredevil and Elektra (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Daredevil and Elektra' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Daredevil', 2003, 'film', 9480, '/oCDBwSkntYamuw8VJIxMRCtDBmi.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Elektra', 2005, 'film', 9947, '/Z4dAOxjAHTUZO6DJ2WVAsxzwe3.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'She-Hulk: Attorney at Law', 2022, 'film', 1026208, '/yhFN7yvskzm1Tsknkg46eQbQr9w.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Guardians of the Galaxy (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Guardians of the Galaxy' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Guardians of the Galaxy', 2014, 'film', 118340, '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Guardians of the Galaxy Holiday Special', 2022, 'film', 774752, '/8dqXyslZ2hv49Oiob9UjlGSHSTR.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thor: Love and Thunder', 2022, 'film', 616037, '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Black Panther (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Black Panther' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain America: Civil War', 2016, 'film', 271110, '/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther', 2018, 'film', 284054, '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Panther: Wakanda Forever', 2022, 'film', 505642, '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Doctor Strange (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Doctor Strange' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Strange', 2016, 'film', 284052, '/xf8PbyQcR5ucXErmZNzdKR0s8ya.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Infinity War', 2018, 'film', 299536, '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avengers: Endgame', 2019, 'film', 299534, '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Spider-Man: No Way Home', 2021, 'film', 634649, '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', 40, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Blade (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Blade' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade', 1998, 'film', 36647, '/hx0sdduAsr4rq03RZKZzglR25z7.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade II', 2002, 'film', 36586, '/yDHwo3eWcMiy5LnnEnlGV9iLu9k.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade: Trinity', 2004, 'film', 36648, '/6f7iXvPOnf83MaLB1JmPzUor1rr.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Eternals', 2021, 'film', 524434, '/lFByFSLV5WDJEv3KabbdAF959F2.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- G.I. Joe (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'G.I. Joe' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'G.I. Joe: The Movie', 1987, 'film', 17421, '/gADRX5uks0nIsgEzwNpkCIHukBN.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'G.I. Joe: The Rise of Cobra', 2009, 'film', 14869, '/mc9b25IAprHfsaOz0wTshOwGHcY.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'G.I. Joe: Retaliation', 2013, 'film', 72559, '/3rWIZMzTKcCtV0eHJ70Z4Ru659f.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Snake Eyes - G.I. Joe Origins', 2021, 'film', 568620, '/uIXF0sQGXOxQhbaEaKOi2VYlIL0.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Tom Clancy (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Tom Clancy' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Hunt for Red October', 1990, 'film', 1669, '/yVl7zidse4KiWtGMqHFtZCx4X3N.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Patriot Games', 1992, 'film', 9869, '/9IT7gnszrRthduYxCLqaIkM55Un.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Sum of All Fears', 2002, 'film', 4614, '/3E4LW4bjRhEMDeeXeIsmkJ94v8K.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jack Ryan: Shadow Recruit', 2014, 'film', 137094, '/m7HcLUodrD4lM4s0Hui1tzO2pjO.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Jack Ryan (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Jack Ryan' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Hunt for Red October', 1990, 'film', 1669, '/yVl7zidse4KiWtGMqHFtZCx4X3N.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Patriot Games', 1992, 'film', 9869, '/9IT7gnszrRthduYxCLqaIkM55Un.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Sum of All Fears', 2002, 'film', 4614, '/3E4LW4bjRhEMDeeXeIsmkJ94v8K.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jack Ryan: Shadow Recruit', 2014, 'film', 137094, '/m7HcLUodrD4lM4s0Hui1tzO2pjO.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Charlie's Angels (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Charlie''s Angels' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Charlie''s Angels (1976)', 1976, 'film', NULL, NULL, 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Charlie''s Angels (2000)', 2000, 'film', 4327, '/iHTmZs0BmkwMCYi8rhvMWC5G4EM.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Charlie''s Angels: Full Throttle', 2003, 'film', 9471, '/n4cdJ0Wqxb7C0HmZbcaC4eYnkIf.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Charlie''s Angels (2019)', 2019, 'film', 458897, '/1DPUFG6QnGqzpvEaDEv7TaepycM.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Insidious (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Insidious' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Insidious', 2010, 'film', 49018, '/1egpmVXuXed58TH2UOnX1nATTrf.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Insidious: Chapter 2', 2013, 'film', 91586, '/w5JjiB3O1CLDXbTJe1QpU5RHmlU.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Insidious: Chapter 3', 2015, 'film', 280092, '/iDdGfdNvY1EX0uDdA4Ru77fwMfc.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Insidious: The Last Key', 2018, 'film', 406563, '/nb9fc9INMg8kQ8L7sE7XTNsZnUX.jpg', 40, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Transporter (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Transporter' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Transporter', 2002, 'film', 4108, '/dncJ81z1BahrT3ogLvlxOUC5n4u.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transporter 2', 2005, 'film', 9335, '/cdm17vK8PxHfTi7ayZf6WKbOgUO.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Transporter 3', 2008, 'film', 13387, '/p4R9Le2jYW2XB2QxbUeu74jJQ5D.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Transporter: Refueled', 2015, 'film', 287948, '/71kaQfdrMy0LHSeLRADsvlDGCgb.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Carrie (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Carrie' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (1976)', 1976, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Rage: Carrie 2', 1999, 'film', 7341, '/jJmIf22gwwQPAFJfZ6Tr1MwSpRg.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (2002)', 2002, 'film', NULL, NULL, 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Carrie (2013)', 2013, 'film', NULL, NULL, 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Marvel Misfits (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Marvel Misfits' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Howard the Duck', 1986, 'film', 10658, '/eU0dWo8PJgsSAZFbcyHiUpuLSyW.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Man-Thing', 2005, 'film', 18882, '/kfPPnOygXSGaBFpsCUyu7xQdkoO.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass', 2010, 'film', 23483, '/iHMbrTHJwocsNvo5murCBw0CwTo.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass 2', 2013, 'film', 59859, '/1go2A3gdQjaMuHWquybgoJlQRcX.jpg', 40, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Hannibal Lecter (4 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Hannibal Lecter' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Manhunter', 1986, 'film', 11454, '/6rb24x39vV8n5301IelC8rCPJTH.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hannibal', 2001, 'film', 9740, '/v5wAZwRqpGWmyAaaJ8BBHYuNXnj.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Red Dragon', 2002, 'film', 9533, '/ou9ZKA2cms02b7CdCdVqGkKu0O0.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hannibal Rising', 2007, 'film', 1248, '/7FTDMQoac0uqJUquZk4KenDzLMZ.jpg', 40, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Frankenstein (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Frankenstein' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Bride of Frankenstein', 1935, 'film', 229, '/5241zUwe7rC17MNc2QpCBKKdp1N.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Son of Frankenstein', 1939, 'film', 3077, '/oefhX4T3iWo2XFvaOunR7azWAo3.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mary Shelley''s Frankenstein', 1994, 'film', 3036, '/bOwCAQsZlEKrwhPi1ejY6BS8jpL.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Silent Hill (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Silent Hill' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Hill', 2006, 'film', 588, '/r0bEDWO2w4a43K2xTNSF284qOsc.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Silent Hill: Revelation', 2012, 'film', 61012, '/9ZDOzeSzjurGnQYokbRI0hJnmk6.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Return to Silent Hill', 2026, 'film', 680493, '/fqAGFN2K2kDL0EHxvJaXzaMUkkt.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Darkman (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Darkman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Darkman', 1990, 'film', 9556, '/9fxGRzlINIvfPFhizMgbQaDDrK.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Darkman II: The Return of Durant', 1995, 'film', 18998, '/kEQ6FWjvDnIl6sK88LCDcTwwjWr.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Darkman III: Die Darkman Die', 1996, 'film', 19002, '/hURMKPp4FRlmbafRlo2iejquT0o.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Knives Out (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Knives Out' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Knives Out', 2019, 'film', 546554, '/pThyQovXQrw2m0s9x82twj48Jq4.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Glass Onion: A Knives Out Mystery', 2022, 'film', 661374, '/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wake Up Dead Man: A Knives Out Mystery', 2025, 'film', 812583, '/qCOGGi8JBVEZMc3DVby8rUivyXz.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Avatar (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Avatar' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avatar', 2009, 'film', 19995, '/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avatar: The Way of Water', 2022, 'film', 76600, '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Avatar: Fire and Ash', 2025, 'film', 83533, '/bRBeSHfGHwkEpImlhxPmOcUsaeg.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Robert Langdon (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Robert Langdon' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Da Vinci Code', 2006, 'film', 591, '/9ejKfNk0LBhSI9AahH4f9NJNZNM.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Angels & Demons', 2009, 'film', 13448, '/tFZQAuulEOtFTp0gHbVdEXwGrYe.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Inferno', 2016, 'film', 207932, '/cnqvFvjAaV28F1tU7986VVg0WP7.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Green Lantern (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Green Lantern' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Legends of the Superheroes', 1979, 'film', NULL, NULL, 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Justice League of America', 1997, 'film', 69336, '/6Bd04JTvYC5UPrgvEkeThst3jG6.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman (2025)', 2025, 'film', NULL, NULL, 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Bad Boys (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Bad Boys' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bad Boys', 1995, 'film', 9737, '/x1ygBecKHfXX4M2kRhmFKWfWbJc.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bad Boys For Life', 2020, 'film', 38700, '/y95lQLnuNKdPAzw9F9Ab8kJ80c3.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bad Boys: Ride or Die', 2024, 'film', 573435, '/oGythE98MYleE6mZlGs5oBGkux1.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Kingsman (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Kingsman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Secret Service', 2014, 'film', 207703, '/r6q9wZK5a2K51KFj4LWVID6Ja1r.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kingsman: The Golden Circle', 2017, 'film', 343668, '/34xBL6BXNYFqtHO9zhcgoakS4aP.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Argylle', 2024, 'film', 848538, '/siduVKgOnABO4WH4lOwPQwaGwJp.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dune (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dune' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Children of Dune', 2003, 'film', 1589362, '/fgFMlandKdOCNkaOoiGMUxUQxZW.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dune (2021)', 2021, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dune: Part Two', 2024, 'film', 693134, '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- French Connection (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'French Connection' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The French Connection', 1971, 'film', 1051, '/pH4saPwMjhnVGwmSH6RkMaHrt3s.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'French Connection II', 1975, 'film', 10711, '/55slIJqWAJSd8JdNnmq2oYlqBkX.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Popeye Doyle', 1986, 'film', 116214, '/30ZbqYZbED70vzuFaBmbGzs5mmW.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Maze Runner (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Maze Runner' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Maze Runner', 2014, 'film', 198663, '/ode14q7WtDugFDp78fo9lCsmay9.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maze Runner: The Scorch Trials', 2015, 'film', 294254, '/mYw7ZyejqSCPFlrT2jHZOESZDU3.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maze Runner: The Death Cure', 2018, 'film', 336843, '/drbERzlA4cuRWhsTXfFOY4mRR4f.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Captain Marvel (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Captain Marvel' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Captain Marvel', 2019, 'film', 299537, '/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ms. Marvel', 2022, 'film', 979160, '/aolMYjs6QWonQFlnRGvU3o5zeQH.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Marvels', 2023, 'film', 609681, '/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Pet Sematary (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Pet Sematary' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary', 1989, 'film', 8913, '/a1gIACZb04bL8EvLqMpofW2Eqeo.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary (2019)', 2019, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pet Sematary: Bloodlines', 2023, 'film', 830764, '/yqnNLn24shYnZ6kqGpbwuB3NJ0D.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Shazam (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Shazam' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam!', 2019, 'film', 287947, '/xnopI5Xtky18MPhK40cZAGAOVeV.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Black Adam', 2022, 'film', 436270, '/rCtreCr4xiYEWDQTebybolIh6Xe.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shazam! Fury of the Gods', 2023, 'film', 594767, '/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Fletch (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Fletch' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fletch', 1985, 'film', 9749, '/nKDnMvVynvj7lwdv1iAZO1DzTYn.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fletch Lives', 1989, 'film', 14628, '/A30iCFQVKXvQzGHEE4hyVC0QtrD.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Confess, Fletch', 2022, 'film', 724665, '/h2oyiPu7aql1s1mLDoKBNAH7p3B.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Suicide Squad (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Suicide Squad' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Birds of Prey', 2020, 'film', 495764, '/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Suicide Squad', 2021, 'film', 436969, '/q61qEyssk2ku3okWICKArlAdhBn.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Mortal Kombat (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Mortal Kombat' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat', 1995, 'film', 9312, '/fcK7tzSSXMYiMN8E9KlZJL1BYyp.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat: Annihilation', 1997, 'film', 9823, '/ttryglcY2osWZE3sRYBf3ewTZsW.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Mortal Kombat (2021)', 2021, 'film', 460465, '/ybrX94xQm8lXYpZAPRmwD9iIbWP.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Joker (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Joker' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Suicide Squad', 2016, 'film', 297761, '/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Joker', 2019, 'film', 475557, '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Zack Snyder''s Justice League', 2021, 'film', 791373, '/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Shining (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Shining' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shining (1980)', 1980, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shining (1997)', 1997, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doctor Sleep', 2019, 'film', 501170, '/p69QzIBbN06aTYqRRiCOY1emNBh.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- House of 1000 Corpses (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'House of 1000 Corpses' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'House of 1000 Corpses', 2003, 'film', 2662, '/29c2qgXmSREosLBevOILEuMWzQC.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Devil''s Rejects', 2005, 'film', 1696, '/drZz4AuI7trq6BxlH9Xa4v4O0Pb.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '3 From Hell', 2019, 'film', 489064, '/iaURDnsqwTpFdg7RuizUp0nI2I4.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Deadpool (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Deadpool' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'X-Men Origins: Wolverine', 2009, 'film', 2080, '/yj8LbTju1p7CUJg7US2unSBk33s.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool', 2016, 'film', 293660, '/3E53WEZJqP6aM84D8CckXx4pIHw.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Deadpool 2', 2018, 'film', 383498, '/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Tomb Raider (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Tomb Raider' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lara Croft: Tomb Raider', 2001, 'film', 1995, '/ye5h6fhfz8TkKV4QeuTucvFzxB9.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lara Croft: Tomb Raider - The Cradle of Life', 2003, 'film', 1996, '/ylIEGeAr2ygSClK4FDj9mi2Ah22.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tomb Raider', 2018, 'film', 338970, '/s4Qn5LF6OwK4rIifmthIDtbqDSs.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Creepshow (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Creepshow' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow', 1982, 'film', 16281, '/4SoyTCEpsgLjX6yAyMsx3AsAyRQ.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow 2', 1987, 'film', 16288, '/bbanIymLuTYmQGis9nlCkFlT1eg.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Creepshow 3', 2006, 'film', 16304, '/qvJSdbruD4e5cUxruoUFUkJrsqt.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Blair Witch (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Blair Witch' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Blair Witch Project', 1999, 'film', 2667, '/9050VGrYjYrEjpOvDZVAngLbg1f.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Book of Shadows: Blair Witch 2', 2000, 'film', 11531, '/l1jF93S9FYbzp3Byh5VUA1KApSJ.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blair Witch', 2016, 'film', 351211, '/Ai73frMEz68bibFGRlPKdWBaIaq.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Different Seasons (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Different Seasons' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Stand by Me', 1986, 'film', 235, '/vz0w9BSehcqjDcJOjRaCk7fgJe7.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Shawshank Redemption', 1994, 'film', 278, '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Apt Pupil', 1998, 'film', 9445, '/pU3fvfSvrs5pZFdODPCzoLk95Ws.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Human Centipede (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Human Centipede' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Human Centipede (First Sequence)', 2009, 'film', 37169, '/gMtjxIkEi0hnTV5lPHbgeZ4ZpUZ.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Human Centipede 2 (Full Sequence)', 2011, 'film', 74997, '/9YEUMnMhIjD5ek4zIqOhLSnTnJS.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Human Centipede 3 (Final Sequence)', 2015, 'film', 94365, '/xUk5AGcGvybPBvvMqrDPbAFAknD.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Before (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Before' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Before Sunrise', 1995, 'film', 76, '/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Before Sunset', 2004, 'film', 80, '/4sW5XH9ZfYXpvFzev00S1IGAEbg.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Before Midnight', 2013, 'film', 132344, '/qbGKJmNUroDz75kh5Oafoall89e.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ocean's 11 (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ocean''s 11' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ocean''s Eleven (2001)', 2001, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ocean''s Twelve', 2004, 'film', 163, '/pE5anFf7nf6ah7V3VRezQ1KSovi.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ocean''s Thirteen', 2007, 'film', 298, '/pBsZs4zYUiUTemqbikTZ76iQRaU.jpg', 30, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Sometimes They Come Back (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Sometimes They Come Back' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back', 1991, 'film', 27769, '/cJc0hUhtWmZzIeWc1k8CVpJFVbm.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back...Again', 1996, 'film', 27770, '/mBYsbLOpJP7MBapOy7gECD1ePlz.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sometimes They Come Back...for More', 1998, 'film', 27771, '/rQNVWiT6yoEZ2SNa29pXGdh3mK2.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Mangler (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Mangler' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler', 1995, 'film', 13559, '/vwRZOUzIX17luLM69sCC9meM9od.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler 2', 2001, 'film', 27345, '/eD7yhqDlVY53JA5eV0XbDI9Tbv2.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Mangler Reborn', 2005, 'film', 28660, '/3PGZbMTXafsnG1xIykCkyYWAPPm.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Salem's Lot (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Salem''s Lot' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Return to Salem''s Lot', 1987, 'film', 27740, '/sc3jWWodUIaofc176PlYUQzUslj.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '''Salem''s Lot (2004)', 2026, 'film', NULL, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Salem''s Lot (1979)', 2026, 'film', NULL, NULL, 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Riddick (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Riddick' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pitch Black', 2000, 'film', 2787, '/3AnlxZ5CZnhKKzjgFyY6EHxmOyl.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Chronicles of Riddick', 2004, 'film', 2789, '/bVO1r90diKfFLzvZ5D3qK6Z558O.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Riddick', 2013, 'film', 87421, '/pUul9pGWOKT7X0smkTvsIEIQxcP.jpg', 30, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Heroes (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Heroes' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tank Girl', 1995, 'film', 9067, '/dpX63vJd6k5fMTudLaEOw9ffX8h.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Constantine', 2005, 'film', 561, '/vPYgvd2MwHlxTamAOjwVQp4qs1W.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jonah Hex', 2010, 'film', 20533, '/b1BLIXEe9zzaFvuWdYGoeuhuh75.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Punisher (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Punisher' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (1989)', 1989, 'film', NULL, NULL, 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Punisher (2004)', 2004, 'film', NULL, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Punisher: War Zone', 2008, 'film', 13056, '/oOvKJgYUIpfswGHAdW6159bPbvM.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Lost Boys (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Lost Boys' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Lost Boys', 1987, 'film', 1547, '/nH1lvyQvfbL5GKScTtT6zkIvDEn.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lost Boys: The Tribe', 2008, 'film', 13489, '/9JNiL8IIvDTs1M4eFw8IUKmItKk.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lost Boys: The Thirst', 2010, 'film', 46812, '/sKeaELcJyoCFzU5QeiIhjbNagIN.jpg', 30, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Back to the Future (3 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Back to the Future' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Back to the Future', 1985, 'film', 105, '/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Back to the Future Part III', 1989, 'film', 196, '/crzoVQnMzIrRfHtQw0tLBirNfVg.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Back to the Future Part II', 1989, 'film', 165, '/YBawEsTkUZBDajKbd5LiHkmMGf.jpg', 30, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Edgar Wright (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Edgar Wright' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Baby Driver', 2017, 'film', 339403, '/tYzFuYXmT8LOYASlFCkaPiAFAl0.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Running Man (2025)', 2025, 'film', NULL, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Running Man (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Running Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Running Man (1987)', 1987, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Running Man (2025)', 2025, 'film', NULL, NULL, 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Tron (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Tron' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'TRON: Legacy', 2010, 'film', 20526, '/vuifSABRpSnxCAOxEnWpNbZSXpp.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'TRON: Ares', 2025, 'film', 533533, '/chpWmskl3aKm1aTZqUHRCtviwPy.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Rose Red (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Rose Red' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rose Red', 2002, 'film', 1368089, '/4ob9XDtA0xrR79ua0F7UeVDCxMY.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Diary of Ellen Rimbauer', 2003, 'film', 16175, '/fjTzrF9m2hC8OF4Q1umM5CPoeK9.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nobody (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nobody' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nobody', 2021, 'film', 615457, '/oBgWY00bEFeZ9N25wWVyuQddbAo.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nobody 2', 2025, 'film', 1007734, '/iyxwxDZCpIm0vIORaHpmgJv2BGF.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Jack Reacher (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Jack Reacher' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jack Reacher', 2012, 'film', 75780, '/uQBbjrLVsUibWxNDGA4Czzo8lwz.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Jack Reacher: Never Go Back', 2016, 'film', 343611, '/cOg3UT2NYWHZxp41vpxAnVCOC4M.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ouija Series (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ouija Series' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ouija', 2014, 'film', 242512, '/gwjHlGjK2xXKpjd65BWyAMwzTWC.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ouija: Origin of Evil', 2016, 'film', 335796, '/gwynHc2RrOFaplYMMpQRpr3TIA4.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Gladiator (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Gladiator' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gladiator', 2000, 'film', 98, '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gladiator II', 2024, 'film', 558449, '/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Twister (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Twister' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twister', 1996, 'film', 664, '/d4ie3f6QTvNw40V770Uzo87SDZn.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twisters', 2024, 'film', 718821, '/pjnD08FlMAIXsfOLKQbvmO0f0MD.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Speed (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Speed' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Speed', 1994, 'film', 1637, '/82PkCE4R95KhHICUDF7G4Ly2z3l.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Speed 2: Cruise Control', 1997, 'film', 1639, '/gnK1ocpwUTj24zAktzomOJsD2bu.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Fugitive (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Fugitive' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Fugitive', 1993, 'film', 5503, '/b3rEtLKyOnF89mcK75GXDXdmOEf.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'U.S. Marshals', 1998, 'film', 11808, '/5ST0BydDSXtW5AtfDDhTVS13pTt.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Chinatown (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Chinatown' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Chinatown', 1974, 'film', 829, '/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Two Jakes', 1990, 'film', 32669, '/49DSKcjPUdLjzyMpf8OIKep0cLN.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Basic Instinct (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Basic Instinct' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Basic Instinct', 1992, 'film', 402, '/76Ts0yoHk8kVQj9MMnoMixhRWoh.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Basic Instinct 2', 2006, 'film', 3093, '/yNRSbx6AhOlW673t2073Wr2iH4U.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Nightmares and Dreamscapes (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Nightmares and Dreamscapes' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Quicksilver Highway', 1997, 'film', 26215, '/ktKeyB6yNo81wD60NxZvb7f1nZz.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Nightmares & Dreamscapes', 2006, 'film', NULL, NULL, 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- American Psycho (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'American Psycho' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'American Psycho', 2000, 'film', 1359, '/9uGHEgsiUXjCNq8wdq4r49YL8A1.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'American Psycho II: All American Girl', 2002, 'film', 10726, '/mYBvrIV78mckZGdT5gpHtXOKVc2.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- The Haunting (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'The Haunting' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Haunting (1963)', 1963, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Haunting (1999)', 1999, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Straw Dogs (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Straw Dogs' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Straw Dogs (1971)', 1971, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Straw Dogs (2011)', 2011, 'film', NULL, NULL, 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dead Rising (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dead Rising' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dead Rising: Watchtower', 2015, 'film', 293771, '/95gMn5GwR6rPHmmHfDyEs0pO2U7.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Dead Rising: Endgame', 2016, 'film', 400605, '/yQZCTiMWnXNTeKtnBAOmGdUT0rf.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Coming to America (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Coming to America' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Coming To America', 1988, 'film', 9602, '/8YZiA1o264dk0cr1USyMdph6SZl.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Coming 2 America', 2021, 'film', 484718, '/nWBPLkqNApY5pgrJFMiI9joSI30.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- The Stand (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'The Stand' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Stand', 1994, 'film', 235, '/vz0w9BSehcqjDcJOjRaCk7fgJe7.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Stand (2020)', 2020, 'film', NULL, NULL, 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Bloodrayne (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Bloodrayne' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bloodrayne', 2005, 'film', 168705, '/1Xy9uu5INNMnyF7W6BTEQkkGOZC.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bloodrayne: The Third Reich', 2010, 'film', 12685, '/kS48eBvmVXtNJGXWW5QMQmm1JbO.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- 48 Hours (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = '48 Hours' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '48 Hrs.', 1982, 'film', 150, '/rvvjXHzEDBIvIVDBHNOwHS7hVPu.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Another 48 Hours', 1990, 'film', 11595, '/ixeygHHDsuzsg67H1IPTc3Qp8cR.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- The Craft (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'The Craft' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Craft', 1996, 'film', 9100, '/8bW2RdRkloYtEPhbQZN4wcdmJP4.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Craft: Legacy', 2020, 'film', 590995, '/lhMIra0pqWNuD6CIXoTmGwZ0EBS.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Manchurian Candidate (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Manchurian Candidate' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Manchurian Candidate (1962)', 1962, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Manchurian Candidate (2004)', 2004, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Escape From (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Escape From' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Escape from New York', 1981, 'film', 1103, '/vH9llaphjAssRGi0k7e75tD40Ce.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Escape from L.A.', 1996, 'film', 10061, '/3L9lL2eUsmLNNfENPwNOc82Hzpw.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Andromeda Strain (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Andromeda Strain' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Andromeda Strain (1971)', 1971, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Andromeda Strain (2008)', 2008, 'film', NULL, NULL, 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dungeon Siege (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dungeon Siege' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'In the Name of the King: A Dungeon Siege Tale', 2007, 'film', 2312, '/bbN1lmDk1PT0GsTFCy179sk5nIF.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'In the Name of the King 2: Two Worlds', 2011, 'film', 80410, '/kM9hjeGLtPZi9ExuBVwIFYrQbx0.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- It (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'It' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'It (2017)', 2017, 'film', 662365, '/obgf4HSkIkYZnrjLCKiWTeDwj8p.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'It (1990)', 2026, 'film', 61755, '/w8s5YdbaXmlaXYaumDxbsuCL3c0.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Angry Birds (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Angry Birds' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Angry Birds Movie', 2016, 'film', 153518, '/iOH0fEFtV9z9rZp9zmBFGGeWicv.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Angry Birds Movie 2', 2019, 'film', 454640, '/fKk4bfnouKEY5iPzYDMcVmtgDEy.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Hitman (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Hitman' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hitman', 2007, 'film', 1620, '/h69UJOOKlrHcvhl5H2LY74N61DQ.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Hitman: Agent 47', 2015, 'film', 249070, '/cx9AOBOv9Qf5ufZYQMbfTV7w7VY.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wreck-It Ralph (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wreck-It Ralph' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wreck-It Ralph', 2012, 'film', 82690, '/zWoIgZ7mgmPkaZjG0102BSKFIqQ.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ralph Breaks the Internet', 2018, 'film', 404368, '/iVCrhBcpDaHGvv7CLYbK6PuXZo1.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Incredibles (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Incredibles' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Incredibles', 2004, 'film', 9806, '/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Incredibles 2', 2018, 'film', 260513, '/9lFKBtaVIhP7E2Pk0IY1CwTKTMZ.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Stephen Spielberg (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Stephen Spielberg' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Minority Report', 2002, 'film', 180, '/ccqpHq5tk5W4ymbSbuoy4uYOxFI.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ready Player One', 2018, 'film', 333339, '/pU1ULUq8D3iRxl1fdX2lZIzdHuI.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Pacific Rim (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Pacific Rim' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pacific Rim', 2013, 'film', 68726, '/8wo4eN8dWKaKlxhSvBz19uvj8gA.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Pacific Rim: Uprising', 2018, 'film', 268896, '/nFWhttU8PM50t25NPdy7PE7rv3G.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Street Fighter (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Street Fighter' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Street Fighter', 1994, 'film', 11667, '/6yh95dD2Y6uWAlPfWCZZygBM1ec.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Street Fighter: The Legend of Chun-Li', 2009, 'film', 15268, '/lbNemoc9bRIAIVck0e2cv1cgftN.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- The Room Tommy Wiseau (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'The Room Tommy Wiseau' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Room', 2003, 'film', 17473, '/9QscHN4pXj6Ja1k7e1ZT4vWDGnr.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Disaster Artist', 2017, 'film', 371638, '/2HuLGiyH0TPYxnCvYHAxc8K738o.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Blade Runner (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Blade Runner' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade Runner', 1982, 'film', 78, '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Blade Runner 2049', 2017, 'film', 335984, '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Trainspotting (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Trainspotting' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Trainspotting', 1996, 'film', 627, '/y0HmDV0bZDTtXWHqqYYbT9XoshB.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'T2: Trainspotting', 2017, 'film', 180863, '/xlbpCwa9OXXIiNgXcwuompHFIk9.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Twin Peaks (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Twin Peaks' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twin Peaks', 1990, 'film', 1062861, '/1JhPNmu1cmkqltUnkQll5o1YmPy.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Twin Peaks: Fire Walk with Me', 1992, 'film', 1923, '/mxsGXqetGnirf99qapYd5MMY1VL.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Sinister (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Sinister' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sinister', 2012, 'film', 82507, '/nzx10sca3arCeYBAomHan4Q6wa1.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Sinister 2', 2015, 'film', 283445, '/hF6ORyihtAWHqKkIQI8BSpLQyON.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Short Circuit (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Short Circuit' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Short Circuit', 1986, 'film', 2605, '/e3eimdUK6lLe0iaSlLrYVQF3yeL.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Short Circuit 2', 1988, 'film', 11966, '/vXzkNsPEA59EON5PMVXsURe8o67.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- The Spirit (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'The Spirit' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (1987)', 1987, 'film', NULL, NULL, 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Spirit (2008)', 2008, 'film', 14092, '/5ngIhoA0b4aGBoPFPURAbDwCKT7.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Machete (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Machete' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Machete', 2010, 'film', 23631, '/dcPSm1rGEFdiEc7DaKz0t5kb66b.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Machete Kills', 2013, 'film', 106747, '/3i4UgSZmAJXt6Euy5azvknmzsm9.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Maniac (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Maniac' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maniac (1980)', 1980, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maniac (2012)', 2012, 'film', NULL, NULL, 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Trucks (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Trucks' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Maximum Overdrive', 1986, 'film', 9980, '/8pGYesuatPnMS8lhS4NvwiDjKbG.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Trucks', 2000, 'film', 1122766, '/mKy0O9kizS0k00woeEgdlYAHAha.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Lawnmower Man (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Lawnmower Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Lawnmower Man', 1992, 'film', 10163, '/aDACpFww9vkeyYOj5xrfJuxoQdK.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Lawnmower Man 2: Beyond Cyberspace', 1996, 'film', 11525, '/aP8eGsCyZVCHgSMxhDa4KiC7H9B.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- David Fincher (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'David Fincher' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fight Club', 1999, 'film', 550, '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Social Network', 2010, 'film', 37799, '/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Night Shift (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Night Shift' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Cat''s Eye', 1985, 'film', 10552, '/AtSRmjEYUASsXfrEJrqF2oYEbFe.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Graveyard Shift', 1990, 'film', 19158, '/jrb0BhhtzwM3K55Vo0kLdtDqJks.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Gremlins (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Gremlins' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gremlins', 1984, 'film', 927, '/6m0F7fsXjQvUbCZrPWcJNrjvIui.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Gremlins 2', 1990, 'film', 928, '/35F5yD7MljvBE2AC0NHAVCoPGEi.jpg', 20, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Swamp Thing (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Swamp Thing' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Swamp Thing', 1982, 'film', 17918, '/7BGaE9A7UeyxH29aeFbQfzEmIi0.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Return of Swamp Thing', 1989, 'film', 19142, '/5sm1Yi1hgj805b9o2a1uC6BXhqw.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Fright Night (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Fright Night' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fright Night', 1985, 'film', 11797, '/euIh75MwNDrYkTEVSkw7VXWGXoE.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Fright Night 2: New Blood', 2013, 'film', 214597, '/3Is5G28YLNKq22n5Ee2yTmYA3m6.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Kick-Ass (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Kick-Ass' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass', 2010, 'film', 23483, '/iHMbrTHJwocsNvo5murCBw0CwTo.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Kick-Ass 2', 2013, 'film', 59859, '/1go2A3gdQjaMuHWquybgoJlQRcX.jpg', 20, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- RED (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'RED' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED', 2010, 'film', 39514, '/8eeK3OB5PeSRQD7BpZcGZKkehG.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'RED 2', 2013, 'film', 146216, '/tbksijr6g340yFWRgI4JfwrtM9h.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ghost Rider (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ghost Rider' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider', 2007, 'film', 1250, '/1pyU94dAY7npDQCKuxCSyX9KthN.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ghost Rider: Spirit of Vengeance', 2011, 'film', 71676, '/fDtIZXLNreDHk3mOskJYABrQNOQ.jpg', 20, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- X-Files (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'X-Files' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The X-Files: Fight the Future', 1998, 'film', 1267419, '/2bHJ7A28q3KytS5nKAmYHtEnGIo.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The X Files: I Want to Believe', 2008, 'film', 8836, '/3zQMhutUMJP6lK49x7i2YfsOHL9.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Alien (2 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Alien' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'AVP: Alien vs. Predator', 2004, 'film', 395, '/ySWu5bCnnmgV1cVacvFnFIhgOjp.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Aliens vs. Predator: Requiem', 2007, 'film', 440, '/5iTwPDNtvK6ZZF607BHBbU3HO0B.jpg', 20, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- 300 (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = '300' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '300: Rise of an Empire', 2014, 'film', 53182, '/wYDdWN1McB1Sio4z1dPSkb40Z78.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Five Nights at Freddy's (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Five Nights at Freddy''s' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Five Nights at Freddy''s 2', 2025, 'film', 1228246, '/udAxQEORq2I5wxI97N2TEqdhzBE.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Universe (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Universe' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Superman (2025)', 2025, 'film', NULL, NULL, 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Minecraft (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Minecraft' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'A Minecraft Movie', 2025, 'film', 950387, '/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Battleship (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Battleship' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Battleship', 2012, 'film', 44833, '/9b0Im7SfedHiajTwzSL9zGyBI7M.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Thanksgiving (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Thanksgiving' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Thanksgiving', 2023, 'film', 1071215, '/f5f3TEVst1nHHyqgn7Z3tlwnBIH.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Town That Dreaded Sundown (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Town That Dreaded Sundown' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Town That Dreaded Sundown', 1976, 'film', 48197, '/sI6kUePh4S3T1rDozPR0Etg7E8X.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- DC Superpets (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'DC Superpets' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'DC League of Super-Pets', 2022, 'film', 539681, '/qpPMewlugFaejXjz4YNDnpTniFX.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Uncharted (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Uncharted' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Uncharted', 2022, 'film', 335787, '/rJHC1RUORuUhtfNb4Npclx0xnOf.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- My Bloody Valentine (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'My Bloody Valentine' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'My Bloody Valentine (1981)', 1981, 'film', NULL, NULL, 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Shang-Chi (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Shang-Chi' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Shang Chi and the Legend of the Ten Rings', 2021, 'film', 566525, '/d08HqqeBQSwN8i8MEvpsZ8Cb438.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Army of the Dead (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Army of the Dead' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Army of the Dead', 2021, 'film', 503736, '/gCIsRxzcxvmuLYeAvWgoOuSxszF.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Bill & Ted (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Bill & Ted' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Bill & Ted''s Excellent Adventure', 1989, 'film', 1648, '/tV25lGWGWGEqUe3U0xjQTBgilSx.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Doom (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Doom' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Doom: Annihilation', 2019, 'film', 520901, '/b7pEmwnayMZCVlnSq33izWcOlPI.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Happy Death Day (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Happy Death Day' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Happy Death Day', 2017, 'film', 440021, '/cTaEIUYTt52ooq9quVbAQ7NpGwo.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- House of the Dead (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'House of the Dead' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'House of the Dead', 2003, 'film', 11059, '/4x337Nt4cq6OO1Rb3HDvUofT9F0.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Warcraft (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Warcraft' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Warcraft', 2016, 'film', 68735, '/nZIIOs06YigBnvmlJ2hxZeA8eTO.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Teen Titans (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Teen Titans' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Teen Titans GO! To the Movies', 2018, 'film', 474395, '/mFHihhE9hlvJEk2f1AqdLRaYHd6.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Need for Speed (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Need for Speed' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Need For Speed', 2014, 'film', 136797, '/45D153Bk0bNwonV1w5IBBvqssPV.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Alone in the Dark (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Alone in the Dark' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Alone in the Dark', 2005, 'film', 12142, '/bSxrbVCyWW077zhtpuYlo3zgyug.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wing Commander (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wing Commander' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wing Commander', 1999, 'film', 10350, '/e3p2vkA4mnFaBlyAIntkZWkzOJW.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Prince of Persia (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Prince of Persia' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Prince of Persia: The Sands of Time', 2010, 'film', 9543, '/siNGMLdOUNYLEGtlsnmQcpO2XZX.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Final Fantasy (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Final Fantasy' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Final Fantasy: The Spirits Within', 2001, 'film', 2114, '/47b1EwFqqSWxYna7NtUM7iML4oT.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Rampage (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Rampage' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Rampage', 2018, 'film', 427641, '/MGADip4thVSErP34FAAfzFBTZ5.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ready Player One (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ready Player One' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ready Player One', 2018, 'film', 333339, '/pU1ULUq8D3iRxl1fdX2lZIzdHuI.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Mario (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Mario' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Super Mario Bros.', 1993, 'film', 9607, '/yt5bbMfKpg1nRr4k5edxs7tPK2m.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Total Recall (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Total Recall' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Total Recall (2012)', 2012, 'film', NULL, NULL, 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dark Tower (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dark Tower' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dark Tower', 2017, 'film', 353491, '/i9GUSgddIqrroubiLsvvMRYyRy0.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Wild at Heart (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Wild at Heart' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Wild at Heart', 1990, 'film', 483, '/uLUFI5sJIfWrBUWB2Y1dEuyvvVy.jpg', 10, '{"up": 2, "down": 1, "label": "mostly_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Ferris Bueller (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Ferris Bueller' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Ferris Bueller''s Day Off', 1986, 'film', 9377, '/9LTQNCvoLsKXP0LtaKAaYVtRaQL.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Tales From the Darkside (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Tales From the Darkside' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Tales from the Darkside: The Movie', 1990, 'film', 20701, '/5q8WK4gW45Knxhpb29IVOCbbfI7.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Cujo (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Cujo' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Cujo', 1983, 'film', 10489, '/uNBt2YxrQdyOjnm2rDQ5QiCmQ0K.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Watchmen (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Watchmen' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Watchmen', 2009, 'film', 13183, '/u0ROjy3KPzMDTipqCrwD8LwkKSQ.jpg', 10, '{"up": 0, "down": 3, "label": "all_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- He-Man (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'He-Man' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Masters of the Universe', 1987, 'film', 11649, '/gaUecXFd31V68yOTJPJYaB9YhAf.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Firestarter (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Firestarter' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Firestarter', 1984, 'film', 11495, '/2ux5lqNuibd8eOkwwUhzfzAJBqD.jpg', 10, '{"up": 1, "down": 2, "label": "mostly_down", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Dead Zone (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Dead Zone' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'The Dead Zone', 1983, 'film', 11336, '/9yTVaeS8eIkOpbwIycVFm7EQrgF.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- Big Hero 6 (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = 'Big Hero 6' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, 'Big Hero 6', 2014, 'film', 177572, '/2mxS4wUimwlLmI1xp6QW6NSU361.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;


  -- 2001 and 2010 (1 episodes)
  SELECT id INTO sid FROM community_miniseries
    WHERE community_id = cid AND title = '2001 and 2010' AND tab_key = 'filmography';

  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)
  VALUES (sid, '2001: A Space Odyssey', 1968, 'film', 62, '/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg', 10, '{"up": 3, "down": 0, "label": "all_up", "hosts": []}')
  ON CONFLICT DO NOTHING;

END $$;

-- ═══ NO SERIES (213 individual reviews) ═══
-- Intermission #1 - Fall of the Alamo (?) tmdb:? verdict:?
-- The Bride (1985) (?) tmdb:? verdict:?
-- Dracula (2025) (?) tmdb:? verdict:?
-- Silent Night, Deadly Night (2025) (?) tmdb:? verdict:?
-- Frankenstein (2025) (?) tmdb:? verdict:?
-- Marvel Zombies (2008) tmdb:1406088 verdict:?
-- Book Review: I Know What You Did Last Summer by Lois Duncan (?) tmdb:? verdict:?
-- Apollo 13 (1995) tmdb:568 verdict:all_up
-- Sinners (2025) tmdb:1233413 verdict:all_up
-- Dungeons & Dragons (2000) (?) tmdb:? verdict:?
-- Clue (1985) (1985) tmdb:15196 verdict:?
-- 300 Review (?) tmdb:? verdict:?
-- Book Review: Hollywood Monster: A Walk Down Elm Street with the Man of Your Dreams by Robert Englund and Adam Goldsher (?) tmdb:? verdict:?
-- Salem's Lot (2024) (?) tmdb:? verdict:?
-- Joker: Folie à Deux (2024) tmdb:889737 verdict:?
-- The Green Inferno (2013) tmdb:171424 verdict:mostly_up
-- Cannibal Holocaust (1980) tmdb:8689 verdict:mostly_down
-- Deadpool and Wolverine (2024) tmdb:533535 verdict:?
-- Echo (2024) (?) tmdb:? verdict:?
-- Book Review: Chapterhouse: Dune (?) tmdb:? verdict:?
-- Book Review: Heretics of Dune by Frank Herbert (?) tmdb:? verdict:?
-- Book Review: God Emperor of Dune (?) tmdb:? verdict:?
-- Disturbia (2007) tmdb:8271 verdict:mostly_up
-- Body Double (1984) tmdb:11507 verdict:all_up
-- Rear Window (1954) (?) tmdb:? verdict:?
-- Ghost of Frankenstein (1942) tmdb:3074 verdict:?
-- Frankenstein (1931) (?) tmdb:? verdict:?
-- Watchmen (2019) (?) tmdb:? verdict:?
-- Five Nights at Freddy’s (2025) tmdb:1228246 verdict:?
-- The Town That Dreaded Sundown (2014) (?) tmdb:? verdict:?
-- Insidious: The Red Door (2023) tmdb:614479 verdict:?
-- The Flash (2023) (?) tmdb:? verdict:?
-- Guardians of the Galaxy Vol. 3 (2023) tmdb:447365 verdict:?
-- The Super Mario Bros. Movie (2023) (?) tmdb:? verdict:?
-- Bram Stoker’s Dracula (1992) tmdb:6114 verdict:?
-- Dracula (1979) (?) tmdb:? verdict:?
-- Dracula’s Daughter (1936) tmdb:22440 verdict:?
-- Dracula (1931) (?) tmdb:? verdict:?
-- Nosferatu (1922) (?) tmdb:? verdict:?
-- Collateral Damage (2002) tmdb:9884 verdict:all_down
-- Werewolf by Night Spoiler Review (?) tmdb:? verdict:?
-- The 6th Day (2000) tmdb:8452 verdict:mostly_down
-- End of Days (1999) tmdb:9946 verdict:mostly_down
-- Eraser (1996) tmdb:9268 verdict:all_down
-- True Lies (1994) tmdb:36955 verdict:all_up
-- Last Action Hero (1993) tmdb:9593 verdict:mostly_down
-- Red Heat (1988) tmdb:9604 verdict:mostly_down
-- Raw Deal (1986) tmdb:2099 verdict:all_down
-- Commando (1985) tmdb:10999 verdict:mostly_up
-- Prey Movie Review (?) tmdb:? verdict:?
-- Underdog (2007) tmdb:6589 verdict:mostly_down
-- Book Review: Midnight Sun by Stephenie Meyer (?) tmdb:? verdict:?
-- Book Review: Breaking Dawn by Stephenie Meyer (?) tmdb:? verdict:?
-- Book Review: Eclipse by Stephenie Meyer (?) tmdb:? verdict:?
-- Book Review: New Moon by Stephenie Meyer (?) tmdb:? verdict:?
-- Book Review: Twilight by Stephanie Meyer (?) tmdb:? verdict:?
-- Firestarter (2022) (2022) tmdb:532710 verdict:?
-- Dr. Strange In the Multiverse of Madness (2022) tmdb:453395 verdict:?
-- The Unbearable Weight of Massive Talent (2022) tmdb:648579 verdict:all_up
-- The Rock (1996) tmdb:9802 verdict:mostly_up
-- Assassin’s Creed (2016) tmdb:121856 verdict:?
-- My Bloody Valentine 3D (2009) tmdb:14435 verdict:?
-- The Night Flier (Stephen King Series) (?) tmdb:? verdict:?
-- The King’s Man (2021) tmdb:476669 verdict:?
-- Dolan’s Cadillac (2009) tmdb:19823 verdict:?
-- The Martian (2015) tmdb:286217 verdict:all_up
-- The Right Stuff (1983) tmdb:9549 verdict:all_up
-- Loki (Season 1) (?) tmdb:? verdict:?
-- The Haunting of Hill House (2018) The Haunting of Hill House (2018) (?) tmdb:? verdict:?
-- The Green Knight (2021) tmdb:559907 verdict:all_up
-- Like A Dragon (2007) tmdb:28796 verdict:?
-- F9 - The Fast Saga (2021) tmdb:385128 verdict:?
-- Without Remorse (?) tmdb:1280790 verdict:?
-- Bloodrayne: Deliverance (2007) tmdb:17456 verdict:?
-- Tremors Bonus: Michael Gross **SPOILER** Interview (?) tmdb:? verdict:?
-- Tremors II: Aftershocks (1996) tmdb:11069 verdict:?
-- Tremors (1990) (?) tmdb:? verdict:?
-- The Last House on the Left (1972) - Podcast Announcement and Warning (?) tmdb:? verdict:?
-- Bill and Ted Face The Music (2020) tmdb:501979 verdict:?
-- Bill and Ted’s Bogus Journey (1991) tmdb:1649 verdict:?
-- Clear & Present Danger (1994) tmdb:9331 verdict:?
-- The Breakfast Club -- Our *1,000th* movie review podcast! (?) tmdb:? verdict:?
-- Dr. Strangelove (or How I Learned to Stop Worrying and Support Podcasts) (?) tmdb:? verdict:?
-- In the Name of the King 3: The Last Mission (2014) tmdb:252360 verdict:?
-- The Rise of Skywalker (2019) tmdb:181812 verdict:?
-- Black Christmas (2019) (?) tmdb:? verdict:?
-- Son of Kong (1933) tmdb:43149 verdict:?
-- Trick or Treat! Put a donation in Now Playing's bag and get treated with our ZOMBIELAND 2 review! (?) tmdb:? verdict:?
-- Now Playing's ZOMBIELAND Review -- Available now! (?) tmdb:? verdict:?
-- It: Chapter 2 (2022) tmdb:587412 verdict:?
-- Spider-Man: Far From Home Movie Review (?) tmdb:? verdict:?
-- John Wick Chapter 3: Parabellum (2019) tmdb:458156 verdict:?
-- Pokemon 3: The Movie (Entei – Spell of the Unown) (2000) tmdb:10991 verdict:?
-- Happy Death Day 2 U (?) tmdb:? verdict:?
-- Groundhog Day (1993) tmdb:137 verdict:all_up
-- Leprechaun Returns - Behind the Scenes Interviews (?) tmdb:? verdict:?
-- Locke (2014) tmdb:210479 verdict:all_up
-- Face/Off (1997) tmdb:754 verdict:mostly_up
-- Hereditary (2018) tmdb:493922 verdict:all_up
-- House of the Dead II (2006) tmdb:29293 verdict:?
-- D.O.A. - Dead Or Alive (2006) tmdb:9053 verdict:?
-- Tekken 2: Kazuya's Revenge (Movie Review) (?) tmdb:? verdict:?
-- Tekken (2009) Movie Review (?) tmdb:? verdict:?
-- Mission: Impossible -- Fallout (Podcast Review) (?) tmdb:? verdict:?
-- It Came From the Desert (Movie Review) (?) tmdb:? verdict:?
-- Alone in the Dark II (Movie Review) (?) tmdb:? verdict:?
-- Ocean's 8 (2018) tmdb:402900 verdict:?
-- Doom (2005) (?) tmdb:? verdict:?
-- Death Wish (2018) (?) tmdb:? verdict:?
-- The Last Jedi (2017) tmdb:181808 verdict:?
-- 12 Monkeys (1995) tmdb:63 verdict:?
-- Leatherface (2017) (2017) tmdb:300665 verdict:?
-- Bloody Birthday (1981) tmdb:55538 verdict:mostly_down
-- Happy Birthday to Me (1981) tmdb:37936 verdict:mostly_down
-- Bad Boys 2 (2005) tmdb:1268838 verdict:?
-- Wonder Woman (1975) Bonus Episode: Soundtrack Interview with Neil S. Bulk (?) tmdb:? verdict:?
-- Wonder Woman (2017) (2017) tmdb:297762 verdict:?
-- Wonder Woman (1974) (?) tmdb:? verdict:?
-- Guardians of the Galaxy Vol. 2 (2017) tmdb:283995 verdict:?
-- Dance With the Devil (Perdita Durango) (1997) tmdb:9845 verdict:?
-- Chopping Mall -- Interviews with director Jim Wynorski and writer Steve Mitchell (?) tmdb:? verdict:?
-- Dune (2000) (2005) tmdb:285832 verdict:?
-- Dune (1984) (2017) tmdb:276563 verdict:?
-- Rob Zombie's 31 (?) tmdb:? verdict:?
-- Pet Sematary Two (1992) tmdb:10906 verdict:?
-- Ferris Bueller's Day Off - 30th Anniversary Soundtrack (?) tmdb:? verdict:?
-- Interview: Lea Thompson and Ed Gale -- Howard the Duck 30th Anniversary (?) tmdb:? verdict:?
-- The Last Starfighter (1984) tmdb:11884 verdict:mostly_up
-- Stardust (2007) tmdb:2270 verdict:all_down
-- Princess Mononoke (1997) tmdb:128 verdict:all_up
-- Hobo with a Shotgun (2011) tmdb:49010 verdict:all_up
-- Star Wars Holiday Special (1978) tmdb:74849 verdict:?
-- The Force Awakens (2015) tmdb:140607 verdict:?
-- The Clone Wars (2008) tmdb:12180 verdict:?
-- Revenge of the Sith (2005) tmdb:1895 verdict:?
-- Attack of the Clones (2002) tmdb:1894 verdict:?
-- The Phantom Menace (2020) tmdb:661852 verdict:?
-- It Follows (2015) tmdb:270303 verdict:all_up
-- The Ewok Adventure (Caravan of Courage) (1984) tmdb:1884 verdict:?
-- Fantastic Four (2015) (2015) tmdb:166424 verdict:?
-- Firestarter: Rekindled (?) tmdb:1580222 verdict:?
-- Steven Spielberg's Duel (?) tmdb:? verdict:?
-- Fast &amp; Furious 6 (?) tmdb:? verdict:?
-- Fast and Furious (1939) tmdb:169822 verdict:?
-- Boyhood (2014) tmdb:85350 verdict:mostly_up
-- Willow (1988) tmdb:847 verdict:all_down
-- Ocean's 11 (1960) (?) tmdb:? verdict:?
-- Plastic Galaxy: The Story of Star Wars Toys (2014) tmdb:253150 verdict:all_up
-- Memento - Chronological Review (?) tmdb:? verdict:?
-- Memento - Reversed Review (?) tmdb:? verdict:?
-- 2010: The Year We Make Contact (1984) tmdb:4437 verdict:?
-- The Night Shift Collection: The Woman in the Room, The Boogeyman, and Disciples of the Crow (?) tmdb:? verdict:?
-- Drag Me to Hell (2009) tmdb:16871 verdict:mostly_up
-- Die Hard 2: Die Harder (1990) tmdb:1573 verdict:?
-- New Year's Evil (1980) tmdb:69165 verdict:mostly_down
-- License to Kill (1986) tmdb:48733 verdict:?
-- Trick 'R' Treat (2007) tmdb:23202 verdict:mostly_down
-- The Cabin in the Woods (2012) tmdb:22970 verdict:all_up
-- Spider-Man (1977) (?) tmdb:? verdict:?
-- Batman &amp; Robin (?) tmdb:? verdict:?
-- Thor (2011) (2011) tmdb:10195 verdict:?
-- Hulk (2003) (?) tmdb:? verdict:?
-- The Return of the Incredible Hulk (Death in the Family) (1977) tmdb:166890 verdict:?
-- Dr. Strange (1978) (?) tmdb:? verdict:?
-- Silence of the Lambs (2022) tmdb:1064810 verdict:?
-- Fright Night (2011) (?) tmdb:? verdict:?
-- Fright Night Part II (1988) tmdb:18086 verdict:?
-- Cowboys & Aliens (2011) tmdb:49849 verdict:all_down
-- Green Lantern Review (?) tmdb:? verdict:?
-- Transformers: The Movie (1986) tmdb:1857 verdict:?
-- X2: X-Men United (2003) tmdb:36658 verdict:?
-- Book Review: Jaws The Revenge by Hank Searls (?) tmdb:? verdict:?
-- Book Review: Healers and Hunters (WARS: The Battle of Phobos - Earthers, Part 1 of 3) by Nathan P. Butler (?) tmdb:? verdict:?
-- Book Review: Jaws by Peter Benchley (?) tmdb:? verdict:?
-- Book Review: Howard the Duck by Ellis Weiner (?) tmdb:? verdict:?
-- Broadway Review: Spider-Man Turn Off the Dark (?) tmdb:? verdict:?
-- Book Review: Adjustment Team by Philip K. Dick (?) tmdb:? verdict:?
-- Book Review: The Golden Man by Philip K. Dick (?) tmdb:? verdict:?
-- Next (2007) (?) tmdb:? verdict:?
-- Book Review: A Scanner Darkly by Philip K. Dick (?) tmdb:? verdict:?
-- Book Review: Paycheck by Philip K. Dick (?) tmdb:? verdict:?
-- Book Review: The Minority Report by Philip K Dick (?) tmdb:? verdict:?
-- Book Review: Impostor by Philip K. Dick (?) tmdb:? verdict:?
-- Book Review: Second Variety by Philip K. Dick (?) tmdb:? verdict:?
-- Book Review: We Can Remember It For You Wholesale by Philip K. Dick (?) tmdb:? verdict:?
-- Total Recall (1990) (?) tmdb:? verdict:?
-- Book Review: Do Androids Dream of Electric Sheep? by Philip K. Dick (?) tmdb:? verdict:?
-- Black Christmas (2006) (?) tmdb:? verdict:?
-- Black Christmas (1974) (?) tmdb:? verdict:?
-- Tron (1982) (?) tmdb:? verdict:?
-- Interview with First Blood author David Morrell (?) tmdb:? verdict:?
-- Book Review: Rambo 3 by David Morrell (?) tmdb:? verdict:?
-- Book Review: Rambo - First Blood Part II by David Morrell (?) tmdb:? verdict:?
-- Book Review: First Blood by David Morrell (?) tmdb:? verdict:?
-- Texas Chainsaw Massacre: The Next Generation (The Return of the Texas Chainsaw Massacre) (1995) tmdb:16780 verdict:?
-- Scott Pilgrim vs. the World (2010) tmdb:22538 verdict:all_up
-- Nightmare on Elm Street Bonus Interviews: Heather Langenkamp and Robert Englund (?) tmdb:? verdict:?
-- Freddy vs. Jason (Freddy's Side) (?) tmdb:? verdict:?
-- New Nightmare (aka Wes Craven's New Nightmare) (?) tmdb:? verdict:?
-- A Nightmare on Elm Street 5: The Dream Child (1989) tmdb:10160 verdict:?
-- A Nightmare on Elm Street (1984) (?) tmdb:? verdict:?
-- Book Review: George Lucas’s Blockbusting edited by Alex Ben Block and Lucy Autrey Wilson (?) tmdb:? verdict:?
-- Book Review: Under the Dome by Stephen King (?) tmdb:? verdict:?
-- Book Review: Indiana Jones and the Army of the Dead by Steve Perry (?) tmdb:? verdict:?
-- Saw (2004) (?) tmdb:? verdict:?
-- Book Review: No Doors, No Windows by Joe Screiber (?) tmdb:? verdict:?
-- Book Review: Infected by Scott Sigler (?) tmdb:? verdict:?
-- Book Review: Iron Man: Femmes Fatales by Robert Greenberger (?) tmdb:? verdict:?
-- Book Review: A Walk Through the Book of Matthew by Jamie Estes (?) tmdb:? verdict:?
-- Friday the 13th Series Wrap-Up (?) tmdb:? verdict:?
-- Freddy vs. Jason (Jason Focus Review) (?) tmdb:? verdict:?
-- Friday the 13th Part III in 3-D (?) tmdb:? verdict:?
-- Harvey Pekar Interview (?) tmdb:? verdict:?