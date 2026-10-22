import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, Check, Cpu, GitCompareArrows, HardDrive, MemoryStick, MonitorSmartphone, Settings } from 'lucide-react'
import site from '../data/site.json'
import { useProduct, useProducts } from '../lib/data'
import { formatPrice } from '../lib/format'
import { waProduct } from '../lib/wa'
import { compare, useCompare } from '../lib/compare'
import Breadcrumbs from '../components/Breadcrumbs'
import Img from '../components/Img'
import Seo from '../components/Seo'
import Rail from '../components/Rail'
import ProductCard from '../components/ProductCard'
import SectionHeader from '../components/SectionHeader'
import PageLoader from '../components/PageLoader'
import NotFound from './NotFound'
import { WhatsAppIcon } from '../components/icons'

const FEATURE_ICONS = {
  CPU: Cpu,
  RAM: MemoryStick,
  Storage: HardDrive,
  Display: MonitorSmartphone,
  Camera,
  OS: Settings,
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { data: p, error } = useProduct(slug)
  if (error) return <NotFound />
  if (!p) return <PageLoader />
  return <ProductView key={slug} p={p} />
}

function ProductView({ p }) {
  const [active, setActive] = useState(0)
  const inCompare = useCompare().includes(p.slug)
  const price = formatPrice(p.price)
  const summary = p.features.map((f) => `${f.label} ${f.value}`).join(', ')

  return (
    <>
      <Seo
        title={`${p.name} — Harga & Spesifikasi`}
        description={`Harga ${p.name} ${p.price ? price : ''} di Complete Selular. ${summary}`.slice(0, 160)}
        image={p.gallery[0]?.src}
      />
      <div className="bg-white">
        <div className="container-page py-6 sm:py-10">
          <Breadcrumbs
            items={[
              { to: '/katalog', label: 'Katalog' },
              p.brand && { to: `/brand/${p.brand}`, label: p.brandName },
              { label: p.name },
            ].filter(Boolean)}
          />

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
            {/* Gallery */}
            <div>
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/60 p-8 sm:p-12">
                <Img img={p.gallery[active]} priority alt={p.name} className="size-full object-contain" />
              </div>
              {p.gallery.length > 1 && (
                <div className="mt-3 flex scrollbar-none gap-2 overflow-x-auto">
                  {p.gallery.map((g, i) => (
                    <button
                      key={g.src}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`Gambar ${i + 1}`}
                      aria-current={i === active}
                      className={`size-20 shrink-0 rounded-2xl bg-slate-50 p-2 ring-2 transition ${
                        i === active ? 'ring-brand-500' : 'ring-transparent hover:ring-slate-200'
                      }`}
                    >
                      <Img img={g} alt="" className="size-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              {p.brandName && (
                <Link
                  to={`/brand/${p.brand}`}
                  className="text-brand-600 hover:text-brand-800 text-sm font-semibold tracking-wider uppercase"
                >
                  {p.brandName}
                </Link>
              )}
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{p.name}</h1>
              {p.categoryName && <p className="mt-1 text-sm text-slate-500">{p.categoryName}</p>}

              <p className={`mt-5 font-extrabold ${p.price ? 'text-brand-700 text-3xl' : 'text-xl text-slate-500'}`}>
                {price}
              </p>
              <p className="mt-1 text-sm text-slate-500">Harga dapat berubah sewaktu-waktu. Cek stok via WhatsApp.</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={waProduct(p.name, p.price ? price : undefined)}
                  target="_blank"
                  rel="noopener"
                  className="btn-wa flex-1 !py-3.5 sm:flex-none sm:!px-8"
                >
                  <WhatsAppIcon className="size-5" /> Beli via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => compare.toggle(p.slug)}
                  aria-pressed={inCompare}
                  className={`btn !py-3.5 ring-1 ${
                    inCompare
                      ? 'bg-brand-50 text-brand-700 ring-brand-200'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {inCompare ? <Check className="size-4" /> : <GitCompareArrows className="size-4" />}
                  {inCompare ? 'Ditambahkan' : 'Bandingkan'}
                </button>
              </div>

              {p.features.length > 0 && (
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {p.features.map((f) => {
                    const Icon = FEATURE_ICONS[f.label] ?? Settings
                    return (
                      <li key={f.label} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5">
                        <span className="text-brand-600 grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                          <Icon className="size-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">{f.label}</p>
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900" title={f.value}>
                            {f.value}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-8">
                <p className="mb-3 text-sm font-semibold text-slate-900">Juga tersedia di marketplace resmi</p>
                <div className="flex flex-wrap gap-2">
                  {site.marketplaces.map((m) => (
                    <a
                      key={m.name}
                      href={m.url}
                      target="_blank"
                      rel="noopener"
                      className="hover:ring-brand-300 flex h-11 items-center rounded-xl bg-white px-3 ring-1 ring-slate-200 transition"
                      aria-label={m.name}
                    >
                      {m.img ? <Img img={m.img} alt={m.name} className="h-6 w-auto max-w-24 object-contain" /> : m.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {p.specs.length > 0 && (
        <section className="container-page py-10 sm:py-14">
          <SectionHeader title="Spesifikasi Lengkap" />
          <div className="grid gap-4 md:grid-cols-2">
            {p.specs.map((g) => (
              <div key={g.group} className="card overflow-hidden">
                <h3 className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-sm font-semibold text-slate-900">
                  {g.group}
                </h3>
                <dl className="divide-y divide-slate-100">
                  {g.rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-[40%_1fr] gap-4 px-5 py-2.5 text-sm">
                      <dt className="text-slate-500">{r.label}</dt>
                      <dd className="font-medium break-words text-slate-800">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      <Related p={p} />
    </>
  )
}

function Related({ p }) {
  const { data } = useProducts()
  const related = data?.filter((x) => x.brand === p.brand && x.slug !== p.slug).slice(0, 10) ?? []
  if (!related.length) return null
  return (
    <section className="container-page pb-14">
      <SectionHeader title={`Lainnya dari ${p.brandName}`} to={`/brand/${p.brand}`} />
      <Rail>
        {related.map((x) => (
          <ProductCard key={x.slug} p={x} />
        ))}
      </Rail>
    </section>
  )
}
