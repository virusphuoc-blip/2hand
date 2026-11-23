import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { DEFAULT_CATEGORIES, type Category, type ListingStatus } from './constants'
import { getDb } from './firebase'
import { makeThumb } from './images'
import type { Listing, ListingInput, Profile, Report } from './types'

const MARKET_LIMIT = 500

function toListing(id: string, d: DocumentData): Listing {
  return {
    id,
    title: d.title ?? '',
    categoryId: d.categoryId ?? 'khac',
    categoryName: d.categoryName ?? '',
    condition: d.condition ?? 'used-good',
    price: d.price ?? 0,
    description: d.description ?? '',
    thumb: d.thumb ?? '',
    imageCount: d.imageCount ?? 0,
    province: d.province ?? '',
    phone: d.phone ?? '',
    zalo: d.zalo ?? '',
    sellerId: d.sellerId ?? '',
    sellerName: d.sellerName ?? '',
    status: d.status ?? 'pending',
    createdAt: d.createdAt ?? 0,
    updatedAt: d.updatedAt ?? 0,
  }
}

/* ---------------- Categories ---------------- */

export async function fetchCategories(): Promise<{ list: Category[]; seeded: boolean }> {
  const snap = await getDocs(collection(getDb(), 'categories'))
  if (snap.empty) return { list: DEFAULT_CATEGORIES, seeded: false }
  const list = snap.docs.map((d) => ({
    id: d.id,
    name: String(d.data().name ?? d.id),
    order: Number(d.data().order ?? 0),
    active: d.data().active !== false,
  }))
  list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'vi'))
  return { list, seeded: true }
}

export async function seedCategories(): Promise<void> {
  const batch = writeBatch(getDb())
  for (const c of DEFAULT_CATEGORIES) {
    batch.set(doc(getDb(), 'categories', c.id), { name: c.name, order: c.order, active: c.active })
  }
  await batch.commit()
}

export async function saveCategory(c: Category): Promise<void> {
  await setDoc(doc(getDb(), 'categories', c.id), { name: c.name, order: c.order, active: c.active })
}

/* ---------------- Listings ---------------- */

export async function fetchMarket(): Promise<Listing[]> {
  const snap = await getDocs(query(collection(getDb(), 'listings'), where('status', '==', 'active'), limit(MARKET_LIMIT)))
  return snap.docs.map((d) => toListing(d.id, d.data()))
}

export async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const snap = await getDoc(doc(getDb(), 'listings', id))
    return snap.exists() ? toListing(snap.id, snap.data()) : null
  } catch {
    return null
  }
}

export async function fetchListingImages(id: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(getDb(), 'listingImages', id))
    const images = snap.exists() ? snap.data().images : []
    return Array.isArray(images) ? images.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

export async function fetchMyListings(uid: string): Promise<Listing[]> {
  const snap = await getDocs(query(collection(getDb(), 'listings'), where('sellerId', '==', uid)))
  return snap.docs.map((d) => toListing(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)
}

export async function fetchAllListings(): Promise<Listing[]> {
  const snap = await getDocs(collection(getDb(), 'listings'))
  return snap.docs.map((d) => toListing(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)
}

function listingFields(input: ListingInput, thumb: string) {
  return {
    title: input.title.trim(),
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    condition: input.condition,
    price: input.price,
    description: input.description.trim(),
    thumb,
    imageCount: input.images.length,
    province: input.province,
    phone: input.phone,
    zalo: input.zalo,
  }
}

export async function createListing(seller: { uid: string; name: string }, input: ListingInput): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'listings'))
  const now = Date.now()
  const thumb = await makeThumb(input.images[0] ?? '')
  const batch = writeBatch(db)
  batch.set(ref, {
    ...listingFields(input, thumb),
    sellerId: seller.uid,
    sellerName: seller.name,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  })
  batch.set(doc(db, 'listingImages', ref.id), { sellerId: seller.uid, images: input.images })
  await batch.commit()
  return ref.id
}

/** Seller edit: content changes go back to "chờ duyệt". */
export async function updateListing(id: string, seller: { uid: string; name: string }, input: ListingInput): Promise<void> {
  const db = getDb()
  const thumb = await makeThumb(input.images[0] ?? '')
  const batch = writeBatch(db)
  batch.update(doc(db, 'listings', id), {
    ...listingFields(input, thumb),
    sellerName: seller.name,
    status: 'pending',
    updatedAt: Date.now(),
  })
  batch.set(doc(db, 'listingImages', id), { sellerId: seller.uid, images: input.images })
  await batch.commit()
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  await updateDoc(doc(getDb(), 'listings', id), { status, updatedAt: Date.now() })
}

/** "Đăng lại": đưa tin lên đầu chợ, chờ duyệt lại. */
export async function repostListing(id: string): Promise<void> {
  const now = Date.now()
  await updateDoc(doc(getDb(), 'listings', id), { status: 'pending', createdAt: now, updatedAt: now })
}

export async function deleteListing(id: string): Promise<void> {
  const db = getDb()
  const batch = writeBatch(db)
  batch.delete(doc(db, 'listingImages', id))
  batch.delete(doc(db, 'listings', id))
  await batch.commit()
}

/* ---------------- Profiles ---------------- */

function toProfile(uid: string, d: DocumentData): Profile {
  return {
    uid,
    email: d.email ?? '',
    displayName: d.displayName ?? '',
    phone: d.phone ?? '',
    zalo: d.zalo ?? '',
    province: d.province ?? '',
    disabled: d.disabled === true,
    createdAt: d.createdAt ?? 0,
  }
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid))
  return snap.exists() ? toProfile(uid, snap.data()) : null
}

export async function createProfile(p: Omit<Profile, 'disabled' | 'createdAt'>): Promise<void> {
  await setDoc(doc(getDb(), 'users', p.uid), {
    email: p.email,
    displayName: p.displayName.trim(),
    phone: p.phone,
    zalo: p.zalo,
    province: p.province,
    disabled: false,
    createdAt: Date.now(),
  })
}

export async function updateProfileDoc(uid: string, p: Pick<Profile, 'displayName' | 'phone' | 'zalo' | 'province'>) {
  await updateDoc(doc(getDb(), 'users', uid), {
    displayName: p.displayName.trim(),
    phone: p.phone,
    zalo: p.zalo,
    province: p.province,
  })
}

export async function fetchUsers(): Promise<Profile[]> {
  const snap = await getDocs(collection(getDb(), 'users'))
  return snap.docs.map((d) => toProfile(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), { disabled })
}

/* ---------------- Reports ---------------- */

export async function createReport(r: Omit<Report, 'id' | 'status' | 'createdAt'>): Promise<void> {
  await setDoc(doc(collection(getDb(), 'reports')), { ...r, status: 'open', createdAt: Date.now() })
}

export async function fetchReports(): Promise<Report[]> {
  const snap = await getDocs(collection(getDb(), 'reports'))
  return snap.docs
    .map((d) => {
      const x = d.data()
      return {
        id: d.id,
        listingId: x.listingId ?? '',
        listingTitle: x.listingTitle ?? '',
        reason: x.reason ?? '',
        note: x.note ?? '',
        reporterId: x.reporterId ?? '',
        reporterEmail: x.reporterEmail ?? '',
        status: x.status === 'resolved' ? 'resolved' : 'open',
        createdAt: x.createdAt ?? 0,
      } as Report
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function setReportStatus(id: string, status: Report['status']): Promise<void> {
  await updateDoc(doc(getDb(), 'reports', id), { status })
}

export async function deleteReport(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'reports', id))
}
