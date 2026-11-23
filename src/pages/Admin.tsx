import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConditionBadge, Empty, ListingImage, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import {
  deleteListing,
  deleteReport,
  fetchAllListings,
  fetchReports,
  fetchUsers,
  saveCategory,
  seedCategories,
  setListingStatus,
  setReportStatus,
  setUserDisabled,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCategories } from '../lib/categories'
import { ADMIN_EMAIL, STATUS_LABELS, reportReasonLabel, type Category, type ListingStatus } from '../lib/constants'
import { formatPrice, slugify, startOfToday, timeAgo } from '../lib/text'
import type { Listing, Profile, Report } from '../lib/types'
import { useTitle } from '../lib/useTitle'

type Tab = 'stats' | 'listings' | 'reports' | 'users' | 'categories'
const TABS: [Tab, string][] = [
  ['stats', 'Thống kê'],
  ['listings', 'Tin đăng'],
  ['reports', 'Báo cáo'],
  ['users', 'Người dùng'],
  ['categories', 'Danh mục'],
]

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  useTitle('Quản trị')
  if (loading) return <Spinner />
  if (!user || !isAdmin) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-bold">Khu vực quản trị</h1>
        <p className="mt-2 text-sm text-slate-600">Chỉ tài khoản Google {ADMIN_EMAIL} mới truy cập được trang này.</p>
        {!user && <Link to="/dang-nhap?next=/quan-tri" className="btn-primary mt-4">Đăng nhập bằng Google</Link>}
      </div>
    )
  }
  return <AdminPanel />
}

function AdminPanel() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('stats')
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [users, setUsers] = useState<Profile[] | null>(null)
  const [reports, setReports] = useState<Report[] | null>(null)

  const load = useCallback(async () => {
    try {
      const [l, u, r] = await Promise.all([fetchAllListings(), fetchUsers(), fetchReports()])
      setListings(l)
      setUsers(u)
      setReports(r)
    } catch {
      toast('Không tải được dữ liệu quản trị (kiểm tra Firestore rules).', 'error')
      setListings((x) => x ?? [])
      setUsers((x) => x ?? [])
      setReports((x) => x ?? [])
    }
  }, [toast])

  useEffect(() => {
    Promise.all([fetchAllListings(), fetchUsers(), fetchReports()])
      .then(([l, u, r]) => {
        setListings(l)
        setUsers(u)
        setReports(r)
      })
      .catch(() => {
        toast('Không tải được dữ liệu quản trị (kiểm tra Firestore rules).', 'error')
        setListings([])
        setUsers([])
        setReports([])
      })
  }, [toast])

  const pendingCount = listings?.filter((l) => l.status === 'pending').length ?? 0
  const openReports = reports?.filter((r) => r.status === 'open').length ?? 0

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Trang quản trị</h1>
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${tab === k ? 'bg-brand-500 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
            data-testid={`admin-tab-${k}`}
          >
            {label}
            {k === 'listings' && pendingCount > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{pendingCount}</span>}
            {k === 'reports' && openReports > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{openReports}</span>}
          </button>
        ))}
      </div>
      {!listings || !users || !reports ? (
        <Spinner />
      ) : tab === 'stats' ? (
        <Stats listings={listings} users={users} reports={reports} />
      ) : tab === 'listings' ? (
        <ListingsAdmin listings={listings} reload={load} />
      ) : tab === 'reports' ? (
        <ReportsAdmin reports={reports} listings={listings} reload={load} />
      ) : tab === 'users' ? (
        <UsersAdmin users={users} listings={listings} reload={load} />
      ) : (
        <CategoriesAdmin listings={listings} />
      )}
    </div>
  )
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'amber' | 'emerald' | 'red' }) {
  const tones = { slate: 'text-slate-900', amber: 'text-amber-600', emerald: 'text-emerald-600', red: 'text-red-600' }
  return (
    <div className="card p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-2xl font-extrabold ${tones[tone]}`}>{value.toLocaleString('vi-VN')}</div>
    </div>
  )
}

