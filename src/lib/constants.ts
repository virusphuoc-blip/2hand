export const SITE_NAME = '2Hand'
export const SITE_URL = 'https://2hand.vhphuoc.io.vn'
export const ADMIN_EMAIL = 'virusphuoc@gmail.com'

export const MAX_IMAGES = 4
/** Max length (characters) of one uploaded image stored as a base64 data URL. */
export const MAX_IMAGE_DATA_URL = 200_000
export const MAX_THUMB_DATA_URL = 30_000
export const MAX_TITLE = 100
export const MAX_DESCRIPTION = 3000
export const MAX_PRICE = 10_000_000_000

export type Category = { id: string; name: string; order: number; active: boolean }

export const DEFAULT_CATEGORIES: Category[] = [
  'Điện thoại',
  'Máy tính & Laptop',
  'Xe máy',
  'Xe đạp',
  'Đồ gia dụng',
  'Điện tử (tivi, loa, máy ảnh...)',
  'Quần áo',
  'Giày dép',
  'Túi xách & Phụ kiện',
  'Nội thất',
  'Đồ chơi trẻ em',
  'Sách & Đồ học tập',
  'Thể thao',
  'Mẹ & Bé',
  'Khác',
].map((name, i) => ({
  id: [
    'dien-thoai',
    'may-tinh-laptop',
    'xe-may',
    'xe-dap',
    'do-gia-dung',
    'dien-tu',
    'quan-ao',
    'giay-dep',
    'tui-xach-phu-kien',
    'noi-that',
    'do-choi-tre-em',
    'sach-do-hoc-tap',
    'the-thao',
    'me-be',
    'khac',
  ][i],
  name,
  order: i + 1,
  active: true,
}))

export type Condition = 'new' | 'like-new' | 'used-good' | 'used-scratched'

export const CONDITIONS: { id: Condition; label: string; short: string; isNew: boolean }[] = [
  { id: 'new', label: 'Mới 100%', short: 'Mới 100%', isNew: true },
  { id: 'like-new', label: 'Như mới', short: 'Như mới', isNew: false },
  { id: 'used-good', label: 'Đã qua sử dụng — còn tốt', short: 'Đã dùng — còn tốt', isNew: false },
  { id: 'used-scratched', label: 'Đã qua sử dụng — có trầy xước', short: 'Đã dùng — trầy xước', isNew: false },
]

export function conditionLabel(id: string): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id
}

export type ListingStatus = 'pending' | 'active' | 'sold' | 'hidden'

export const STATUS_LABELS: Record<ListingStatus, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang bán',
  sold: 'Đã bán',
  hidden: 'Bị ẩn',
}

export const REPORT_REASONS = [
  { id: 'scam', label: 'Lừa đảo' },
  { id: 'wrong-description', label: 'Sai mô tả' },
  { id: 'sold', label: 'Đã bán' },
  { id: 'duplicate', label: 'Tin trùng lặp' },
  { id: 'prohibited', label: 'Hàng cấm / không phù hợp' },
  { id: 'other', label: 'Lý do khác' },
] as const

export function reportReasonLabel(id: string): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? id
}

/** 34 tỉnh/thành sau sắp xếp đơn vị hành chính (từ 01/07/2025). */
export const PROVINCES = [
  'TP. Hà Nội',
  'TP. Hồ Chí Minh',
  'TP. Hải Phòng',
  'TP. Đà Nẵng',
  'TP. Cần Thơ',
  'TP. Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
]
