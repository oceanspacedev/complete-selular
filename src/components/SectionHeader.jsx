import { Link } from 'react-router-dom'

// Marketplace section heading: bold title left, plain "Lihat Semua" link right, no decoration.
// `eyebrow` is accepted for old callers but no longer shown.
export default function SectionHeader({ title, to, linkLabel = 'Lihat Semua', children }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
      <h2 className="text-ink min-w-0 text-base font-extrabold sm:text-xl">{title}</h2>
      {children}
      {to && (
        <Link
          to={to}
          className="text-brand-600 hover:text-brand-700 inline-flex shrink-0 items-center rounded text-sm font-bold pointer-coarse:-my-3 pointer-coarse:min-h-11"
        >
          {linkLabel}
          {/* Several "Lihat Semua" links share a page; name the section for screen readers */}
          {typeof title === 'string' && <span className="sr-only"> {title}</span>}
        </Link>
      )}
    </div>
  )
}
