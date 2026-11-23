import { useState, type FormEvent } from 'react'
import { useCategories } from '../lib/categories'
import { CONDITIONS, MAX_DESCRIPTION, MAX_IMAGES, MAX_IMAGE_DATA_URL, MAX_PRICE, MAX_TITLE, PROVINCES, type Condition } from '../lib/constants'
import { approxKB, compressFile, isDataUrl, isHttpUrl } from '../lib/images'
import { digitsOnly, isValidPhone, parsePrice } from '../lib/text'
import type { ListingInput } from '../lib/types'

export type FormInitial = Partial<ListingInput>

export default function ListingForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: FormInitial
  submitLabel: string
  onSubmit: (input: ListingInput) => Promise<void>
}) {
  const { active, all } = useCategories()
  const [title, setTitle] = useState(initial.title ?? '')
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? '')
  const [condition, setCondition] = useState<Condition | ''>(initial.condition ?? '')
  const [price, setPrice] = useState(initial.price ? String(initial.price) : '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [images, setImages] = useState<string[]>(initial.images ?? [])
  const [province, setProvince] = useState(initial.province ?? '')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [zalo, setZalo] = useState(initial.zalo ?? '')
  const [link, setLink] = useState('')
  const [imgBusy, setImgBusy] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const choices = active.some((c) => c.id === categoryId) ? active : [...active, ...all.filter((c) => c.id === categoryId)]
  const priceNum = parsePrice(price)

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setImgBusy(true)
    const room = MAX_IMAGES - images.length
    const picked = Array.from(files).slice(0, room)
    if (files.length > room) setError(`Chỉ được tối đa ${MAX_IMAGES} ảnh/tin.`)
    const out: string[] = []
    for (const f of picked) {
      try {
        out.push(await compressFile(f))
      } catch (e) {
        setError((e as Error).message)
      }
    }
    setImages((x) => [...x, ...out].slice(0, MAX_IMAGES))
    setImgBusy(false)
  }

  const addLink = () => {
    const u = link.trim()
    if (!isHttpUrl(u)) {
      setError('Link ảnh phải bắt đầu bằng https://')
      return
    }
    if (u.length > 2000) {
      setError('Link ảnh quá dài.')
      return
    }
    if (images.length >= MAX_IMAGES) {
      setError(`Chỉ được tối đa ${MAX_IMAGES} ảnh/tin.`)
      return
    }
    setError('')
    setImages((x) => [...x, u])
    setLink('')
  }

  const move = (i: number) => setImages((x) => (i === 0 ? x : [x[i], ...x.slice(0, i), ...x.slice(i + 1)]))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cat = all.find((c) => c.id === categoryId)
    const problems: string[] = []
    if (title.trim().length < 5) problems.push('Tiêu đề tối thiểu 5 ký tự.')
    if (!cat) problems.push('Hãy chọn danh mục.')
    if (!condition) problems.push('Hãy chọn tình trạng món hàng.')
    if (priceNum > MAX_PRICE) problems.push('Giá bán không hợp lệ.')
    if (description.trim().length < 10) problems.push('Mô tả tối thiểu 10 ký tự.')
    if (images.length < 1) problems.push('Cần ít nhất 1 ảnh.')
    if (!province) problems.push('Hãy chọn tỉnh/thành.')
    if (!isValidPhone(phone)) problems.push('Số điện thoại không hợp lệ.')
    if (zalo && !isValidPhone(zalo)) problems.push('Số Zalo không hợp lệ.')
    if (problems.length) {
      setError(problems.join(' '))
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit({
        title: title.trim(),
        categoryId,
        categoryName: cat!.name,
        condition: condition as Condition,
        price: priceNum,
        description: description.trim(),
        images,
        province,
        phone: digitsOnly(phone),
        zalo: digitsOnly(zalo),
      })
    } catch (err) {
      const code = (err as { code?: string }).code
      setError(code === 'permission-denied' ? 'Không có quyền đăng/sửa tin (tài khoản bị khoá hoặc dữ liệu không hợp lệ).' : 'Lưu tin thất bại: ' + ((err as Error).message || 'lỗi không xác định'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="title">Tiêu đề *</label>
          <input id="title" className="field" maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: iPhone 13 128GB xanh, pin 89%" />
          <div className="mt-1 text-right text-xs text-slate-400">{title.length}/{MAX_TITLE}</div>
        </div>

        <fieldset>
          <legend className="label">Danh mục * <span className="font-normal text-slate-500">(chọn 1 trong danh sách)</span></legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-testid="category-checklist">
            {choices.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${categoryId === c.id ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-slate-200'}`}>
                <input type="radio" name="category" value={c.id} checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} className="h-4 w-4 accent-brand-500" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Tình trạng *</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-testid="condition-options">
            {CONDITIONS.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${condition === c.id ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-slate-200'}`}>
                <input type="radio" name="condition" value={c.id} checked={condition === c.id} onChange={() => setCondition(c.id)} className="h-4 w-4 accent-brand-500" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="price">Giá bán (đ) *</label>
          <input id="price" className="field" inputMode="numeric" value={priceNum ? priceNum.toLocaleString('vi-VN') : ''} onChange={(e) => setPrice(e.target.value)} placeholder="Để trống = Thỏa thuận" />
        </div>

        <div>
          <label className="label" htmlFor="desc">Mô tả *</label>
          <textarea id="desc" className="field" rows={6} maxLength={MAX_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Xuất xứ, thời gian sử dụng, lỗi/trầy xước (nếu có), phụ kiện kèm theo, bảo hành…" />
          <div className="mt-1 text-right text-xs text-slate-400">{description.length}/{MAX_DESCRIPTION}</div>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="label !mb-0">Ảnh * ({images.length}/{MAX_IMAGES})</div>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Tối đa {MAX_IMAGES} ảnh/tin. Ảnh tải lên được tự động nén còn ≤ {Math.round(MAX_IMAGE_DATA_URL / 1000)} KB/ảnh và lưu trực tiếp trong cơ sở dữ liệu.
          Hoặc dán link ảnh công khai (bắt đầu bằng https://). Ảnh đầu tiên là ảnh bìa.
        </p>
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Ảnh ${i + 1}`} referrerPolicy="no-referrer" className="aspect-square w-full rounded-lg bg-slate-100 object-cover" />
                <button type="button" onClick={() => setImages((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white" aria-label={`Xoá ảnh ${i + 1}`}>✕</button>
                <div className="mt-0.5 text-center text-[10px] text-slate-500">
                  {i === 0 ? 'Ảnh bìa' : <button type="button" className="underline" onClick={() => move(i)}>Đặt làm bìa</button>}
                  {isDataUrl(src) ? ` · ${approxKB(src)} KB` : ' · link'}
                </div>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <>
            <label className="btn-outline w-full cursor-pointer">
              {imgBusy ? 'Đang nén ảnh…' : 'Chọn ảnh từ máy'}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={imgBusy} onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} data-testid="image-file" />
            </label>
            <div className="flex gap-2">
              <input className="field" type="url" placeholder="https://… link ảnh" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link ảnh" data-testid="image-link" />
              <button type="button" className="btn-outline shrink-0" onClick={addLink} data-testid="image-link-add">Thêm</button>
            </div>
          </>
        )}
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="province">Tỉnh/thành *</label>
          <select id="province" className="field" value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">— Chọn tỉnh/thành —</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">SĐT liên hệ *</label>
            <input id="phone" className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" />
          </div>
          <div>
            <label className="label" htmlFor="zalo">Zalo (nếu khác SĐT)</label>
            <input id="zalo" className="field" inputMode="tel" value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="Để trống = dùng SĐT" />
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="form-error">{error}</div>}
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy || imgBusy} data-testid="submit-listing">
        {busy ? 'Đang lưu…' : submitLabel}
      </button>
      <p className="text-center text-xs text-slate-500">Tin đăng sẽ ở trạng thái “Chờ duyệt” cho tới khi quản trị duyệt.</p>
    </form>
  )
}
