# 2Hand — Chợ đồ cũ & mới

Chợ chung kiểu rao vặt: ai cũng xem được tin đăng, đăng ký tài khoản để đăng bán. React + Vite + Tailwind, Firebase Auth + Firestore (gói Spark miễn phí, không dùng Cloud Storage).

## Chạy local

```bash
cp .env.example .env.local   # điền config Firebase Web App
npm install
npm run dev
```

## Kiểm tra

```bash
npm run build      # tsc + vite build
npm run lint       # oxlint
npm test           # unit tests (lọc/tìm kiếm, tiện ích)
npm run test:rules # Firestore rules trên emulator (cần Java 21 + firebase-tools)
```

## Triển khai

Build tĩnh (`dist/`), không phụ thuộc nền tảng:

- **Vercel**: `vercel.json` (SPA rewrite). Env vars `VITE_FIREBASE_*`.
- **Cloudflare Pages**: build `npm run build`, output `dist`; `public/_redirects` lo SPA fallback. Env vars giống hệt.

`firestore.rules` do chủ sở hữu duyệt và đăng thủ công trên Firebase Console.

© 2026 VH Phước. Mọi nội dung thuộc về VH Phước.
