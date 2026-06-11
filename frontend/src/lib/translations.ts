type Entry = { en: string; de: string }

export const translations = {
  // Header
  'nav.tagline': { en: 'Berlin renter intelligence', de: 'Berliner Mieter-Intelligenz' },
  'nav.dashboard': { en: 'Dashboard', de: 'Dashboard' },

  // Landing hero
  'hero.eyebrow': { en: 'Agentic AI · real-time apartment alerts for Berlin', de: 'Agentic AI · Echtzeit-Wohnungsalerts für Berlin' },
  'hero.title': {
    en: 'Be first to the Berlin apartment that fits you.',
    de: 'Sei der Erste bei der Berliner Wohnung, die zu dir passt.',
  },
  'hero.lead': {
    en: 'Predwell watches every major listing portal and agency feed in Berlin for you. The moment a flat matches your profile, you get an instant alert with a direct link — while there’s still time to reach the agent. Plus neighborhood insight on every match and a daily read on where the market is moving.',
    de: 'Predwell beobachtet alle großen Wohnungsportale und Makler-Feeds in Berlin für dich. Sobald eine Wohnung zu deinem Profil passt, bekommst du sofort einen Alert mit Direktlink — solange noch Zeit bleibt, den Anbieter zu erreichen. Dazu Kiez-Insights zu jedem Treffer und täglich ein Überblick, wohin sich der Markt bewegt.',
  },
  'hero.cta.free': { en: 'Try Free – No Credit Card Required', de: 'Kostenlos testen – ohne Kreditkarte' },
  'hero.cta.how': { en: 'See how it works', de: 'So funktioniert es' },
  'hero.freeNote': {
    en: 'Run one free market report first. No card, no checkout, no commitment.',
    de: 'Starte mit einem kostenlosen Markt-Report. Keine Karte, kein Checkout, keine Verpflichtung.',
  },

  // Hero alert-card mock
  'alert.topline': { en: 'New match', de: 'Neuer Treffer' },
  'alert.live': { en: 'Live', de: 'Live' },
  'alert.match': { en: 'match', de: 'Treffer' },
  'alert.title': { en: '2-room flat in Kreuzberg, 58 m²', de: '2-Zimmer-Wohnung in Kreuzberg, 58 m²' },
  'alert.meta': { en: '€1,240 warm · 2 rooms · available Aug 1', de: '1.240 € warm · 2 Zimmer · frei ab 1. Aug.' },
  'alert.fit': { en: 'Unfurnished long-term let, no WBS needed.', de: 'Unbefristet, unmöbliert, kein WBS nötig.' },
  'alert.source': { en: '', de: '' },
  'alert.cta': { en: 'View the listing', de: 'Inserat ansehen' },
  'alert.posted': { en: 'posted 90s ago', de: 'vor 90 Sek.' },

  // Trust band
  'trust.eu': { en: 'EU-hosted & GDPR-native', de: 'EU-gehostet & DSGVO-konform' },
  'trust.eu.sub': { en: 'Built on EU infrastructure (Scaleway, Paris). No US cloud, no Schrems II risk.', de: 'Auf EU-Infrastruktur (Scaleway, Paris). Keine US-Cloud, kein Schrems-II-Risiko.' },
  'trust.source': { en: 'Straight to the listing', de: 'Direkt zum Inserat' },
  'trust.source.sub': { en: 'Every alert links to the original listing and its agent — we send renters to the source, never around it.', de: 'Jeder Alert verlinkt das Original-Inserat und seinen Anbieter — wir schicken Mieter zur Quelle, nicht daran vorbei.' },
  'trust.fast': { en: 'Minutes, not hours', de: 'Minuten statt Stunden' },
  'trust.fast.sub': { en: 'Berlin flats are gone in hours. We alert you within minutes of a listing going live.', de: 'Berliner Wohnungen sind in Stunden weg. Wir alarmieren dich Minuten nach Veröffentlichung.' },

  // Forecast card
  'forecast.topline.left': { en: 'Availability forecast', de: 'Verfügbarkeits-Prognose' },
  'forecast.topline.right': { en: 'Berlin', de: 'Berlin' },
  'forecast.metric.window': { en: 'early window', de: 'Vorlauf' },
  'forecast.metric.feeds': { en: 'agency feeds', de: 'Verwalter-Feeds' },
  'forecast.metric.contact': { en: 'landlord contact', de: 'Vermieter-Kontakt' },

  // How it works
  'how.title': { en: 'Your agent, not your second job.', de: 'Dein Agent, nicht dein Zweitjob.' },
  'how.copy': {
    en: 'Predwell is an agentic AI that works the Berlin market around the clock — polling every feed, matching each new listing to your profile, enriching it with neighborhood data, and alerting you the instant something fits. You set your criteria once; the agent does the rest.',
    de: 'Predwell ist eine agentische KI, die rund um die Uhr den Berliner Markt bearbeitet — fragt jeden Feed ab, gleicht jedes neue Inserat mit deinem Profil ab, reichert es mit Kiez-Daten an und alarmiert dich in dem Moment, in dem etwas passt. Du legst deine Kriterien einmal fest; den Rest erledigt der Agent.',
  },
  'how.step1.title': { en: 'Watch every feed', de: 'Jeden Feed beobachten' },
  'how.step1.copy': {
    en: 'Predwell polls every major portal, agency, and local source around the clock — so you don’t have to refresh anything.',
    de: 'Predwell fragt alle großen Portale, Makler und lokalen Quellen rund um die Uhr ab — du musst nichts mehr aktualisieren.',
  },
  'how.step2.title': { en: 'Match your profile', de: 'Mit deinem Profil abgleichen' },
  'how.step2.copy': {
    en: 'The instant a new listing fits your budget, rooms, and districts, it’s a match — scored and ready.',
    de: 'Sobald ein neues Inserat zu Budget, Zimmern und Kiezen passt, ist es ein Treffer — bewertet und bereit.',
  },
  'how.step3.title': { en: 'You reach out first', de: 'Du meldest dich zuerst' },
  'how.step3.copy': {
    en: 'Get an alert with a direct link to the listing and its agent — and act while the flat is still available.',
    de: 'Erhalte einen Alert mit Direktlink zum Inserat und Anbieter — und handle, solange die Wohnung noch frei ist.',
  },

  // What you get (features)
  'features.eyebrow': { en: 'What you get', de: 'Das bekommst du' },
  'features.title': { en: 'The instant your flat appears, you know — plus a daily read on the market.', de: 'In dem Moment, in dem deine Wohnung auftaucht, weißt du es — dazu täglich ein Marktüberblick.' },
  'features.digest.label': { en: 'Daily market digest', de: 'Täglicher Markt-Digest' },
  'features.digest.title': { en: 'Know where Berlin is moving', de: 'Wisse, wo sich Berlin bewegt' },
  'features.digest.copy': {
    en: 'Every morning, a short read on which districts are heating up and cooling down — new supply, price drift, how fast flats are going.',
    de: 'Jeden Morgen ein kurzer Überblick, welche Kieze anziehen und welche abkühlen — neues Angebot, Preisentwicklung, wie schnell Wohnungen weg sind.',
  },
  'features.digest.example': {
    en: '"Friedrichshain supply up 61% this week; Moabit slowing. Act early-week in Neukölln under €1,100."',
    de: '„Friedrichshain: Angebot +61 % diese Woche; Moabit kühlt ab. In Neukölln unter 1.100 € früh in der Woche zuschlagen.“',
  },
  'features.alerts.label': { en: 'Instant match alerts', de: 'Sofort-Alerts bei Treffern' },
  'features.alerts.title': { en: 'Be first, not 200th', de: 'Sei der Erste, nicht der 200.' },
  'features.alerts.copy': {
    en: 'The moment a flat fitting your profile is posted to any portal or agency feed we watch, Predwell pings you — price, area, and a direct link straight to the listing and its agent, while there is still time to be first.',
    de: 'Sobald eine Wohnung zu deinem Profil auf einem der beobachteten Portale oder Makler-Feeds auftaucht, meldet sich Predwell — Preis, Kiez und Direktlink zum Inserat und seinem Anbieter, solange du noch der Erste sein kannst.',
  },
  'features.alerts.example': {
    en: '"Opportunity in Kreuzberg — 2 rooms, €1,240 warm, 92% match. Act fast →"',
    de: '„Chance in Kreuzberg — 2 Zimmer, 1.240 € warm, 92 % Treffer. Schnell sein →“',
  },
  'features.hood.label': { en: 'Neighborhood intelligence', de: 'Kiez-Analyse' },
  'features.hood.title': { en: 'Know the neighborhood, not just the flat', de: 'Kenne den Kiez, nicht nur die Wohnung' },
  'features.hood.copy': {
    en: 'Every match comes with what the listing leaves out: walking distance to schools, playgrounds, parks, transit and supermarkets, plus the real commute to your work — so you can judge a place before you ever visit.',
    de: 'Zu jedem Treffer kommt, was im Inserat fehlt: Laufwege zu Schulen, Spielplätzen, Parks, ÖPNV und Supermärkten, dazu die echte Pendelzeit zur Arbeit — damit du eine Wohnung einschätzen kannst, bevor du sie besichtigst.',
  },
  'features.hood.example': {
    en: '"3 min to a playground · 6 min to the U-Bahn · 21 min to your office · 2 supermarkets within 300 m"',
    de: '„3 Min. zum Spielplatz · 6 Min. zur U-Bahn · 21 Min. ins Büro · 2 Supermärkte in 300 m“',
  },

  // Smart free-text search
  'search.freetext.label': { en: 'Describe your ideal flat', de: 'Beschreibe deine Wunschwohnung' },
  'search.freetext.placeholder': {
    en: '2 rooms in Mitte or Prenzlauer Berg, up to €1,500 warm, close to a Kita, parking, no sublets…',
    de: '2 Zimmer in Mitte oder Prenzlauer Berg, bis 1.500 € warm, nah an einer Kita, Parkplatz, keine Zwischenmiete…',
  },
  'search.parsing': { en: 'Reading your wish…', de: 'Lese deinen Wunsch…' },
  'search.understood': { en: 'Understood', de: 'Verstanden' },
  'search.features.label': { en: 'Must-haves', de: 'Wichtig' },
  'search.proximity.label': { en: 'Close to', de: 'In der Nähe von' },
  'feat.parking': { en: 'Parking', de: 'Parkplatz' },
  'feat.balcony': { en: 'Balcony', de: 'Balkon' },
  'feat.ebk': { en: 'Fitted kitchen (EBK)', de: 'Einbauküche (EBK)' },
  'feat.furnished': { en: 'Furnished', de: 'Möbliert' },
  'feat.unfurnished': { en: 'Unfurnished', de: 'Unmöbliert' },
  'feat.lift': { en: 'Lift', de: 'Aufzug' },
  'feat.garden': { en: 'Garden', de: 'Garten' },
  'feat.pets_ok': { en: 'Pets OK', de: 'Haustiere OK' },
  'feat.wg': { en: 'WG-friendly', de: 'WG-geeignet' },
  'feat.no_wg': { en: 'No shared flats', de: 'Keine WG' },
  'feat.no_temporary': { en: 'No sublets', de: 'Keine Zwischenmiete' },
  'feat.wbs_ok': { en: 'I have a WBS', de: 'WBS vorhanden' },
  'prox.kita': { en: 'Kita / daycare', de: 'Kita' },
  'prox.school': { en: 'School', de: 'Schule' },
  'prox.park': { en: 'Park', de: 'Park' },
  'prox.transit': { en: 'Transit', de: 'ÖPNV' },
  'prox.supermarket': { en: 'Supermarket', de: 'Supermarkt' },

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

  // Notifications
  'notify.label': { en: 'How should we reach you?', de: 'Wie sollen wir dich erreichen?' },
  'notify.email': { en: 'Email', de: 'E-Mail' },
  'notify.push': { en: 'Browser push', de: 'Browser-Push' },
  'notify.push.soon': { en: 'coming soon', de: 'bald verfügbar' },
  'notify.note': {
    en: 'We alert you the moment a fitting flat appears.',
    de: 'Wir alarmieren dich, sobald eine passende Wohnung auftaucht.',
  },
  'settings.notifications': { en: 'Notifications', de: 'Benachrichtigungen' },
  'settings.saved': { en: 'Saved', de: 'Gespeichert' },

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
  'flag.furnished': { en: 'Furnished', de: 'Möbliert' },
  'flag.ebk': { en: 'Fitted kitchen', de: 'Einbauküche' },
  'flag.wg_suitable': { en: 'WG-friendly', de: 'WG-geeignet' },
  'unit.rooms': { en: 'rooms', de: 'Zimmer' },
  'flag.temporary': { en: 'Temporary', de: 'Befristet' },
  'flag.requires_wbs': { en: 'WBS required', de: 'WBS nötig' },
  'flag.swap_only': { en: 'Swap only', de: 'Nur Tausch' },
  'flag.cooperative': { en: 'Co-op', de: 'Genossenschaft' },
  'flag.commission_free': { en: 'No commission', de: 'Provisionsfrei' },

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
