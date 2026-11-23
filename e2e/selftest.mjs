// E2E self-test at 390px against Firebase emulators + `vite --mode emulator`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5180'
const CHROME = process.env.CHROME
const OUT = new URL('./screens/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const results = []
const ok = (name) => { results.push(`PASS ${name}`); console.log('PASS', name) }
const assert = (cond, name) => { if (!cond) throw new Error('FAIL ' + name); ok(name) }

// tiny solid-colour PNGs for uploads
function png(path, w, h, rgb) {
  const zlib = await_zlib
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = (rgb[1] + x) % 256; raw[o + 2] = (rgb[2] + y) % 256 } }
  const crc = (buf) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } let r = 0xffffffff; for (const b of buf) r = t[(r ^ b) & 0xff] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}
const await_zlib = await import('node:zlib')
png('/tmp/2hand-a.png', 800, 600, [30, 120, 200])
png('/tmp/2hand-b.png', 600, 800, [220, 90, 40])

// reset emulator data
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-2hand/databases/(default)/documents', { method: 'DELETE' })
await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-2hand/accounts', { method: 'DELETE' })

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const device = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' }
let shot = 0
const snap = async (page, name) => page.screenshot({ path: `${OUT}${String(++shot).padStart(2, '0')}-${name}.png`, fullPage: true })

const seller = await browser.newContext({ ...device, permissions: ['clipboard-read', 'clipboard-write'] })
const sp = await seller.newPage()
sp.on('dialog', (d) => d.accept())
const errors = []
sp.on('pageerror', (e) => errors.push(String(e)))

// 1. Register
await sp.goto(BASE + '/dang-ky')
await sp.fill('#r-name', 'Phước Test')
await sp.fill('#r-email', `seller${Date.now()}@example.com`)
await sp.fill('#r-pass', 'matkhau123')
await sp.fill('#r-phone', '0988474228')
await sp.selectOption('#r-province', 'TP. Hồ Chí Minh')
await snap(sp, 'dang-ky')
await sp.click('[data-testid=register-submit]')
await sp.waitForURL(BASE + '/')
ok('Đăng ký email/mật khẩu + hồ sơ người bán')
const width = await sp.evaluate(() => document.documentElement.scrollWidth)
assert(width <= 390, `Không tràn ngang ở 390px (scrollWidth=${width})`)

// 2. Post 2 listings
async function post({ title, cat, cond, price, desc, file, link }) {
  await sp.goto(BASE + '/dang-tin')
  await sp.fill('#title', title)
  await sp.locator('[data-testid=category-checklist] label', { hasText: cat }).click()
  await sp.locator('[data-testid=condition-options] label', { hasText: cond }).click()
  await sp.fill('#price', String(price))
  await sp.fill('#desc', desc)
  await sp.setInputFiles('[data-testid=image-file]', file)
  await sp.waitForSelector('img[alt="Ảnh 1"]')
  if (link) { await sp.fill('[data-testid=image-link]', link); await sp.click('[data-testid=image-link-add]'); await sp.waitForSelector('img[alt="Ảnh 2"]') }
  const phone = await sp.inputValue('#phone')
  if (shot < 4) await snap(sp, 'dang-tin')
  await sp.click('[data-testid=submit-listing]')
  await sp.waitForURL(/tin-cua-toi\?tab=pending/)
  return phone
}
const phone = await post({ title: 'iPhone 13 128GB xanh, pin 89%', cat: 'Điện thoại', cond: 'Đã qua sử dụng — có trầy xước', price: 9000000, desc: 'Máy zin, có vài vết trầy nhẹ ở viền, kèm sạc.', file: '/tmp/2hand-a.png', link: 'https://example.com/iphone.jpg' })
assert(phone === '0988474228', 'Form đăng tin tự điền SĐT từ hồ sơ')
await post({ title: 'Nồi cơm điện Sharp 1.8L mới nguyên hộp', cat: 'Đồ gia dụng', cond: 'Mới 100%', price: 800000, desc: 'Hàng mới 100%, chưa bóc hộp, bảo hành 12 tháng.', file: '/tmp/2hand-b.png' })
await sp.waitForSelector('[data-testid=my-listing]')
assert((await sp.locator('[data-testid=my-listing]').count()) === 2, 'Đăng 2 tin (1 đồ cũ, 1 đồ mới) → cả 2 ở "Chờ duyệt"')
await snap(sp, 'tin-cua-toi-cho-duyet')

// Guests don't see pending listings yet
const guest = await browser.newContext(device)
const gp = await guest.newPage()
gp.on('pageerror', (e) => errors.push(String(e)))
await gp.goto(BASE + '/')
await gp.waitForSelector('[data-testid=result-count]')
assert((await gp.textContent('[data-testid=result-count]')) === '0 tin', 'Tin chờ duyệt chưa hiện ở chợ')

