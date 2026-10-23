import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { brands, categories } from '../data/brands.json'
import { KINDS, PRICE_RANGES, productKind } from '../lib/format'
import { useModels } from '../lib/data'
import { waLink } from '../lib/wa'
import { GridSkeleton, ProductGrid } from '../components/ProductCard'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Dialog from '../components/Dialog'
import { WhatsAppIcon } from '../components/icons'
import Seo from '../components/Seo'

// Models without a price always sink to the end
const SORTS = [
  { id: 'new', label: 'Terbaru', compare: (a, b) => (b.date ?? '').localeCompare(a.date ?? '') },
  {
    id: 'price-asc',
    label: 'Harga terendah',
    compare: (a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity) || 0,
  },
  { id: 'price-desc', label: 'Harga tertinggi', compare: (a, b) => (b.maxPrice ?? -1) - (a.maxPrice ?? -1) },
  { id: 'name', label: 'Nama A–Z', compare: (a, b) => a.name.localeCompare(b.name, 'id') },
]

// URL parameter for each filter, so every state is shareable and survives Back
const KEYS = { q: 'q', kind: 'jenis', brand: 'brand', category: 'kategori', price: 'harga', sort: 'urut' }
const SHOWN = 'tampil'
const PAGE = 20

// A listing is found by its full name (capacity included, e.g. "8/256") and its brand, so a name
// copied from a marketplace still finds the phone
const haystacks = new WeakMap()
function haystack(m) {
  if (!haystacks.has(m)) {
    const parts = [m.name, m.brandName]
    haystacks.set(m, parts.filter(Boolean).join(' ').toLowerCase())
  }
  return haystacks.get(m)
}

const kinds = new WeakMap()
const kindOf = (m) => (kinds.has(m) ? kinds.get(m) : kinds.set(m, productKind(m.name)).get(m))

// Kind and brand are checked last, so their chips can count how many models each one would leave
// with the other filters kept (kinds counted within the chosen brand, brands within the chosen kind)
function filterModels(models, { q, kind, brand, category, price, sort }) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const range = PRICE_RANGES.find((r) => r.id === price)
  const brandCounts = {}
  const kindCounts = {}
  const results = []
  for (const m of models) {
    if (category && m.category !== category) continue
    if (range && !(m.minPrice && m.minPrice >= range.min && m.minPrice < range.max)) continue
    if (words.length && !words.every((w) => haystack(m).includes(w))) continue
    const k = kindOf(m)
    if (!brand || m.brand === brand) kindCounts[k] = (kindCounts[k] ?? 0) + 1
    if (kind && k !== kind) continue
    brandCounts[m.brand] = (brandCounts[m.brand] ?? 0) + 1
    if (!brand || m.brand === brand) results.push(m)
  }
  const compare = SORTS.find((s) => s.id === sort).compare
  // While searching, the default order puts phones and tablets ahead of accessories, so "redmi"
  // opens on Redmi phones rather than the newer Redmi Watch
  results.sort(words.length && sort === 'new' ? (a, b) => isDevice(b) - isDevice(a) || compare(a, b) : compare)
  return { results, brandCounts, kindCounts }
}

const DEVICES = new Set(['phone', 'tablet'])
const isDevice = (m) => DEVICES.has(kindOf(m))

function setOrDelete(params, key, value) {
  if (value) params.set(key, value)
  else params.delete(key)
}

