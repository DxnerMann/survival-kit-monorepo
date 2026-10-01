INSERT INTO quicklinks (
    id,
    title,
    description,
    url,
    clickedThisMonth,
    clickedOverall,
    favouriteCount,
    approvedByAdmin,
    addedAt,
    lastUpdated,
    lastReset
) VALUES
    (
        'qwop',
        'QWOP',
        'Lauf 100 Meter. Du darfst nur Q, W, O und P benutzen.',
        'https://www.foddy.net/Athletics.html',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'paperclips',
        'Universal Paperclips',
        'Du produzierst Büroklammern. Irgendwann die ganze Galaxie.',
        'https://www.decisionproblem.com/paperclips/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'little-alchemy-2',
        'Little Alchemy 2',
        'Mische Elemente und schau zu, wie aus Luft und Feuer ein Drache wird.',
        'https://littlealchemy2.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'skribbl',
        'Skribbl.io',
        'Jemand malt grauenhaft, alle anderen raten. Klassiker für die Vorlesung.',
        'https://skribbl.io/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'game-2048',
        '2048',
        'Schiebe Zahlen, bis 2048 erscheint oder die Vorlesung vorbei ist.',
        'https://play2048.co/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'slither',
        'Slither.io',
        'Eine Schlange, die andere Schlangen frisst. Mehr braucht es nicht.',
        'https://slither.io/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'globle',
        'Globle',
        'Finde das Land des Tages. Jeder Tipp färbt die Weltkarte.',
        'https://globle-game.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'worldle',
        'Worldle',
        'Erkenne das Land nur an seiner Silhouette.',
        'https://worldle.teuteuf.fr/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'semantle',
        'Semantle',
        'Ein Wort des Tages. Deine Tipps werden nach Bedeutung bewertet.',
        'https://semantle.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'timeguessr',
        'TimeGuessr',
        'Wo und wann wurde dieses Foto gemacht?',
        'https://timeguessr.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'framed',
        'Framed',
        'Ein Filmbild pro Tipp. Sechs Versuche, den Film zu erkennen.',
        'https://framed.wtf/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'dark-room',
        'A Dark Room',
        'Du erwachst in einem dunklen Raum. Dann eskaliert alles.',
        'https://adarkroom.doublespeakgames.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'cat-bounce',
        'Cat Bounce',
        'Katzen fallen. Du lässt sie hüpfen. Das ist das ganze Spiel.',
        'https://cat-bounce.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'bonk',
        'Bonk.io',
        'Physik-Prügeleien mit runden Figuren und selbst gebauten Arenen.',
        'https://bonk.io/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'sandspiel',
        'Sandspiel',
        'Ein Sandkasten aus Pixeln. Feuer, Wasser, Pflanzen und Chaos.',
        'https://sandspiel.club/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'city-guesser',
        'City Guesser',
        'Ein Straßenclip, und du rätst die Stadt. Meistens liegst du daneben.',
        'https://cityguesser.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'flagle',
        'Flagle',
        'Errate das Land anhand seiner Flagge. Die Farben helfen selten.',
        'https://flagle.io/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'costcodle',
        'Costcodle',
        'Wordle, aber der Supermarkt hat die Wörter ausgesucht.',
        'https://costcodle.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'metazooa',
        'Metazooa',
        'Finde das Tier des Tages, indem du den Stammbaum entlangtippst.',
        'https://metazooa.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    ),
    (
        'foodguessr',
        'FoodGuessr',
        'Ein Foto von einem Gericht. Wo auf der Welt wird das gegessen?',
        'https://foodguessr.com/',
        0, 0, 0, true, NOW(), NOW(), NOW()
    )
ON CONFLICT (id) DO NOTHING;
