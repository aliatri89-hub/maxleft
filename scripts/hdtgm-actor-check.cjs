// hdtgm-actor-check.cjs
// Cross-references ALL HDTGM films against TMDB cast for any actor(s).
// Run: node scripts/hdtgm-actor-check.cjs
//
// Update ACTORS array with TMDB person IDs from themoviedb.org/person/{id}

const TMDB_API_KEY = 'ec6edb453a82a8a1081d13e597ea95ce';

const ACTORS = [
  { id: 6905, name: 'Steven Seagal' },
  { id: 19356, name: 'Jean-Claude Van Damme' },
];

const films = [
  { title: "Skyline", year: 1931, tmdb_id: 477181, genre: "Drama" },
  { title: "Until We Meet Again", year: 1952, tmdb_id: 212564, genre: "Drama" },
  { title: "Babes in Toyland", year: 1961, tmdb_id: 32611, genre: "Comedy" },
  { title: "Hercules in New York", year: 1970, tmdb_id: 5227, genre: "Comedy" },
  { title: "Jonathan Livingston Seagull", year: 1973, tmdb_id: 56150, genre: "Drama" },
  { title: "The Wicker Man", year: 1973, tmdb_id: 16307, genre: "Horror" },
  { title: "Zardoz", year: 1974, tmdb_id: 4923, genre: "Sci-Fi & Fantasy" },
  { title: "Rollerball", year: 1975, tmdb_id: 11484, genre: "Sci-Fi & Fantasy" },
  { title: "Bugsy Malone", year: 1976, tmdb_id: 8446, genre: "Drama" },
  { title: "Starcrash", year: 1978, tmdb_id: 22049, genre: "Sci-Fi & Fantasy" },
  { title: "The Star Wars Holiday Special", year: 1978, tmdb_id: 74849, genre: "Action & Adventure" },
  { title: "Can't Stop the Music", year: 1980, tmdb_id: 40932, genre: "Comedy" },
  { title: "The Apple", year: 1980, tmdb_id: 49069, genre: "Sci-Fi & Fantasy" },
  { title: "The Jazz Singer", year: 1980, tmdb_id: 15310, genre: "Drama" },
  { title: "Xanadu", year: 1980, tmdb_id: 15668, genre: "Sci-Fi & Fantasy" },
  { title: "Grease 2", year: 1982, tmdb_id: 9037, genre: "Comedy" },
  { title: "Halloween III: Season of the Witch", year: 1982, tmdb_id: 10676, genre: "Horror" },
  { title: "MegaForce", year: 1982, tmdb_id: 27380, genre: "Action & Adventure" },
  { title: "Yes, Giorgio", year: 1982, tmdb_id: 88451, genre: "Documentary & Music" },
  { title: "A Night In Heaven", year: 1983, tmdb_id: 5686, genre: "Comedy" },
  { title: "Jaws 3-D", year: 1983, tmdb_id: 17692, genre: "Crime & Thriller" },
  { title: "Staying Alive", year: 1983, tmdb_id: 10805, genre: "Drama" },
  { title: "Superman III", year: 1983, tmdb_id: 9531, genre: "Comedy" },
  { title: "Body Rock", year: 1984, tmdb_id: 47946, genre: "Documentary & Music" },
  { title: "Breakin' 2: Electric Boogaloo", year: 1984, tmdb_id: 17464, genre: "Drama" },
  { title: "Ninja III: The Domination", year: 1984, tmdb_id: 28148, genre: "Action & Adventure" },
  { title: "Rhinestone", year: 1984, tmdb_id: 16551, genre: "Comedy" },
  { title: "Runaway", year: 1984, tmdb_id: 9507, genre: "Sci-Fi & Fantasy" },
  { title: "Streets of Fire", year: 1984, tmdb_id: 14746, genre: "Action & Adventure" },
  { title: "Supergirl", year: 1984, tmdb_id: 9651, genre: "Action & Adventure" },
  { title: "Surf II: The End of the Trilogy", year: 1984, tmdb_id: 30411, genre: "Comedy" },
  { title: "Voyage of the Rock Aliens", year: 1984, tmdb_id: 38265, genre: "Sci-Fi & Fantasy" },
  { title: "A View to a Kill", year: 1985, tmdb_id: 707, genre: "Action & Adventure" },
  { title: "Gymkata", year: 1985, tmdb_id: 14570, genre: "Action & Adventure" },
  { title: "Howling II: Stirba - Werewolf Bitch", year: 1985, tmdb_id: 29794, genre: "Crime & Thriller" },
  { title: "Lifeforce", year: 1985, tmdb_id: 11954, genre: "Horror" },
  { title: "Return to Oz", year: 1985, tmdb_id: 13155, genre: "Action & Adventure" },
  { title: "The Dirt Bike Kid", year: 1985, tmdb_id: 33321, genre: "Comedy" },
  { title: "The Last Dragon", year: 1985, tmdb_id: 13938, genre: "Action & Adventure" },
  { title: "The Legend of the Stardust Brothers", year: 1985, tmdb_id: 530578, genre: "Documentary & Music" },
  { title: "The Peanut Butter Solution", year: 1985, tmdb_id: 19425, genre: "Comedy" },
  { title: "Tuff Turf", year: 1985, tmdb_id: 28410, genre: "Drama" },
  { title: "Chopping Mall", year: 1986, tmdb_id: 28941, genre: "Horror" },
  { title: "Cobra", year: 1986, tmdb_id: 9874, genre: "Action & Adventure" },
  { title: "Crossroads", year: 1986, tmdb_id: 15392, genre: "Drama" },
  { title: "Howard the Duck", year: 1986, tmdb_id: 10658, genre: "Sci-Fi & Fantasy" },
  { title: "Jason Lives - Friday the 13th Part VI", year: 1986, tmdb_id: 10225, genre: "Horror" },
  { title: "Maximum Overdrive", year: 1986, tmdb_id: 9980, genre: "Horror" },
  { title: "Never Too Young to Die", year: 1986, tmdb_id: 27408, genre: "Action & Adventure" },
  { title: "Ninja Terminator", year: 1986, tmdb_id: 40027, genre: "Action & Adventure" },
  { title: "Rad", year: 1986, tmdb_id: 13841, genre: "Drama" },
  { title: "Shanghai Surprise", year: 1986, tmdb_id: 58048, genre: "Comedy" },
  { title: "Solarbabies", year: 1986, tmdb_id: 36677, genre: "Sci-Fi & Fantasy" },
  { title: "The Wraith", year: 1986, tmdb_id: 10017, genre: "Action & Adventure" },
  { title: "Under the Cherry Moon", year: 1986, tmdb_id: 33345, genre: "Comedy" },
  { title: "Date with an Angel", year: 1987, tmdb_id: 28370, genre: "Comedy" },
  { title: "Hard Ticket to Hawaii", year: 1987, tmdb_id: 26011, genre: "Action & Adventure" },
  { title: "Hello Mary Lou: Prom Night II", year: 1987, tmdb_id: 39929, genre: "Horror" },
  { title: "Jaws: The Revenge", year: 1987, tmdb_id: 580, genre: "Action & Adventure" },
  { title: "Made in Heaven", year: 1987, tmdb_id: 42010, genre: "Comedy" },
  { title: "Masters of the Universe", year: 1987, tmdb_id: 11649, genre: "Action & Adventure" },
  { title: "Miami Connection", year: 1987, tmdb_id: 59558, genre: "Action & Adventure" },
  { title: "Munchies", year: 1987, tmdb_id: 4365, genre: "Comedy" },
  { title: "My Demon Lover", year: 1987, tmdb_id: 51521, genre: "Comedy" },
  { title: "Over the Top", year: 1987, tmdb_id: 1825, genre: "Action & Adventure" },
  { title: "Superman IV: The Quest for Peace", year: 1987, tmdb_id: 11411, genre: "Action & Adventure" },
  { title: "The Garbage Pail Kids Movie", year: 1987, tmdb_id: 14443, genre: "Action & Adventure" },
  { title: "The Running Man", year: 1987, tmdb_id: 865, genre: "Action & Adventure" },
  { title: "Tough Guys Don't Dance", year: 1987, tmdb_id: 78146, genre: "Comedy" },
  { title: "Action Jackson", year: 1988, tmdb_id: 10117, genre: "Action & Adventure" },
  { title: "Bloodsport", year: 1988, tmdb_id: 11690, genre: "Action & Adventure" },
  { title: "Death Spa", year: 1988, tmdb_id: 28389, genre: "Horror" },
  { title: "Hell Comes to Frogtown", year: 1988, tmdb_id: 22572, genre: "Action & Adventure" },
  { title: "Jack's Back", year: 1988, tmdb_id: 41959, genre: "Horror" },
  { title: "Mac and Me", year: 1988, tmdb_id: 20196, genre: "Comedy" },
  { title: "Monkey Shines", year: 1988, tmdb_id: 29787, genre: "Horror" },
  { title: "My Stepmother Is an Alien", year: 1988, tmdb_id: 12120, genre: "Comedy" },
  { title: "Uninvited", year: 1988, tmdb_id: 45937, genre: "Horror" },
  { title: "Dream a Little Dream", year: 1989, tmdb_id: 15142, genre: "Sci-Fi & Fantasy" },
  { title: "Friday the 13th Part VIII: Jason Takes Manhattan", year: 1989, tmdb_id: 10283, genre: "Horror" },
  { title: "No Holds Barred", year: 1989, tmdb_id: 39002, genre: "Action & Adventure" },
  { title: "Tango & Cash", year: 1989, tmdb_id: 9618, genre: "Action & Adventure" },
  { title: "Teen Witch", year: 1989, tmdb_id: 25199, genre: "Comedy" },
  { title: "The January Man", year: 1989, tmdb_id: 32059, genre: "Crime & Thriller" },
  { title: "Vampire's Kiss", year: 1989, tmdb_id: 7091, genre: "Comedy" },
  { title: "Abraxas, Guardian of the Universe", year: 1990, tmdb_id: 37926, genre: "Sci-Fi & Fantasy" },
  { title: "Don't Tell Her It's Me", year: 1990, tmdb_id: 21433, genre: "Comedy" },
  { title: "Ernest Goes to Jail", year: 1990, tmdb_id: 18943, genre: "Comedy" },
  { title: "Look Who's Talking Too", year: 1990, tmdb_id: 9356, genre: "Comedy" },
  { title: "The First Power", year: 1990, tmdb_id: 41374, genre: "Crime & Thriller" },
  { title: "Troll 2", year: 1990, tmdb_id: 26914, genre: "Action & Adventure" },
  { title: "A Gnome Named Gnorm", year: 1991, tmdb_id: 21357, genre: "Comedy" },
  { title: "Body Parts", year: 1991, tmdb_id: 32146, genre: "Horror" },
  { title: "Cool as Ice", year: 1991, tmdb_id: 1496, genre: "Comedy" },
  { title: "Drop Dead Fred", year: 1991, tmdb_id: 10379, genre: "Comedy" },
  { title: "Highlander II: The Quickening", year: 1991, tmdb_id: 8010, genre: "Sci-Fi & Fantasy" },
  { title: "Hudson Hawk", year: 1991, tmdb_id: 9292, genre: "Action & Adventure" },
  { title: "Mannequin Two: On the Move", year: 1991, tmdb_id: 34376, genre: "Sci-Fi & Fantasy" },
  { title: "Nothing But Trouble", year: 1991, tmdb_id: 11933, genre: "Comedy" },
  { title: "Samurai Cop", year: 1991, tmdb_id: 65374, genre: "Action & Adventure" },
  { title: "Ski School", year: 1991, tmdb_id: 21811, genre: "Comedy" },
  { title: "Teenage Mutant Ninja Turtles II: The Secret of the Ooze", year: 1991, tmdb_id: 1497, genre: "Sci-Fi & Fantasy" },
  { title: "Cool World", year: 1992, tmdb_id: 14239, genre: "Animation" },
  { title: "Freejack", year: 1992, tmdb_id: 9278, genre: "Sci-Fi & Fantasy" },
  { title: "Ladybugs", year: 1992, tmdb_id: 19087, genre: "Comedy" },
  { title: "Prelude to a Kiss", year: 1992, tmdb_id: 2613, genre: "Drama" },
  { title: "Sleepwalkers", year: 1992, tmdb_id: 11428, genre: "Horror" },
  { title: "Stop! Or My Mom Will Shoot", year: 1992, tmdb_id: 9876, genre: "Action & Adventure" },
  { title: "The Lawnmower Man", year: 1992, tmdb_id: 10163, genre: "Sci-Fi & Fantasy" },
  { title: "Toys", year: 1992, tmdb_id: 11597, genre: "Sci-Fi & Fantasy" },
  { title: "Airborne", year: 1993, tmdb_id: 13064, genre: "Action & Adventure" },
  { title: "Body of Evidence", year: 1993, tmdb_id: 2149, genre: "Drama" },
  { title: "Demolition Man", year: 1993, tmdb_id: 9739, genre: "Crime & Thriller" },
  { title: "GetEven", year: 1993, tmdb_id: 99373, genre: "Action & Adventure" },
  { title: "Ghost in the Machine", year: 1993, tmdb_id: 41651, genre: "Sci-Fi & Fantasy" },
  { title: "Hard Target", year: 1993, tmdb_id: 2019, genre: "Action & Adventure" },
  { title: "Look Who's Talking Now!", year: 1993, tmdb_id: 11982, genre: "Comedy" },
  { title: "Mr. Nanny", year: 1993, tmdb_id: 19371, genre: "Comedy" },
  { title: "My Boyfriend's Back", year: 1993, tmdb_id: 31503, genre: "Comedy" },
  { title: "Surf Ninjas", year: 1993, tmdb_id: 23470, genre: "Action & Adventure" },
  { title: "Color of Night", year: 1994, tmdb_id: 2124, genre: "Comedy" },
  { title: "Disclosure", year: 1994, tmdb_id: 8984, genre: "Crime & Thriller" },
  { title: "Double Dragon", year: 1994, tmdb_id: 2436, genre: "Action & Adventure" },
  { title: "Fair Game", year: 1994, tmdb_id: 438383, genre: "Drama" },
  { title: "Holy Matrimony", year: 1994, tmdb_id: 2348, genre: "Comedy" },
  { title: "Junior", year: 1994, tmdb_id: 6280, genre: "Comedy" },
  { title: "Milk Money", year: 1994, tmdb_id: 8986, genre: "Comedy" },
  { title: "Street Fighter", year: 1994, tmdb_id: 11667, genre: "Action & Adventure" },
  { title: "Tammy and the T-Rex", year: 1994, tmdb_id: 55563, genre: "Sci-Fi & Fantasy" },
  { title: "The Shadow", year: 1994, tmdb_id: 8850, genre: "Action & Adventure" },
  { title: "The Specialist", year: 1994, tmdb_id: 2636, genre: "Action & Adventure" },
  { title: "Timecop", year: 1994, tmdb_id: 8831, genre: "Crime & Thriller" },
  { title: "Congo", year: 1995, tmdb_id: 10329, genre: "Action & Adventure" },
  { title: "Hackers", year: 1995, tmdb_id: 10428, genre: "Action & Adventure" },
  { title: "Jade", year: 1995, tmdb_id: 11863, genre: "Action & Adventure" },
  { title: "Johnny Mnemonic", year: 1995, tmdb_id: 9886, genre: "Sci-Fi & Fantasy" },
  { title: "Judge Dredd", year: 1995, tmdb_id: 9482, genre: "Sci-Fi & Fantasy" },
  { title: "Theodore Rex", year: 1995, tmdb_id: 36259, genre: "Sci-Fi & Fantasy" },
  { title: "Top Dog", year: 1995, tmdb_id: 36278, genre: "Action & Adventure" },
  { title: "Virtuosity", year: 1995, tmdb_id: 9271, genre: "Action & Adventure" },
  { title: "Barb Wire", year: 1996, tmdb_id: 11867, genre: "Sci-Fi & Fantasy" },
  { title: "Escape from L.A.", year: 1996, tmdb_id: 10061, genre: "Action & Adventure" },
  { title: "Jingle All the Way", year: 1996, tmdb_id: 9279, genre: "Comedy" },
  { title: "Kazaam", year: 1996, tmdb_id: 11511, genre: "Sci-Fi & Fantasy" },
  { title: "Lawnmower Man 2: Beyond Cyberspace", year: 1996, tmdb_id: 11525, genre: "Sci-Fi & Fantasy" },
  { title: "Space Jam", year: 1996, tmdb_id: 2300, genre: "Comedy" },
  { title: "Striptease", year: 1996, tmdb_id: 9879, genre: "Comedy" },
  { title: "The Adventures of Pinocchio", year: 1996, tmdb_id: 18975, genre: "Comedy" },
  { title: "The Arrival", year: 1996, tmdb_id: 10547, genre: "Sci-Fi & Fantasy" },
  { title: "The Christmas Tree", year: 1996, tmdb_id: 80612, genre: "Drama" },
  { title: "The Glimmer Man", year: 1996, tmdb_id: 9625, genre: "Action & Adventure" },
  { title: "The Island of Dr. Moreau", year: 1996, tmdb_id: 9306, genre: "Sci-Fi & Fantasy" },
  { title: "The Phantom", year: 1996, tmdb_id: 9826, genre: "Action & Adventure" },
  { title: "The Quest", year: 1996, tmdb_id: 9103, genre: "Action & Adventure" },
  { title: "An American Werewolf in Paris", year: 1997, tmdb_id: 9406, genre: "Horror" },
  { title: "Anaconda", year: 1997, tmdb_id: 9360, genre: "Action & Adventure" },
  { title: "Batman & Robin", year: 1997, tmdb_id: 415, genre: "Action & Adventure" },
  { title: "Con Air", year: 1997, tmdb_id: 1701, genre: "Action & Adventure" },
  { title: "Double Team", year: 1997, tmdb_id: 9405, genre: "Action & Adventure" },
  { title: "Face/Off", year: 1997, tmdb_id: 754, genre: "Action & Adventure" },
  { title: "Speed 2: Cruise Control", year: 1997, tmdb_id: 1639, genre: "Action & Adventure" },
  { title: "Spice World", year: 1997, tmdb_id: 6116, genre: "Action & Adventure" },
  { title: "Steel", year: 1997, tmdb_id: 8854, genre: "Sci-Fi & Fantasy" },
  { title: "The Devil's Advocate", year: 1997, tmdb_id: 1813, genre: "Horror" },
  { title: "Blues Brothers 2000", year: 1998, tmdb_id: 11568, genre: "Documentary & Music" },
  { title: "Cats", year: 1998, tmdb_id: 26598, genre: "Documentary & Music" },
  { title: "Jack Frost", year: 1998, tmdb_id: 9745, genre: "Comedy" },
  { title: "Music from Another Room", year: 1998, tmdb_id: 39424, genre: "Comedy" },
  { title: "Bats", year: 1999, tmdb_id: 10496, genre: "Horror" },
  { title: "Deep Blue Sea", year: 1999, tmdb_id: 8914, genre: "Action & Adventure" },
  { title: "Lake Placid", year: 1999, tmdb_id: 9825, genre: "Horror" },
  { title: "Simply Irresistible", year: 1999, tmdb_id: 16172, genre: "Comedy" },
  { title: "Wild Wild West", year: 1999, tmdb_id: 8487, genre: "Action & Adventure" },
  { title: "Battlefield Earth", year: 2000, tmdb_id: 5491, genre: "Sci-Fi & Fantasy" },
  { title: "Deadfall", year: 2000, tmdb_id: 445773, genre: "Horror" },
  { title: "Dracula 2000", year: 2000, tmdb_id: 10577, genre: "Crime & Thriller" },
  { title: "Dungeons & Dragons", year: 2000, tmdb_id: 11849, genre: "Drama" },
  { title: "Eye of the Beholder", year: 2000, tmdb_id: 18681, genre: "Crime & Thriller" },
  { title: "Jill Rips", year: 2000, tmdb_id: 122163, genre: "Crime & Thriller" },
  { title: "Leprechaun in the Hood", year: 2000, tmdb_id: 18011, genre: "Horror" },
  { title: "Love's Labour's Lost", year: 2000, tmdb_id: 51333, genre: "Comedy" },
  { title: "Merlin: The Return", year: 2000, tmdb_id: 53105, genre: "Comedy" },
  { title: "Reindeer Games", year: 2000, tmdb_id: 2155, genre: "Crime & Thriller" },
  { title: "The 6th Day", year: 2000, tmdb_id: 8452, genre: "Sci-Fi & Fantasy" },
  { title: "Crocodile Dundee in Los Angeles", year: 2001, tmdb_id: 9290, genre: "Action & Adventure" },
  { title: "Doppelganger", year: 2001, tmdb_id: 122817, genre: "Comedy" },
  { title: "Driven", year: 2001, tmdb_id: 10477, genre: "Action & Adventure" },
  { title: "Ghosts of Mars", year: 2001, tmdb_id: 10016, genre: "Action & Adventure" },
  { title: "Glitter", year: 2001, tmdb_id: 10696, genre: "Drama" },
  { title: "Jason X", year: 2001, tmdb_id: 11470, genre: "Horror" },
  { title: "Kate & Leopold", year: 2001, tmdb_id: 11232, genre: "Comedy" },
  { title: "Monkeybone", year: 2001, tmdb_id: 23685, genre: "Action & Adventure" },
  { title: "Rock Star", year: 2001, tmdb_id: 12508, genre: "Documentary & Music" },
  { title: "Swordfish", year: 2001, tmdb_id: 9705, genre: "Action & Adventure" },
  { title: "The Fast and the Furious", year: 2001, tmdb_id: 9799, genre: "Action & Adventure" },
  { title: "Killing Me Softly", year: 2002, tmdb_id: 14365, genre: "Crime & Thriller" },
  { title: "Shark Attack 3: Megalodon", year: 2002, tmdb_id: 18015, genre: "Horror" },
  { title: "The Adventures of Pluto Nash", year: 2002, tmdb_id: 11692, genre: "Action & Adventure" },
  { title: "The Country Bears", year: 2002, tmdb_id: 18357, genre: "Action & Adventure" },
  { title: "The Master of Disguise", year: 2002, tmdb_id: 13908, genre: "Comedy" },
  { title: "Thunderpants", year: 2002, tmdb_id: 21605, genre: "Comedy" },
  { title: "Tiptoes", year: 2002, tmdb_id: 8325, genre: "Drama" },
  { title: "Daredevil", year: 2003, tmdb_id: 9480, genre: "Sci-Fi & Fantasy" },
  { title: "Dreamcatcher", year: 2003, tmdb_id: 6171, genre: "Drama" },
  { title: "From Justin to Kelly", year: 2003, tmdb_id: 31246, genre: "Comedy" },
  { title: "Gigli", year: 2003, tmdb_id: 8046, genre: "Comedy" },
  { title: "Perfect", year: 2003, tmdb_id: 676338, genre: "Drama" },
  { title: "Sinbad of the Seven Seas", year: 2003, tmdb_id: 44126, genre: "Action & Adventure" },
  { title: "The League of Extraordinary Gentlemen", year: 2003, tmdb_id: 8698, genre: "Sci-Fi & Fantasy" },
  { title: "View from the Top", year: 2003, tmdb_id: 11523, genre: "Comedy" },
  { title: "Catwoman", year: 2004, tmdb_id: 314, genre: "Action & Adventure" },
  { title: "Cellular", year: 2004, tmdb_id: 9759, genre: "Action & Adventure" },
  { title: "Sky Captain and the World of Tomorrow", year: 2004, tmdb_id: 5137, genre: "Crime & Thriller" },
  { title: "Sleepover", year: 2004, tmdb_id: 9893, genre: "Comedy" },
  { title: "Torque", year: 2004, tmdb_id: 10718, genre: "Action & Adventure" },
  { title: "Van Helsing", year: 2004, tmdb_id: 7131, genre: "Horror" },
  { title: "You Got Served", year: 2004, tmdb_id: 14114, genre: "Documentary & Music" },
  { title: "A Sound of Thunder", year: 2005, tmdb_id: 10077, genre: "Crime & Thriller" },
  { title: "Serenity", year: 2005, tmdb_id: 16320, genre: "Sci-Fi & Fantasy" },
  { title: "Stealth", year: 2005, tmdb_id: 10048, genre: "Sci-Fi & Fantasy" },
  { title: "Stone Cold", year: 2005, tmdb_id: 31046, genre: "Drama" },
  { title: "The Island", year: 2005, tmdb_id: 1635, genre: "Action & Adventure" },
  { title: "Crank", year: 2006, tmdb_id: 1948, genre: "Action & Adventure" },
  { title: "Deck the Halls", year: 2006, tmdb_id: 9969, genre: "Comedy" },
  { title: "The Covenant", year: 2006, tmdb_id: 9954, genre: "Sci-Fi & Fantasy" },
  { title: "The Lake House", year: 2006, tmdb_id: 2044, genre: "Comedy" },
  { title: "The Secret", year: 2006, tmdb_id: 26594, genre: "Documentary & Music" },
  { title: "Ultraviolet", year: 2006, tmdb_id: 9920, genre: "Sci-Fi & Fantasy" },
  { title: "88 Minutes", year: 2007, tmdb_id: 3489, genre: "Crime & Thriller" },
  { title: "Bratz", year: 2007, tmdb_id: 14123, genre: "Comedy" },
  { title: "Holiday in Handcuffs", year: 2007, tmdb_id: 24446, genre: "Comedy" },
  { title: "I Know Who Killed Me", year: 2007, tmdb_id: 5857, genre: "Crime & Thriller" },
  { title: "In the Name of the King: A Dungeon Siege Tale", year: 2007, tmdb_id: 2312, genre: "Action & Adventure" },
  { title: "Perfect Stranger", year: 2007, tmdb_id: 7183, genre: "Crime & Thriller" },
  { title: "Shoot 'Em Up", year: 2007, tmdb_id: 4141, genre: "Action & Adventure" },
  { title: "Spider-Man 3", year: 2007, tmdb_id: 559, genre: "Action & Adventure" },
  { title: "The Number 23", year: 2007, tmdb_id: 3594, genre: "Crime & Thriller" },
  { title: "Punisher: War Zone", year: 2008, tmdb_id: 13056, genre: "Action & Adventure" },
  { title: "The Happening", year: 2008, tmdb_id: 8645, genre: "Crime & Thriller" },
  { title: "The Hottie & The Nottie", year: 2008, tmdb_id: 63315, genre: "Comedy" },
  { title: "The Love Guru", year: 2008, tmdb_id: 12177, genre: "Comedy" },
  { title: "The Visitor", year: 2008, tmdb_id: 12473, genre: "Crime & Thriller" },
  { title: "All About Steve", year: 2009, tmdb_id: 23706, genre: "Comedy" },
  { title: "Crank: High Voltage", year: 2009, tmdb_id: 15092, genre: "Action & Adventure" },
  { title: "Gamer", year: 2009, tmdb_id: 18501, genre: "Action & Adventure" },
  { title: "Gooby", year: 2009, tmdb_id: 21293, genre: "Comedy" },
  { title: "Old Dogs", year: 2009, tmdb_id: 22949, genre: "Comedy" },
  { title: "Surrogates", year: 2009, tmdb_id: 19959, genre: "Sci-Fi & Fantasy" },
  { title: "The Dog Who Saved Christmas", year: 2009, tmdb_id: 28904, genre: "Comedy" },
  { title: "The Ugly Truth", year: 2009, tmdb_id: 20943, genre: "Comedy" },
  { title: "Birdemic: Shock and Terror", year: 2010, tmdb_id: 40016, genre: "Comedy" },
  { title: "Burlesque", year: 2010, tmdb_id: 42297, genre: "Drama" },
  { title: "The Back-Up Plan", year: 2010, tmdb_id: 34806, genre: "Comedy" },
  { title: "The Last Airbender", year: 2010, tmdb_id: 10196, genre: "Action & Adventure" },
  { title: "The Tourist", year: 2010, tmdb_id: 37710, genre: "Action & Adventure" },
  { title: "Abduction", year: 2011, tmdb_id: 59965, genre: "Crime & Thriller" },
  { title: "Beastly", year: 2011, tmdb_id: 38117, genre: "Comedy" },
  { title: "Drive Angry", year: 2011, tmdb_id: 47327, genre: "Sci-Fi & Fantasy" },
  { title: "Fast Five", year: 2011, tmdb_id: 51497, genre: "Action & Adventure" },
  { title: "Green Lantern", year: 2011, tmdb_id: 44912, genre: "Action & Adventure" },
  { title: "Love on a Leash", year: 2011, tmdb_id: 307124, genre: "Drama" },
  { title: "Passion Play", year: 2011, tmdb_id: 38753, genre: "Drama" },
  { title: "Q", year: 2011, tmdb_id: 27726, genre: "Crime & Thriller" },
  { title: "Season of the Witch", year: 2011, tmdb_id: 23047, genre: "Action & Adventure" },
  { title: "Sucker Punch", year: 2011, tmdb_id: 23629, genre: "Action & Adventure" },
  { title: "The Twilight Saga: Breaking Dawn - Part 1", year: 2011, tmdb_id: 50619, genre: "Action & Adventure" },
  { title: "Trespass", year: 2011, tmdb_id: 70578, genre: "Crime & Thriller" },
  { title: "Bad Ass", year: 2012, tmdb_id: 94380, genre: "Action & Adventure" },
  { title: "Bait", year: 2012, tmdb_id: 118957, genre: "Horror" },
  { title: "Joyful Noise", year: 2012, tmdb_id: 63574, genre: "Comedy" },
  { title: "The Avengers", year: 2012, tmdb_id: 24428, genre: "Sci-Fi & Fantasy" },
  { title: "The Twilight Saga: Breaking Dawn - Part 2", year: 2012, tmdb_id: 50620, genre: "Action & Adventure" },
  { title: "A Talking Cat!?!", year: 2013, tmdb_id: 165013, genre: "Comedy" },
  { title: "After Earth", year: 2013, tmdb_id: 82700, genre: "Sci-Fi & Fantasy" },
  { title: "Beautiful Creatures", year: 2013, tmdb_id: 109491, genre: "Sci-Fi & Fantasy" },
  { title: "Fast & Furious 6", year: 2013, tmdb_id: 82992, genre: "Action & Adventure" },
  { title: "Fateful Findings", year: 2013, tmdb_id: 197599, genre: "Drama" },
  { title: "Grand Piano", year: 2013, tmdb_id: 220286, genre: "Crime & Thriller" },
  { title: "Safe Haven", year: 2013, tmdb_id: 112949, genre: "Comedy" },
  { title: "Sharknado", year: 2013, tmdb_id: 205321, genre: "Action & Adventure" },
  { title: "Godzilla", year: 2014, tmdb_id: 124905, genre: "Action & Adventure" },
  { title: "Hercules", year: 2014, tmdb_id: 184315, genre: "Action & Adventure" },
  { title: "Sharknado 2: The Second One", year: 2014, tmdb_id: 248504, genre: "Crime & Thriller" },
  { title: "Vampire Academy", year: 2014, tmdb_id: 203739, genre: "Comedy" },
  { title: "Winter's Tale", year: 2014, tmdb_id: 137321, genre: "Drama" },
  { title: "Dragon Blade", year: 2015, tmdb_id: 300168, genre: "Action & Adventure" },
  { title: "Fifty Shades of Grey", year: 2015, tmdb_id: 216015, genre: "Drama" },
  { title: "Furious 7", year: 2015, tmdb_id: 168259, genre: "Action & Adventure" },
  { title: "Jupiter Ascending", year: 2015, tmdb_id: 76757, genre: "Sci-Fi & Fantasy" },
  { title: "Sharknado 3: Oh Hell No!", year: 2015, tmdb_id: 331446, genre: "Action & Adventure" },
  { title: "Gods of Egypt", year: 2016, tmdb_id: 205584, genre: "Action & Adventure" },
  { title: "The Great Wall", year: 2016, tmdb_id: 311324, genre: "Action & Adventure" },
  { title: "Underworld: Blood Wars", year: 2016, tmdb_id: 346672, genre: "Sci-Fi & Fantasy" },
  { title: "Fifty Shades Darker", year: 2017, tmdb_id: 341174, genre: "Drama" },
  { title: "Geostorm", year: 2017, tmdb_id: 274855, genre: "Action & Adventure" },
  { title: "The Disaster Artist", year: 2017, tmdb_id: 371638, genre: "Comedy" },
  { title: "The Fate of the Furious", year: 2017, tmdb_id: 337339, genre: "Action & Adventure" },
  { title: "The Snowman", year: 2017, tmdb_id: 372343, genre: "Crime & Thriller" },
  { title: "Valerian and the City of a Thousand Planets", year: 2017, tmdb_id: 339964, genre: "Action & Adventure" },
  { title: "Wish Upon", year: 2017, tmdb_id: 440597, genre: "Horror" },
  { title: "xXx: Return of Xander Cage", year: 2017, tmdb_id: 47971, genre: "Action & Adventure" },
  { title: "Fifty Shades Freed", year: 2018, tmdb_id: 337167, genre: "Drama" },
  { title: "Replicas", year: 2018, tmdb_id: 300681, genre: "Sci-Fi & Fantasy" },
  { title: "Skyscraper", year: 2018, tmdb_id: 447200, genre: "Action & Adventure" },
  { title: "The Hurricane Heist", year: 2018, tmdb_id: 430040, genre: "Action & Adventure" },
  { title: "The Meg", year: 2018, tmdb_id: 345940, genre: "Action & Adventure" },
  { title: "Fast & Furious Presents: Hobbs & Shaw", year: 2019, tmdb_id: 384018, genre: "Action & Adventure" },
  { title: "Bloodshot", year: 2020, tmdb_id: 338762, genre: "Action & Adventure" },
  { title: "F9", year: 2021, tmdb_id: 385128, genre: "Action & Adventure" },
  { title: "Malignant", year: 2021, tmdb_id: 619778, genre: "Horror" },
  { title: "Mortal Kombat", year: 2021, tmdb_id: 460465, genre: "Action & Adventure" },
  { title: "Old", year: 2021, tmdb_id: 631843, genre: "Crime & Thriller" },
  { title: "Ambulance", year: 2022, tmdb_id: 763285, genre: "Crime & Thriller" },
  { title: "Moonfall", year: 2022, tmdb_id: 406759, genre: "Sci-Fi & Fantasy" },
  { title: "Morbius", year: 2022, tmdb_id: 526896, genre: "Action & Adventure" },
  { title: "Beautiful Disaster", year: 2023, tmdb_id: 1016121, genre: "Comedy" },
  { title: "Expend4bles", year: 2023, tmdb_id: 299054, genre: "Action & Adventure" },
  { title: "Fast X", year: 2023, tmdb_id: 385687, genre: "Action & Adventure" },
  { title: "Super Mario Bros.", year: 2023, tmdb_id: 502356, genre: "Comedy" },
  { title: "The Pope's Exorcist", year: 2023, tmdb_id: 758323, genre: "Horror" },
  { title: "Absolution", year: 2024, tmdb_id: 974453, genre: "Action & Adventure" },
  { title: "Bad Boys: Ride or Die", year: 2024, tmdb_id: 573435, genre: "Action & Adventure" },
  { title: "Kraven the Hunter", year: 2024, tmdb_id: 539972, genre: "Action & Adventure" },
  { title: "Madame Web", year: 2024, tmdb_id: 634492, genre: "Action & Adventure" },
  { title: "Megalopolis", year: 2024, tmdb_id: 592831, genre: "Sci-Fi & Fantasy" },
  { title: "Road House", year: 2024, tmdb_id: 359410, genre: "Action & Adventure" },
  { title: "The Beekeeper", year: 2024, tmdb_id: 866398, genre: "Action & Adventure" },
];

