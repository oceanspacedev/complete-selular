import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { useModels } from '../lib/data'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

const byName = [...brands].sort((a, b) => a.name.localeCompare(b.name))

export default function Brands() {
  const { data: models } = useModels()

  // Counted from the listings actually loaded, so the number matches the cards on the brand page
  const counts = useMemo(() => {
    if (!models) return null
    const n = {}
    for (const m of models) n[m.brand] = (n[m.brand] ?? 0) + 1
    return n
  }, [models])

  // Brands with nothing to show are left out
  const listed = byName.filter((b) => (counts ? counts[b.slug] > 0 : b.count !== 0))

  return (
    <>
      <Seo
        title="Semua Brand"
        description="Belanja HP dari brand favoritmu: Samsung, Apple, Oppo, Vivo, Xiaomi, dan lainnya."
      />
      <PageHeader title="Semua Brand" />
      <div className="container-page py-3 sm:py-4">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {listed.map((b) => {
            const logo = site.brandLogos[b.slug]
            return (
              <li key={b.slug}>
                <Link
                  to={`/brand/${b.slug}`}
                  className="group border-line hover:border-brand-300 flex h-full flex-col overflow-hidden rounded-lg border bg-white text-center transition-colors"
                >
                  {/* The visible name below already labels the link, so the logo stays silent */}
                  <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden" aria-hidden>
                    {logo ? (
                      // The logo files carry ~25% whitespace on every side; scale it away so the marks read
                      <Img img={logo} alt="" className="size-full scale-125 object-contain" />
                    ) : (
                      <span className="text-muted text-base font-extrabold">{b.name}</span>
                    )}
                  </div>
                  <div className="border-line border-t px-2 py-2">
                    <p className="group-hover:text-brand-700 text-ink truncate text-[13px] font-bold">{b.name}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
