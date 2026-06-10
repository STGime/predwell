# IMMO AGENT — BUSINESS PLAN
## AI-Powered Real Estate Search Agent for the German Market
### Draft: June 2026

================================================================================
PART 1: THE PROBLEM
================================================================================

## The German Rental Market Is Broken

- 25 million renter households in Germany (57% of population — highest in EU)
- Berlin, Munich, Hamburg, Frankfurt: apartments gone in 2–4 hours
- 200+ applications per attractive listing
- Average search time: 3–6 months in major cities
- People pay €2,000–5,000 for relocation agents (Makler)
- 60% of renters overpay by €50–200/month because they settle

## The User's Daily Reality

- Manually refreshing Immoscout24 every 30 minutes
- Copy-pasting the same intro message 50 times
- Missing listings because they were at work/sleeping
- No visibility into commute times or neighborhood quality
- Zero data on which agents respond and which ghost

================================================================================
PART 2: THE SOLUTION
================================================================================

## Immo Agent — Your 24/7 AI Apartment Hunter

An AI agent that monitors real estate platforms around the clock, instantly
alerts users to matching listings, provides commute time and neighborhood
analysis, pre-fills contact forms, and tracks application status.

The user sets their criteria once. The agent does everything else.

## Core Features (MVP — Month 1–3)

1. **Continuous monitoring** — Polls IS24 API every 5 minutes for new listings
   matching user's criteria (price, rooms, area, features)

2. **Instant alerts** — Push notification/email within 5 minutes of a matching
   listing going live. "New 3-room in Kreuzberg, €1,200 warm, balcony. 18 min
   to your office. View listing →"

3. **Commute time analysis** — BVG/DB API integration. Shows real door-to-door
   times to user's workplace, not just distance.

4. **Neighborhood score** — OpenStreetMap data: supermarkets within 300m,
   parks, schools, noise exposure, bike paths. Ranks listings by livability.

5. **One-tap contact** — Agent pre-fills Immoscout24 contact form with user's
   profile (name, job, income, Schufa status, custom message). User reviews
   and sends with one tap.

6. **Application tracker** — Tracks which listings applied to, agent response
   status, viewing appointments. Dashboard shows pipeline.

## Phase 2 Features (Month 4–6)

7. **WG-Gesucht integration** — Scrape shared apartment listings for student/
   young professional market.

8. **Neubaukompass integration** — New construction projects. High-value
   segment with less competition.

9. **Agent auto-contact** — With user OAuth, agent automatically sends
   contact requests for top matches without user intervention. User sets
   rules: "Auto-apply if: under €1,500, 3+ rooms, within 30min commute."

10. **Agent reputation database** — Track which Makler respond, which ghost.
    "This agent responds to 92% of inquiries within 2 hours."

11. **Listing velocity analytics** — "Apartments in Prenzlauer Berg last 4.2
    hours on average. You need to respond in under 10 minutes."

## Phase 3 Features (Month 7–12)

12. **Immowelt integration** — Apply for partner program access.
13. **Price fairness score** — Compare listing price to neighborhood average.
    "This is €150 above market for the area."
14. **Viewing scheduler** — Auto-suggest viewing times based on user calendar.
15. **Document preparation** — Generate application packet (Schufa, income
    proof, Mietschuldenfreiheitsbescheinigung, custom cover letter).
16. **Purchase market expansion** — IS24 API supports buying, not just renting.

================================================================================
PART 3: DATA STACK
================================================================================

## Primary: Immoscout24 REST API

- Endpoint: rest.immobilienscout24.de/restapi/api
- Auth: OAuth 2.0 (2-legged for search, 3-legged for user actions)
- Data: Listings (price, sqm, rooms, address, geo, features, energy certs,
  photos, contact info), agents, regions
- Rate limit: Documented, needs content partner approval for search
- Coverage: ~60% of German rental market

## Secondary: Scraped Sources

| Source | Segment | Access | Blockers |
|--------|---------|--------|----------|
| WG-Gesucht | Shared apartments, students | HTML scrape | robots.txt open, no API |
| Neubaukompass | New construction | Sitemap crawl | robots.txt open, detailed sitemaps |

## Enrichment APIs

| API | What It Provides | Cost |
|-----|-----------------|------|
| BVG Transport (v5.bvg.transport.rest) | Door-to-door public transit times | Free |
| DB API (developers.deutschebahn.com) | Regional train connections | Free |
| OpenStreetMap (Nominatim) | Nearby amenities, noise, walkability | Free |
| Schufa (B2B partner) | Tenant credit checks | Contract needed |

## What's NOT Accessible (and why)