// Deduplicate by tmdb_id
const seen = new Set();
const uniqueFilms = films.filter(f => {
  if (seen.has(f.tmdb_id)) return false;
  seen.add(f.tmdb_id);
  return true;
});

async function checkCast(film, actorId) {
  const url = `https://api.themoviedb.org/3/movie/${film.tmdb_id}/credits?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const match = data.cast?.find(c => c.id === actorId);
  return match ? { ...film, character: match.character, order: match.order } : null;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`Checking ${uniqueFilms.length} HDTGM films for ${ACTORS.map(a => a.name).join(' + ')}...\n`);

  const hitsByActor = {};
  for (const actor of ACTORS) hitsByActor[actor.name] = [];
  const combined = {};

  for (let i = 0; i < uniqueFilms.length; i++) {
    const film = uniqueFilms[i];
    process.stdout.write(`[${i + 1}/${uniqueFilms.length}] ${film.title} (${film.year})... `);

    const matchedActors = [];
    for (const actor of ACTORS) {
      try {
        const result = await checkCast(film, actor.id);
        if (result) {
          hitsByActor[actor.name].push(result);
          matchedActors.push({ name: actor.name, character: result.character });
        }
      } catch (e) {}
    }

    if (matchedActors.length > 0) {
      combined[film.tmdb_id] = { film, actors: matchedActors };
      console.log(`✅ ${matchedActors.map(a => `${a.name} as "${a.character}"`).join(' + ')}`);
    } else {
      console.log('—');
    }

    if (i % 4 === 3) await sleep(1000);
  }

  console.log('\n========== RESULTS BY ACTOR ==========');
  for (const actor of ACTORS) {
    const hits = hitsByActor[actor.name];
    console.log(`\n${actor.name} — ${hits.length} films:`);
    hits.forEach(h => console.log(`  ${h.year} — ${h.title} [${h.genre}] — "${h.character}"`));
  }

  const combinedFilms = Object.values(combined);
  console.log(`\n========== COMBINED SET (${combinedFilms.length} unique films) ==========`);
  combinedFilms
    .sort((a, b) => a.film.year - b.film.year)
    .forEach(({ film, actors }) =>
      console.log(`  ${film.year} — ${film.title} [${film.genre}] — ${actors.map(a => a.name.split(' ')[0]).join(' + ')}`)
    );

  console.log('\n========== TMDB IDs (for badge_items query) ==========');
  console.log(combinedFilms.map(({ film }) => film.tmdb_id).join(', '));
}

main();
