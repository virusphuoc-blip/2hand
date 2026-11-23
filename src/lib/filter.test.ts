import { describe, expect, it } from 'vitest'
import { applyFilters, EMPTY_FILTERS, filtersFromParams, filtersToParams } from './filter'
import type { Listing } from './types'

const base: Listing = {
  id: '',
  title: '',
  categoryId: 'khac',
  categoryName: 'Khác',
  condition: 'used-good',
  price: 0,
  description: 'mô tả',
  thumb: '',
  imageCount: 1,
  province: 'TP. Hà Nội',
  phone: '0912345678',
  zalo: '',
  sellerId: 'u1',
  sellerName: 'A',
  status: 'active',
  createdAt: 0,
  updatedAt: 0,
}

const items: Listing[] = [
  { ...base, id: 'a', title: 'iPhone 13 128GB', categoryId: 'dien-thoai', condition: 'used-scratched', price: 9_000_000, createdAt: 3 },
  { ...base, id: 'b', title: 'Nồi cơm điện Sharp', categoryId: 'do-gia-dung', condition: 'new', price: 800_000, createdAt: 2, province: 'TP. Hồ Chí Minh' },
  { ...base, id: 'c', title: 'Xe đạp thể thao', categoryId: 'xe-dap', condition: 'like-new', price: 2_500_000, createdAt: 1 },
]

describe('applyFilters', () => {
  it('sorts newest first by default', () => {
    expect(applyFilters(items, EMPTY_FILTERS).map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })
  it('sorts by price', () => {
    expect(applyFilters(items, { ...EMPTY_FILTERS, sort: 'price-asc' }).map((l) => l.id)).toEqual(['b', 'c', 'a'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, sort: 'price-desc' }).map((l) => l.id)).toEqual(['a', 'c', 'b'])
  })
  it('searches without diacritics', () => {
    expect(applyFilters(items, { ...EMPTY_FILTERS, q: 'noi com' }).map((l) => l.id)).toEqual(['b'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, q: 'XE ĐẠP' }).map((l) => l.id)).toEqual(['c'])
  })
  it('filters by category, condition kind, price and province', () => {
    expect(applyFilters(items, { ...EMPTY_FILTERS, categories: ['dien-thoai', 'xe-dap'] }).map((l) => l.id)).toEqual(['a', 'c'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, kind: 'new' }).map((l) => l.id)).toEqual(['b'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, kind: 'used' }).map((l) => l.id)).toEqual(['a', 'c'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, conditions: ['like-new'] }).map((l) => l.id)).toEqual(['c'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, minPrice: 1_000_000, maxPrice: 5_000_000 }).map((l) => l.id)).toEqual(['c'])
    expect(applyFilters(items, { ...EMPTY_FILTERS, province: 'TP. Hồ Chí Minh' }).map((l) => l.id)).toEqual(['b'])
  })
  it('round-trips URL params', () => {
    const f = { ...EMPTY_FILTERS, q: 'iphone', categories: ['dien-thoai'], kind: 'used' as const, minPrice: 100, maxPrice: 200, sort: 'price-asc' as const }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
  })
})
