import { useNavigate } from 'react-router-dom'
import ListingForm from '../components/ListingForm'
import { NeedProfile, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { createListing } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/useTitle'

export default function PostListing() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  useTitle('Đăng tin bán')
  if (loading) return <Spinner />
  if (!user) return null
  if (!profile || !profile.phone || !profile.province || !profile.displayName) return <NeedProfile />
  if (profile.disabled) {
    return <div className="card mx-auto max-w-lg p-6 text-center text-red-700">Tài khoản đã bị khoá, không thể đăng tin.</div>
  }
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-xl font-bold">Đăng tin bán</h1>
      <ListingForm
        initial={{ phone: profile.phone, zalo: profile.zalo, province: profile.province }}
        submitLabel="Đăng tin"
        onSubmit={async (input) => {
          await createListing({ uid: user.uid, name: profile.displayName }, input)
          toast('Đã đăng tin! Tin đang chờ quản trị duyệt.')
          navigate('/tin-cua-toi?tab=pending')
        }}
      />
    </div>
  )
}
