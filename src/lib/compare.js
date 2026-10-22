import { useSyncExternalStore } from 'react'

// Up to 3 product slugs, remembered per browser and kept in sync across tabs.
const KEY = 'cs-compare'
const MAX = 3
const hasWindow = typeof window !== 'undefined'
const listeners = new Set()
const noticeListeners = new Set()
let slugs = read()
let notice = null
let noticeTimer

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? [...new Set(v.filter((s) => typeof s === 'string'))].slice(0, MAX) : []
  } catch {
    return []
  }
}

// Another tab may have changed the list since this module loaded; always start from storage
// so one tab never overwrites what another just added.
function sync() {
  const next = read()
  if (next.join() !== slugs.join()) {
    slugs = next
    listeners.forEach((l) => l())
  }
}

function write(next) {
  slugs = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  listeners.forEach((l) => l())
}

// One polite live region shared by every compare control (cards, product page, compare page),
// created up front because screen readers ignore regions inserted together with their text.
const region = hasWindow ? getRegion() : null
function getRegion() {
  const id = 'cs-compare-status'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    el.setAttribute('role', 'status')
    el.style.cssText =
      'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'
    document.body.append(el)
  }
  return el
}

function notify(text, kind = 'info') {
  notice = { id: Date.now(), text, kind }
  noticeListeners.forEach((l) => l())
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice = null
    noticeListeners.forEach((l) => l())
  }, 5000)
  if (!region) return
  // Clearing first makes an identical message (e.g. "full" twice in a row) be read again.
  region.textContent = ''
  setTimeout(() => (region.textContent = text), 60)
}

if (hasWindow) {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) sync()
  })
}

const label = (name) => name || 'Produk'

export const compare = {
  max: MAX,
  has: (slug) => slugs.includes(slug),
  // Never evicts silently: when the list is full the add is refused so the UI can say why.
  // Returns { ok: true, added, count } or { ok: false, reason: 'full', count }.
  toggle(slug, name) {
    sync()
    if (slugs.includes(slug)) {
      write(slugs.filter((s) => s !== slug))
      notify(`${label(name)} dihapus dari perbandingan.`)
      return { ok: true, added: false, count: slugs.length }
    }
    if (slugs.length >= MAX) {
      notify(`Maksimal ${MAX} produk. Hapus salah satu di halaman Bandingkan dulu.`, 'full')
      return { ok: false, reason: 'full', count: slugs.length }
    }
    write([...slugs, slug])
    notify(`${label(name)} ditambahkan ke perbandingan (${slugs.length} dari ${MAX}).`)
    return { ok: true, added: true, count: slugs.length }
  },
  // Returns the previous list so callers can offer "Urungkan" via compare.restore().
  remove(slug, name) {
    sync()
    const prev = slugs
    if (!prev.includes(slug)) return prev
    write(prev.filter((s) => s !== slug))
    notify(`${label(name)} dihapus dari perbandingan.`)
    return prev
  },
  clear() {
    sync()
    const prev = slugs
    write([])
    if (prev.length) notify('Semua produk dihapus dari perbandingan.')
    return prev
  },
  restore(list) {
    sync()
    const merged = [...new Set([...list, ...slugs])].slice(0, MAX)
    write(merged)
    notify(`Perbandingan dipulihkan (${merged.length} dari ${MAX} produk).`)
  },
}

export function useCompare() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => slugs,
    () => slugs,
  )
}

// Latest compare message ({ id, text, kind: 'info' | 'full' }) or null, cleared after 5 s.
// It is already announced to screen readers, so a visible toast for it should not be a live region.
export function useCompareNotice() {
  return useSyncExternalStore(
    (l) => (noticeListeners.add(l), () => noticeListeners.delete(l)),
    () => notice,
    () => null,
  )
}
