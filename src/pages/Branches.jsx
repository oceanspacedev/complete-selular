import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, MapPin, Search, X } from 'lucide-react'
import branches from '../data/branches.json'
import site from '../data/site.json'
import { waLink } from '../lib/wa'
import { WhatsAppIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Seo from '../components/Seo'

// Lowercase letters and digits only, so "hp mart", "HPMART" and "Hp-Mart" all find each other
const compact = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')

// Most addresses leave the province out, so "jawa barat" would otherwise miss most West Java stores
const JABAR = ['Jawa Barat', 'Jabar']
const JATENG = ['Jawa Tengah', 'Jateng']
const PROVINCE = {
  Cirebon: JABAR,
  Indramayu: JABAR,
  Majalengka: JABAR,
  Cilacap: JATENG,
  Pemalang: JATENG,
  Tegal: JATENG,
}

// Each address part (between commas) is compacted on its own and kept apart, so a phrase never
// matches across parts: "cirebon ciledug" must not treat "…, Cirebon, Ciledug, …" as a phrase hit
const indexed = branches.map((b) => ({
  ...b,
  hay: [b.name, b.city, ...b.address.split(/[,()]/), ...(PROVINCE[b.city] ?? [])]
    .map(compact)
    .filter(Boolean)
    .join(' '),
}))

// Chip order is fixed (most branches first) so chips don't jump around while the counts change
const CITIES = (() => {
  const counts = {}
  for (const b of branches) counts[b.city] = (counts[b.city] ?? 0) + 1
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
})()

function search(q) {
  const words = q.split(/\s+/).map(compact).filter(Boolean)
  if (!words.length) return indexed
  const phrase = indexed.filter((b) => b.hay.includes(words.join('')))
  // When the whole phrase exists somewhere ("jawa barat"), stores that only have the words in
  // separate places ("Kec. Tegal Barat, … Jawa Tengah") are noise, not results
  if (phrase.length || words.length === 1) return phrase
  return indexed.filter((b) => words.every((w) => b.hay.includes(w)))
}

function withParams(params, changes) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

const WA_GENERAL =
  'Halo admin Complete Selular, saya mau tanya alamat cabang Complete Selular terdekat dari lokasi saya.'

export default function Branches() {
  const [params, setParams] = useSearchParams()
  const urlQ = params.get('q') ?? ''
  const kota = (params.get('kota') ?? '').toLowerCase()
  const city = CITIES.find((c) => c.toLowerCase() === kota) ?? ''

  // The field keeps its own state so typing stays instant; the URL catches up after a pause.
  // `written` is the last q we put in the URL ourselves, so only Back/Forward or an edited
  // link overwrite what the user is typing.
  const [q, setQ] = useState(urlQ)
  const written = useRef(urlQ)
  useEffect(() => {
    if (urlQ === written.current) return
    written.current = urlQ
    setQ(urlQ)
  }, [urlQ])

  // Typing replaces the history entry; picking a city pushes one, so Back steps through cities
  const update = (changes, { push = false } = {}) => {
    const next = withParams(params, changes)
    if ('q' in changes) written.current = changes.q
    if (next.toString() !== params.toString()) setParams(next, { replace: !push })
  }

  const needle = q.trim()
  useEffect(() => {
    if (needle === urlQ) return
    const t = setTimeout(() => update({ q: needle }), 400)
    return () => clearTimeout(t)
  }, [needle, urlQ, params])

  const found = useMemo(() => search(needle), [needle])
  const counts = useMemo(() => {
    const c = {}
    for (const b of found) c[b.city] = (c[b.city] ?? 0) + 1
    return c
  }, [found])
  const list = city ? found.filter((b) => b.city === city) : found

  const inputRef = useRef(null)
  const allChipRef = useRef(null)
  const barRef = useRef(null)
  const resultsRef = useRef(null)

  // When the list changes while the user is scrolled deep into it, bring the result count
  // back up under the sticky bar instead of leaving them in the footer of a shorter list
  const shown = useRef({ city, needle })
  useLayoutEffect(() => {
    if (shown.current.city === city && shown.current.needle === needle) return
    shown.current = { city, needle }
    const bar = barRef.current?.getBoundingClientRect()
    const top = resultsRef.current?.getBoundingClientRect().top
    if (bar && top != null && top < bar.bottom) window.scrollBy(0, top - bar.bottom - 12)
  }, [city, needle])

  const selectCity = (c) => update({ kota: c, q: needle }, { push: true })
  const showAllCities = () => {
    selectCity('')
    allChipRef.current?.focus()
  }
  const reset = () => {
    setQ('')
    update({ kota: '', q: '' }, { push: true })
    allChipRef.current?.focus()
  }
  const clearQuery = () => {
    setQ('')
    update({ q: '' })
    inputRef.current?.focus()
  }

  const hiddenByCity = city && !list.length && found.length > 0
  const status = !city && !needle ? `Semua ${list.length} cabang` : describe(list.length, city, needle)

  return (
    <>
      <Seo
        title="Toko Cabang"
        description={`Daftar ${branches.length} toko cabang Complete Selular beserta alamat dan petunjuk arah lewat Google Maps.`}
      />
      <PageHeader
        title="Toko Cabang"
        subtitle={`Alamat dan petunjuk arah ${branches.length} cabang yang sudah tercantum online, dari total ${site.branchCount} cabang Complete Selular.`}
      >
        <a
          href={waLink(WA_GENERAL)}
          target="_blank"
          rel="noopener"
          className="text-wa-700 mt-1 inline-flex min-h-8 items-center gap-1.5 rounded text-[13px] font-bold underline-offset-2 hover:underline pointer-coarse:min-h-11"
        >
          <WhatsAppIcon className="size-4" /> Cabang lain? Tanya lewat WhatsApp
        </a>
      </PageHeader>

      {/* Sits right under the sticky site header: 116px tall on phones, 64px from sm, 108px with the nav row from lg */}
      <div
        ref={barRef}
        className="border-line sticky top-[116px] z-20 mt-2 border-y bg-white sm:top-16 lg:top-[108px] [@media(max-height:30rem)]:static"
      >
        <form
          role="search"
          className="container-page py-2"
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: needle })
            // Closes the on-screen keyboard so the results are visible; with a real keyboard
            // focus stays put so keyboard and screen-reader users keep their place
            if (window.matchMedia?.('(pointer: coarse)').matches) inputRef.current?.blur()
          }}
        >
          {/* Hidden on phones to keep the sticky band short; the icon and placeholder carry it there */}
          <label htmlFor="cari-cabang" className="text-ink sr-only text-[13px] font-bold sm:not-sr-only">
            Cari cabang
          </label>
          <div className="flex flex-col gap-2 sm:mt-1 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative sm:w-72 sm:shrink-0 lg:w-80">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                ref={inputRef}
                id="cari-cabang"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nama toko, jalan, atau kota…"
                className={`ring-brand-300 text-ink focus:border-brand-500 h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 text-sm transition outline-none hover:border-slate-400 focus:ring-2 pointer-coarse:h-11 [&::-webkit-search-cancel-button]:appearance-none ${q ? 'pr-10' : 'pr-3'}`}
              />
              {q && (
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label="Hapus kata kunci"
                  className="text-muted hover:text-ink absolute top-1/2 right-0.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg hover:bg-slate-100 pointer-coarse:right-0 pointer-coarse:size-11"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>

            <ChipRow label="Filter kota" active={city}>
              {['', ...CITIES].map((c) => {
                const active = city === c
                const n = c ? (counts[c] ?? 0) : found.length
                return (
                  <button
                    key={c || 'all'}
                    ref={c ? undefined : allChipRef}
                    type="button"
                    onClick={() => selectCity(c)}
                    aria-pressed={active}
                    className={`chip shrink-0 scroll-mx-10 ${
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-line text-ink hover:border-brand-300 bg-white'
                    }`}
                  >
                    {c || 'Semua'}{' '}
                    <span className={`font-medium ${active ? 'text-brand-700' : 'text-muted'}`}>
                      {n}
                      <span className="sr-only"> cabang</span>
                    </span>
                  </button>
                )
              })}
            </ChipRow>
          </div>
        </form>
      </div>

      <div ref={resultsRef} className="container-page py-3 sm:py-4">
        <p role="status" className="text-muted mb-2 text-[13px] sm:mb-3">
          {status}
        </p>

        {list.length ? (
          <>
            {/* Opted out of scroll anchoring: when a filter removes the anchored card Chrome jumps to the
                top of the page, and the effect above already places the new results */}
            <div className="grid gap-2 [overflow-anchor:none] sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {list.map((b) => (
                <article key={b.name + b.address} className="card flex flex-col p-3 sm:p-4">
                  <h2 className="text-ink text-sm font-bold">{b.name}</h2>
                  <p className="text-muted text-xs">{b.city}</p>
                  <p className="text-ink mt-1.5 flex-1 text-sm leading-relaxed break-words">{b.address}</p>
                  {b.maps && (
                    <a
                      href={b.maps}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Petunjuk arah ke ${b.name} (Google Maps, tab baru)`}
                      // Keeps keyboard focus clear of the sticky search bar when the browser scrolls it into view
                      className="text-brand-600 hover:text-brand-700 mt-2 inline-flex min-h-8 scroll-mt-40 items-center gap-1 self-start rounded text-[13px] font-bold hover:underline sm:scroll-mt-32 pointer-coarse:min-h-11 [@media(max-height:30rem)]:scroll-mt-0"
                    >
                      Petunjuk arah
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </article>
              ))}
            </div>

            <section className="card mt-3 flex flex-col items-start gap-3 p-4 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-ink text-sm font-bold">Cabang terdekatmu belum ada di daftar?</h2>
                <p className="text-muted mt-1 text-sm">
                  Daftar ini baru memuat {branches.length} dari {site.branchCount} cabang Complete Selular. Kirim
                  lokasimu lewat WhatsApp, admin kami bantu carikan cabang terdekat.
                </p>
              </div>
              <a href={waLink(WA_GENERAL)} target="_blank" rel="noopener" className="btn-wa shrink-0">
                <WhatsAppIcon className="size-4" /> Tanya via WhatsApp
              </a>
            </section>
          </>
        ) : (
          <EmptyState
            title="Cabang tidak ditemukan"
            icon={MapPin}
            actions={
              hiddenByCity ? (
                <>
                  <button type="button" onClick={showAllCities} className="btn-primary">
                    Cari di semua kota ({found.length})
                  </button>
                  <a href={waLink(WA_GENERAL)} target="_blank" rel="noopener" className="btn-ghost">
                    <WhatsAppIcon className="size-4" /> Tanya via WhatsApp
                  </a>
                </>
              ) : (
                <>
                  <button type="button" onClick={reset} className="btn-ghost">
                    Reset pencarian
                  </button>
                  <a
                    href={waLink(
                      needle
                        ? `Halo admin Complete Selular, apakah ada cabang Complete Selular di daerah ${needle}?`
                        : WA_GENERAL,
                    )}
                    target="_blank"
                    rel="noopener"
                    className="btn-wa"
                  >
                    <WhatsAppIcon className="size-4" /> Tanya via WhatsApp
                  </a>
                </>
              )
            }
          >
            {hiddenByCity ? (
              <>
                Tidak ada cabang di {city} yang cocok dengan “{needle}”, tapi ada {found.length} cabang di kota lain.
              </>
            ) : (
              <>
                Belum ada cabang tercantum yang cocok dengan “{needle}”. Cabang di daerahmu mungkin belum masuk daftar
                ini, tanyakan saja lewat WhatsApp.
              </>
            )}
          </EmptyState>
        )}
      </div>
    </>
  )
}

function describe(n, city, needle) {
  const where = city ? ` di ${city}` : ''
  const what = needle ? ` yang cocok dengan “${needle}”` : ''
  return n ? `${n} cabang${where}${what}` : `Tidak ada cabang${where}${what}`
}

// Horizontally scrolling chip row. The edges fade out while there is more to scroll, so the
// row reads as scrollable even where the scrollbar is hidden (touch) or chips end on a gap.
function ChipRow({ label, active, children }) {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  // Chrome only scrolls a fully hidden element into view on focus, so a chip half under an edge
  // fade would keep its focus ring hidden. Sets scrollLeft directly so the window never scrolls.
  const reveal = (chip, center = false) => {
    const row = ref.current
    if (!chip || chip.parentElement !== row || row.scrollWidth <= row.clientWidth) return
    const fade = 40
    const start = chip.offsetLeft
    const end = start + chip.offsetWidth
    if (center) row.scrollLeft = start - (row.clientWidth - chip.offsetWidth) / 2
    else if (start - fade < row.scrollLeft) row.scrollLeft = start - fade
    else if (end + fade > row.scrollLeft + row.clientWidth) row.scrollLeft = end + fade - row.clientWidth
  }

  // A city restored from the URL (shared link, reload, Back) may sit far off to the right;
  // centre it on first render, then just nudge it into view when the city changes
  const mounted = useRef(false)
  useLayoutEffect(() => {
    reveal(ref.current.querySelector('[aria-pressed="true"]'), !mounted.current)
    mounted.current = true
  }, [active])

  useLayoutEffect(() => {
    const el = ref.current
    const measure = () => {
      const start = el.scrollLeft > 1
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((e) => (e.start === start && e.end === end ? e : { start, end }))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [])

  const mask = `linear-gradient(to right, ${edges.start ? 'transparent, #000 2.5rem' : '#000, #000'}, ${
    edges.end ? '#000 calc(100% - 2.5rem), transparent' : '#000'
  })`

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      onFocus={(e) => reveal(e.target)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      // py-1 leaves room for the focus outline, which the scroll container would otherwise clip.
      // relative keeps the chips' sr-only text inside the scroller instead of widening the page.
      className="relative -mx-4 -my-1 flex min-w-0 [scrollbar-width:thin] gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-1 sm:px-1 lg:flex-wrap lg:overflow-visible pointer-coarse:scrollbar-none"
    >
      {children}
    </div>
  )
}
