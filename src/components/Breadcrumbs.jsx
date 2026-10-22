import { Link } from 'react-router-dom'

// Items with `to` are links; the last item without one is the current page. That item stays on one
// line and truncates, because the page's <h1> right below repeats it in full — a long product or
// article title must not wrap onto its own row. (An error page can end on a link back to its list.)
//   onDark  light text for use on the navy bands
export default function Breadcrumbs({ items, onDark = false }) {
  const all = [{ to: '/', label: 'Beranda' }, ...items.filter(Boolean)]
  return (
    <nav aria-label="Jejak navigasi" className={`${onDark ? 'text-white/70' : 'text-muted'} mb-2 text-xs`}>
      <ol className="flex items-center gap-1.5">
        {all.map((it, i) => {
          const last = i === all.length - 1
          return (
            <li key={`${i}-${it.label}`} className={`flex items-center gap-1.5 ${last ? 'min-w-0' : 'shrink-0'}`}>
              {i > 0 && (
                <span aria-hidden className={onDark ? 'text-white/40' : 'text-slate-400'}>
                  /
                </span>
              )}
              {it.to ? (
                <Link
                  to={it.to}
                  className={`${onDark ? 'hover:text-white' : 'hover:text-brand-700'} -my-2 block py-2 hover:underline pointer-coarse:-my-3 pointer-coarse:py-3 ${last ? 'min-w-0 truncate' : ''}`}
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  title={last ? it.label : undefined}
                  className={last ? `${onDark ? 'text-white' : 'text-ink'} truncate font-semibold` : undefined}
                >
                  {it.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
