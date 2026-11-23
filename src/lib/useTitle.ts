import { useEffect } from 'react'
import { SITE_NAME } from './constants'

export function useTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Chợ đồ cũ & mới toàn quốc`
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    }
  }, [title, description])
}
