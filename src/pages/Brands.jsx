import { Link } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'

export default function Brands() {
  const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <Seo
        title="Semua Brand"
        description="Belanja HP dari brand favoritmu: Samsung, Apple, Oppo, Vivo, Xiaomi, dan lainnya."
      />
      <PageHeader title="Semua Brand" subtitle="Pilih brand favoritmu dan temukan seri terbarunya." />
      <div className="container-page py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {sorted.map((b) => (
            <Link
              key={b.slug}
              to={`/brand/${b.slug}`}
              className="group card flex flex-col items-center p-5 text-center transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex h-16 w-full items-center justify-center">
                {site.brandLogos[b.slug] ? (
                  <Img img={site.brandLogos[b.slug]} alt={b.name} className="max-h-full w-auto object-contain" />
                ) : (
                  <span className="text-2xl font-extrabold tracking-tight text-slate-800">{b.name}</span>
                )}
              </div>
              <p className="group-hover:text-brand-700 mt-3 font-semibold text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-500">{b.total} produk</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
