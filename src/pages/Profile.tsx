import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { createProfile, updateProfileDoc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PROVINCES } from '../lib/constants'
import { digitsOnly, isValidPhone } from '../lib/text'
import { useTitle } from '../lib/useTitle'

export default function Profile() {
  const { user, profile, loading } = useAuth()
  useTitle('Hồ sơ người bán')
  if (loading || !user) return <Spinner />
  return <ProfileForm key={profile?.uid ?? 'new'} />
}

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [zalo, setZalo] = useState(profile?.zalo ?? '')
  const [province, setProvince] = useState(profile?.province ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (displayName.trim().length < 2) return setError('Tên hiển thị tối thiểu 2 ký tự.')
    if (!isValidPhone(phone)) return setError('Số điện thoại không hợp lệ.')
    if (zalo && !isValidPhone(zalo)) return setError('Số Zalo không hợp lệ.')
    if (!province) return setError('Hãy chọn tỉnh/thành.')
    setError('')
    setBusy(true)
    try {
      const data = { displayName: displayName.trim().slice(0, 60), phone: digitsOnly(phone), zalo: digitsOnly(zalo), province }
      if (profile) await updateProfileDoc(user.uid, data)
      else await createProfile({ uid: user.uid, email: user.email ?? '', ...data })
      await refreshProfile()
      toast('Đã lưu hồ sơ.')
      const next = params.get('next')
      if (next?.startsWith('/')) navigate(next)
    } catch {
      setError('Lưu hồ sơ thất bại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg space-y-4 p-4" noValidate>
      <h1 className="text-xl font-bold">Hồ sơ người bán</h1>
      {!profile && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Hoàn tất hồ sơ để bắt đầu đăng tin.</p>}
      <div className="text-sm text-slate-600">Email: <b>{user?.email}</b></div>
      <div>
        <label className="label" htmlFor="p-name">Tên hiển thị *</label>
        <input id="p-name" className="field" maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">Số điện thoại *</label>
        <input id="p-phone" className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" />
      </div>
      <div>
        <label className="label" htmlFor="p-zalo">Zalo (tùy chọn)</label>
        <input id="p-zalo" className="field" inputMode="tel" value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="Để trống nếu trùng SĐT" />
      </div>
      <div>
        <label className="label" htmlFor="p-province">Tỉnh/thành *</label>
        <select id="p-province" className="field" value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="">— Chọn tỉnh/thành —</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div>}
      <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="save-profile">{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
    </form>
  )
}
