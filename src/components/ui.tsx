import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { CONDITIONS, STATUS_LABELS, type ListingStatus } from '../lib/constants'

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {label}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card px-4 py-10 text-center text-slate-500">{children}</div>
}

export function ConditionBadge({ condition }: { condition: string }) {
  const c = CONDITIONS.find((x) => x.id === condition)
  const cls = c?.isNew ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{c?.short ?? condition}</span>
}

export function StatusBadge({ status }: { status: ListingStatus }) {
  const cls: Record<ListingStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    active: 'bg-emerald-100 text-emerald-800',
    sold: 'bg-slate-200 text-slate-700',
    hidden: 'bg-red-100 text-red-700',
  }
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${cls[status]}`}>{STATUS_LABELS[status]}</span>
}

export function ListingImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className}`}>
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M21 17l-5-5-8 7" />
        </svg>
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={`object-cover ${className}`} />
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <>{children}</>
}

export function NeedProfile() {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <h1 className="text-lg font-bold">Hoàn tất hồ sơ người bán</h1>
      <p className="mt-2 text-sm text-slate-600">Bạn cần nhập tên hiển thị, số điện thoại và tỉnh/thành trước khi đăng tin.</p>
      <Link to="/tai-khoan?next=/dang-tin" className="btn-primary mt-4">Cập nhật hồ sơ</Link>
    </div>
  )
}
