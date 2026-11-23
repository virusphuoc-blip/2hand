import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import ListingCard from '../components/ListingCard'
import { Empty, Spinner } from '../components/ui'
import { fetchMarket } from '../lib/api'
import { useCategories } from '../lib/categories'
import { CONDITIONS, PROVINCES } from '../lib/constants'
import { applyFilters, countActiveFilters, EMPTY_FILTERS, filtersFromParams, filtersToParams, type Filters } from '../lib/filter'
import { firebaseConfigured } from '../lib/firebase'
import { formatPrice, parsePrice } from '../lib/text'
import type { Listing } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const PAGE = 24

export default function Market() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const { active: categories } = useCategories()
  const [listings, setListings] = useState<Listing[] | null>(firebaseConfigured ? null : [])
  const [error, setError] = useState('')
  const [q, setQ] = useState(filters.q)
  const [showFilters, setShowFilters] = useState(false)
  const [shown, setShown] = useState(PAGE)
  useTitle(filters.q ? `Tìm "${filters.q}"` : '')

  useEffect(() => {
    if (!firebaseConfigured) return
    fetchMarket()
      .then(setListings)
      .catch(() => {
        setError('Không tải được danh sách tin. Vui lòng thử lại.')
        setListings([])
      })
  }, [])

  const update = (patch: Partial<Filters>) => {
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true })
    setShown(PAGE)
  }

  const results = useMemo(() => (listings ? applyFilters(listings, filters) : []), [listings, filters])
  const activeCount = countActiveFilters(filters)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    update({ q })
  }

  const toggle = (key: 'categories' | 'conditions', id: string) => {
    const cur = filters[key]
    update({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSearch} className="flex gap-2" role="search">
        <input
          className="field"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm điện thoại, xe máy, laptop…"
          aria-label="Từ khoá tìm kiếm"
          data-testid="search-input"
        />
        <button type="submit" className="btn-primary shrink-0" data-testid="search-button">Tìm</button>
      </form>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" aria-label="Danh mục">
        <button
          type="button"
          className={`chip shrink-0 ${filters.categories.length === 0 ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          onClick={() => update({ categories: [] })}
        >
          Tất cả
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip shrink-0 whitespace-nowrap ${filters.categories.includes(c.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            onClick={() => toggle('categories', c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-outline" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} data-testid="toggle-filters">
          Bộ lọc{activeCount ? ` (${activeCount})` : ''}
        </button>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
          {(
            [
              ['', 'Tất cả'],
              ['new', 'Đồ mới'],
              ['used', 'Đồ cũ'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => update({ kind: k })}
              className={`px-3 py-2 font-medium ${filters.kind === k ? 'bg-brand-500 text-white' : 'text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
          aria-label="Sắp xếp"
          data-testid="sort-select"
        >
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </div>

      {showFilters && (
        <FilterPanel filters={filters} categories={categories} onChange={update} onToggle={toggle} />
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">{filters.q || activeCount ? 'Kết quả tìm kiếm' : 'Tin đăng mới nhất'}</h1>
        {listings && <span className="text-sm text-slate-500" data-testid="result-count">{results.length} tin</span>}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {listings === null ? (
        <Spinner />
      ) : results.length === 0 ? (
        <Empty>
          Chưa có tin đăng phù hợp.
          {(filters.q || activeCount > 0) && (
            <div className="mt-3">
              <button type="button" className="btn-outline" onClick={() => { setQ(''); setParams(filtersToParams(EMPTY_FILTERS)) }}>
                Xoá bộ lọc
              </button>
            </div>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.slice(0, shown).map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
          {shown < results.length && (
            <div className="text-center">
              <button type="button" className="btn-outline" onClick={() => setShown((n) => n + PAGE)}>Xem thêm</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterPanel({
  filters,
  categories,
  onChange,
  onToggle,
}: {
  filters: Filters
  categories: { id: string; name: string }[]
  onChange: (p: Partial<Filters>) => void
  onToggle: (key: 'categories' | 'conditions', id: string) => void
}) {
  const [min, setMin] = useState(filters.minPrice ? String(filters.minPrice) : '')
  const [max, setMax] = useState(filters.maxPrice ? String(filters.maxPrice) : '')
  const fmt = (s: string) => (parsePrice(s) ? parsePrice(s).toLocaleString('vi-VN') : '')
  return (
    <div className="card space-y-4 p-3" data-testid="filter-panel">
      <fieldset>
        <legend className="label">Danh mục</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {categories.map((c) => (
            <label key={c.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-500" checked={filters.categories.includes(c.id)} onChange={() => onToggle('categories', c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Tình trạng</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={filters.conditions.includes(c.id)} onChange={() => onToggle('conditions', c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Khoảng giá (đ)</legend>
        <div className="flex items-center gap-2">
          <input className="field" inputMode="numeric" placeholder="Từ" value={fmt(min)} onChange={(e) => setMin(e.target.value)} aria-label="Giá từ" data-testid="price-min" />
          <span>–</span>
          <input className="field" inputMode="numeric" placeholder="Đến" value={fmt(max)} onChange={(e) => setMax(e.target.value)} aria-label="Giá đến" data-testid="price-max" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            [0, 1_000_000],
            [1_000_000, 5_000_000],
            [5_000_000, 15_000_000],
            [15_000_000, 0],
          ].map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              className="chip border-slate-300 bg-white text-xs text-slate-700"
              onClick={() => {
                setMin(a ? String(a) : '')
                setMax(b ? String(b) : '')
                onChange({ minPrice: a, maxPrice: b })
              }}
            >
              {a && b ? `${formatPrice(a)} – ${formatPrice(b)}` : a ? `Trên ${formatPrice(a)}` : `Dưới ${formatPrice(b)}`}
            </button>
          ))}
        </div>
        <button type="button" className="btn-outline mt-2 w-full" onClick={() => onChange({ minPrice: parsePrice(min), maxPrice: parsePrice(max) })} data-testid="apply-price">
          Áp dụng khoảng giá
        </button>
      </fieldset>
      <div>
        <label className="label" htmlFor="f-province">Tỉnh/thành</label>
        <select id="f-province" className="field" value={filters.province} onChange={(e) => onChange({ province: e.target.value })}>
          <option value="">Toàn quốc</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="btn-outline w-full"
        onClick={() => {
          setMin('')
          setMax('')
          onChange({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })
        }}
      >
        Xoá bộ lọc
      </button>
    </div>
  )
}
