import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { getJson } from '../lib/data'
import { compare, useCompare } from '../lib/compare'
import { formatPrice } from '../lib/format'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Img from '../components/Img'
import Seo from '../components/Seo'

export default function Compare() {
  const slugs = useCompare()
  const [products, setProducts] = useState({})

  useEffect(() => {
    for (const s of slugs) {
      if (products[s]) continue
      getJson(`/data/products/${s}.json`).then(
        (p) => setProducts((m) => ({ ...m, [s]: p })),
        () => compare.remove(s),
      )
    }
  }, [slugs, products])

  const list = slugs.map((s) => products[s]).filter(Boolean)
  const rows = buildRows(list)
  const cols = { gridTemplateColumns: `minmax(120px,180px) repeat(${compare.max}, minmax(180px,1fr))` }

  return (
    <>
      <Seo title="Bandingkan Produk" />
      <PageHeader
        title="Bandingkan Produk"
        subtitle={`Bandingkan spesifikasi hingga ${compare.max} produk sekaligus.`}
      />
      <div className="container-page py-10">
        {!slugs.length ? (
          <EmptyState title="Belum ada produk dipilih">
            Tekan ikon bandingkan pada kartu produk di{' '}
            <Link to="/katalog" className="text-brand-700 font-semibold underline">
              katalog
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid border-b border-slate-100" style={cols}>
                <div className="p-4 text-sm text-slate-500">
                  {slugs.length > 1 && (
                    <button type="button" onClick={compare.clear} className="hover:text-brand-700 underline">
                      Hapus semua
                    </button>
                  )}
                </div>
                {Array.from({ length: compare.max }, (_, i) => {
                  const p = list[i]
                  if (!p)
                    return (
                      <Link
                        key={i}
                        to="/katalog"
                        className="hover:border-brand-300 hover:text-brand-700 m-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-500"
                      >
                        <Plus className="size-5" /> Tambah produk
                      </Link>
                    )
                  return (
                    <div key={p.slug} className="relative p-4 text-center">
                      <button
                        type="button"
                        onClick={() => compare.remove(p.slug)}
                        className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        aria-label={`Hapus ${p.name}`}
                      >
                        <X className="size-4" />
                      </button>
                      <Link to={`/product/${p.slug}`} className="group">
                        <Img img={p.image} alt={p.name} className="mx-auto size-32 object-contain" />
                        <p className="group-hover:text-brand-700 mt-3 text-sm font-semibold text-slate-900">{p.name}</p>
                      </Link>
                      <p className="text-brand-700 mt-1 font-bold">{formatPrice(p.price)}</p>
                    </div>
                  )
                })}
              </div>
              {rows.map((r) =>
                r.group ? (
                  <div
                    key={r.group}
                    className="bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase"
                  >
                    {r.group}
                  </div>
                ) : (
                  <div key={r.key} className="grid border-b border-slate-100 text-sm" style={cols}>
                    <div className="p-4 text-slate-500">{r.label}</div>
                    {Array.from({ length: compare.max }, (_, i) => (
                      <div key={i} className="p-4 font-medium break-words text-slate-800">
                        {r.values[i] ?? (list[i] ? '—' : '')}
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Union of every spec row across the selected products, grouped like the product pages.
function buildRows(list) {
  const groups = new Map()
  list.forEach((p, i) => {
    for (const g of p.specs) {
      if (!groups.has(g.group)) groups.set(g.group, new Map())
      const rows = groups.get(g.group)
      for (const r of g.rows) {
        if (!rows.has(r.label)) rows.set(r.label, [])
        rows.get(r.label)[i] = r.value
      }
    }
  })
  const out = []
  for (const [group, rows] of groups) {
    out.push({ group })
    for (const [label, values] of rows) out.push({ key: `${group}/${label}`, label, values })
  }
  return out
}
