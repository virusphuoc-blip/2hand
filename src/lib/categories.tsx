import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCategories } from './api'
import { DEFAULT_CATEGORIES, type Category } from './constants'
import { firebaseConfigured } from './firebase'

type CategoriesState = {
  all: Category[]
  active: Category[]
  seeded: boolean
  name: (id: string, fallback?: string) => string
  reload: () => Promise<void>
}

const Ctx = createContext<CategoriesState | null>(null)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [seeded, setSeeded] = useState(false)

  const reload = useCallback(async () => {
    if (!firebaseConfigured) return
    try {
      const r = await fetchCategories()
      setAll(r.list)
      setSeeded(r.seeded)
    } catch {
      /* keep defaults */
    }
  }, [])

  useEffect(() => {
    if (!firebaseConfigured) return
    let alive = true
    fetchCategories()
      .then((r) => {
        if (!alive) return
        setAll(r.list)
        setSeeded(r.seeded)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<CategoriesState>(() => {
    const map = new Map(all.map((c) => [c.id, c.name]))
    return {
      all,
      active: all.filter((c) => c.active),
      seeded,
      name: (id, fallback) => map.get(id) ?? fallback ?? id,
      reload,
    }
  }, [all, seeded, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCategories(): CategoriesState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCategories must be used inside CategoriesProvider')
  return ctx
}