| Platform | Reason |
|----------|--------|
| Immowelt | Captcha-wall, partner program possible but gated |
| Immonet | Immediate captcha, blocked |
| eBay Kleinanzeigen | Captcha-wall, anti-bot aggressive |
| mobile.de / Autoscout24 | Explicitly ban AI bots — don't even try |

================================================================================
PART 4: TECHNICAL ARCHITECTURE
================================================================================

## Stack

- **Backend-as-a-Service:** eurobase.app (EU-hosted Supabase alternative)
  — PostgreSQL database, authentication, real-time subscriptions, edge functions,
  file storage. 100% EU data residency, GDPR-compliant by default.
- **Edge Functions:** eurobase Edge Functions (Deno) for polling, enrichment,
  notifications. Runs in EU data centers.
- **Database:** Managed PostgreSQL via eurobase (with PostGIS for geo queries)
- **Auth:** eurobase Auth — email/password, Google OAuth, magic link
- **Real-time:** eurobase Realtime for live listing feed in dashboard
- **Storage:** eurobase Storage for user documents (Schufa, income proof)
- **Frontend:** React (web app + PWA for mobile), hosted on Hetzner or
  eurobase Static Hosting (EU-only, no US infra)
- **Notifications:** Firebase Cloud Messaging (push) + SendGrid (email)
  Note: FCM is the only non-EU dependency. Only device tokens pass through
  Google servers — no personal data. Replace with UnifiedPush or ntfy in
  Phase 2 for 100% EU stack.
- **Background jobs:** eurobase pg_cron + Edge Functions for scheduled polling

## Why eurobase.app

- **EU data residency** — No US cloud exposure. No Schrems II risk.
  German tenants storing apartment search data need this.
- **Supabase-compatible API** — Same JS client SDK, same SQL editor,
  same RLS policies. Familiar developer experience, but hosted in EU.
- **GDPR tooling built in** — DPA, DSAR export, dynamic Article 30
  processing reports. Regulatory compliance from day one, not bolted on.
- **Flat pricing, no egress fees** — Predictable costs. No Firebase
  "€30K bill surprise" risk.
- **Zero DevOps** — No server provisioning, no database tuning, no
  backup management. Ship features instead of managing infrastructure.

## Agent Loop

```
Every 5 minutes:
  1. Poll IS24 API for new listings matching ALL user criteria
  2. Deduplicate against known listings (Redis)
  3. For each NEW match:
     a. Enrich with BVG commute time
     b. Enrich with OSM neighborhood data
     c. Calculate match score (0–100)
     d. If score > user's threshold: push notification
     e. Store in user's dashboard
  4. Update listing velocity metrics
```

## Data Flow

```
IS24 API ──→ Edge Function (poll) ──→ Match Engine ──→ Edge Function (notify)
                │                         │
                ▼                         ▼
          eurobase Database           eurobase Realtime
          (PostgreSQL+PostGIS)        (live feed → dashboard)
                │
BVG API ◄───────┤
OSM API ◄───────┘
```

================================================================================
PART 5: MONETIZATION
================================================================================

## Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | €0 | 1 search profile, 3 cities, email alerts only, 30-min poll |
| Pro | €19.99/mo | 3 profiles, unlimited cities, push notifications, 5-min poll, commute + neighborhood scores |
| Premium | €39.99/mo | 10 profiles, auto-apply, agent reputation data, listing velocity, document generation |
| Annual | €15.99/mo | Pro features, billed €191.88/year |

## Revenue Model

Per-user economics (Pro tier, monthly):

| Line | Amount |
|------|--------|
| Revenue | €19.99/month |
| Eurobase (Pro plan, per user allocation) | €1.00–2.00 |
| IS24 API (est. after free tier) | €0.50–1.00 |
| BVG API | €0 (free) |
| OSM API | €0 (free) |
| Push notifications (FCM) | €0.01 |
| Frontend hosting (Hetzner €5/mo VPS) | €0.10 |
| **Gross margin** | **€16.00–18.00 (80–90%)** |

Eurobase advantage: flat pricing, no egress surprises, EU data residency
included. No separate server, database, or cache to manage.

## Target Economics (Year 1)

| Month | Users | MRR | Cumulative Revenue |
|-------|-------|-----|-------------------|
| 1 | 50 | €1,000 | €1,000 |
| 3 | 300 | €6,000 | €10,500 |
| 6 | 1,000 | €20,000 | €43,500 |
| 12 | 3,000 | €60,000 | €254,000 |

CAC target: under €30 via organic (Reddit, TikTok, student groups, word of mouth).
With €17 margin per user: payback in under 2 months.

================================================================================
PART 6: GO-TO-MARKET
================================================================================

## Target Audience (Germany)

1. **Young professionals (25–35)** — moving to Berlin/Munich/Hamburg for work.
   Will pay to save time. Most likely to convert from free to Pro.

