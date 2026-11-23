import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const now = () => Date.now()

const ADMIN = { email: 'virusphuoc@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' as const } }
const FAKE_ADMIN = { email: 'virusphuoc@gmail.com', email_verified: false, firebase: { sign_in_provider: 'password' as const } }

const profile = (email: string, extra: Record<string, unknown> = {}) => ({
  email,
  displayName: 'Người bán',
  phone: '0912345678',
  zalo: '',
  province: 'TP. Hà Nội',
  disabled: false,
  createdAt: now(),
  ...extra,
})

const listing = (sellerId: string, extra: Record<string, unknown> = {}) => ({
  title: 'iPhone 13 128GB',
  categoryId: 'dien-thoai',
  categoryName: 'Điện thoại',
  condition: 'used-good',
  price: 9000000,
  description: 'Máy đẹp, pin 90%, đủ phụ kiện.',
  thumb: '',
  imageCount: 1,
  province: 'TP. Hà Nội',
  phone: '0912345678',
  zalo: '',
  sellerId,
  sellerName: 'Người bán',
  status: 'pending',
  createdAt: now(),
  updatedAt: now(),
  ...extra,
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-2hand-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice'), profile('alice@example.com'))
    await setDoc(doc(db, 'users/bob'), profile('bob@example.com'))
    await setDoc(doc(db, 'users/mallory'), profile('mallory@example.com', { disabled: true }))
    await setDoc(doc(db, 'listings/pending1'), listing('alice'))
    await setDoc(doc(db, 'listings/active1'), listing('alice', { status: 'active' }))
    await setDoc(doc(db, 'listingImages/pending1'), { sellerId: 'alice', images: ['https://example.com/a.jpg'] })
    await setDoc(doc(db, 'listingImages/active1'), { sellerId: 'alice', images: ['https://example.com/a.jpg'] })
  })
})

const alice = () => env.authenticatedContext('alice', { email: 'alice@example.com' }).firestore()
const bob = () => env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore()
const mallory = () => env.authenticatedContext('mallory', { email: 'mallory@example.com' }).firestore()
const admin = () => env.authenticatedContext('admin', ADMIN).firestore()
const fakeAdmin = () => env.authenticatedContext('fake', FAKE_ADMIN).firestore()
const guest = () => env.unauthenticatedContext().firestore()

describe('listings', () => {
  it('guests can query active listings but not pending ones', async () => {
    await assertSucceeds(getDocs(query(collection(guest(), 'listings'), where('status', '==', 'active'))))
    await assertSucceeds(getDoc(doc(guest(), 'listings/active1')))
    await assertFails(getDoc(doc(guest(), 'listings/pending1')))
    await assertFails(getDocs(collection(guest(), 'listings')))
    await assertSucceeds(getDoc(doc(guest(), 'listingImages/active1')))
    await assertFails(getDoc(doc(guest(), 'listingImages/pending1')))
  })

  it('sellers see their own listings of any status', async () => {
    await assertSucceeds(getDocs(query(collection(alice(), 'listings'), where('sellerId', '==', 'alice'))))
    await assertFails(getDoc(doc(bob(), 'listings/pending1')))
  })

  it('new listings must be pending, owned and valid', async () => {
    const db = bob()
    const b = writeBatch(db)
    b.set(doc(db, 'listings/new1'), listing('bob'))
    b.set(doc(db, 'listingImages/new1'), { sellerId: 'bob', images: ['data:image/jpeg;base64,AAAA'] })
    await assertSucceeds(b.commit())
    await assertFails(setDoc(doc(bob(), 'listings/new2'), listing('bob', { status: 'active' })))
    await assertFails(setDoc(doc(bob(), 'listings/new3'), listing('alice')))
    await assertFails(setDoc(doc(bob(), 'listings/new4'), listing('bob', { condition: 'broken' })))
    await assertFails(setDoc(doc(bob(), 'listings/new5'), listing('bob', { imageCount: 5 })))
    await assertFails(setDoc(doc(guest(), 'listings/new6'), listing('bob')))
  })

  it('rejects more than 4 images or oversized images', async () => {
    const db = bob()
    await setDoc(doc(db, 'listings/n1'), listing('bob'))
    await assertFails(setDoc(doc(db, 'listingImages/n1'), { sellerId: 'bob', images: Array(5).fill('https://x.y/a.jpg') }))
    await assertFails(setDoc(doc(db, 'listingImages/n1'), { sellerId: 'bob', images: ['data:image/jpeg;base64,' + 'A'.repeat(200001)] }))
    await assertFails(setDoc(doc(db, 'listingImages/n1'), { sellerId: 'bob', images: ['javascript:alert(1)'] }))
  })

  it('disabled users cannot post', async () => {
    await assertFails(setDoc(doc(mallory(), 'listings/m1'), listing('mallory')))
  })

  it('sellers cannot approve their own listing, but can edit, mark sold and delete', async () => {
    await assertFails(updateDoc(doc(alice(), 'listings/pending1'), { status: 'active' }))
    await assertSucceeds(updateDoc(doc(alice(), 'listings/pending1'), { title: 'iPhone 13 128GB xanh', updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(alice(), 'listings/active1'), { status: 'sold', updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(alice(), 'listings/active1'), { status: 'pending', createdAt: now(), updatedAt: now() }))
    await assertFails(updateDoc(doc(bob(), 'listings/pending1'), { status: 'sold' }))
    await assertSucceeds(deleteDoc(doc(alice(), 'listings/pending1')))
  })

  it('editing an active listing must send it back to pending', async () => {
    await assertFails(updateDoc(doc(alice(), 'listings/active1'), { title: 'Đổi tiêu đề nhưng vẫn đang bán', updatedAt: now() }))
  })

  it('only the real Google admin can approve / hide', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'listings/pending1'), { status: 'active', updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(admin(), 'listings/active1'), { status: 'hidden', updatedAt: now() }))
    await assertFails(updateDoc(doc(admin(), 'listings/active1'), { title: 'Admin sửa nội dung' }))
    await assertFails(updateDoc(doc(fakeAdmin(), 'listings/pending1'), { status: 'active', updatedAt: now() }))
    await assertSucceeds(getDocs(collection(admin(), 'listings')))
    await assertSucceeds(deleteDoc(doc(admin(), 'listings/active1')))
  })
})