export default function Catalog() {
  const { data: models, error, retry } = useModels()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const panelId = useId()

  const sortParam = params.get(KEYS.sort)
  const f = {
    q: params.get(KEYS.q) ?? '',
    kind: KINDS.some((k) => k.id === params.get(KEYS.kind)) ? params.get(KEYS.kind) : '',
    brand: params.get(KEYS.brand) ?? '',
    category: params.get(KEYS.category) ?? '',
    price: params.get(KEYS.price) ?? '',
    sort: SORTS.some((s) => s.id === sortParam) ? sortParam : 'new',
  }
  // "Tampilkan lebih banyak" progress lives in the URL so Back from a product restores it
  const shown = Math.max(PAGE, parseInt(params.get(SHOWN), 10) || PAGE)

  // Timers and focus requests outlive a render, so they read the latest params from a ref
  const paramsRef = useRef(params)
  paramsRef.current = params
  const countRef = useRef(null)
  const chipsRef = useRef(null)
  const gridRef = useRef(null)
  const resultsRef = useRef(null)
  const pendingFocus = useRef(null)
  const scrollToResults = useRef(false)
  const retried = useRef(false)
  const sortPushed = useRef(false)

  // Discrete changes (chips, sort, reset) push history so Back undoes them one by one
  // (The search itself is typed in the header's search field, which navigates here with ?q=)
  const apply = (changes, { replace = false } = {}) => {
    const next = new URLSearchParams(paramsRef.current)
    for (const [key, value] of Object.entries(changes)) {
      setOrDelete(next, KEYS[key], key === 'sort' && value === 'new' ? '' : value)
    }
    next.delete(SHOWN)
    scrollToResults.current = !filtersOpen
    setParams(next, { replace })
  }

  const clearFilters = { kind: '', brand: '', category: '', price: '' }
  // Every reset leaves its button behind, so focus lands on the result count
  const reset = (changes) => {
    pendingFocus.current = { count: true }
    apply(changes)
  }

  const showMore = () => {
    pendingFocus.current = { card: shown }
    const next = new URLSearchParams(paramsRef.current)
    next.set(SHOWN, String(shown + PAGE))
    setParams(next, { replace: true })
  }

  // Runs after every render that was asked to move focus or scroll
  useEffect(() => {
    const request = pendingFocus.current
    pendingFocus.current = null
    if (request?.card != null) {
      // First newly loaded card, so keyboard users continue where the new items start
      gridRef.current?.querySelectorAll('article')[request.card]?.querySelector('a')?.focus()
    } else if (request) {
      // The removed chip is gone: move to its neighbour, or to the result count when none remain
      const chips = chipsRef.current?.querySelectorAll('[data-remove]') ?? []
      const target = (!request.count && chips[Math.min(request.chip, chips.length - 1)]) || countRef.current
      target?.focus({ preventScroll: true })
    }
    if (scrollToResults.current) {
      scrollToResults.current = false
      // After a filter change far down the grid, bring the top of the new results back into view
      if (resultsRef.current && resultsRef.current.getBoundingClientRect().top < 0) {
        resultsRef.current.scrollIntoView({ block: 'start' })
      }
    }
  })

  // "Coba lagi" unmounts itself, which drops focus to <body>. Once the retry settles, land on the
  // result count, or back on the retry button if it failed again. Focus the user already moved
  // elsewhere is left alone.
  useEffect(() => {
    if (!retried.current || (!models && !error)) return
    retried.current = false
    if (document.activeElement && document.activeElement !== document.body) return
    if (models) countRef.current?.focus()
    else resultsRef.current?.querySelector('[role="alert"] button')?.focus()
  }, [models, error])

  // The sheet is mobile-only; close it if the window grows into the sidebar layout
  useEffect(() => {
    if (!filtersOpen) return
    const mq = window.matchMedia('(min-width: 64rem)')
    const onChange = () => mq.matches && setFiltersOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [filtersOpen])

  const { results, brandCounts, kindCounts } = useMemo(
    () => (models ? filterModels(models, f) : { results: [], brandCounts: {}, kindCounts: {} }),
    [models, f.q, f.kind, f.brand, f.category, f.price, f.sort],
  )

  // Offer only options that match something in this snapshot
  const options = useMemo(() => {
    if (!models) return { brands, categories }
    const has = (key, slug) => models.some((m) => m[key] === slug)
    return {
      brands: brands.filter((b) => has('brand', b.slug)),
      categories: categories.filter((c) => has('category', c.slug)),
    }
  }, [models])

  const kindLabel = KINDS.find((k) => k.id === f.kind)?.label ?? ''
  const brandName = brands.find((b) => b.slug === f.brand)?.name ?? f.brand
  const categoryName = categories.find((c) => c.slug === f.category)?.name ?? f.category
  const priceLabel = PRICE_RANGES.find((r) => r.id === f.price)?.label ?? ''
  const active = [
    f.q && { key: 'q', label: `“${f.q}”`, remove: `Hapus pencarian “${f.q}”` },
    f.kind && { key: 'kind', label: kindLabel, remove: `Hapus filter ${kindLabel}` },
    f.brand && { key: 'brand', label: brandName, remove: `Hapus filter ${brandName}` },
    f.category && { key: 'category', label: categoryName, remove: `Hapus filter ${categoryName}` },
    f.price && { key: 'price', label: priceLabel, remove: `Hapus filter harga ${priceLabel}` },
  ].filter(Boolean)
  const filterCount = active.filter((a) => a.key !== 'q').length

  const wanted = [
    f.q && `*${f.q}*`,
    f.kind && kindLabel,
    f.brand && `brand ${brandName}`,
    f.price && `harga ${priceLabel}`,
  ].filter(Boolean)
  const waAsk = wanted.length
    ? waLink(
        `Halo admin Complete Selular, saya cari ${wanted.join(', ')} tapi belum ketemu di website. Apakah stoknya tersedia?`,
      )
    : waLink()

  const remaining = results.length - shown
  const panel = (
    <FilterPanel
      f={f}
      options={options}
      brandCounts={models && brandCounts}
      kindCounts={models && kindCounts}
      onChange={(key, value) => apply({ [key]: value })}
    />
  )

  return (
    <>
      <Seo title="Katalog Produk" description="Daftar harga HP, tablet & gadget terbaru di Complete Selular." />
      <PageHeader title="Katalog Produk" />

      <div className="container-page grid gap-4 py-3 sm:py-4 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar; phones and tablets get the same filters in a bottom sheet */}
        <aside
          aria-labelledby={`${panelId}-side`}
          className="card hidden p-4 lg:sticky lg:top-[7.75rem] lg:block lg:max-h-[calc(100dvh-8.75rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain"
        >
          <h2 id={`${panelId}-side`} className="text-ink mb-3 text-base font-extrabold">
            Filter
          </h2>
          {panel}
        </aside>

        <div ref={resultsRef} className="min-w-0">
          {/* Marketplace toolbar: result count left, filter + sort right */}
          <div className="card mb-3 flex flex-wrap items-center gap-2 px-3 py-2 sm:min-h-14 sm:px-4">
            <div className="w-full sm:me-auto sm:w-auto">
              {models ? (
                <h2
                  ref={countRef}
                  tabIndex={-1}
                  className="text-muted rounded text-sm font-normal focus-visible:outline-offset-4"
                >
                  <b className="text-ink font-extrabold">{results.length}</b> produk
                </h2>
              ) : (
                !error && <div aria-hidden className="skeleton my-0.5 h-4 w-20 rounded" />
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              // The panel only exists while the sheet is open
              aria-controls={filtersOpen ? panelId : undefined}
              className={`${CONTROL} flex-1 justify-center gap-2 px-3 font-bold sm:flex-none lg:hidden`}
            >
              <SlidersHorizontal className="text-muted size-4" aria-hidden /> Filter
              {filterCount > 0 && (
                <>
                  <span className="sr-only">, </span>
                  <span className="bg-brand-600 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold text-white">
                    {filterCount}
                    <span className="sr-only"> aktif</span>
                  </span>
                </>
              )}
            </button>

            <div className="relative flex-1 sm:flex-none">
              <select
                aria-label="Urutkan"
                value={f.sort}
                onFocus={() => {
                  sortPushed.current = false
                }}
                // Opening the picker again is a new deliberate choice, even if focus never left
                onPointerDown={() => {
                  sortPushed.current = false
                }}
                onChange={(e) => {
                  // Arrow keys change a closed select once per press: only the first change while it
                  // keeps focus gets a history entry, so Back does not step through every option
                  apply({ sort: e.target.value }, { replace: sortPushed.current })
                  sortPushed.current = true
                }}
                className={`${CONTROL} w-full appearance-none pr-9 pl-3 font-semibold`}
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="text-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
                aria-hidden
              />
            </div>
          </div>

          {/* Announces result counts as filters change; the visible count above is the focus target */}
          <p role="status" className="sr-only">
            {models ? `${results.length} produk ditemukan` : ''}
          </p>

          {error && !models ? (
            <ErrorState
              onRetry={() => {
                retried.current = true
                retry()
              }}
              title="Gagal memuat produk"
            />
          ) : !models ? (
            <GridSkeleton columns="sidebar" />
          ) : (
            <>
              {active.length > 0 && (
                <div ref={chipsRef} className="mb-3 flex flex-wrap items-center gap-2">
                  {active.map((a, i) => (
                    <button
                      key={a.key}
                      type="button"
                      data-remove
                      aria-label={a.remove}
                      onClick={() => {
                        pendingFocus.current = { chip: i }
                        apply({ [a.key]: '' })
                      }}
                      className="chip border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100 min-h-8 px-2.5 py-1 text-[13px] pointer-coarse:min-h-11"
                    >
                      {a.label} <X className="size-3.5" aria-hidden />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => reset({ ...clearFilters, q: '' })}
                    className="text-brand-700 hover:text-brand-800 rounded px-1 py-1 text-[13px] font-bold hover:underline pointer-coarse:min-h-11"
                  >
                    Hapus semua
                  </button>
                </div>
              )}

              {results.length ? (
                <>
                  <div ref={gridRef}>
                    <ProductGrid products={results.slice(0, shown)} priorityCount={2} columns="sidebar" />
                  </div>
                  {remaining > 0 && (
                    <div className="mt-4 text-center">
                      <button type="button" onClick={showMore} className="btn-ghost w-full sm:w-auto">
                        {remaining > PAGE
                          ? `Tampilkan ${PAGE} lagi · ${remaining} tersisa`
                          : `Tampilkan ${remaining} produk terakhir`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  as="h3"
                  // Blame the search only when nothing else could have emptied the list
                  title={
                    filterCount
                      ? 'Tidak ada produk yang cocok dengan filter ini'
                      : f.q
                        ? `Tidak ada hasil untuk “${f.q}”`
                        : 'Produk tidak ditemukan'
                  }
                  actions={
                    <>
                      {filterCount > 0 ? (
                        <button type="button" onClick={() => reset(clearFilters)} className="btn-ghost">
                          Hapus filter
                        </button>
                      ) : (
                        f.q && (
                          <button type="button" onClick={() => reset({ q: '' })} className="btn-ghost">
                            Hapus pencarian
                          </button>
                        )
                      )}
                      <a href={waAsk} target="_blank" rel="noopener" className="btn-wa">
                        <WhatsAppIcon className="size-4" /> Tanya stok via WhatsApp
                        <span className="sr-only"> (buka di tab baru)</span>
                      </a>
                    </>
                  }
                >
                  {filterCount ? 'Coba ubah filter.' : f.q ? 'Coba kata kunci lain.' : 'Tanya stoknya ke admin.'}
                </EmptyState>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter">
        <div id={panelId} className="p-4">
          {panel}
        </div>
        <div className="border-line sticky bottom-0 border-t bg-white px-4 py-3">
          {models && !results.length && (
            <p className="text-muted mb-3 text-sm">
              <b className="text-ink font-bold">Tidak ada produk cocok.</b>{' '}
              {filterCount ? 'Coba ubah atau hapus filter.' : f.q && `Pencarian “${f.q}” belum menemukan produk.`}
            </p>
          )}
          <div className="flex gap-2">
            {/* Clears only what this sheet sets; the search stays, unlike "Hapus semua" on the page */}
            <button
              type="button"
              aria-disabled={!filterCount}
              onClick={() => filterCount && apply(clearFilters)}
              className="btn-ghost aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              Hapus filter
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">
              {!models ? 'Tampilkan produk' : results.length ? `Tampilkan ${results.length} produk` : 'Tutup'}
            </button>
          </div>
        </div>
        {/* The page behind the modal is inert, so the sheet carries its own announcement */}
        <p role="status" className="sr-only">
          {models ? (results.length ? `${results.length} produk cocok` : 'Tidak ada produk cocok') : ''}
        </p>
      </Dialog>
    </>
  )
}

// Toolbar controls: same height, radius and border as the header's search field
const CONTROL =
  'border-line text-ink hover:border-brand-300 inline-flex h-10 items-center rounded-lg border bg-white text-sm transition-colors pointer-coarse:h-11'

function FilterPanel({ f, options, brandCounts, kindCounts, onChange }) {
  return (
    <div className="divide-line space-y-4 divide-y [&>*:not(:first-child)]:pt-4">
      <FilterGroup title="Jenis">
        {KINDS.map((k) => (
          <Chip
            key={k.id}
            active={f.kind === k.id}
            count={kindCounts && (kindCounts[k.id] ?? 0)}
            onClick={() => onChange('kind', f.kind === k.id ? '' : k.id)}
          >
            {k.label}
          </Chip>
        ))}
      </FilterGroup>
      {/* A single category (everything is "Mobiles" today) filters nothing, so hide the group */}
      {options.categories.length > 1 && (
        <FilterGroup title="Kategori">
          <Chip active={!f.category} onClick={() => onChange('category', '')}>
            Semua
          </Chip>
          {options.categories.map((c) => (
            <Chip key={c.slug} active={f.category === c.slug} onClick={() => onChange('category', c.slug)}>
              {c.name}
            </Chip>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Harga">
        {PRICE_RANGES.map((r) => (
          <Chip key={r.id} active={f.price === r.id} onClick={() => onChange('price', f.price === r.id ? '' : r.id)}>
            {r.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Brand">
        {options.brands.map((b) => (
          <Chip
            key={b.slug}
            active={f.brand === b.slug}
            count={brandCounts && (brandCounts[b.slug] ?? 0)}
            onClick={() => onChange('brand', f.brand === b.slug ? '' : b.slug)}
          >
            {b.name}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, children }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id}>
      <h3 id={id} className="text-ink mb-2 text-[13px] font-bold">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

//   count  models this choice would show with the other filters kept; omitted while loading. It is not
//          shown, but a choice that would show nothing is disabled (unless active, so it can be undone).
function Chip({ active, count, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={`chip min-h-8 gap-1 px-2.5 py-1 text-[13px] disabled:opacity-40 pointer-coarse:min-h-11 ${
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-line text-ink hover:border-brand-300 bg-white font-medium'
      }`}
    >
      {active && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  )
}
