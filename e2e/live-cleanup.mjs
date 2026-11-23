import { chromium } from 'playwright-core'
const BASE = 'https://2hand.vhphuoc.io.vn'
const email = process.argv[2]
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage()
p.on('dialog', (d) => d.accept())
await p.goto(BASE + '/dang-nhap')
await p.fill('#l-email', email)
await p.fill('#l-pass', 'Selftest#2026')
await p.click('[data-testid=login-submit]')
await p.waitForURL((u) => u.pathname === '/', { timeout: 20000 })
await p.goto(BASE + '/tin-cua-toi?tab=pending')
await p.waitForSelector('[data-testid=my-listing]', { timeout: 15000 })
await p.locator('[data-testid=delete-listing]').first().click()
await p.waitForFunction(() => !document.querySelector('[data-testid=my-listing]'), null, { timeout: 15000 })
await p.reload()
await p.waitForSelector('text=Chờ duyệt (0)', { timeout: 15000 })
console.log('STEP Xoá tin test OK, Tin của tôi: Chờ duyệt (0) sau khi tải lại')
await b.close()
