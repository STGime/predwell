import { eb } from './eurobase'

export interface District {
  id: string
  name: string
  slug: string
  avg_rent_sqm: number
  listing_velocity_hours: number
  demand_score: number
}

export interface SearchProfile {
  id: string
  user_id: string
  name: string
  budget_max: number
  rooms_min: number
  district_ids: string[]
  is_active: boolean
  created_at: string
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
}

export interface Match {
  id: string
  search_profile_id: string
  listing_id: string
  score: number
  status: MatchStatus
  notes: string | null
  matched_at: string
}

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
