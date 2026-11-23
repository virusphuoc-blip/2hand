import { describe, expect, it } from 'vitest'
import { formatPrice, isValidPhone, normalize, parsePrice, slugify, zaloHref } from './text'

describe('text utils', () => {
  it('normalizes Vietnamese', () => {
    expect(normalize('  Điện  Thoại Cũ ')).toBe('dien thoai cu')
  })
  it('formats and parses prices', () => {
    expect(formatPrice(0)).toBe('Thỏa thuận')
    expect(formatPrice(1500000)).toBe('1.500.000 đ')
    expect(parsePrice('1.500.000 đ')).toBe(1500000)
  })
  it('validates phones and builds zalo links', () => {
    expect(isValidPhone('0912 345 678')).toBe(true)
    expect(isValidPhone('12345')).toBe(false)
    expect(zaloHref('0912 345 678')).toBe('https://zalo.me/0912345678')
  })
  it('slugifies', () => {
    expect(slugify('Đồ cổ & Sưu tầm')).toBe('do-co-suu-tam')
  })
})