describe('users', () => {
  it('users manage their own profile but cannot unlock themselves', async () => {
    const carol = env.authenticatedContext('carol', { email: 'carol@example.com' }).firestore()
    await assertSucceeds(setDoc(doc(carol, 'users/carol'), profile('carol@example.com')))
    await assertFails(setDoc(doc(carol, 'users/carol2'), profile('carol@example.com')))
    await assertSucceeds(updateDoc(doc(carol, 'users/carol'), { phone: '0987654321' }))
    await assertFails(updateDoc(doc(mallory(), 'users/mallory'), { disabled: false }))
    await assertFails(getDoc(doc(bob(), 'users/alice')))
    await assertFails(getDocs(collection(bob(), 'users')))
  })

  it('admin can list users and lock / unlock', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'users')))
    await assertSucceeds(updateDoc(doc(admin(), 'users/bob'), { disabled: true }))
    await assertFails(updateDoc(doc(admin(), 'users/bob'), { phone: '0999999999' }))
    await assertFails(updateDoc(doc(fakeAdmin(), 'users/bob'), { disabled: true }))
  })
})

describe('categories & reports', () => {
  it('everyone reads categories, only admin writes', async () => {
    await assertSucceeds(getDocs(collection(guest(), 'categories')))
    await assertFails(setDoc(doc(alice(), 'categories/xe-may'), { name: 'Xe máy', order: 1, active: true }))
    await assertSucceeds(setDoc(doc(admin(), 'categories/xe-may'), { name: 'Xe máy', order: 1, active: true }))
    await assertFails(setDoc(doc(admin(), 'categories/Bad ID'), { name: 'Xe máy', order: 1, active: true }))
  })

  it('signed-in users can report; only admin reads reports', async () => {
    const r = { listingId: 'active1', listingTitle: 'iPhone', reason: 'scam', note: '', reporterId: 'bob', reporterEmail: 'bob@example.com', status: 'open', createdAt: now() }
    await assertSucceeds(setDoc(doc(bob(), 'reports/r1'), r))
    await assertFails(setDoc(doc(guest(), 'reports/r2'), r))
    await assertFails(setDoc(doc(bob(), 'reports/r3'), { ...r, reason: 'spam-lol' }))
    await assertFails(getDocs(collection(bob(), 'reports')))
    await assertSucceeds(getDocs(collection(admin(), 'reports')))
    await assertSucceeds(updateDoc(doc(admin(), 'reports/r1'), { status: 'resolved' }))
  })
})