2. **Students** — shared apartments, WG market. Price-sensitive but large
   volume. Free tier entry point → convert when they graduate and work.

3. **Expats/immigrants** — don't know the market, language barrier, don't
   know which neighborhoods are good. Huge pain point.

4. **Families relocating** — need schools, parks, quiet. Willing to pay
   premium for neighborhood analysis.

## Acquisition Channels (Ranked)

1. **Reddit** — r/berlin, r/munich, r/hamburg, r/germany. Every week: "How
   do I find an apartment?" posts. Answer genuinely, mention Immo Agent
   where relevant. Set up Reddit monitoring cron (already have infra for this).

2. **TikTok/Instagram Reels** — Apartment hunting content is viral. Show
   the agent finding an apartment in real-time. "I let an AI find me an
   apartment in Berlin. Here's what happened."

3. **University housing offices** — Partner with Studentenwerk. Students
   are the most desperate apartment seekers. Free tier as Studentenwerk
   benefit → convert after graduation.

4. **Expat Facebook groups** — "Internationals in Berlin," "Expats in
   Munich." Highly active, people constantly asking for apartment help.

5. **Product Hunt** — Launch with the AI agent angle. "An AI that finds
   you an apartment in Germany." Strong narrative for the AI community.

6. **Relocation agencies** — B2B: sell to companies relocating employees.
   SAP, Siemens, BMW move thousands of employees to new cities annually.
   Corporate tier: €99/month for 20 employee seats.

## Launch Sequence

| Week | Action |
|------|--------|
| 1 | Apply for IS24 content partner access |
| 2 | Build MVP: IS24 poller + BVG integration + push notifications |
| 3 | Build web dashboard + user profiles |
| 4 | Private beta with 20 users (Reddit/Discord recruitment) |
| 5 | Launch on Product Hunt + Reddit |
| 6 | TikTok/Instagram content push |
| 8 | Studentenwerk partnership outreach |
| 12 | Corporate relocation program launch |

================================================================================
PART 7: COMPETITIVE LANDSCAPE
================================================================================

## Direct Competitors

| Competitor | What They Do | Weakness |
|------------|-------------|----------|
| McMakler | Hybrid agent + tech platform | Human-dependent, expensive, selling-focused |
| PriceHubble | Real estate valuation data | B2B only, no consumer search agent |
| Scoperty | Property value estimates | No listing monitoring, no agent functionality |
| Immomio | Digital application management | Landlord tool, not tenant tool |

## No Full Autonomous Agent Exists

None of the above is an AI agent that:
- Monitors 24/7 across platforms
- Auto-calculates commute times and neighborhood scores
- Pre-fills and sends contact requests
- Tracks applications and agent responses

This is a greenfield opportunity.

================================================================================
PART 8: LEGAL & REGULATORY (GERMANY)
================================================================================

## What You Need

1. **Impressum** (required) — Full contact details on website
2. **Datenschutzerklärung** (required) — GDPR-compliant privacy policy.
   User data: email, search criteria, location, application documents.
   Storage: German servers (Hetzner). Processing: clearly documented.
3. **AGB** (recommended) — Terms of service
4. **IS24 API ToS compliance** — Must adhere to rate limits and usage terms

## What You DON'T Need

- **No Makler license (§34c GewO)** — You're a software tool, not a real
  estate agent. You don't negotiate contracts or handle money.
