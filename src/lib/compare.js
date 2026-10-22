import { useSyncExternalStore } from 'react'
// Up to 3 product slugs, remembered per browser.
const KEY = 'cs-compare'
const MAX = 3
let slugs = read()
const listeners = new Set()
function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.slice(0, MAX) : []
  } catch {
    return []
  }
}
function set(next) {
  slugs = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  listeners.forEach((l) => l())
}
export const compare = {
  toggle(slug) {
    if (slugs.includes(slug)) set(slugs.filter((s) => s !== slug))
    else set([...slugs, slug].slice(-MAX))
  },
  remove: (slug) => set(slugs.filter((s) => s !== slug)),
  clear: () => set([]),
  max: MAX,
}
export function useCompare() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => slugs,
  )
}
