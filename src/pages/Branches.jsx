import { useMemo, useState } from 'react'
import { MapPin, Navigation, Search } from 'lucide-react'
import branches from '../data/branches.json'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Seo from '../components/Seo'

export default function Branches() {
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const cities = useMemo(() => {
    const counts = {}
    for (const b of branches) counts[b.city] = (counts[b.city] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [])
  const needle = q.toLowerCase().trim()
  const list = branches.filter(
    (b) => (!city || b.city === city) && (!needle || `${b.name} ${b.address}`.toLowerCase().includes(needle)),
  )

  return (
    <>
      <Seo
        title="Toko Cabang"
        description="Daftar lengkap toko cabang Complete Selular beserta alamat dan lokasi Google Maps."
      />
      <PageHeader
        title="Toko Cabang"
        subtitle="Temukan cabang Complete Selular terdekat dan kunjungi langsung tokonya."
      >
        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama toko, jalan, atau kota…"
            aria-label="Cari cabang"
            className="focus:ring-brand-500 h-12 w-full rounded-full bg-slate-100 pr-4 pl-11 outline-none focus:bg-white focus:ring-2"
          />
        </div>
      </PageHeader>

      <div className="container-page py-8">
        <div className="-mx-4 mb-6 flex scrollbar-none gap-2 overflow-x-auto px-4">
          {[['', branches.length], ...cities].map(([c, n]) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => setCity(c)}
              aria-pressed={city === c}
              className={
                city === c
                  ? 'chip bg-brand-600 ring-brand-600 shrink-0 text-white'
                  : 'chip hover:text-brand-700 shrink-0 bg-white text-slate-600 ring-slate-200'
              }
            >
              {c || 'Semua'} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>

        {list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <article key={b.name + b.address} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="bg-brand-50 text-brand-600 grid size-10 shrink-0 place-items-center rounded-xl">
                    <MapPin className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{titleCase(b.name)}</h2>
                    <p className="text-brand-600 text-xs font-medium">{b.city}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{b.address}</p>
                {b.maps && (
                  <a href={b.maps} target="_blank" rel="noopener" className="btn-ghost mt-4 self-start !py-2">
                    <Navigation className="size-4" /> Petunjuk arah
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Cabang tidak ditemukan">Coba kata kunci lain.</EmptyState>
        )}
      </div>
    </>
  )
}

const KEEP_UPPER = new Set(['HPMART', 'OPPO', 'CS', 'II', 'III'])
const titleCase = (s) =>
  s
    .split(' ')
    .map((w) => (KEEP_UPPER.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ')