- **No §34d insurance license** — Not selling financial products
- **EU AI Act: Limited-risk category** — Real estate matching is not
  classified as high-risk unless you provide financing advice. Lowest
  regulatory burden. Just need transparency (tell users it's AI).

## Data Protection

- **All data stored in EU** — Eurobase provides 100% EU data residency.
  No US cloud exposure, no Schrems II risk.
- **GDPR-compliant by default** — Eurobase includes DPA, DSAR export,
  dynamic Article 30 processing reports, and sub-processor documentation.
- **User profile data encrypted** at rest via Eurobase managed encryption
- **Application documents** auto-deleted after 90 days of inactivity
- **Consent management** — DSGVO-compliant cookie consent, clear opt-in
  for push notifications and email
- **Right to deletion** (Art. 17) — full account + data wipe via Eurobase DSAR
- **No data sharing** with third parties beyond what's required for the
  service (IS24 API, BVG API, notification delivery)
- **No separate infrastructure to audit** — Eurobase provides the GDPR
  documentation needed for your own compliance

================================================================================
PART 9: RISKS & MITIGATIONS
================================================================================

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| IS24 revokes API access | Low | High | Build WG-Gesucht scraper as backup; apply for Immowelt partner program |
| IS24 builds their own agent | Medium | High | Differentiate on cross-platform + enrichment data they can't match |
| Low conversion from free | High | Medium | Time-limit free tier (3 months); push notifications are the upgrade hook |
| GDPR complaint | Medium | Medium | German servers, clear privacy policy, data minimization by design |
| German market too small | Low | Medium | DACH expansion natural (Austria/Switzerland same platforms) |

================================================================================
PART 10: FINANCIAL PROJECTIONS (YEAR 1)
================================================================================

## Monthly Runway (Solo Founder, Berlin)

| Cost | Monthly |
|------|---------|
| Eurobase (Pro plan) | €25–100 |
| IS24 API (after free tier) | €100–500 |
| Domain + email + tools | €50 |
| Marketing (content, ads) | €100–500 |
| **Total burn** | **€275–1,150/month** |

No server bills, no database admin, no DevOps. Eurobase handles scaling,
backups, and EU data residency. Shipping speed: 3x faster than custom backend.

## Revenue Ramp

| Quarter | Users (cum.) | MRR | Revenue |
|---------|-------------|-----|---------|
| Q1 | 300 | €6,000 | €10,500 |
| Q2 | 1,000 | €20,000 | €39,000 |
| Q3 | 2,000 | €40,000 | €90,000 |
| Q4 | 3,000 | €60,000 | €150,000 |
| **Year 1 Total** | | | **€289,500** |

Solo founder, no salary needed. Company profitable from month 2.

================================================================================
PART 11: FIRST 30 DAYS — WHAT TO BUILD
================================================================================

### Week 1: Foundation
- [ ] Apply for IS24 API developer account + content partner access
- [ ] Create eurobase project (free tier to start, upgrade as needed)
- [ ] Set up database schema: users, search_profiles, listings, applications, agents
- [ ] Enable PostGIS extension for geo queries
- [ ] Build IS24 API polling Edge Function (Deno, scheduled via pg_cron)
- [ ] Implement BVG transport API enrichment in Edge Function
- [ ] Implement OSM neighborhood data enrichment in Edge Function

### Week 2: Core Logic
- [ ] Build matching engine as Edge Function (criteria → score → notification)
- [ ] User authentication via eurobase Auth (email + Google OAuth)
- [ ] Push notification pipeline (Firebase Cloud Messaging)
- [ ] Email notification pipeline (SendGrid)
- [ ] Set up eurobase Realtime subscriptions for live listing feed

### Week 3: Frontend
- [ ] Web dashboard (React): search profiles, match feed, application tracker
- [ ] Connect to eurobase via JS client SDK (@eurobase/supabase-js compatible)
- [ ] PWA wrapper for mobile
- [ ] User onboarding flow (set up first search profile in 2 minutes)

### Week 4: Launch
- [ ] Private beta with 20 Reddit-recruited users
- [ ] Fix bugs, iterate on UX
- [ ] Prepare Product Hunt launch materials
- [ ] Prepare Reddit launch post (r/berlin, r/germany)
- [ ] Prepare TikTok demo video

================================================================================
PART 12: KEY DECISIONS
================================================================================

1. **Name:** Immo Agent (working title). Consider: Wohny, Heimfind, MietPilot

2. **Domain:** immo-agent.de or similar (.de is important for German trust)

3. **Free tier:** Yes — 1 profile, 3 cities, 30-min poll, email only.
   This is your growth engine. Most users start free, convert when they
   realize push notifications + 5-min polling is the difference between
   getting an apartment or not.

4. **Mobile app:** No — PWA is sufficient for MVP. Native apps in Year 2.

5. **Location:** Berlin. Largest rental market. Launch city.

6. **Language:** German first. English as secondary. The pain is universal
   but the platform (IS24) is German-language.

================================================================================
APPENDIX: API REFERENCE
================================================================================

## Immoscout24

- Developer portal: api.immobilienscout24.de
- Search: GET /search/v1.0/search (radius or region)
- Expose: GET /expose/{id}
- Contact agent: POST /expose/{id}/contact
- Auth: OAuth 2.0 (2-legged for search, 3-legged for user actions)
- robots.txt: EXPLICITLY ALLOWS AI BOTS (GPTBot, ClaudeBot, PerplexityBot)

## BVG Transport

- API: v5.bvg.transport.rest
- Locations: GET /locations?query={address}
- Journeys: GET /journeys?from={id}&to={id}&departure=now
- Cost: Free, no API key required

## OpenStreetMap / Nominatim

- API: nominatim.openstreetmap.org
- Search: GET /search?q={address}&format=json
- Reverse: GET /reverse?lat={lat}&lon={lon}&format=json
- Rate limit: 1 request/second (fair use)
- Cost: Free

## Deutsche Bahn

- Developer portal: developers.deutschebahn.com
- Station data, timetables, real-time departures
- Free tier available

================================================================================
END OF BUSINESS PLAN
================================================================================
