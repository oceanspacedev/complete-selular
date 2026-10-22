import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-brand-700">
            Beranda
          </Link>
        </li>
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-slate-300" />
            {it.to ? (
              <Link to={it.to} className="hover:text-brand-700">
                {it.label}
              </Link>
            ) : (
              <span className="line-clamp-1 text-slate-700">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
