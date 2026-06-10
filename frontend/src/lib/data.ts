import { eb } from './eurobase'

export interface District {
  id: string
  name: string
  slug: string
  avg_rent_sqm: number
  listing_velocity_hours: number
  demand_score: number
}

// Canonical search vocabulary — shared by parse-search, match-engine, and UI.
export const FEATURE_KEYS = [
  'parking',
  'balcony',
  'furnished',
  'unfurnished',
  'lift',
  'garden',
  'pets_ok',
  'no_temporary',
  'wbs_ok',
] as const
export const PROXIMITY_KEYS = ['kita', 'school', 'park', 'transit', 'supermarket'] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]
export type ProximityKey = (typeof PROXIMITY_KEYS)[number]

/** Parsed (or hand-edited) search criteria, persisted into search_profiles.features. */
export interface SearchCriteria {
  features: Partial<Record<FeatureKey, boolean>>
  proximity: Partial<Record<ProximityKey, boolean>>
}

/** Shape returned by the parse-search edge function. */
export interface ParsedSearch extends SearchCriteria {
  budget_max: number | null
  rooms_min: number | null
  district_ids: string[]
  district_slugs: string[]
  summary: string | null
}

export interface SearchProfile {
  id: string
  user_id: string
  name: string
  budget_max: number
  rooms_min: number
  district_ids: string[]
  features: SearchCriteria | null
  query_text: string | null
  is_active: boolean
  created_at: string
}

export interface ListingGeo {
  kita_m?: number | null
  school_m?: number | null
  park_m?: number | null
  transit_m?: number | null
  supermarket_m?: number | null
}

export interface Listing {
  id: string
  source: string
  title: string
  url: string | null
  district_id: string | null
  address_text: string | null
  price_warm: number | null
  size_sqm: number | null
  rooms: number | null
  first_seen_at: string
  enrichment: ({ geo?: ListingGeo } & Record<string, unknown>) | null
}

export interface ListingFlags {
  temporary?: boolean
  requires_wbs?: boolean
  furnished?: boolean
  swap_only?: boolean
  cooperative?: boolean
  commission_free?: boolean
  deposit_months?: number | null
  fit_note?: string | null
}

export interface Match {
  id: string
  search_profile_id: string
  listing_id: string
  score: number
  status: MatchStatus
  notes: string | null
  matched_at: string
  flags: ListingFlags | null
  fit_note: string | null
}

/** Flag keys rendered as chips on match cards, in display order. */
export const DISPLAY_FLAGS: (keyof ListingFlags)[] = [
  'furnished',
  'temporary',
  'requires_wbs',
  'swap_only',
  'cooperative',
  'commission_free',
]

export type MatchStatus = 'new' | 'seen' | 'contacted' | 'applied' | 'viewing' | 'rejected' | 'won'

export const MATCH_STATUSES: MatchStatus[] = [
  'new',
  'seen',
  'contacted',
  'applied',
  'viewing',
  'rejected',
  'won',
]

export interface Subscription {
  id: string
  user_id: string
  status: 'pending' | 'active' | 'canceled' | 'past_due'
  plan: string
  current_period_end: string | null
}

function asArray<T>(data: T | T[] | null): T[] {
  if (data === null) return []
  return Array.isArray(data) ? data : [data]
}

export async function fetchDistricts(): Promise<District[]> {
  const { data } = await eb.db.from<District>('districts').select('*').order('name')
  return asArray(data)
}

export async function fetchProfiles(): Promise<SearchProfile[]> {
  const { data } = await eb.db
    .from<SearchProfile>('search_profiles')
    .select('*')
    .order('created_at')
  return asArray(data)
}

export async function fetchMatches(profileIds: string[]): Promise<Match[]> {
  if (profileIds.length === 0) return []
  const { data } = await eb.db
    .from<Match>('matches')
    .select('*')
    .in('search_profile_id', profileIds)
    .order('matched_at', { ascending: false })
    .limit(100)
  return asArray(data)
}

export async function fetchListingsByIds(ids: string[]): Promise<Map<string, Listing>> {
  if (ids.length === 0) return new Map()
  const { data } = await eb.db.from<Listing>('listings').select('*').in('id', ids)
  return new Map(asArray(data).map((l) => [l.id, l]))
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data } = await eb.db.from<Subscription>('subscriptions').select('*').limit(1)
  const rows = asArray(data)
  return rows[0] ?? null
}

export function isPro(sub: Subscription | null): boolean {
  return sub?.status === 'active'
}

/** Free tier: 1 search profile. Pro: 3. */
export function profileLimit(sub: Subscription | null): number {
  return isPro(sub) ? 3 : 1
}
