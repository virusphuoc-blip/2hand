import { CONDITIONS } from './constants'
import { normalize } from './text'
import type { Listing } from './types'

export type SortKey = 'newest' | 'price-asc' | 'price-desc'

export type Filters = {
  q: string
  categories: string[]
  conditions: string[]
  /** '' | 'new' | 'used' — quick toggle on top of conditions */
  kind: '' | 'new' | 'used'
  province: string
  minPrice: number
  maxPrice: number
  sort: SortKey
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  categories: [],
  conditions: [],
  kind: '',
  province: '',
  minPrice: 0,
  maxPrice: 0,
  sort: 'newest',
}

export function filtersFromParams(p: URLSearchParams): Filters {
  const list = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean)
  const num = (k: string) => {
    const n = Number(p.get(k) ?? '')
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const sort = p.get('sx')
  const kind = p.get('loai')
  return {
    q: p.get('q') ?? '',
    categories: list('dm'),
    conditions: list('tt'),
    kind: kind === 'new' || kind === 'used' ? kind : '',
    province: p.get('tinh') ?? '',
    minPrice: num('giatu'),
    maxPrice: num('giaden'),
    sort: sort === 'price-asc' || sort === 'price-desc' ? sort : 'newest',
  }
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.categories.length) p.set('dm', f.categories.join(','))
  if (f.conditions.length) p.set('tt', f.conditions.join(','))
  if (f.kind) p.set('loai', f.kind)
  if (f.province) p.set('tinh', f.province)
  if (f.minPrice) p.set('giatu', String(f.minPrice))
  if (f.maxPrice) p.set('giaden', String(f.maxPrice))
  if (f.sort !== 'newest') p.set('sx', f.sort)
  return p
}

export function countActiveFilters(f: Filters): number {
  return (
    (f.categories.length ? 1 : 0) +
    (f.conditions.length ? 1 : 0) +
    (f.kind ? 1 : 0) +
    (f.province ? 1 : 0) +
    (f.minPrice || f.maxPrice ? 1 : 0)
  )
}

export function applyFilters(listings: Listing[], f: Filters): Listing[] {
  const terms = normalize(f.q).split(' ').filter(Boolean)
  const newIds = new Set(CONDITIONS.filter((c) => c.isNew).map((c) => c.id as string))
  const out = listings.filter((l) => {
    if (f.categories.length && !f.categories.includes(l.categoryId)) return false
    if (f.conditions.length && !f.conditions.includes(l.condition)) return false
    if (f.kind === 'new' && !newIds.has(l.condition)) return false
    if (f.kind === 'used' && newIds.has(l.condition)) return false
    if (f.province && l.province !== f.province) return false
    if (f.minPrice && l.price < f.minPrice) return false
    if (f.maxPrice && l.price > f.maxPrice) return false
    if (terms.length) {
      const hay = normalize(`${l.title} ${l.description} ${l.categoryName} ${l.province}`)
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
  out.sort((a, b) => {
    if (f.sort === 'price-asc') return a.price - b.price || b.createdAt - a.createdAt
    if (f.sort === 'price-desc') return b.price - a.price || b.createdAt - a.createdAt
    return b.createdAt - a.createdAt
  })
  return out
}
