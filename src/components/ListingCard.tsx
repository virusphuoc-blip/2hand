import { Link } from 'react-router-dom'
import { useCategories } from '../lib/categories'
import { formatPrice, timeAgo } from '../lib/text'
import type { Listing } from '../lib/types'
import { ConditionBadge, ListingImage } from './ui'

export default function ListingCard({ l }: { l: Listing }) {
  const { name } = useCategories()
  return (
    <Link to={`/tin/${l.id}`} className="card group flex flex-col overflow-hidden hover:ring-brand-500" data-testid="listing-card">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <ListingImage src={l.thumb} alt={l.title} className="h-full w-full transition group-hover:scale-105" />
        {l.imageCount > 1 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{l.imageCount} ảnh</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">{l.title}</h3>
        <div className="text-base font-bold text-red-600">{formatPrice(l.price)}</div>
        <div><ConditionBadge condition={l.condition} /></div>
        <div className="mt-auto truncate pt-1 text-xs text-slate-500">
          {name(l.categoryId, l.categoryName)} · {l.province} · {timeAgo(l.createdAt)}
        </div>
      </div>
    </Link>
  )
}