function Stats({ listings, users, reports }: { listings: Listing[]; users: Profile[]; reports: Report[] }) {
  const today = startOfToday()
  const week = today - 6 * 86400000
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="admin-stats">
      <StatCard label="Tổng tin đăng" value={listings.length} />
      <StatCard label="Tin hôm nay" value={listings.filter((l) => l.createdAt >= today).length} tone="emerald" />
      <StatCard label="Tin chờ duyệt" value={listings.filter((l) => l.status === 'pending').length} tone="amber" />
      <StatCard label="Tin đang bán" value={listings.filter((l) => l.status === 'active').length} />
      <StatCard label="Tin đã bán" value={listings.filter((l) => l.status === 'sold').length} />
      <StatCard label="Tổng người dùng" value={users.length} />
      <StatCard label="Người dùng mới hôm nay" value={users.filter((u) => u.createdAt >= today).length} tone="emerald" />
      <StatCard label="Người dùng mới 7 ngày" value={users.filter((u) => u.createdAt >= week).length} tone="emerald" />
      <StatCard label="Báo cáo chưa xử lý" value={reports.filter((r) => r.status === 'open').length} tone="red" />
    </div>
  )
}

function ListingsAdmin({ listings, reload }: { listings: Listing[]; reload: () => Promise<void> }) {
  const toast = useToast()
  const { name } = useCategories()
  const [status, setStatus] = useState<ListingStatus | ''>('pending')
  const [busy, setBusy] = useState('')
  const list = status ? listings.filter((l) => l.status === status) : listings

  const act = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id)
    try {
      await fn()
      toast(ok)
      await reload()
    } catch {
      toast('Thao tác thất bại.', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-2">
      <select className="field" value={status} onChange={(e) => setStatus(e.target.value as ListingStatus | '')} aria-label="Lọc theo trạng thái" data-testid="admin-status-filter">
        <option value="">Tất cả ({listings.length})</option>
        {(Object.keys(STATUS_LABELS) as ListingStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]} ({listings.filter((l) => l.status === s).length})</option>
        ))}
      </select>
      {list.length === 0 ? (
        <Empty>Không có tin nào.</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((l) => (
            <li key={l.id} className="card flex gap-3 p-2.5" data-testid="admin-listing">
              <Link to={`/tin/${l.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <ListingImage src={l.thumb} alt={l.title} className="h-full w-full" />
              </Link>
              <div className="min-w-0 flex-1 space-y-1">
                <Link to={`/tin/${l.id}`} className="line-clamp-2 text-sm font-semibold">{l.title}</Link>
                <div className="text-sm font-bold text-red-600">{formatPrice(l.price)}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <StatusBadge status={l.status} />
                  <ConditionBadge condition={l.condition} />
                  <span>{name(l.categoryId, l.categoryName)}</span>
                </div>
                <div className="text-xs text-slate-500">{l.sellerName} · {l.phone} · {l.province} · {timeAgo(l.createdAt)}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {l.status !== 'active' && l.status !== 'sold' && (
                    <button type="button" disabled={busy === l.id} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white" onClick={() => act(l.id, () => setListingStatus(l.id, 'active'), 'Đã duyệt tin.')} data-testid="approve-listing">
                      Duyệt
                    </button>
                  )}
                  {l.status !== 'hidden' && (
                    <button type="button" disabled={busy === l.id} className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white" onClick={() => act(l.id, () => setListingStatus(l.id, 'hidden'), 'Đã ẩn tin.')} data-testid="hide-listing">
                      Ẩn
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === l.id}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600"
                    onClick={() => {
                      if (window.confirm('Xoá vĩnh viễn tin này?')) void act(l.id, () => deleteListing(l.id), 'Đã xoá tin.')
                    }}
                    data-testid="admin-delete-listing"
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

function ReportsAdmin({ reports, listings, reload }: { reports: Report[]; listings: Listing[]; reload: () => Promise<void> }) {
  const toast = useToast()
  const [showResolved, setShowResolved] = useState(false)
  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings])
  const list = reports.filter((r) => showResolved || r.status === 'open')

  const act = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn()
      toast(ok)
      await reload()
    } catch {
      toast('Thao tác thất bại.', 'error')
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        Hiện cả báo cáo đã xử lý
      </label>
      {list.length === 0 ? (
        <Empty>Không có báo cáo nào.</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => {
            const l = byId.get(r.listingId)
            return (
              <li key={r.id} className="card space-y-1 p-3 text-sm" data-testid="admin-report">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/tin/${r.listingId}`} className="font-semibold hover:underline">{r.listingTitle || r.listingId}</Link>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${r.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.status === 'open' ? 'Chưa xử lý' : 'Đã xử lý'}
                  </span>
                </div>
                <div><b>Lý do:</b> {reportReasonLabel(r.reason)}</div>
                {r.note && <div className="whitespace-pre-line text-slate-700">{r.note}</div>}
                <div className="text-xs text-slate-500">Người báo cáo: {r.reporterEmail || r.reporterId} · {timeAgo(r.createdAt)}</div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {l ? <StatusBadge status={l.status} /> : <span className="text-xs text-slate-500">Tin đã bị xoá</span>}
                  {l && l.status !== 'hidden' && (
                    <button type="button" className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white" onClick={() => act(async () => { await setListingStatus(l.id, 'hidden'); await setReportStatus(r.id, 'resolved') }, 'Đã ẩn tin và đóng báo cáo.')}>
                      Ẩn tin
                    </button>
                  )}
                  {r.status === 'open' && (
                    <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium" onClick={() => act(() => setReportStatus(r.id, 'resolved'), 'Đã đánh dấu đã xử lý.')}>
                      Đánh dấu đã xử lý
                    </button>
                  )}
                  <button type="button" className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600" onClick={() => act(() => deleteReport(r.id), 'Đã xoá báo cáo.')}>
                    Xoá báo cáo
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function UsersAdmin({ users, listings, reload }: { users: Profile[]; listings: Listing[]; reload: () => Promise<void> }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of listings) m.set(l.sellerId, (m.get(l.sellerId) ?? 0) + 1)
    return m
  }, [listings])
  const list = users.filter((u) => !q || `${u.displayName} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-2">
      <input className="field" placeholder="Tìm theo tên, email, SĐT" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm người dùng" />
      <p className="text-xs text-slate-500">
        “Khoá” chặn người dùng đăng/sửa tin (kiểm tra bằng Firestore rules). Tài khoản đăng nhập Firebase vẫn tồn tại; muốn vô hiệu hoá hẳn, vào Firebase Console → Authentication.
      </p>
      {list.length === 0 ? (
        <Empty>Chưa có người dùng.</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.uid} className="card flex items-center gap-3 p-3 text-sm" data-testid="admin-user">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {u.displayName || '(chưa đặt tên)'}{' '}
                  {u.disabled && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">Đã khoá</span>}
                </div>
                <div className="truncate text-xs text-slate-500">{u.email}</div>
                <div className="text-xs text-slate-500">{u.phone} · {u.province} · {counts.get(u.uid) ?? 0} tin · tham gia {timeAgo(u.createdAt)}</div>
              </div>
              {u.email.toLowerCase() !== ADMIN_EMAIL && (
                <button
                  type="button"
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${u.disabled ? 'bg-emerald-600 text-white' : 'border border-red-300 text-red-600'}`}
                  onClick={async () => {
                    try {
                      await setUserDisabled(u.uid, !u.disabled)
                      toast(u.disabled ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.')
                      await reload()
                    } catch {
                      toast('Thao tác thất bại.', 'error')
                    }
                  }}
                >
                  {u.disabled ? 'Mở khoá' : 'Khoá'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CategoriesAdmin({ listings }: { listings: Listing[] }) {
  const toast = useToast()
  const { all, seeded, reload } = useCategories()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of listings) m.set(l.categoryId, (m.get(l.categoryId) ?? 0) + 1)
    return m
  }, [listings])

  useEffect(() => {
    if (seeded) return
    seedCategories()
      .then(reload)
      .catch(() => toast('Không khởi tạo được danh mục mặc định.', 'error'))
  }, [seeded, reload, toast])

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      await reload()
      toast(ok)
    } catch {
      toast('Lưu danh mục thất bại.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const swap = (i: number, j: number) => {
    const a = all[i]
    const b = all[j]
    if (!a || !b) return
    void run(async () => {
      await saveCategory({ ...a, order: b.order })
      await saveCategory({ ...b, order: a.order === b.order ? a.order + 1 : a.order })
    }, 'Đã đổi thứ tự.')
  }

  const add = () => {
    const name = newName.trim()
    if (name.length < 2) return toast('Tên danh mục tối thiểu 2 ký tự.', 'error')
    let id = slugify(name) || 'danh-muc'
    while (all.some((c) => c.id === id)) id = `${id}-${Math.floor(Math.random() * 1000)}`
    const order = Math.max(0, ...all.map((c) => c.order)) + 1
    void run(async () => {
      await saveCategory({ id, name, order, active: true })
      setNewName('')
    }, 'Đã thêm danh mục.')
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Người bán chỉ chọn được danh mục đang hiển thị. Ẩn danh mục không ảnh hưởng tin đã đăng.</p>
      <ul className="space-y-1.5" data-testid="admin-categories">
        {all.map((c: Category, i) => {
          const value = edits[c.id] ?? c.name
          const dirty = value.trim() !== c.name
          return (
            <li key={c.id} className={`card flex items-center gap-2 p-2 ${c.active ? '' : 'opacity-60'}`} data-testid="admin-category">
              <div className="flex flex-col">
                <button type="button" className="px-1 text-xs leading-none text-slate-500 disabled:opacity-30" disabled={busy || i === 0} onClick={() => swap(i, i - 1)} aria-label="Lên">▲</button>
                <button type="button" className="px-1 text-xs leading-none text-slate-500 disabled:opacity-30" disabled={busy || i === all.length - 1} onClick={() => swap(i, i + 1)} aria-label="Xuống">▼</button>
              </div>
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                value={value}
                maxLength={60}
                onChange={(e) => setEdits((x) => ({ ...x, [c.id]: e.target.value }))}
                aria-label={`Tên danh mục ${c.name}`}
              />
              <span className="shrink-0 text-xs text-slate-400">{counts.get(c.id) ?? 0}</span>
              {dirty && (
                <button
                  type="button"
                  disabled={busy || value.trim().length < 2}
                  className="shrink-0 rounded-md bg-brand-500 px-2 py-1.5 text-xs font-semibold text-white"
                  onClick={() => run(async () => {
                    await saveCategory({ ...c, name: value.trim() })
                    setEdits((x) => { const n = { ...x }; delete n[c.id]; return n })
                  }, 'Đã đổi tên danh mục.')}
                  data-testid="save-category"
                >
                  Lưu
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold ${c.active ? 'border border-slate-300 text-slate-700' : 'bg-emerald-600 text-white'}`}
                onClick={() => run(() => saveCategory({ ...c, active: !c.active }), c.active ? 'Đã ẩn danh mục.' : 'Đã hiện danh mục.')}
                data-testid="toggle-category"
              >
                {c.active ? 'Ẩn' : 'Hiện'}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="card flex gap-2 p-2">
        <input className="field" placeholder="Tên danh mục mới" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} aria-label="Tên danh mục mới" data-testid="new-category" />
        <button type="button" className="btn-primary shrink-0" disabled={busy} onClick={add} data-testid="add-category">Thêm</button>
      </div>
    </div>
  )
}
