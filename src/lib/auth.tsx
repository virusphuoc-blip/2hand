import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createProfile, fetchProfile } from './api'
import { ADMIN_EMAIL } from './constants'
import { auth, getAuthOrThrow } from './firebase'
import type { Profile } from './types'

export type SignUpData = {
  email: string
  password: string
  displayName: string
  phone: string
  zalo: string
  province: string
}

type AuthState = {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (d: SignUpData) => Promise<void>
  signInGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function isAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified) return false
  if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL) return false
  return user.providerData.some((p) => p.providerId === 'google.com')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const seq = useRef(0)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, async (u) => {
      const my = ++seq.current
      let p: Profile | null = null
      if (u) {
        try {
          p = await fetchProfile(u.uid)
        } catch {
          p = null
        }
      }
      if (my !== seq.current) return
      setUser(u)
      setProfile(p)
      setLoading(false)
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    const u = auth?.currentUser
    const p = u ? await fetchProfile(u.uid) : null
    seq.current++
    setProfile(p)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: isAdminUser(user),
      refreshProfile,
      async signInEmail(email, password) {
        await signInWithEmailAndPassword(getAuthOrThrow(), email.trim(), password)
      },
      async signUpEmail(d) {
        const cred = await createUserWithEmailAndPassword(getAuthOrThrow(), d.email.trim(), d.password)
        await updateProfile(cred.user, { displayName: d.displayName.trim() })
        await createProfile({
          uid: cred.user.uid,
          email: cred.user.email ?? d.email.trim(),
          displayName: d.displayName,
          phone: d.phone,
          zalo: d.zalo,
          province: d.province,
        })
        const p = await fetchProfile(cred.user.uid)
        seq.current++
        setUser(cred.user)
        setProfile(p)
        setLoading(false)
      },
      async signInGoogle() {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        try {
          await signInWithPopup(getAuthOrThrow(), provider)
        } catch (e) {
          const code = (e as { code?: string }).code
          if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(getAuthOrThrow(), provider)
            return
          }
          throw e
        }
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getAuthOrThrow(), email.trim())
      },
      async signOut() {
        await fbSignOut(getAuthOrThrow())
      },
    }),
    [user, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Tài khoản không tồn tại.',
    'auth/email-already-in-use': 'Email này đã được đăng ký.',
    'auth/weak-password': 'Mật khẩu tối thiểu 6 ký tự.',
    'auth/too-many-requests': 'Bạn thử quá nhiều lần, vui lòng đợi một lát.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/network-request-failed': 'Lỗi mạng, vui lòng thử lại.',
    'auth/unauthorized-domain': 'Tên miền này chưa được cho phép đăng nhập (Firebase → Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được bật trong Firebase.',
    'permission-denied': 'Bạn không có quyền thực hiện thao tác này.',
  }
  return map[code] ?? (e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
}
