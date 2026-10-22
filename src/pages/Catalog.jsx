import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { brands, categories } from '../data/brands.json'
import { useProducts } from '../lib/data'
import { GridSkeleton, ProductGrid } from '../components/ProductCard'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Seo from '../components/Seo'

const PRICE_RANGES = [
  { id: 'u2', label: '< 2 jt', min: 0, max: 2e6 },
  { id: '2-5', label: '2 – 5 jt', min: 2e6, max: 5e6 },
  { id: '5-10', label: '5 – 10 jt', min: 5e6, max: 10e6 },
  { id: '10-20', label: '10 – 20 jt', min: 10e6, max: 20e6 },
  { id: 'o20', label: '> 20 jt', min: 20e6, max: Infinity },
]

const SORTS = [
  { id: 'new', label: 'Terbaru' },
  { id: 'price-asc', label: 'Harga terendah' },
  { id: 'price-desc', label: 'Harga tertinggi' },
  { id: 'name', label: 'Nama A–Z' },
]

const PAGE = 20

export function filterProducts(products, { q, brand, category, price, sort }) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const range = PRICE_RANGES.find((r) => r.id === price)
  const list = products.filter((p) => {
    if (brand && p.brand !== brand) return false
    if (category && p.category !== category) return false
    if (range && !(p.price && p.price >= range.min && p.price < range.max)) return false
    if (words.length) {
      const hay = `${p.name} ${p.brandName ?? ''}`.toLowerCase()
      if (!words.every((w) => hay.includes(w))) return false
    }
    return true
  })
  // Products without a price always sink to the end
  if (sort === 'price-asc') list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || 0)
  else if (sort === 'price-desc') list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1))
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  return list
}

export default function Catalog() {
  const { data: products } = useProducts()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const f = {
    q: params.get('q') ?? '',
    brand: params.get('brand') ?? '',
    category: params.get('kategori') ?? '',
    price: params.get('harga') ?? '',
    sort: params.get('urut') ?? 'new',
  }
  const keyOf = { brand: 'brand', category: 'kategori', price: 'harga', sort: 'urut', q: 'q' }

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || (key === 'sort' && value === 'new')) next.delete(keyOf[key])
    else next.set(keyOf[key], value)
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  const results = useMemo(
    () => (products ? filterProducts(products, f) : []),
    [products, f.q, f.brand, f.category, f.price, f.sort],
  )
  const active = [
    f.q && { key: 'q', label: `“${f.q}”` },
    f.brand && { key: 'brand', label: brands.find((b) => b.slug === f.brand)?.name ?? f.brand },
    f.category && { key: 'category', label: categories.find((c) => c.slug === f.category)?.name ?? f.category },
    f.price && { key: 'price', label: PRICE_RANGES.find((r) => r.id === f.price)?.label },
  ].filter(Boolean)

  return (
    <>
      <Seo title="Katalog Produk" description="Daftar harga HP, tablet & gadget terbaru di Complete Selular." />
      <PageHeader title="Katalog Produk" subtitle="Temukan smartphone, tablet & gadget terbaru dengan harga terbaik." />

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
        {/* Filters: sidebar on desktop, collapsible panel on mobile */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} space-y-7 lg:block`}>
          <FilterGroup title="Kategori">
            <Chip active={!f.category} onClick={() => update('category', '')}>
              Semua
            </Chip>
            {categories.map((c) => (
              <Chip key={c.slug} active={f.category === c.slug} onClick={() => update('category', c.slug)}>
                {c.name}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup title="Harga">
            {PRICE_RANGES.map((r) => (
              <Chip key={r.id} active={f.price === r.id} onClick={() => update('price', f.price === r.id ? '' : r.id)}>
                {r.label}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup title="Brand">
            {brands.map((b) => (
              <Chip
                key={b.slug}
                active={f.brand === b.slug}
                onClick={() => update('brand', f.brand === b.slug ? '' : b.slug)}
              >
                {b.name}
              </Chip>
            ))}
          </FilterGroup>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={f.q}
              onChange={(e) => update('q', e.target.value)}
              placeholder="Cari produk…"
              aria-label="Cari produk"
              className="focus:ring-brand-500 h-10 min-w-0 flex-1 rounded-full bg-white px-4 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 sm:max-w-xs"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="btn-ghost !py-2 lg:hidden"
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="size-4" /> Filter
            </button>
            <select
              value={f.sort}
              onChange={(e) => update('sort', e.target.value)}
              aria-label="Urutkan"
              className="focus:ring-brand-500 ml-auto h-10 rounded-full bg-white px-4 text-sm ring-1 ring-slate-200 outline-none focus:ring-2"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {products && (
              <span>
                <b className="text-slate-900">{results.length}</b> produk
              </span>
            )}
            {active.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => update(a.key, '')}
                className="chip bg-brand-50 text-brand-700 ring-brand-100 hover:bg-brand-100 !py-1"
              >
                {a.label} <X className="size-3.5" />
              </button>
            ))}
            {active.length > 1 && (
              <button
                type="button"
                onClick={() => setParams({}, { replace: true })}
                className="hover:text-brand-700 underline"
              >
                Reset
              </button>
            )}
          </div>

          {!products ? (
            <GridSkeleton />
          ) : results.length ? (
            <>
              <ProductGrid products={results.slice(0, limit)} priorityCount={4} />
              {results.length > limit && (
                <div className="mt-8 text-center">
                  <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-ghost !px-8">
                    Tampilkan lebih banyak ({results.length - limit})
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState title="Produk tidak ditemukan">Coba kata kunci lain atau hapus beberapa filter.</EmptyState>
          )}
        </div>
      </div>
    </>
  )
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip !text-[13px] ${
        active
          ? 'bg-brand-600 ring-brand-600 text-white'
          : 'hover:text-brand-700 hover:ring-brand-300 bg-white text-slate-600 ring-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
