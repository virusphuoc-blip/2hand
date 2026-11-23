import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authErrorMessage, useAuth } from '../lib/auth'
import { PROVINCES } from '../lib/constants'
import { firebaseConfigured } from '../lib/firebase'
import { digitsOnly, isValidPhone } from '../lib/text'
import { useTitle } from '../lib/useTitle'

function useNext() {
  const [params] = useSearchParams()
  const next = params.get('next')
  return next?.startsWith('/') ? next : '/'
}

/** After any sign-in: send users without a seller profile to the profile page. */
function useRedirectWhenSignedIn(paused = false) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const next = useNext()
  useEffect(() => {
    if (paused || loading || !user) return
    if (!profile) navigate(`/tai-khoan?next=${encodeURIComponent(next)}`, { replace: true })
    else navigate(next, { replace: true })
  }, [paused, user, profile, loading, navigate, next])
}

function GoogleButton({ onError }: { onError: (m: string) => void }) {
  const { signInGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="btn-outline w-full"
      disabled={busy || !firebaseConfigured}
      data-testid="google-signin"
      onClick={async () => {
        setBusy(true)
        try {
          await signInGoogle()
        } catch (e) {
          onError(authErrorMessage(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Tiếp tục với Google
    </button>
  )
}

export function Login() {
  const { signInEmail, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const next = useNext()
  useTitle('Đăng nhập')
  useRedirectWhenSignedIn()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInEmail(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mx-auto max-w-md space-y-4 p-5">
      <h1 className="text-xl font-bold">Đăng nhập</h1>
      <GoogleButton onError={setError} />
      <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc<span className="h-px flex-1 bg-slate-200" /></div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="l-email">Email</label>
          <input id="l-email" className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="l-pass">Mật khẩu</label>
          <input id="l-pass" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div>}
        {info && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</div>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !firebaseConfigured} data-testid="login-submit">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-brand-600 hover:underline"
          onClick={async () => {
            if (!email) return setError('Nhập email để nhận link đặt lại mật khẩu.')
            try {
              await resetPassword(email)
              setInfo('Đã gửi email đặt lại mật khẩu.')
              setError('')
            } catch (err) {
              setError(authErrorMessage(err))
            }
          }}
        >
          Quên mật khẩu?
        </button>
        <Link to={`/dang-ky?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600 hover:underline">Đăng ký tài khoản</Link>
      </div>
    </div>
  )
}

export function Register() {
  const { signUpEmail } = useAuth()
  const [f, setF] = useState({ displayName: '', email: '', password: '', phone: '', zalo: '', province: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = useNext()
  useTitle('Đăng ký tài khoản')
  useRedirectWhenSignedIn(busy)

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.displayName.trim().length < 2) return setError('Tên hiển thị tối thiểu 2 ký tự.')
    if (!isValidPhone(f.phone)) return setError('Số điện thoại không hợp lệ.')
    if (f.zalo && !isValidPhone(f.zalo)) return setError('Số Zalo không hợp lệ.')
    if (!f.province) return setError('Hãy chọn tỉnh/thành.')
    if (f.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự.')
    setBusy(true)
    setError('')
    try {
      await signUpEmail({ ...f, displayName: f.displayName.trim().slice(0, 60), phone: digitsOnly(f.phone), zalo: digitsOnly(f.zalo) })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mx-auto max-w-md space-y-4 p-5">
      <h1 className="text-xl font-bold">Đăng ký tài khoản</h1>
      <p className="text-sm text-slate-600">Ai cũng xem được tin đăng. Đăng ký để đăng bán đồ cũ và đồ mới miễn phí.</p>
      <GoogleButton onError={setError} />
      <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc dùng email<span className="h-px flex-1 bg-slate-200" /></div>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label className="label" htmlFor="r-name">Tên hiển thị *</label>
          <input id="r-name" className="field" maxLength={60} value={f.displayName} onChange={set('displayName')} />
        </div>
        <div>
          <label className="label" htmlFor="r-email">Email *</label>
          <input id="r-email" className="field" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label" htmlFor="r-pass">Mật khẩu * (tối thiểu 6 ký tự)</label>
          <input id="r-pass" className="field" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="r-phone">SĐT *</label>
            <input id="r-phone" className="field" inputMode="tel" value={f.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label" htmlFor="r-zalo">Zalo</label>
            <input id="r-zalo" className="field" inputMode="tel" value={f.zalo} onChange={set('zalo')} placeholder="Tùy chọn" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="r-province">Tỉnh/thành *</label>
          <select id="r-province" className="field" value={f.province} onChange={set('province')}>
            <option value="">— Chọn tỉnh/thành —</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !firebaseConfigured} data-testid="register-submit">{busy ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
      </form>
      <p className="text-center text-sm">
        Đã có tài khoản? <Link to={`/dang-nhap?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
      </p>
    </div>
  )
}
