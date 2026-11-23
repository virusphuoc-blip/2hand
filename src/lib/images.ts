import { MAX_IMAGE_DATA_URL, MAX_THUMB_DATA_URL } from './constants'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không đọc được ảnh.'))
    img.src = src
  })
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Không đọc được tệp.'))
    r.readAsDataURL(file)
  })
}

async function shrink(src: string, maxSide: number, maxLen: number): Promise<string> {
  const img = await loadImage(src)
  let side = maxSide
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      const out = canvas.toDataURL('image/jpeg', q)
      if (out.length <= maxLen) return out
    }
    side = Math.round(side * 0.75)
  }
  throw new Error('Ảnh quá lớn, vui lòng chọn ảnh khác.')
}

/** Resize + compress a picked photo into a JPEG data URL ≤ MAX_IMAGE_DATA_URL characters. */
export async function compressFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ chấp nhận tệp ảnh.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Ảnh gốc tối đa 15 MB.')
  return shrink(await readFile(file), 1200, MAX_IMAGE_DATA_URL)
}

export function isDataUrl(s: string): boolean {
  return s.startsWith('data:image/')
}

export function isHttpUrl(s: string): boolean {
  return /^https:\/\/\S+$/i.test(s.trim())
}

/** Small preview stored on the listing doc so the market grid stays light. */
export async function makeThumb(first: string): Promise<string> {
  if (!first) return ''
  if (!isDataUrl(first)) return first
  return shrink(first, 360, MAX_THUMB_DATA_URL)
}

export function approxKB(s: string): number {
  return Math.round(s.length / 1024)
}
