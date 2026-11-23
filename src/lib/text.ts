export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatPrice(n: number): string {
  if (!n) return 'Thỏa thuận'
  return n.toLocaleString('vi-VN') + ' đ'
}

export function parsePrice(s: string): number {
  const digits = s.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function digitsOnly(s: string): string {
  return s.replace(/[^\d]/g, '')
}

export function isValidPhone(s: string): boolean {
  return /^(0|84)\d{9,10}$/.test(digitsOnly(s))
}

export function telHref(phone: string): string {
  return 'tel:' + digitsOnly(phone)
}

export function zaloHref(phone: string): string {
  return 'https://zalo.me/' + digitsOnly(phone)
}

export function zaloMessage(title: string, url: string): string {
  return `Chào bạn, mình thấy tin "${title}" trên 2Hand (${url}). Món này còn không bạn?`
}

export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ngày trước`
  return new Date(ms).toLocaleDateString('vi-VN')
}

export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export function slugify(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
