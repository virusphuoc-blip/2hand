import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty, ListingImage, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import { deleteListing, fetchMyListings, repostListing, setListingStatus } from '../lib/api'
import { useAuth } from '../lib/auth'
import { STATUS_LABELS, type ListingStatus } from '../lib/constants'
import { formatPrice, timeAgo } from '../lib/text'
import type { Listing } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const TABS: ListingStatus[] = ['pending', 'active', 'sold', 'hidden']

export default function MyListings() {
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (TABS as string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as ListingStatus) : 'active'
  const [items, setItems] = useState<Listing[] | null>(null)
  const [busy, setBusy] = useState('')
  useTitle('Tin của tôi')

  const load = useCallback(async () => {
    if (!user) return
    try {
      setItems(await fetchMyListings(user.uid))
    } catch {
      setItems([])
      toast('Không tải được tin của bạn.', 'error')
    }
  }, [user, toast])

  useEffect(() => {
    if (!user) return
    fetchMyListings(user.uid)
      .then(setItems)
      .catch(() => setItems([]))
  }, [user])

  const act = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id)
    try {
      await fn()
      toast(ok)
      await load()
    } catch {
      toast('Thao tác thất bại.', 'error')
    } finally {
      setBusy('')
    }
  }

  if (!items) return <Spinner />
  const counts = Object.fromEntries(TABS.map((t) => [t, items.filter((l) => l.status === t).length]))
  const list = items.filter((l) => l.status === tab)

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tin của tôi</h1>
        <Link to="/dang-tin" className="btn-primary">+ Đăng tin</Link>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams({ tab: t }, { replace: true })}
            className={`rounded-lg px-1 py-2 text-xs font-semibold sm:text-sm ${tab === t ? 'bg-brand-500 text-white' : 'text-slate-600'}`}
            data-testid={`tab-${t}`}
          >
            {STATUS_LABELS[t]} ({counts[t]})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty>Không có tin nào ở mục “{STATUS_LABELS[tab]}”.</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((l) => (
            <li key={l.id} className="card flex gap-3 p-2.5" data-testid="my-listing">
              <Link to={`/tin/${l.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <ListingImage src={l.thumb} alt={l.title} className="h-full w-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/tin/${l.id}`} className="line-clamp-2 text-sm font-semibold">{l.title}</Link>
                <div className="text-sm font-bold text-red-600">{formatPrice(l.price)}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <StatusBadge status={l.status} /> {timeAgo(l.createdAt)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.status !== 'sold' && (
                    <Link to={`/sua-tin/${l.id}`} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium">Sửa</Link>
                  )}
                  {l.status === 'active' && (
                    <button type="button" disabled={busy === l.id} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white" onClick={() => act(l.id, () => setListingStatus(l.id, 'sold'), 'Đã đánh dấu “Đã bán”.')} data-testid="mark-sold">
                      Đánh dấu đã bán
                    </button>
                  )}
                  {(l.status === 'sold' || l.status === 'hidden') && (
                    <button type="button" disabled={busy === l.id} className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-medium text-white" onClick={() => act(l.id, () => repostListing(l.id), 'Đã đăng lại — tin đang chờ duyệt.')} data-testid="repost">
                      Đăng lại
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === l.id}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600"
                    onClick={() => {
                      if (window.confirm('Xoá vĩnh viễn tin này?')) void act(l.id, () => deleteListing(l.id), 'Đã xoá tin.')
                    }}
                    data-testid="delete-listing"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
