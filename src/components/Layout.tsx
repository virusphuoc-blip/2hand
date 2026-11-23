import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { firebaseConfigured } from '../lib/firebase'
import { APP_VERSION } from '../version'

export default function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setOpen(false)
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand-500 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5">
          <Link to="/" className="flex items-center gap-2" aria-label="2Hand — trang chủ">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-extrabold text-brand-600">2H</span>
            <span className="text-xl font-extrabold tracking-tight">2Hand</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/dang-tin"
              className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-brand-600 shadow-sm hover:bg-brand-50"
            >
              + Đăng tin
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-lg hover:bg-brand-600"
              aria-label="Mở menu"
              aria-expanded={open}
              data-testid="menu-button"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav className="absolute right-2 top-full mt-1 w-64 rounded-xl bg-white p-2 text-slate-800 shadow-xl ring-1 ring-slate-200">
            {user ? (
              <div className="border-b border-slate-100 px-3 pb-2 pt-1 text-sm">
                <div className="font-semibold">{profile?.displayName || user.displayName || 'Tài khoản'}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
              </div>
            ) : null}
            <NavLink to="/" end className={navCls}>Chợ 2Hand</NavLink>
            <NavLink to="/dang-tin" className={navCls}>Đăng tin bán</NavLink>
            {user ? (
              <>
                <NavLink to="/tin-cua-toi" className={navCls}>Tin của tôi</NavLink>
                <NavLink to="/tai-khoan" className={navCls}>Hồ sơ người bán</NavLink>
                {isAdmin && <NavLink to="/quan-tri" className={navCls}>Trang quản trị</NavLink>}
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    await signOut()
                    navigate('/')
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink to="/dang-nhap" className={navCls}>Đăng nhập</NavLink>
                <NavLink to="/dang-ky" className={navCls}>Đăng ký tài khoản</NavLink>
              </>
            )}
          </nav>
        )}
      </header>

      {!firebaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Hệ thống đang được cấu hình — chưa kết nối cơ sở dữ liệu (Firebase). Vui lòng quay lại sau.
        </div>
      )}
      {profile?.disabled && (
        <div className="bg-red-100 px-4 py-2 text-center text-sm text-red-800">
          Tài khoản của bạn đã bị khoá. Bạn không thể đăng hoặc sửa tin. Liên hệ quản trị để được hỗ trợ.
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-3 py-5 text-center text-sm text-slate-600">
          <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/" className="hover:text-brand-600">Chợ</Link>
            <Link to="/dang-tin" className="hover:text-brand-600">Đăng tin</Link>
            <Link to="/tin-cua-toi" className="hover:text-brand-600">Tin của tôi</Link>
          </div>
          <p>© 2026 VH Phước. Mọi nội dung thuộc về VH Phước.</p>
          <p className="mt-1 text-xs text-slate-400" data-testid="app-version">2Hand v{APP_VERSION}</p>
        </div>
      </footer>
    </div>
  )
}
