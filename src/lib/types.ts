import type { Condition, ListingStatus } from './constants'

export type Listing = {
  id: string
  title: string
  categoryId: string
  categoryName: string
  condition: Condition
  price: number
  description: string
  thumb: string
  imageCount: number
  province: string
  phone: string
  zalo: string
  sellerId: string
  sellerName: string
  status: ListingStatus
  createdAt: number
  updatedAt: number
}

export type ListingInput = Pick<
  Listing,
  'title' | 'categoryId' | 'categoryName' | 'condition' | 'price' | 'description' | 'province' | 'phone' | 'zalo'
> & { images: string[] }

export type Profile = {
  uid: string
  email: string
  displayName: string
  phone: string
  zalo: string
  province: string
  disabled: boolean
  createdAt: number
}

export type Report = {
  id: string
  listingId: string
  listingTitle: string
  reason: string
  note: string
  reporterId: string
  reporterEmail: string
  status: 'open' | 'resolved'
  createdAt: number
}
