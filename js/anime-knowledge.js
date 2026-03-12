/* ═══════════════════════════════════════════════════════════════════
   AnimeSense AI — Anime Knowledge Database v1.0
   ═══════════════════════════════════════════════════════════════════
   Local structured knowledge for 35 popular anime series.
   Injected into LLM context via the Context Builder (Feature 5).
   ═══════════════════════════════════════════════════════════════════ */

const AnimeKnowledge = (() => {

    const DATABASE = {

        // ─────────────── SHŌNEN CLASSICS ───────────────

        "naruto": {
            title: "Naruto / Naruto Shippuden",
            author: "Masashi Kishimoto",
            studio: "Pierrot",
            years: "2002–2017",
            themes: ["friendship", "war", "destiny", "perseverance", "loneliness"],
            power_system: "Chakra — molded from spiritual and physical energy into jutsu (ninjutsu, genjutsu, taijutsu). Kekkei Genkai (bloodline limits), Sage Mode, Tailed Beast transformations.",
            characters: ["Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake", "Itachi Uchiha", "Jiraiya", "Madara Uchiha", "Obito Uchiha", "Hinata Hyuga", "Pain/Nagato"],
            notable_arcs: ["Chunin Exams", "Sasuke Retrieval", "Pain's Assault", "Fourth Great Ninja War", "Itachi's Truth"],
            ending_summary: "Naruto becomes the Seventh Hokage after defeating Kaguya Otsutsuki in the Fourth Great Ninja War. Sasuke redeems himself and travels as a wanderer. Naruto marries Hinata.",
            related: ["boruto", "bleach", "one piece", "hunter x hunter"]
        },

        "one piece": {
            title: "One Piece",
            author: "Eiichiro Oda",
            studio: "Toei Animation",
            years: "1999–ongoing",
            themes: ["freedom", "adventure", "dreams", "camaraderie", "justice vs tyranny"],
            power_system: "Devil Fruits — grant unique supernatural abilities at the cost of swimming. Three types: Paramecia, Zoan, Logia. Haki — Observation (precognition), Armament (invisible armor), Conqueror's (domination).",
            characters: ["Monkey D. Luffy", "Roronoa Zoro", "Nami", "Sanji", "Usopp", "Nico Robin", "Tony Tony Chopper", "Franky", "Brook", "Jinbe", "Shanks", "Whitebeard", "Blackbeard"],
            notable_arcs: ["Arlong Park", "Alabasta", "Enies Lobby", "Marineford", "Dressrosa", "Whole Cake Island", "Wano Country", "Egghead"],
            ending_summary: "Ongoing — Luffy aims to find the One Piece treasure and become King of the Pirates.",
            related: ["naruto", "dragon ball z", "fairy tail", "bleach"]
        },

        "attack on titan": {
            title: "Attack on Titan (Shingeki no Kyojin)",
            author: "Hajime Isayama",
            studio: "WIT Studio (S1–S3), MAPPA (S4)",
            years: "2013–2023",
            themes: ["freedom", "war", "morality", "cycle of hatred", "determinism", "genocide"],
            power_system: "Titan Shifting — inherited Nine Titans allow humans to transform into giant Titans. Paths connect all Subjects of Ymir across space and time. Founding Titan controls all others.",
            characters: ["Eren Yeager", "Mikasa Ackerman", "Armin Arlert", "Levi Ackerman", "Erwin Smith", "Annie Leonhart", "Reiner Braun", "Zeke Yeager", "Historia Reiss"],
            notable_arcs: ["Trost", "Female Titan", "Uprising", "Return to Shiganshina", "Marley", "War for Paradis", "The Rumbling"],
            ending_summary: "Eren activates the Rumbling to destroy the outside world but is stopped by his friends. Mikasa kills Eren. The Titan powers vanish. The cycle of violence continues as Paradis is eventually attacked.",
            related: ["vinland saga", "code geass", "death note", "psycho-pass"]
        },

        "dragon ball z": {
            title: "Dragon Ball Z",
            author: "Akira Toriyama",
            studio: "Toei Animation",
            years: "1989–1996",
            themes: ["martial arts", "surpassing limits", "rivalry", "protecting loved ones"],
            power_system: "Ki — life energy manipulated for flight, energy blasts, and transformations. Super Saiyan forms, Ultra Instinct, God Ki, Fusion (Potara/Dance).",
            characters: ["Goku", "Vegeta", "Gohan", "Piccolo", "Frieza", "Cell", "Majin Buu", "Trunks", "Krillin", "Beerus", "Whis"],
            notable_arcs: ["Saiyan Saga", "Frieza Saga", "Cell Saga", "Buu Saga"],
            ending_summary: "Goku defeats Kid Buu with a Spirit Bomb. Years later, he trains Uub, the reincarnation of Buu. Continued in Dragon Ball Super.",
            related: ["one punch man", "naruto", "my hero academia", "jujutsu kaisen"]
        },

        "jujutsu kaisen": {
            title: "Jujutsu Kaisen",
            author: "Gege Akutami",
            studio: "MAPPA",
            years: "2020–ongoing",
            themes: ["curses and humanity", "strength vs sacrifice", "the value of life", "corruption of power"],
            power_system: "Cursed Energy — negative emotions manifested as power. Cursed Techniques (innate abilities), Domain Expansion (trapped-space ultimate), Reversed Cursed Technique (healing), Binding Vows (power contracts).",
            characters: ["Yuji Itadori", "Megumi Fushiguro", "Nobara Kugisaki", "Satoru Gojo", "Ryomen Sukuna", "Kento Nanami", "Toji Fushiguro", "Suguru Geto", "Yuta Okkotsu", "Maki Zenin"],
            notable_arcs: ["Cursed Womb", "Kyoto Goodwill Event", "Shibuya Incident", "Culling Game", "Shinjuku Showdown"],
            ending_summary: "Ongoing manga — the Shinjuku Showdown arc features the climactic battle against Sukuna.",
            related: ["demon slayer", "chainsaw man", "bleach", "hunter x hunter"]
        },

        "demon slayer": {
            title: "Demon Slayer: Kimetsu no Yaiba",
            author: "Koyoharu Gotouge",
            studio: "ufotable",
            years: "2019–ongoing (anime)",
            themes: ["family bonds", "compassion", "perseverance", "loss and grief"],
            power_system: "Breathing Techniques — Total Concentration Breathing enhances physical abilities. Sun Breathing (origin), Water, Flame, Thunder, Wind, etc. Demon Blood Arts — unique to each demon.",
            characters: ["Tanjiro Kamado", "Nezuko Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira", "Giyu Tomioka", "Kyojuro Rengoku", "Muzan Kibutsuji", "Hashira (Pillars)"],
            notable_arcs: ["Final Selection", "Mount Natagumo", "Mugen Train", "Entertainment District", "Swordsmith Village", "Hashira Training", "Infinity Castle"],
            ending_summary: "Tanjiro and the Demon Slayer Corps defeat Muzan Kibutsuji. Nezuko is cured. The story shifts to their descendants in modern-day Japan.",
            related: ["jujutsu kaisen", "bleach", "naruto", "fullmetal alchemist brotherhood"]
        },

        "bleach": {
            title: "Bleach",
            author: "Tite Kubo",
            studio: "Pierrot",
            years: "2004–2012, 2022–2025 (TYBW)",
            themes: ["death and the afterlife", "duty", "identity", "sacrifice"],
            power_system: "Zanpakutō — soul-cutting swords with Shikai (release) and Bankai (final release). Reiatsu/Reiryoku (spiritual pressure/energy). Hollowfication, Quincy powers (Schrift).",
            characters: ["Ichigo Kurosaki", "Rukia Kuchiki", "Sosuke Aizen", "Byakuya Kuchiki", "Uryu Ishida", "Orihime Inoue", "Renji Abarai", "Kenpachi Zaraki", "Yhwach"],
            notable_arcs: ["Soul Society", "Hueco Mundo/Arrancar", "Fake Karakura Town", "Fullbring", "Thousand-Year Blood War"],
            ending_summary: "Ichigo defeats Yhwach with the Silver Arrowhead. He marries Orihime; their son Kazui inherits Shinigami powers. Rukia becomes Soul Society Captain.",
            related: ["naruto", "jujutsu kaisen", "one piece", "soul eater"]
        },

        "hunter x hunter": {
            title: "Hunter x Hunter (2011)",
            author: "Yoshihiro Togashi",
            studio: "Madhouse",
            years: "2011–2014",
            themes: ["adventure", "complexity of morality", "the price of power", "human nature"],
            power_system: "Nen — life energy with six categories: Enhancement, Transmutation, Emission, Conjuration, Manipulation, Specialization. Hatsu (personal ability), Vow & Limitations (higher risk = more power).",
            characters: ["Gon Freecss", "Killua Zoldyck", "Kurapika", "Leorio Paradinight", "Hisoka Morow", "Meruem", "Chrollo Lucilfer", "Netero"],
            notable_arcs: ["Hunter Exam", "Heaven's Arena", "Yorknew City", "Greed Island", "Chimera Ant", "Election"],
            ending_summary: "Anime ends after the Election arc. Gon meets his father Ging. The manga continues with the Dark Continent expedition and Succession Contest arcs (on hiatus).",
            related: ["jujutsu kaisen", "naruto", "fullmetal alchemist brotherhood", "yu yu hakusho"]
        },

        "my hero academia": {
            title: "My Hero Academia (Boku no Hero Academia)",
            author: "Kohei Horikoshi",
            studio: "Bones",
            years: "2016–2025",
            themes: ["heroism", "legacy", "society's flaws", "what it means to save people"],
            power_system: "Quirks — genetic superpowers manifesting in ~80% of the population. One For All (stockpiling Quirk), All For One (stealing Quirk), Quirk Awakening, Quirk Singularity.",
            characters: ["Izuku Midoriya (Deku)", "Katsuki Bakugo", "Shoto Todoroki", "All Might", "Tomura Shigaraki", "Endeavor", "Ochaco Uraraka", "Hawks"],
            notable_arcs: ["USJ Incident", "Sports Festival", "Hero Killer Stain", "All Might vs All For One", "Overhaul", "My Villain Academia", "Paranormal Liberation War", "Final Act"],
            ending_summary: "Deku defeats Shigaraki/All For One and loses One For All. He becomes a teacher at U.A. while Bakugo and others continue as pro heroes.",
            related: ["one punch man", "mob psycho 100", "naruto", "jujutsu kaisen"]
        },

        // ─────────────── MODERN HIT SERIES ───────────────

        "chainsaw man": {
            title: "Chainsaw Man",
            author: "Tatsuki Fujimoto",
            studio: "MAPPA",
            years: "2022–ongoing",
            themes: ["desire", "loneliness", "violence as coping", "existentialism", "found family"],
            power_system: "Devils — embody human fears and grow stronger from collective terror. Fiends (devil possessing corpse), Hybrids (human-devil fusion with transformation trigger), Contracts (trade something for devil power).",
            characters: ["Denji", "Makima", "Power", "Aki Hayakawa", "Pochita", "Reze", "Himeno", "Kishibe"],
            notable_arcs: ["Bat Devil", "Eternity Devil", "Katana Man", "Bomb Girl", "International Assassins", "Gun Devil", "Control Devil"],
            ending_summary: "Part 1: Denji kills Makima (Control Devil) by eating her. Part 2 (ongoing) follows Denji in high school with a new War Devil threat.",
            related: ["jujutsu kaisen", "mob psycho 100", "dorohedoro", "fire punch"]
        },

        "spy x family": {
            title: "Spy x Family",
            author: "Tatsuya Endo",
            studio: "WIT Studio / CloverWorks",
            years: "2022–ongoing",
            themes: ["found family", "peace vs war", "duality", "innocence", "espionage"],
            power_system: "No traditional power system. Loid: master spy/combatant. Yor: superhuman assassin strength. Anya: telepathy (Project Apple experiment). Bond: precognition.",
            characters: ["Loid Forger (Twilight)", "Yor Forger (Thorn Princess)", "Anya Forger", "Bond Forger", "Franky Franklin", "Damian Desmond", "Yuri Briar"],
            notable_arcs: ["Operation Strix", "Eden Academy Admissions", "Yor vs Assassins (Cruise Arc)", "School Festival"],
            ending_summary: "Ongoing — Loid continues Operation Strix to maintain peace while the Forger family grows closer.",
            related: ["frieren", "violet evergarden", "kaguya-sama"]
        },

        "solo leveling": {
            title: "Solo Leveling (Ore dake Level Up na Ken)",
            author: "Chugong (novel), Dubu/REDICE Studio (manhwa)",
            studio: "A-1 Pictures",
            years: "2024–ongoing (anime)",
            themes: ["growth", "power fantasy", "survival", "responsibility", "loneliness of power"],
            power_system: "System — a game-like interface that only Sung Jinwoo can access. Leveling up, stat allocation, shadow extraction (summoning fallen enemies as shadow soldiers). Gates/Dungeons ranked E–S.",
            characters: ["Sung Jinwoo", "Cha Hae-In", "Go Gun-Hee", "Thomas Andre", "Liu Zhigang", "Igris", "Beru", "Antares"],
            notable_arcs: ["Double Dungeon", "C-Rank Dungeon", "Red Gate", "Jeju Island S-Rank Gate", "Monarchs vs Rulers"],
            ending_summary: "Jinwoo defeats the Monarchs, rewinds time to save everyone, and lives as the only one who remembers. He becomes the Shadow Monarch, protecting Earth from the shadows.",
            related: ["sword art online", "mushoku tensei", "overlord", "tower of god"]
        },

        "frieren": {
            title: "Frieren: Beyond Journey's End (Sousou no Frieren)",
            author: "Kanehito Yamada, Tsukasa Abe",
            studio: "Madhouse",
            years: "2023–ongoing",
            themes: ["passage of time", "meaning of life", "understanding others", "grief and memory"],
            power_system: "Magic — spells fueled by mana. Offensive magic, defensive magic, folk magic (trivial daily spells). Mana concealment, Zoltraak (humanity's progress weaponizing demon magic). No rigid system — emphasis on creativity.",
            characters: ["Frieren", "Fern", "Stark", "Himmel", "Heiter", "Eisen", "Serie", "Macht", "Qual"],
            notable_arcs: ["Post-Demon King Journey", "Frieren's Memories", "First-Class Mage Exam", "Serie's Test"],
            ending_summary: "Ongoing — Frieren travels to Aureole (where souls rest) to speak with Himmel again, learning to understand humans along the way.",
            related: ["violet evergarden", "mushoku tensei", "made in abyss", "march comes in like a lion"]
        },

        "dandadan": {
            title: "Dandadan",
            author: "Yukinobu Tatsu",
            studio: "Science SARU",
            years: "2024–ongoing",
            themes: ["youth", "the supernatural", "romance", "friendship", "absurd comedy"],
            power_system: "Occult/Psychic hybrid — Momo Ayase has psychic powers (telekinesis), Okarun gains power from a cursed entity (Turbo Granny). Spirits and aliens coexist; combat uses a mix of psychic abilities and spirit energy.",
            characters: ["Momo Ayase", "Ken Takakura (Okarun)", "Turbo Granny", "Aira Shiratori", "Jiji", "Acrobatic Silky"],
            notable_arcs: ["Turbo Granny", "Serpoian Aliens", "Acrobatic Silky", "Dover Demon", "Nessie"],
            ending_summary: "Ongoing — Okarun and Momo continue dealing with ghosts and aliens while developing their relationship.",
            related: ["mob psycho 100", "chainsaw man", "jujutsu kaisen", "noragami"]
        },

        // ─────────────── PSYCHOLOGICAL / THRILLER ───────────────

        "death note": {
            title: "Death Note",
            author: "Tsugumi Ohba, Takeshi Obata",
            studio: "Madhouse",
            years: "2006–2007",
            themes: ["justice", "morality", "god complex", "cat-and-mouse", "corruption of power"],
            power_system: "Death Note — a supernatural notebook; writing a person's name in it while picturing their face causes death. Shinigami Eyes (see names/lifespans at the cost of half your remaining life). Rules govern its use.",
            characters: ["Light Yagami (Kira)", "L Lawliet", "Ryuk", "Misa Amane", "Near", "Mello", "Soichiro Yagami"],
            notable_arcs: ["L vs Light", "Yotsuba Arc", "Near & Mello Saga", "Final Confrontation"],
            ending_summary: "Light is exposed by Near. Ryuk writes Light's name in his Death Note. Light dies on a staircase, mirroring L. Near takes over as the world's greatest detective.",
            related: ["code geass", "psycho-pass", "monster", "steins;gate"]
        },

        "steins;gate": {
            title: "Steins;Gate",
            author: "5pb. / Nitroplus (visual novel)",
            studio: "White Fox",
            years: "2011",
            themes: ["time travel", "sacrifice", "the butterfly effect", "loss and determination"],
            power_system: "Time manipulation via Phone Microwave (D-Mail: send texts to the past changing worldlines), Time Leap Machine (send memories back). Divergence Meter tracks worldline shifts. Attractor Fields constrain fate.",
            characters: ["Rintaro Okabe", "Kurisu Makise", "Mayuri Shiina", "Daru (Itaru Hashida)", "Suzuha Amane", "Moeka Kiryuu", "Ruka Urushibara"],
            notable_arcs: ["D-Mail Experiments", "SERN Threat", "Mayuri's Death Loop", "Reaching Steins Gate"],
            ending_summary: "Okabe reaches the Steins Gate worldline where both Kurisu and Mayuri live. He deceives his past self by faking Kurisu's death to avoid a time paradox.",
            related: ["re zero", "erased", "madoka magica", "your name"]
        },

        "code geass": {
            title: "Code Geass: Lelouch of the Rebellion",
            author: "Ichiro Okouchi, Goro Taniguchi",
            studio: "Sunrise",
            years: "2006–2008",
            themes: ["rebellion", "sacrifice for peace", "ends justifying means", "identity", "colonialism"],
            power_system: "Geass — supernatural powers granted by Code bearers. Lelouch's Geass: absolute obedience (one-time command per person via eye contact). Others have different Geass abilities. Knightmare Frames (mecha).",
            characters: ["Lelouch vi Britannia (Zero)", "Suzaku Kururugi", "C.C.", "Kallen Kozuki", "Nunnally vi Britannia", "Cornelia", "Schneizel", "Euphemia"],
            notable_arcs: ["Black Knights Formation", "SAZ Massacre", "Black Rebellion", "Chinese Federation", "Emperor Charles", "Zero Requiem"],
            ending_summary: "Lelouch executes the Zero Requiem: he becomes the world's tyrant so Suzaku (disguised as Zero) can assassinate him, uniting the world against a common enemy. Peace is achieved through Lelouch's sacrifice.",
            related: ["death note", "attack on titan", "gundam", "psycho-pass"]
        },

        "psycho-pass": {
            title: "Psycho-Pass",
            author: "Gen Urobuchi",
            studio: "Production I.G",
            years: "2012–2014",
            themes: ["dystopia", "free will", "justice systems", "societal control", "what defines a criminal"],
            power_system: "Sibyl System — AI network that measures citizens' mental states (Psycho-Pass/Crime Coefficient). Dominators — guns that read Crime Coefficients and adjust from stun to lethal. Criminally Asymptomatic individuals can bypass detection.",
            characters: ["Akane Tsunemori", "Shinya Kogami", "Shogo Makishima", "Nobuchika Ginoza", "Shusei Kagari"],
            notable_arcs: ["Case 1 (Specimen Case)", "Makishima Arc", "Sibyl System Revelation"],
            ending_summary: "Kogami kills Makishima outside the system. Akane chooses to work within the flawed Sibyl System to change it from the inside.",
            related: ["death note", "ghost in the shell", "code geass", "monster"]
        },

        // ─────────────── ISEKAI / FANTASY ───────────────

        "sword art online": {
            title: "Sword Art Online",
            author: "Reki Kawahara",
            studio: "A-1 Pictures",
            years: "2012–2020",
            themes: ["virtual reality", "identity in digital worlds", "love", "what makes life real"],
            power_system: "VRMMORPG Mechanics — Sword Skills (system-assisted attacks), Incarnation System (Alicization — willpower shapes reality), Cardinal System (AI god of the game), fluctlight (human soul digitized).",
            characters: ["Kirito", "Asuna", "Sinon", "Leafa/Suguha", "Yui", "Klein", "Eugeo", "Alice Zuberg", "Kayaba Akihiko"],
            notable_arcs: ["Aincrad", "Fairy Dance", "Phantom Bullet", "Mother's Rosario", "Alicization", "War of Underworld"],
            ending_summary: "Kirito saves the Underworld and returns to the real world. He and Asuna continue their relationship. Alice becomes the first AI citizen.",
            related: ["solo leveling", "overlord", "no game no life", "mushoku tensei"]
        },

        "mushoku tensei": {
            title: "Mushoku Tensei: Jobless Reincarnation",
            author: "Rifujin na Magonote",
            studio: "Studio Bind",
            years: "2021–ongoing",
            themes: ["redemption", "second chances", "growing up", "consequence of actions"],
            power_system: "Magic Types: Attack, Healing, Detoxification, Barrier, Divine, Summoning. Ranked: Beginner → Intermediate → Advanced → Saint → King → Emperor → God. Touki (aura for melee fighters). Magic items/artifacts.",
            characters: ["Rudeus Greyrat", "Eris Boreas Greyrat", "Sylphiette", "Roxy Migurdia", "Paul Greyrat", "Orsted", "Hitogami"],
            notable_arcs: ["Buena Village", "Demon Continent", "Ranoa Magic Academy", "Teleport Labyrinth", "Turning Point arcs"],
            ending_summary: "Ongoing in anime — Rudeus eventually defeats Hitogami and lives a full life, dying of old age surrounded by family.",
            related: ["re zero", "konosuba", "solo leveling", "shield hero"]
        },

        "re zero": {
            title: "Re:Zero − Starting Life in Another World",
            author: "Tappei Nagatsuki",
            studio: "White Fox",
            years: "2016–ongoing",
            themes: ["suffering and resilience", "self-worth", "love", "what it means to be a hero"],
            power_system: "Return by Death — Subaru dies and resets to a checkpoint, retaining memories. He cannot tell anyone about this power. Witch Factors grant Authorities (Sloth, Greed, etc.). Spirit Arts and Divine Protections.",
            characters: ["Subaru Natsuki", "Emilia", "Rem", "Ram", "Beatrice", "Roswaal", "Echidna", "Reinhard van Astrea", "Petelgeuse Romani-Conti"],
            notable_arcs: ["Capital & Appa Seller", "Mansion/Rem arc", "White Whale/Sloth", "Sanctuary", "Watchtower"],
            ending_summary: "Ongoing — Subaru continues dying and resetting to save those he loves, slowly uncovering the mysteries of the Witch of Envy.",
            related: ["steins;gate", "mushoku tensei", "konosuba", "sword art online"]
        },

        "overlord": {
            title: "Overlord",
            author: "Kugane Maruyama",
            studio: "Madhouse",
            years: "2015–2022",
            themes: ["power without challenge", "loyalty", "what defines humanity", "building an empire"],
            power_system: "YGGDRASIL MMO System — Classes, levels (max 100), tiered magic (1st–10th + Super-Tier). World Items (game-breaking artifacts). New World modifiers: Wild Magic, Runecraft, Martial Arts.",
            characters: ["Ainz Ooal Gown (Momonga)", "Albedo", "Shalltear Bloodfallen", "Demiurge", "Cocytus", "Pandora's Actor", "Narberal Gamma"],
            notable_arcs: ["Carne Village", "Shalltear Brain-Wash", "Lizardman Arc", "Holy Kingdom", "Re-Estize Kingdom destruction"],
            ending_summary: "Ainz conquers much of the New World, establishing the Sorcerer Kingdom. The light novel continues beyond the anime.",
            related: ["solo leveling", "sword art online", "that time i got reincarnated as a slime", "log horizon"]
        },

        // ─────────────── MECHA / SCI-FI ───────────────

        "neon genesis evangelion": {
            title: "Neon Genesis Evangelion",
            author: "Hideaki Anno",
            studio: "Gainax / Khara (Rebuild)",
            years: "1995–1996 (TV), 2007–2021 (Rebuild)",
            themes: ["depression", "human connection", "escapism", "the hedgehog's dilemma", "existentialism"],
            power_system: "Eva Units — biomechanical giants piloted by children via nerve synchronization. AT Fields (absolute terror fields, barrier of the soul). Angels have unique abilities. Human Instrumentality Project merges all souls.",
            characters: ["Shinji Ikari", "Asuka Langley Soryu", "Rei Ayanami", "Misato Katsuragi", "Gendo Ikari", "Kaworu Nagisa", "Ritsuko Akagi"],
            notable_arcs: ["Angel Battles", "Asuka's Breakdown", "Third Impact", "End of Evangelion (alternate ending)", "Rebuild films 1.0–3.0+1.0"],
            ending_summary: "TV: Shinji accepts himself through Instrumentality. EoE: Shinji rejects Instrumentality, returns to reality with Asuka. Rebuild 3.0+1.0: Shinji erases the Evas and creates a world without them.",
            related: ["gurren lagann", "gundam", "darling in the franxx", "ghost in the shell"]
        },

        "cowboy bebop": {
            title: "Cowboy Bebop",
            author: "Shinichiro Watanabe (director)",
            studio: "Sunrise",
            years: "1998–1999",
            themes: ["existentialism", "loneliness", "running from the past", "jazz and freedom"],
            power_system: "No supernatural power system. Realistic space-age combat: firearms, martial arts (Jeet Kune Do), spacecraft dogfights. The characters' strength is their skill, wit, and determination.",
            characters: ["Spike Spiegel", "Jet Black", "Faye Valentine", "Edward Wong", "Ein", "Vicious", "Julia"],
            notable_arcs: ["Spike's Past (Vicious/Julia)", "Jet's Partner Betrayal", "Faye's Memory", "Ed's Father", "The Real Folk Blues (finale)"],
            ending_summary: "Spike confronts Vicious and kills him but is fatally wounded. He collapses on the syndicate steps, mimicking a gun with his finger — 'Bang.' His fate is left ambiguous. The Bebop crew scatters.",
            related: ["samurai champloo", "trigun", "ghost in the shell", "black lagoon"]
        },

        // ─────────────── SPORTS / UNIQUE ───────────────

        "blue lock": {
            title: "Blue Lock",
            author: "Muneyuki Kaneshiro, Yusuke Nomura",
            studio: "8bit",
            years: "2022–ongoing",
            themes: ["ego", "survival of the fittest", "individual talent vs teamwork", "breaking mental limits"],
            power_system: "No supernatural powers. Ego-driven soccer philosophy: Flow State (chemical lock, zone), Spatial Awareness, Meta Vision, Direct Shot. Jinpachi Ego's methodology: the world's best striker is the most selfish.",
            characters: ["Yoichi Isagi", "Meguru Bachira", "Seishiro Nagi", "Hyoma Chigiri", "Rin Itoshi", "Sae Itoshi", "Jinpachi Ego", "Reo Mikage"],
            notable_arcs: ["First Selection", "Second Selection", "Third Selection", "U-20 Match", "Neo Egoist League"],
            ending_summary: "Ongoing — Isagi progresses through Blue Lock to become Japan's ultimate striker for the World Cup.",
            related: ["haikyuu", "slam dunk", "kuroko no basket", "hajime no ippo"]
        },

        "haikyuu": {
            title: "Haikyuu!!",
            author: "Haruichi Furudate",
            studio: "Production I.G",
            years: "2014–2020 (TV), 2024 (films)",
            themes: ["teamwork", "growth through failure", "rivals who push each other", "flying"],
            power_system: "No powers — pure volleyball technique and athleticism. Key concepts: quick attacks, blocking systems, serve receives, setter strategy, mental warfare, the 'view from the top'.",
            characters: ["Shoyo Hinata", "Tobio Kageyama", "Kei Tsukishima", "Daichi Sawamura", "Toru Oikawa", "Wakatoshi Ushijima", "Atsumu Miya", "Kenma Kozume"],
            notable_arcs: ["Aoba Johsai matches", "Training Camp", "Shiratorizawa", "Nationals", "Inarizaki", "Kamomedai"],
            ending_summary: "The manga timeskip shows Hinata playing professional beach volleyball in Brazil, then returning to Japan to join a V.League team. He and Kageyama become internationally famous rivals/teammates.",
            related: ["blue lock", "slam dunk", "kuroko no basket", "ace of diamond"]
        },

        // ─────────────── EMOTIONAL / SLICE OF LIFE ───────────────

        "violet evergarden": {
            title: "Violet Evergarden",
            author: "Kana Akatsuki",
            studio: "Kyoto Animation",
            years: "2018",
            themes: ["understanding love", "war trauma", "healing through connection", "the power of words"],
            power_system: "No power system. Violet's mechanical arms reflect her transition from weapon to human. The story's strength is emotional — Auto Memory Dolls write letters that convey unspoken feelings.",
            characters: ["Violet Evergarden", "Gilbert Bougainvillea", "Claudia Hodgins", "Cattleya Baudelaire", "Iris Cannary", "Luculia Marlborough", "Ann Magnolia"],
            notable_arcs: ["Episode 7 (Playwright)", "Episode 10 (Ann's Letters)", "Episode 13 (Bridge Battle)", "Movie"],
            ending_summary: "Violet discovers Gilbert is alive on an island. She reunites with him, finally understanding the meaning of 'I love you.'",
            related: ["a silent voice", "your lie in april", "clannad", "anohana"]
        },

        "your lie in april": {
            title: "Your Lie in April (Shigatsu wa Kimi no Uso)",
            author: "Naoshi Arakawa",
            studio: "A-1 Pictures",
            years: "2014–2015",
            themes: ["music as expression", "grief and healing", "living fully", "unrequited love"],
            power_system: "No power system. Classical music performance (piano, violin) serves as the medium for emotional expression and character development.",
            characters: ["Kousei Arima", "Kaori Miyazono", "Tsubaki Sawabe", "Ryota Watari", "Hiroko Seto"],
            notable_arcs: ["Kaori's Introduction", "Kousei's Trauma Recovery", "Competition Arcs", "Kaori's Hospitalization"],
            ending_summary: "Kaori dies from her illness. Her letter reveals she always loved Kousei (not Watari). The 'lie in April' was her pretending to like Watari to get close to Kousei. Kousei continues playing piano, carrying her memory.",
            related: ["violet evergarden", "clannad", "a silent voice", "anohana"]
        },

        // ─────────────── CLASSIC / SEINEN ───────────────

        "fullmetal alchemist brotherhood": {
            title: "Fullmetal Alchemist: Brotherhood",
            author: "Hiromu Arakawa",
            studio: "Bones",
            years: "2009–2010",
            themes: ["equivalent exchange", "ambition vs ethics", "brotherhood", "the value of life"],
            power_system: "Alchemy — transmutation circles reshape matter following the Law of Equivalent Exchange. Philosopher's Stone (bypasses limits using human souls). Alkahestry (Xingese variant for healing). Homunculi possess unique powers.",
            characters: ["Edward Elric", "Alphonse Elric", "Roy Mustang", "Riza Hawkeye", "Winry Rockbell", "Scar", "King Bradley (Wrath)", "Father", "Ling Yao/Greed"],
            notable_arcs: ["Nina Tucker", "Laboratory 5", "Rush Valley", "Ishval Flashback", "Briggs", "The Promised Day"],
            ending_summary: "Edward sacrifices his Gate of Truth (ability to use alchemy) to bring back Alphonse's body. Father is destroyed. Ed and Winry marry. Al travels east to study alkahestry.",
            related: ["hunter x hunter", "attack on titan", "code geass", "steins;gate"]
        },

        "vinland saga": {
            title: "Vinland Saga",
            author: "Makoto Yukimura",
            studio: "WIT Studio (S1), MAPPA (S2)",
            years: "2019–2024",
            themes: ["revenge vs peace", "what is a true warrior", "atonement", "the futility of violence"],
            power_system: "No supernatural powers. Realistic Viking-era combat: swordsmanship, archery, seamanship. Thorfinn's arc transitions from violence-driven revenge to pacifist ideals.",
            characters: ["Thorfinn", "Askeladd", "Canute", "Thorkell", "Leif Erikson", "Einar", "Snake", "Hild"],
            notable_arcs: ["War Arc (childhood)", "Askeladd's Gambit", "Farmland Saga (atonement)", "Eastern Expedition"],
            ending_summary: "Season 2 ends with Thorfinn vowing to create a peaceful land (Vinland) free from war and slavery. The manga follows his journey to the New World.",
            related: ["berserk", "attack on titan", "kingdom", "golden kamuy"]
        },

        "berserk": {
            title: "Berserk",
            author: "Kentaro Miura (continued by Studio Gaga)",
            studio: "OLM (1997), GEMBA/Millepensee (2016)",
            years: "1997 (anime), 1989–ongoing (manga)",
            themes: ["struggle against fate", "the cost of ambition", "human resilience", "darkness and hope"],
            power_system: "Brand of Sacrifice — marks Guts as prey for demons. Berserker Armor (enhances abilities at the cost of sanity). Behelits summon the God Hand. Apostles are humans who sacrificed loved ones for power.",
            characters: ["Guts", "Griffith/Femto", "Casca", "Puck", "Serpico", "Schierke", "Skull Knight", "Zodd", "Void"],
            notable_arcs: ["Golden Age (Band of the Hawk)", "The Eclipse", "Conviction", "Millennium Falcon", "Fantasia (Elf Island)"],
            ending_summary: "Manga: After decades of pursuit, Guts reaches Elfhelm where Casca's mind is restored. Post-Miura, Studio Gaga continues — Griffith and Guts' final confrontation remains ahead.",
            related: ["vinland saga", "claymore", "attack on titan", "dark souls (games)"]
        },

        "tokyo ghoul": {
            title: "Tokyo Ghoul",
            author: "Sui Ishida",
            studio: "Pierrot",
            years: "2014–2018",
            themes: ["identity crisis", "what makes a monster", "prejudice", "the grey area of morality"],
            power_system: "Kagune — predatory organs unique to ghouls, manifested from RC Cells. Four types: Ukaku (wing), Koukaku (shoulder blade), Rinkaku (back), Bikaku (tail). Kakuja (evolution from cannibalism). Quinque (weapons crafted from ghoul kagune).",
            characters: ["Ken Kaneki", "Touka Kirishima", "Shuu Tsukiyama", "Hideyoshi Nagachika", "Kishou Arima", "Rize Kamishiro", "Juuzou Suzuya"],
            notable_arcs: ["Gourmet Arc", "Aogiri Tree", "Cochlea Raid", "Anteiku Raid", "Rue Island", "Dragon"],
            ending_summary: "Kaneki becomes the Dragon, a massive kagune entity. He is saved by his friends. Kaneki and Touka marry and have a daughter. Ghouls and humans begin coexisting.",
            related: ["parasyte", "death note", "jujutsu kaisen", "claymore"]
        },

        "mob psycho 100": {
            title: "Mob Psycho 100",
            author: "ONE",
            studio: "Bones",
            years: "2016–2023",
            themes: ["self-improvement", "psychic power don't define worth", "growing up", "empathy"],
            power_system: "Psychic Powers — ESP including telekinesis, pyrokinesis, astral projection, spiritual attacks. Mob's emotion meter (explodes at 100%). Arataka Reigen has no powers but relies on charisma and common sense.",
            characters: ["Shigeo Kageyama (Mob)", "Arataka Reigen", "Ritsu Kageyama", "Dimple", "Teruki Hanazawa", "Sho Suzuki", "Toichiro Suzuki"],
            notable_arcs: ["LOL Cult", "Teruki Fight", "7th Division", "World Domination Arc", "Broccoli Tree", "???% Rampage (S3)"],
            ending_summary: "Mob learns to express his feelings, confesses to Tsubomi (gets rejected), and grows as a person. He succeeds not through power but through genuine human connection.",
            related: ["one punch man", "chainsaw man", "saiki k", "dandadan"]
        },

        "one punch man": {
            title: "One Punch Man",
            author: "ONE (story), Yusuke Murata (manga art)",
            studio: "Madhouse (S1), J.C.Staff (S2)",
            years: "2015–2019",
            themes: ["existential boredom of power", "what makes a hero", "satire of shonen tropes"],
            power_system: "No formal system — heroes are ranked by the Hero Association (C→B→A→S class). Saitama has unlimited strength due to his training. Monsters are ranked by Disaster Level (Wolf→Tiger→Demon→Dragon→God).",
            characters: ["Saitama", "Genos", "Garou", "Tatsumaki", "King", "Bang (Silver Fang)", "Fubuki", "Boros", "Speed-o'-Sound Sonic"],
            notable_arcs: ["Hero Registration", "Boros Invasion", "Monster Association", "Garou Arc"],
            ending_summary: "Ongoing — Saitama defeats Garou (Cosmic Fear Mode) and reality is reset via time-travel punch. Saitama continues searching for a worthy opponent.",
            related: ["mob psycho 100", "dragon ball z", "my hero academia", "saiki k"]
        },

        // ─────────────── ADDITIONAL POPULAR SERIES ───────────────

        "fairy tail": {
            title: "Fairy Tail",
            author: "Hiro Mashima",
            studio: "A-1 Pictures / Satelight / Bridge",
            years: "2009–2019",
            themes: ["friendship", "guild as family", "never giving up", "bonds transcending blood"],
            power_system: "Magic — mages use various forms: Dragon Slayer (consuming elements), Celestial Spirit (summoning), Requip (weapon switching), Maker Magic (ice/wood creation). Ethernano (atmospheric magic particles).",
            characters: ["Natsu Dragneel", "Lucy Heartfilia", "Gray Fullbuster", "Erza Scarlet", "Happy", "Wendy Marvell", "Gajeel", "Makarov Dreyar", "Zeref", "Acnologia"],
            notable_arcs: ["Phantom Lord", "Tower of Heaven", "Oracion Seis", "Edolas", "Tenrou Island", "Grand Magic Games", "Tartaros", "Alvarez Empire"],
            ending_summary: "Natsu defeats Zeref and Acnologia. Fairy Tail is restored. Lucy continues writing her novel. Natsu, Lucy, and Happy go on more adventures.",
            related: ["one piece", "naruto", "black clover", "rave master"]
        },

        "gintama": {
            title: "Gintama",
            author: "Hideaki Sorachi",
            studio: "Sunrise / Bandai Namco Pictures",
            years: "2006–2021",
            themes: ["comedy meets drama", "finding purpose", "protecting what matters", "parody and satire"],
            power_system: "Edo-period Japan invaded by aliens (Amanto). Mix of samurai swordplay, alien technology, and bizarre comedy. No formal power system — pure skill, determination, and comedic timing.",
            characters: ["Gintoki Sakata", "Shinpachi Shimura", "Kagura", "Kotaro Katsura", "Shinsuke Takasugi", "Shoyo Yoshida", "Sadaharu"],
            notable_arcs: ["Benizakura", "Yoshiwara in Flames", "Shinsengumi Crisis", "Shogun Assassination", "Rakuyo", "Silver Soul"],
            ending_summary: "Gintoki and friends defeat Utsuro and save Earth. The Odd Jobs trio continues their chaotic daily lives in Kabuki-cho.",
            related: ["one piece", "saiki k", "daily lives of high school boys"]
        },

        "ghost in the shell": {
            title: "Ghost in the Shell: Stand Alone Complex",
            author: "Masamune Shirow (manga), Kenji Kamiyama (SAC director)",
            studio: "Production I.G",
            years: "2002–2005 (SAC), 1995 (film)",
            themes: ["consciousness", "what defines humanity", "cybernetics", "political intrigue"],
            power_system: "Cyberbrain — humans with cyber-augmented brains can hack, communicate wirelessly, and interface with machines. Full-body cyborg conversion (prosthetic bodies). Tachikoma (AI spider-tanks with emerging sentience).",
            characters: ["Major Motoko Kusanagi", "Batou", "Togusa", "Aramaki", "Tachikoma", "Laughing Man", "Kuze"],
            notable_arcs: ["Laughing Man Case (S1)", "Individual Eleven (S2)", "Solid State Society"],
            ending_summary: "SAC: Section 9 resolves the Laughing Man and Individual Eleven cases. The Major questions her identity while continuing black ops. The 1995 film: The Major merges with the Puppet Master, transcending humanity.",
            related: ["psycho-pass", "serial experiments lain", "akira", "cyberpunk edgerunners"]
        },

        "made in abyss": {
            title: "Made in Abyss",
            author: "Akihito Tsukushi",
            studio: "Kinema Citrus",
            years: "2017–2022",
            themes: ["curiosity vs danger", "the cost of adventure", "loss of innocence", "the unknown"],
            power_system: "The Abyss — a massive pit with increasing dangers per layer. Curse of the Abyss affects ascending travelers (nausea→bleeding→loss of humanity→death). Relics are ancient artifacts with unique powers. Praying Hands/Cartridges mitigate the curse at great cost.",
            characters: ["Riko", "Reg", "Nanachi", "Mitty", "Bondrewd", "Faputa", "Ozen", "Lyza"],
            notable_arcs: ["Seeker Camp", "Nanachi & Mitty", "Bondrewd (Movie 3)", "Iruburu Village"],
            ending_summary: "Ongoing — Riko, Reg, and Nanachi continue descending deeper into the Abyss, leaving the village of Iruburu behind.",
            related: ["frieren", "hunter x hunter", "promised neverland", "land of the lustrous"]
        },

        "konosuba": {
            title: "KonoSuba: God's Blessing on This Wonderful World!",
            author: "Natsume Akatsuki",
            studio: "Studio Deen / Drive",
            years: "2016–2024",
            themes: ["comedy", "isekai parody", "dysfunctional teamwork", "absurdist humor"],
            power_system: "RPG-style fantasy world with classes, skills, and quests. Adventurer Guild ranking. Each party member has broken-but-useless powers: Aqua (powerful but stupid goddess), Megumin (one explosion per day), Darkness (misses every swing).",
            characters: ["Kazuma Satou", "Aqua", "Megumin", "Darkness (Lalatina)", "Wiz", "Yunyun", "Vanir", "Chris/Eris"],
            notable_arcs: ["Verdia the Headless Knight", "Mobile Fortress Destroyer", "Hot Springs Town", "Crimson Demon Village"],
            ending_summary: "Light novel: Kazuma defeats the Demon King and chooses to stay in the fantasy world with his party. The movie adapted volumes 5+.",
            related: ["re zero", "mushoku tensei", "overlord", "that time i got reincarnated as a slime"]
        },

        "dorohedoro": {
            title: "Dorohedoro",
            author: "Q Hayashida",
            studio: "MAPPA",
            years: "2020",
            themes: ["identity", "class warfare", "grotesque beauty", "found family in chaos"],
            power_system: "Smoke Magic — sorcerers produce smoke from their bodies that manifests unique magic (rain of mushrooms, time control, zombification, etc.). Devils exist as the ultimate magical beings. The Hole (non-magic human realm) vs. Sorcerer realm.",
            characters: ["Caiman", "Nikaido", "Shin", "Noi", "En", "Ebisu", "Fujita", "Risu", "Chidaruma"],
            notable_arcs: ["Caiman's Identity", "En Family", "Cross-Eyes", "Hole arc"],
            ending_summary: "Caiman's true identity is revealed as Ai Coleman. The curse is broken. Caiman and Nikaido continue their gyoza restaurant life in the Hole.",
            related: ["chainsaw man", "berserk", "jujutsu kaisen", "mob psycho 100"]
        }
    };

    // ═══════════════════════════ LOOKUP FUNCTIONS ═══════════════════════════

    /**
     * Find knowledge entry by title (fuzzy match).
     * @param {string} query — anime title or partial match
     * @returns {object|null} — knowledge entry or null
     */
    function lookup(query) {
        if (!query) return null;
        const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        // Exact key match
        if (DATABASE[q]) return { key: q, ...DATABASE[q] };

        // Check if query is a substring of any key or vice versa
        for (const [key, data] of Object.entries(DATABASE)) {
            if (q.includes(key) || key.includes(q)) {
                return { key, ...data };
            }
        }

        // Check against titles
        for (const [key, data] of Object.entries(DATABASE)) {
            const titleNorm = data.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
            if (titleNorm.includes(q) || q.includes(titleNorm.split('(')[0].trim())) {
                return { key, ...data };
            }
        }

        // Check character lists
        for (const [key, data] of Object.entries(DATABASE)) {
            const charMatch = data.characters.some(c =>
                c.toLowerCase().includes(q) || q.includes(c.toLowerCase().split(' ')[0])
            );
            if (charMatch) return { key, ...data };
        }

        return null;
    }

    /**
     * Get related anime knowledge for a given anime.
     * @param {string} key — database key
     * @returns {Array<object>} — array of related knowledge entries
     */
    function getRelated(key) {
        const entry = DATABASE[key];
        if (!entry || !entry.related) return [];
        return entry.related
            .map(r => DATABASE[r] ? { key: r, ...DATABASE[r] } : null)
            .filter(Boolean);
    }

    /**
     * Search knowledge base by theme.
     * @param {string} theme — theme keyword
     * @returns {Array<object>} — matching entries
     */
    function searchByTheme(theme) {
        const t = theme.toLowerCase();
        return Object.entries(DATABASE)
            .filter(([_, data]) => data.themes.some(th => th.includes(t)))
            .map(([key, data]) => ({ key, ...data }));
    }

    /**
     * Search knowledge base by studio.
     * @param {string} studio — studio name
     * @returns {Array<object>} — matching entries
     */
    function searchByStudio(studio) {
        const s = studio.toLowerCase();
        return Object.entries(DATABASE)
            .filter(([_, data]) => data.studio.toLowerCase().includes(s))
            .map(([key, data]) => ({ key, ...data }));
    }

    /**
     * Build LLM context string from a knowledge entry.
     * @param {object} knowledge — knowledge entry from lookup()
     * @returns {string} — formatted context block
     */
    function buildKnowledgeContext(knowledge) {
        if (!knowledge) return '';

        let ctx = `\n[ANIMESENSE KNOWLEDGE BASE]\n`;
        ctx += `Title: ${knowledge.title}\n`;
        ctx += `Author/Creator: ${knowledge.author}\n`;
        ctx += `Studio: ${knowledge.studio}\n`;
        ctx += `Years: ${knowledge.years}\n`;
        ctx += `Themes: ${knowledge.themes.join(', ')}\n`;
        ctx += `Power System: ${knowledge.power_system}\n`;
        ctx += `Key Characters: ${knowledge.characters.join(', ')}\n`;

        if (knowledge.notable_arcs) {
            ctx += `Notable Arcs: ${knowledge.notable_arcs.join(', ')}\n`;
        }
        if (knowledge.ending_summary) {
            ctx += `Ending: ${knowledge.ending_summary}\n`;
        }
        if (knowledge.related) {
            ctx += `Related Anime: ${knowledge.related.join(', ')}\n`;
        }

        return ctx;
    }

    /**
     * Get all database keys (for stats/debugging).
     */
    function getAllKeys() {
        return Object.keys(DATABASE);
    }

    /**
     * Get total count of anime in the knowledge base.
     */
    function getCount() {
        return Object.keys(DATABASE).length;
    }

    // ═══════════════════════════ PUBLIC API ═══════════════════════════

    return {
        lookup,
        getRelated,
        searchByTheme,
        searchByStudio,
        buildKnowledgeContext,
        getAllKeys,
        getCount,
        DATABASE
    };

})();
