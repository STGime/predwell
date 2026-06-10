type Entry = { en: string; de: string }

export const translations = {
  // Header
  'nav.tagline': { en: 'Berlin renter intelligence', de: 'Berliner Mieter-Intelligenz' },

  // Landing hero
  'hero.eyebrow': { en: 'Predictive apartment search', de: 'Vorausschauende Wohnungssuche' },
  'hero.title': {
    en: "Find Your Berlin Apartment Before It's Listed",
    de: 'Finde deine Berliner Wohnung, bevor sie inseriert wird',
  },
  'hero.lead': {
    en: 'Predwell aggregates listings from Immoscout, agencies, and local feeds, matches them with historical availability data, and predicts where apartments are likely to open next — so you can contact landlords first.',
    de: 'Predwell sammelt Inserate von Immoscout, Hausverwaltungen und lokalen Quellen, gleicht sie mit historischen Verfügbarkeitsdaten ab und sagt vorher, wo als Nächstes Wohnungen frei werden — damit du Vermieter zuerst kontaktierst.',
  },
  'hero.cta.free': { en: 'Try Free – No Credit Card Required', de: 'Kostenlos testen – ohne Kreditkarte' },
  'hero.cta.how': { en: 'See how it works', de: 'So funktioniert es' },
  'hero.freeNote': {
    en: 'Run one free apartment report first. No card, no checkout, no commitment.',
    de: 'Starte mit einem kostenlosen Wohnungs-Report. Keine Karte, kein Checkout, keine Verpflichtung.',
  },

  // Forecast card
  'forecast.topline.left': { en: 'Availability forecast', de: 'Verfügbarkeits-Prognose' },
  'forecast.topline.right': { en: 'Berlin', de: 'Berlin' },
  'forecast.metric.window': { en: 'early window', de: 'Vorlauf' },
  'forecast.metric.feeds': { en: 'agency feeds', de: 'Verwalter-Feeds' },
  'forecast.metric.contact': { en: 'landlord contact', de: 'Vermieter-Kontakt' },

  // How it works
  'how.title': { en: 'Signal beats scrolling.', de: 'Signal schlägt Scrollen.' },
  'how.copy': {
    en: 'Instead of refreshing listing portals all day, Predwell turns scattered rental data into a ranked watchlist of buildings, neighborhoods, and agencies that are most likely to surface your next apartment.',
    de: 'Statt den ganzen Tag Portale zu aktualisieren, macht Predwell aus verstreuten Mietdaten eine priorisierte Watchlist von Häusern, Kiezen und Verwaltungen, bei denen deine nächste Wohnung am wahrscheinlichsten auftaucht.',
  },
  'how.step1.title': { en: 'Collect the market', de: 'Den Markt erfassen' },
  'how.step1.copy': {
    en: 'Pull listings from Immoscout, agencies, property managers, and niche local sources.',
    de: 'Inserate von Immoscout, Maklern, Hausverwaltungen und lokalen Nischenquellen einsammeln.',
  },
  'how.step2.title': { en: 'Match against history', de: 'Mit Historie abgleichen' },
  'how.step2.copy': {
    en: 'Compare fresh supply with historical rent, vacancy, timing, and source patterns.',
    de: 'Neues Angebot mit historischen Miet-, Leerstands-, Timing- und Quellenmustern vergleichen.',
  },
  'how.step3.title': { en: 'Move before the crowd', de: 'Schneller als die Masse' },
  'how.step3.copy': {
    en: 'Get a prioritized target list so you can contact landlords before listings go public.',
    de: 'Erhalte eine priorisierte Zielliste und kontaktiere Vermieter, bevor Inserate öffentlich werden.',
  },

  // Free report / access section
  'access.eyebrow': { en: 'One free agent run', de: 'Ein kostenloser Agent-Lauf' },
  'access.title': { en: 'Get your free apartment report.', de: 'Hol dir deinen kostenlosen Wohnungs-Report.' },
  'access.copy': {
    en: 'Start with one Predwell search on your Berlin apartment criteria. When the report is complete, we will show the next-best neighborhoods and ask you to subscribe only if you want more runs.',
    de: 'Starte mit einer Predwell-Suche nach deinen Berliner Wohnungskriterien. Nach dem Report zeigen wir dir die besten Kieze — ein Abo brauchst du nur für weitere Läufe.',
  },
  'report.title': { en: 'Try Predwell free.', de: 'Predwell kostenlos testen.' },
  'report.copy': {
    en: 'Tell the agent what you are looking for. Your first prediction report is free; after that, subscribe for €19/month to run unlimited searches and get early alerts.',
    de: 'Sag dem Agenten, was du suchst. Dein erster Prognose-Report ist kostenlos; danach gibt es unbegrenzte Suchen und Früh-Alerts für 19 €/Monat.',
  },
  'report.budget': { en: 'Monthly budget', de: 'Monatsbudget' },
  'report.bedrooms': { en: 'Bedrooms', de: 'Zimmer' },
  'report.rooms.1': { en: '1 room', de: '1 Zimmer' },
  'report.rooms.2': { en: '2 rooms', de: '2 Zimmer' },
  'report.rooms.3plus': { en: '3+ rooms', de: '3+ Zimmer' },
  'report.areas': { en: 'Preferred areas', de: 'Bevorzugte Kieze' },
  'report.areas.placeholder': {
    en: 'Wedding, Neukölln, Friedrichshain',
    de: 'Wedding, Neukölln, Friedrichshain',
  },
  'report.submit': { en: 'Run My Free Apartment Report', de: 'Kostenlosen Wohnungs-Report starten' },
  'report.note': {
    en: 'No credit card required. This browser gets one free Predwell agent run.',
    de: 'Keine Kreditkarte nötig. Dieser Browser bekommt einen kostenlosen Predwell-Lauf.',
  },
  'report.running': { en: 'Predwell is scanning the feeds…', de: 'Predwell durchsucht die Feeds…' },
  'report.ready': { en: 'Your free Predwell report is ready.', de: 'Dein kostenloser Predwell-Report ist fertig.' },
  'report.line.match': {
    en: '{districts} show the strongest match for {bedrooms} around {budget}.',
    de: '{districts} passen am besten zu {bedrooms} um {budget}.',
  },
  'report.line.velocity': {
    en: 'Agency feed velocity is highest {peak}; contact likely landlords before public listings peak.',
    de: 'Die Feed-Aktivität der Verwalter ist {peak} am höchsten; kontaktiere Vermieter, bevor die Inserate öffentlich werden.',
  },
  'report.line.feeds': {
    en: 'We found {count} monitored feeds that can keep watching for openings similar to this search.',
    de: 'Wir haben {count} überwachte Feeds gefunden, die weiter nach ähnlichen Wohnungen suchen können.',
  },
  'report.peak.earlyWeek': { en: 'early in the week', de: 'früh in der Woche' },
  'report.peak.midWeek': { en: 'mid-week', de: 'in der Wochenmitte' },
  'report.peak.weekend': { en: 'on weekends', de: 'am Wochenende' },

  // Paywall
  'paywall.title': { en: 'You’ve used your free search.', de: 'Du hast deine kostenlose Suche genutzt.' },
  'paywall.copy': {
    en: 'Subscribe for €19/month to run unlimited searches, keep Predwell watching Berlin feeds, and get early alerts before listings reach the public portals.',
    de: 'Abonniere für 19 €/Monat: unbegrenzte Suchen, Predwell beobachtet die Berliner Feeds und du bekommst Früh-Alerts, bevor Inserate auf den Portalen landen.',
  },
  'paywall.cta': { en: 'Subscribe to Continue', de: 'Abonnieren und weitermachen' },

  // Lead capture
  'lead.label': { en: 'Email me this report', de: 'Report per E-Mail schicken' },
  'lead.placeholder': { en: 'you@example.com', de: 'du@beispiel.de' },
  'lead.submit': { en: 'Send', de: 'Senden' },
  'lead.done': {
    en: 'Saved — we will email you this report and future Berlin signals.',
    de: 'Gespeichert — wir schicken dir den Report und künftige Berlin-Signale per E-Mail.',
  },

  // Footer
  'footer.left': {
    en: 'Predwell helps renters search Berlin with better timing.',
    de: 'Predwell hilft Mietern, Berlin mit besserem Timing zu durchsuchen.',
  },
  'footer.right': { en: 'One free report · Predwell Pro after that', de: 'Ein Gratis-Report · danach Predwell Pro' },

  // Auth
  'auth.signup.title': { en: 'Create your account.', de: 'Konto erstellen.' },
  'auth.signup.copy': {
    en: 'Predwell keeps watching Berlin feeds for you. Sign up to save your search and get matches.',
    de: 'Predwell beobachtet die Berliner Feeds für dich. Registriere dich, um deine Suche zu speichern und Treffer zu bekommen.',
  },
  'auth.login.title': { en: 'Welcome back.', de: 'Willkommen zurück.' },
  'auth.email': { en: 'Email', de: 'E-Mail' },
  'auth.password': { en: 'Password', de: 'Passwort' },
  'auth.signup.submit': { en: 'Sign up', de: 'Registrieren' },
  'auth.login.submit': { en: 'Log in', de: 'Anmelden' },
  'auth.haveAccount': { en: 'Already have an account? Log in', de: 'Schon ein Konto? Anmelden' },
  'auth.noAccount': { en: 'New to Predwell? Sign up', de: 'Neu bei Predwell? Registrieren' },

  // Onboarding
  'onboarding.eyebrow': { en: 'Two minutes to set up', de: 'In zwei Minuten eingerichtet' },
  'onboarding.title': { en: 'What should Predwell watch for?', de: 'Wonach soll Predwell suchen?' },
  'onboarding.name': { en: 'Profile name', de: 'Profilname' },
  'onboarding.name.placeholder': { en: 'My Berlin search', de: 'Meine Berlin-Suche' },
  'onboarding.districts': { en: 'Districts', de: 'Bezirke' },
  'onboarding.submit': { en: 'Start watching', de: 'Beobachtung starten' },

  // Dashboard
  'app.matches': { en: 'Match feed', de: 'Treffer-Feed' },
  'app.matches.empty': {
    en: 'No matches yet. Predwell is watching the feeds — new matches appear here live.',
    de: 'Noch keine Treffer. Predwell beobachtet die Feeds — neue Treffer erscheinen hier live.',
  },
  'app.profiles': { en: 'Search profiles', de: 'Suchprofile' },
  'app.outlook': { en: 'District outlook', de: 'Bezirks-Ausblick' },
  'app.settings': { en: 'Settings', de: 'Einstellungen' },
  'app.logout': { en: 'Log out', de: 'Abmelden' },
  'app.firstSeen': { en: 'first seen {time}', de: 'zuerst gesehen {time}' },
  'app.score': { en: 'match', de: 'Treffer' },
  'app.status.new': { en: 'New', de: 'Neu' },
  'app.status.seen': { en: 'Seen', de: 'Gesehen' },
  'app.status.contacted': { en: 'Contacted', de: 'Kontaktiert' },
  'app.status.applied': { en: 'Applied', de: 'Beworben' },
  'app.status.viewing': { en: 'Viewing', de: 'Besichtigung' },
  'app.status.rejected': { en: 'Rejected', de: 'Absage' },
  'app.status.won': { en: 'Won', de: 'Zusage' },
  'app.newProfile': { en: 'New profile', de: 'Neues Profil' },
  'app.editProfile': { en: 'Edit profile', de: 'Profil bearbeiten' },
  'app.save': { en: 'Save', de: 'Speichern' },
  'app.delete': { en: 'Delete', de: 'Löschen' },
  'app.budgetMax': { en: 'Max budget (warm)', de: 'Max. Budget (warm)' },
  'app.roomsMin': { en: 'Min rooms', de: 'Min. Zimmer' },
  'app.active': { en: 'Active', de: 'Aktiv' },
  'app.openListing': { en: 'View listing', de: 'Inserat ansehen' },

  // Settings / subscription
  'settings.account': { en: 'Account', de: 'Konto' },
  'settings.subscription': { en: 'Subscription', de: 'Abo' },
  'settings.plan.free': { en: 'Free — 1 search profile', de: 'Free — 1 Suchprofil' },
  'settings.plan.pro': { en: 'Predwell Pro — unlimited runs, 3 profiles, early alerts', de: 'Predwell Pro — unbegrenzte Läufe, 3 Profile, Früh-Alerts' },
  'settings.upgrade': { en: 'Upgrade to Pro — €19/month', de: 'Auf Pro upgraden — 19 €/Monat' },
  'settings.manage': { en: 'Status: {status}', de: 'Status: {status}' },

  // Misc
  'error.generic': { en: 'Something went wrong. Please try again.', de: 'Etwas ist schiefgelaufen. Bitte versuch es erneut.' },
  'loading': { en: 'Loading…', de: 'Lädt…' },
} satisfies Record<string, Entry>
