import { useEffect } from 'react'

/** 75 → "1 hr 15 min" */
export function formatMinutes(total: number): string {
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/** Sets the browser tab title while a page is shown. */
export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Foodweb` : 'Foodweb'
  }, [title])
}
