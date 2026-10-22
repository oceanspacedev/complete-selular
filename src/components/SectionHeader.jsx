import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
export default function SectionHeader({ eyebrow, title, to, linkLabel = 'Lihat semua', children }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-brand-600 mb-1 text-xs font-semibold tracking-wider uppercase">{eyebrow}</p>}
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      {children}
      {to && (
        <Link
          to={to}
          className="group text-brand-700 hover:text-brand-800 inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