// 3. Admin (Google popup on Auth emulator) approves
const adminCtx = await browser.newContext(device)
const ap = await adminCtx.newPage()
ap.on('dialog', (d) => d.accept())
ap.on('pageerror', (e) => errors.push(String(e)))
async function googleLogin(page, email) {
  await page.goto(BASE + '/dang-nhap?next=/quan-tri')
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('[data-testid=google-signin]')])
  await popup.waitForLoadState()
  await popup.getByText('Add new account').click()
  await popup.fill('#email-input', email)
  await popup.fill('#display-name-input', 'VH Phước')
  await popup.click('#sign-in')
}
await googleLogin(ap, 'virusphuoc@gmail.com')
await ap.waitForSelector('[data-testid=admin-stats], #p-phone')
if (await ap.locator('#p-phone').count()) {
  if (!(await ap.inputValue('#p-name'))) await ap.fill('#p-name', 'VH Phước')
  await ap.fill('#p-phone', '0988474228')
  await ap.selectOption('#p-province', 'TP. Hồ Chí Minh')
  await ap.click('[data-testid=save-profile]')
  await ap.waitForURL((u) => u.pathname === '/quan-tri')
}
await ap.waitForSelector('[data-testid=admin-stats]').catch(async (e) => {
  console.log('URL', ap.url(), '\n', (await ap.textContent('body')).slice(0, 800))
  await ap.screenshot({ path: OUT + 'fail.png' })
  throw e
})
const statsText = await ap.textContent('[data-testid=admin-stats]')
assert(statsText.includes('Tin chờ duyệt2'), 'Thống kê: 2 tin chờ duyệt')
await snap(ap, 'quan-tri-thong-ke')
await ap.click('[data-testid=admin-tab-listings]')
await ap.waitForSelector('[data-testid=admin-listing]')
await snap(ap, 'quan-tri-cho-duyet')
for (let i = 0; i < 2; i++) {
  await ap.locator('[data-testid=approve-listing]').first().click()
  await ap.waitForFunction((n) => document.querySelectorAll('[data-testid=approve-listing]').length === n, 1 - i)
}
ok('Admin duyệt 2 tin')

// 4. Guest search + filter
await gp.goto(BASE + '/')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '2 tin')
await snap(gp, 'cho-trang-chu')
await gp.fill('[data-testid=search-input]', 'noi com')
await gp.click('[data-testid=search-button]')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
assert((await gp.textContent('[data-testid=listing-card]')).includes('Nồi cơm'), 'Tìm "noi com" (không dấu) → Nồi cơm điện')
await gp.goto(BASE + '/?dm=dien-thoai')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
assert((await gp.textContent('[data-testid=listing-card]')).includes('iPhone'), 'Lọc danh mục Điện thoại → iPhone')
await gp.goto(BASE + '/')
await gp.click('[data-testid=toggle-filters]')
await gp.fill('[data-testid=price-min]', '1000000')
await gp.fill('[data-testid=price-max]', '10000000')
await gp.click('[data-testid=apply-price]')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
assert((await gp.textContent('[data-testid=listing-card]')).includes('iPhone'), 'Lọc giá 1–10 triệu → iPhone')
await snap(gp, 'loc-gia')
await gp.goto(BASE + '/?loai=new')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
assert((await gp.textContent('[data-testid=listing-card]')).includes('Nồi cơm'), 'Lọc tình trạng "Đồ mới" → Nồi cơm (Mới 100%)')
await gp.goto(BASE + '/?loai=used')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
assert((await gp.textContent('[data-testid=listing-card]')).includes('iPhone'), 'Lọc tình trạng "Đồ cũ" → iPhone')
await gp.goto(BASE + '/?sx=price-asc')
await gp.waitForSelector('[data-testid=listing-card]')
assert((await gp.locator('[data-testid=listing-card]').first().textContent()).includes('Nồi cơm'), 'Sắp xếp giá tăng dần')
await gp.goto(BASE + '/?sx=price-desc')
await gp.waitForSelector('[data-testid=listing-card]')
assert((await gp.locator('[data-testid=listing-card]').first().textContent()).includes('iPhone'), 'Sắp xếp giá giảm dần')

