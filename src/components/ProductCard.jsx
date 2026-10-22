import { Link } from 'react-router-dom'
import { Check, GitCompareArrows } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { prefetchProduct } from '../lib/data'
import { compare, useCompare } from '../lib/compare'
import Img from './Img'
const NEW_DAYS = 45
export default function ProductCard({ p, priority }) {
  const selected = useCompare().includes(p.slug)
  const isNew = Date.now() - new Date(p.date).getTime() < NEW_DAYS * 864e5
  return (
    <article className="group card relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <Link
        to={`/product/${p.slug}`}
        onMouseEnter={() => prefetchProduct(p.slug)}
        onFocus={() => prefetchProduct(p.slug)}
        className="flex flex-1 flex-col after:absolute after:inset-0"
      >
        <div className="relative aspect-square bg-gradient-to-b from-slate-50 to-white p-5">
          <Img
            img={p.image}
            alt={p.name}
            priority={priority}
            className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {isNew && (
            <span className="bg-accent-500 absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white">
              Baru
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4 pt-3">
          {p.brandName && (
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{p.brandName}</p>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-slate-900">{p.name}</h3>
          {p.highlights.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.highlights.slice(0, 2).map((h) => (
                <span key={h} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {h.replace(/\s*NVMe/i, '')}
                </span>
              ))}
            </div>
          )}
          <p className={`mt-auto pt-3 font-bold ${p.price ? 'text-brand-700' : 'text-sm text-slate-500'}`}>
            {formatPrice(p.price)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => compare.toggle(p.slug)}
        aria-pressed={selected}
        aria-label={selected ? `Hapus ${p.name} dari perbandingan` : `Bandingkan ${p.name}`}
        title="Bandingkan"
        className={`absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full ring-1 transition ${
          selected
            ? 'bg-brand-600 ring-brand-600 text-white'
            : 'hover:text-brand-700 bg-white/90 text-slate-500 opacity-100 ring-slate-200 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        }`}
      >
        {selected ? <Check className="size-4" /> : <GitCompareArrows className="size-4" />}
      </button>
    </article>
  )
}
export function ProductGrid({ products, priorityCount = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => (
        <ProductCard key={p.slug} p={p} priority={i < priorityCount} />
      ))}
    </div>
  )
}
export function GridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton aspect-[3/4.4] rounded-[var(--radius-card)]" />
      ))}
    </div>
  )
}
