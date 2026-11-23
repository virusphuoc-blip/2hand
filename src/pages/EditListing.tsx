import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ListingForm, { type FormInitial } from '../components/ListingForm'
import { Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { fetchListing, fetchListingImages, updateListing } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/useTitle'

export default function EditListing() {
  const { id = '' } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [initial, setInitial] = useState<FormInitial | null | undefined>(undefined)
  useTitle('Sửa tin')

  useEffect(() => {
    if (!user) return
    Promise.all([fetchListing(id), fetchListingImages(id)]).then(([l, images]) => {
      if (!l || l.sellerId !== user.uid) return setInitial(null)
      setInitial({ ...l, images: images.length ? images : l.thumb ? [l.thumb] : [] })
    })
  }, [id, user])

  if (initial === undefined) return <Spinner />
  if (!initial || !user) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        Không tìm thấy tin hoặc bạn không phải người đăng. <Link to="/tin-cua-toi" className="text-brand-600 underline">Tin của tôi</Link>
      </div>
    )
  }
  if (profile?.disabled) return <div className="card mx-auto max-w-lg p-6 text-center text-red-700">Tài khoản đã bị khoá, không thể sửa tin.</div>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Sửa tin</h1>
      <p className="mb-3 text-sm text-slate-600">Sau khi lưu, tin sẽ chuyển về “Chờ duyệt” để quản trị kiểm tra lại.</p>
      <ListingForm
        initial={initial}
        submitLabel="Lưu thay đổi"
        onSubmit={async (input) => {
          await updateListing(id, { uid: user.uid, name: profile?.displayName || user.displayName || 'Người bán' }, input)
          toast('Đã lưu. Tin đang chờ duyệt lại.')
          navigate('/tin-cua-toi?tab=pending')
        }}
      />
    </div>
  )
}