// 5. Detail + Zalo
await gp.locator('[data-testid=listing-card]').first().click()
await gp.waitForSelector('[data-testid=detail-title]')
const iphoneUrl = gp.url()
assert((await gp.textContent('[data-testid=detail-condition]')).includes('Đã qua sử dụng — có trầy xước'), 'Chi tiết: hiện tình trạng')
assert((await gp.textContent('[data-testid=detail-price]')).includes('9.000.000'), 'Chi tiết: hiện giá')
assert((await gp.getAttribute('[data-testid=call-button]', 'href')) === 'tel:0988474228', 'Nút Gọi điện tel:0988474228')
assert((await gp.getAttribute('[data-testid=zalo-button]', 'href')) === 'https://zalo.me/0988474228', 'Nút Zalo → https://zalo.me/0988474228')
assert((await gp.locator('button[aria-label^="Ảnh "]').count()) === 2, 'Chi tiết: 2 ảnh (upload + link)')
await snap(gp, 'chi-tiet-tin')
await sp.goto(iphoneUrl)
await sp.waitForSelector('[data-testid=zalo-button]')
const [zp] = await Promise.all([seller.waitForEvent('page'), sp.click('[data-testid=zalo-button]')])
await zp.waitForURL(/zalo\.me/, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
const zaloOpened = zp.url()
await zp.close()
const clip = await sp.evaluate(() => navigator.clipboard.readText())
assert(decodeURIComponent(zaloOpened).includes('zalo.me/0988474228') && clip.includes('iPhone 13'), `Bấm Zalo mở tab ${zaloOpened} + sao chép lời nhắn ("${clip.slice(0, 50)}…")`)

// Report
await sp.click('[data-testid=report-button]')
await sp.locator('label', { hasText: 'Sai mô tả' }).click()
await sp.click('[data-testid=report-submit]')
await sp.waitForSelector('text=Đã gửi báo cáo')
ok('Báo cáo tin đăng (Sai mô tả)')

// 6. My listings: mark sold
await sp.goto(BASE + '/tin-cua-toi?tab=active')
await sp.waitForSelector('[data-testid=my-listing]')
await sp.locator('[data-testid=my-listing]', { hasText: 'iPhone' }).locator('[data-testid=mark-sold]').click()
await sp.waitForFunction(() => document.querySelector('[data-testid=tab-sold]')?.textContent?.includes('(1)'))
await sp.click('[data-testid=tab-sold]')
await snap(sp, 'tin-cua-toi-da-ban')
ok('Đánh dấu "Đã bán" → chuyển sang tab Đã bán')
await gp.goto(BASE + '/')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '1 tin')
ok('Tin đã bán rời khỏi chợ')

// 7. Admin: reports, hide listing, categories
await ap.goto(BASE + '/quan-tri')
await ap.click('[data-testid=admin-tab-reports]')
await ap.waitForSelector('[data-testid=admin-report]')
assert((await ap.textContent('[data-testid=admin-report]')).includes('Sai mô tả'), 'Admin thấy báo cáo')
await ap.click('[data-testid=admin-tab-listings]')
await ap.selectOption('[data-testid=admin-status-filter]', 'active')
await ap.locator('[data-testid=admin-listing]', { hasText: 'Nồi cơm' }).locator('[data-testid=hide-listing]').click()
await ap.waitForSelector('text=Đã ẩn tin.')
await gp.goto(BASE + '/')
await gp.waitForFunction(() => document.querySelector('[data-testid=result-count]')?.textContent === '0 tin')
ok('Admin ẩn tin → biến mất khỏi chợ')
await sp.goto(BASE + '/tin-cua-toi?tab=hidden')
await sp.waitForSelector('[data-testid=my-listing]')
ok('Người bán thấy tin ở tab "Bị ẩn"')
await ap.click('[data-testid=admin-tab-categories]')
await ap.waitForFunction(() => document.querySelectorAll('[data-testid=admin-category]').length === 15)
ok('Checklist 15 danh mục được khởi tạo trong Firestore')
const khac = ap.locator('[data-testid=admin-category]').last()
await khac.locator('input').fill('Khác (đồ linh tinh)')
await khac.locator('[data-testid=save-category]').click()
await ap.waitForSelector('text=Đã đổi tên danh mục.')
const xedap = ap.locator('[data-testid=admin-category]').nth(3)
await xedap.locator('[data-testid=toggle-category]').click()
await ap.waitForSelector('text=Đã ẩn danh mục.')
await ap.fill('[data-testid=new-category]', 'Đồ cổ & Sưu tầm')
await ap.click('[data-testid=add-category]')
await ap.waitForFunction(() => document.querySelectorAll('[data-testid=admin-category]').length === 16)
await snap(ap, 'quan-tri-danh-muc')
await sp.goto(BASE + '/dang-tin')
await sp.waitForSelector('[data-testid=category-checklist]')
const cats = await sp.textContent('[data-testid=category-checklist]')
assert(cats.includes('Khác (đồ linh tinh)') && cats.includes('Đồ cổ & Sưu tầm') && !cats.includes('Xe đạp'), 'Sửa/thêm/ẩn danh mục phản ánh ở form đăng tin')
await ap.click('[data-testid=admin-tab-users]')
await ap.waitForSelector('[data-testid=admin-user]')
await snap(ap, 'quan-tri-nguoi-dung')
ok('Admin xem danh sách người dùng')

// Non-admin cannot open admin
await sp.goto(BASE + '/quan-tri')
await sp.waitForSelector('text=Khu vực quản trị')
ok('Người dùng thường bị chặn khỏi /quan-tri')

const footer = await gp.textContent('footer')
assert(footer.includes('© 2026 VH Phước. Mọi nội dung thuộc về VH Phước.') && footer.includes('v1.0.0'), 'Footer bản quyền + v1.0.0')
assert(errors.length === 0, 'Không có lỗi JS: ' + errors.join(' | '))
await browser.close()
writeFileSync(OUT + 'results.txt', results.join('\n') + '\n')
console.log(`\n${results.length} checks passed`)
