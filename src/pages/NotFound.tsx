import { Link } from 'react-router-dom'
import { useTitle } from '../lib/useTitle'

export default function NotFound() {
  useTitle('Không tìm thấy trang')
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <div className="text-5xl font-extrabold text-brand-500">404</div>
      <p className="mt-2 text-slate-600">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className="btn-primary mt-4">Về chợ 2Hand</Link>
    </div>
  )
}
