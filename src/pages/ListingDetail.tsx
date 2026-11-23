import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConditionBadge, ListingImage, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import { createReport, fetchListing, fetchListingImages } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCategories } from '../lib/categories'
import { conditionLabel, REPORT_REASONS, SITE_URL } from '../lib/constants'
import { formatPrice, telHref, timeAgo, zaloHref, zaloMessage } from '../lib/text'
import type { Listing } from '../lib/types'
import { useTitle } from '../lib/useTitle'

export default function ListingDetail() {
  const { id = '' } = useParams()
  const { user, isAdmin } = useAuth()
  const { name } = useCategories()
  const toast = useToast()
  const [listing, setListing] = useState<Listing | null | undefined>(undefined)
  const [images, setImages] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [reporting, setReporting] = useState(false)
  useTitle(listing ? listing.title : 'Chi tiết tin', listing ? `${listing.title} — ${formatPrice(listing.price)}, ${conditionLabel(listing.condition)}, ${listing.province}. Mua bán trên 2Hand.` : undefined)

  useEffect(() => {
    let alive = true
    fetchListing(id).then((l) => {
      if (!alive) return
      setListing(l)
      if (l) fetchListingImages(id).then((imgs) => alive && setImages(imgs.length ? imgs : l.thumb ? [l.thumb] : []))
    })
    return () => {
      alive = false
    }
  }, [id, user])

  if (listing === undefined) return <Spinner />
  if (!listing) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-bold">Tin đăng không tồn tại</h1>
        <p className="mt-2 text-sm text-slate-600">Tin có thể đã bị xoá, đang chờ duyệt hoặc đã bị ẩn.</p>
        <Link to="/" className="btn-primary mt-4">Về chợ</Link>
      </div>
    )
  }

  const isOwner = user?.uid === listing.sellerId
  const url = `${SITE_URL}/tin/${listing.id}`
  const zaloNumber = listing.zalo || listing.phone
  const message = zaloMessage(listing.title, url)

  const onZalo = () => {
    navigator.clipboard?.writeText(message).then(
      () => toast('Đã sao chép lời nhắn — dán vào khung chat Zalo để gửi.'),
      () => {},
    )
  }

  return (
    <article className="mx-auto max-w-4xl space-y-3">
      <nav className="text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-600">Chợ</Link> ›{' '}
        <Link to={`/?dm=${listing.categoryId}`} className="hover:text-brand-600">{name(listing.categoryId, listing.categoryName)}</Link>
      </nav>

      {(isOwner || isAdmin) && listing.status !== 'active' && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Trạng thái: <StatusBadge status={listing.status} />
          {listing.status === 'pending' && <span>— tin sẽ hiển thị công khai sau khi quản trị duyệt.</span>}
        </div>
      )}
      {listing.status === 'sold' && !isOwner && !isAdmin && (
        <div className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Món hàng này đã được bán.</div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="relative aspect-square bg-slate-100">
            <ListingImage src={images[idx] ?? ''} alt={listing.title} className="h-full w-full !object-contain" />
            {images.length > 1 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{idx + 1}/{images.length}</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg ring-2 ${i === idx ? 'ring-brand-500' : 'ring-transparent'}`}
                  aria-label={`Ảnh ${i + 1}`}
                >
                  <ListingImage src={src} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="card space-y-2 p-4">
            <h1 className="text-xl font-bold leading-snug" data-testid="detail-title">{listing.title}</h1>
            <div className="text-2xl font-extrabold text-red-600" data-testid="detail-price">{formatPrice(listing.price)}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Tình trạng</dt>
              <dd data-testid="detail-condition"><ConditionBadge condition={listing.condition} /> <span className="ml-1">{conditionLabel(listing.condition)}</span></dd>
              <dt className="text-slate-500">Danh mục</dt>
              <dd>{name(listing.categoryId, listing.categoryName)}</dd>
              <dt className="text-slate-500">Khu vực</dt>
              <dd>{listing.province}</dd>
              <dt className="text-slate-500">Đăng</dt>
              <dd>{timeAgo(listing.createdAt)}</dd>
            </dl>
          </div>

          <div className="card space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {(listing.sellerName || '?').charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="font-semibold" data-testid="seller-name">{listing.sellerName}</div>
                <div className="text-xs text-slate-500">Người bán · {listing.province}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={telHref(listing.phone)} className="btn-primary" data-testid="call-button">
                Gọi {listing.phone}
              </a>
              <a
                href={zaloHref(zaloNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onZalo}
                className="btn bg-[#0068ff] text-white hover:bg-[#0055d4]"
                data-testid="zalo-button"
              >
                Chat Zalo
              </a>
            </div>
            <p className="text-xs text-slate-500">
              Bấm “Chat Zalo” sẽ mở zalo.me/{zaloNumber} và tự sao chép lời nhắn: “{message}”
            </p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              An toàn: xem hàng trực tiếp, không chuyển khoản đặt cọc khi chưa gặp người bán.
            </p>
          </div>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="mb-2 font-bold">Mô tả chi tiết</h2>
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-800" data-testid="detail-description">{listing.description}</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {isOwner ? (
          <Link to={`/sua-tin/${listing.id}`} className="btn-outline">Sửa tin</Link>
        ) : (
          <span />
        )}
        <button type="button" className="text-sm font-medium text-red-600 hover:underline" onClick={() => setReporting(true)} data-testid="report-button">
          Báo cáo tin đăng
        </button>
      </div>

      {reporting && <ReportDialog listing={listing} onClose={() => setReporting(false)} />}
    </article>
  )
}

function ReportDialog({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !reason) return
    setBusy(true)
    try {
      await createReport({
        listingId: listing.id,
        listingTitle: listing.title,
        reason,
        note: note.trim().slice(0, 500),
        reporterId: user.uid,
        reporterEmail: user.email ?? '',
      })
      toast('Đã gửi báo cáo. Cảm ơn bạn!')
      onClose()
    } catch {
      toast('Gửi báo cáo thất bại, vui lòng thử lại.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Báo cáo tin đăng">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-4">
        <h2 className="text-lg font-bold">Báo cáo tin đăng</h2>
        {!user ? (
          <>
            <p className="text-sm text-slate-600">Bạn cần đăng nhập để gửi báo cáo (giúp hạn chế báo cáo rác).</p>
            <div className="flex gap-2">
              <Link to={`/dang-nhap?next=/tin/${listing.id}`} className="btn-primary flex-1">Đăng nhập</Link>
              <button type="button" className="btn-outline flex-1" onClick={onClose}>Đóng</button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-brand-500" />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea className="field" rows={3} maxLength={500} placeholder="Mô tả thêm (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <button type="submit" className="btn-danger flex-1" disabled={!reason || busy} data-testid="report-submit">Gửi báo cáo</button>
              <button type="button" className="btn-outline flex-1" onClick={onClose}>Huỷ</button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
