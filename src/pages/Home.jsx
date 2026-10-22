import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CreditCard, MapPin, ShieldCheck, Star, Truck } from 'lucide-react'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { usePosts, useProducts } from '../lib/data'
import { formatDate } from '../lib/format'
import { waLink } from '../lib/wa'
import ProductCard, { GridSkeleton, ProductGrid } from '../components/ProductCard'
import Rail from '../components/Rail'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { GoogleIcon, WhatsAppIcon } from '../components/icons'

export default function Home() {
  const { data: products } = useProducts()
  const latest = products?.slice(0, 12) ?? []
  const featured = products
    ? site.featured.map((slug) => products.find((p) => p.slug === slug)).filter((p) => p && p.price)
    : []

  return (
    <>
      <Seo />
      <Hero />
      <Perks />

      <section className="container-page py-10 sm:py-14">
        <SectionHeader eyebrow="Baru masuk" title="Produk Terbaru" to="/katalog" />
        {products ? (
          <Rail>
            {latest.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </Rail>
        ) : (
          <GridSkeleton count={5} />
        )}
      </section>

      <BrandStrip />

      {featured.length > 0 && (
        <section className="container-page py-10 sm:py-14">
          <SectionHeader eyebrow="Pilihan admin" title="Khusus Buatmu" to="/katalog" />
          <ProductGrid products={featured.slice(0, 10)} />
        </section>
      )}

      <TrustBand />
      <LatestArticles />
      <CtaBand />
    </>
  )
}

function Hero() {
  const banner = site.hero[0]
  return (
    <section className="bg-white">
      <div className="container-page grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
        <div className="order-2 lg:order-1">
          <span className="bg-brand-50 text-brand-700 ring-brand-100 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1">
            <BadgeCheck className="size-3.5" /> Resmi & bergaransi · sejak {site.since}
          </span>
          <h1 className="mt-4 text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Gadget impian,
            <br />
            <span className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-transparent">
              harga paling pas.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            Smartphone, tablet &amp; aksesoris original dari brand ternama. Cicilan mudah, tersedia di{' '}
            {site.branchCount} cabang.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/katalog" className="btn-primary !px-6 !py-3">
              Lihat Katalog <ArrowRight className="size-4" />
            </Link>
            <Link to="/daftar-toko-cabang" className="btn-ghost !px-6 !py-3">
              <MapPin className="size-4" /> Cari Cabang
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-600">
            <GoogleIcon className="size-5" />
            <span className="flex text-amber-400">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            <span>
              <b className="text-slate-900">{site.rating.score}</b> dari {site.rating.count.toLocaleString('id-ID')}{' '}
              ulasan
            </span>
          </div>
        </div>
        {banner && (
          <div className="order-1 lg:order-2">
            <picture>
              <source media="(min-width: 768px)" srcSet={banner[1600].src} />
              <Img
                img={banner[768]}
                priority
                alt="Promo Complete Selular"
                className="shadow-brand-900/10 ring-brand-900/5 aspect-[2560/871] w-full rounded-3xl object-cover shadow-2xl ring-1"
              />
            </picture>
          </div>
        )}
      </div>
    </section>
  )
}

function Perks() {
  const perks = [
    { icon: ShieldCheck, title: 'Garansi Resmi', text: 'Produk original 100%' },
    { icon: CreditCard, title: 'Cicilan Mudah', text: 'Kredivo, Akulaku, Home Credit' },
    { icon: MapPin, title: `${site.branchCount} Cabang`, text: 'Dekat dengan kamu' },
    { icon: Truck, title: 'Belanja Online', text: 'Shopee, Tokopedia & lainnya' },
  ]
  return (
    <section className="border-y border-slate-200/70 bg-white">
      <div className="container-page grid grid-cols-2 gap-4 py-5 lg:grid-cols-4">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="bg-brand-50 text-brand-600 grid size-10 shrink-0 place-items-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="truncate text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BrandStrip() {
  const withLogo = brands.filter((b) => site.brandLogos[b.slug]).sort((a, b) => b.total - a.total)
  return (
    <section className="border-y border-slate-200/70 bg-white py-10 sm:py-14">
      <div className="container-page">
        <SectionHeader eyebrow="Brand pilihan" title="Belanja per Brand" to="/semua-brand" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {withLogo.slice(0, 16).map((b) => (
            <Link
              key={b.slug}
              to={`/brand/${b.slug}`}
              className="group hover:border-brand-200 flex aspect-[3/2] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 transition hover:shadow-[var(--shadow-card)]"
              aria-label={b.name}
            >
              <Img
                img={site.brandLogos[b.slug]}
                alt={b.name}
                className="max-h-full w-auto object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustBand() {
  return (
    <section className="container-page py-10 sm:py-14">
      <div className="from-brand-700 to-brand-900 relative overflow-hidden rounded-[2rem] bg-gradient-to-br px-6 py-10 text-white sm:px-12 sm:py-14">
        <div className="bg-brand-400/30 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dipercaya ribuan pelanggan</h2>
            <p className="text-brand-100 mt-2 max-w-xl">
              Pelayanan ramah, produk original, dan harga kompetitif — itulah kenapa pelanggan terus kembali ke Complete
              Selular.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 text-center sm:gap-10">
            {[
              [site.rating.score.toString().replace('.', ','), 'Rating Google'],
              [site.rating.count.toLocaleString('id-ID'), 'Ulasan'],
              [site.branchCount, 'Cabang'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-brand-200 order-2 text-xs sm:text-sm">{l}</dt>
                <dd className="text-3xl font-extrabold sm:text-4xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mt-8 border-t border-white/15 pt-6">
          <p className="text-brand-200 mb-3 text-xs font-semibold tracking-wider uppercase">Cicilan & pembayaran</p>
          <div className="flex flex-wrap gap-2">
            {site.payments.map((p) => (
              <span key={p.name} className="rounded-lg bg-white px-3 py-1.5">
                <Img img={p.img} alt={p.name} className="h-6 w-auto" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LatestArticles() {
  const { data } = usePosts()
  if (!data?.length) return null
  return (
    <section className="container-page pb-10 sm:pb-14">
      <SectionHeader eyebrow="Seputar gadget" title="Artikel & Review" to="/artikel-review" />
      <div className="grid gap-4 md:grid-cols-3">
        {data.slice(0, 3).map((a) => (
          <Link key={a.slug} to={`/artikel/${a.slug}`} className="group card overflow-hidden">
            <Img
              img={a.cover}
              alt=""
              className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="p-5">
              <p className="text-xs text-slate-500">{formatDate(a.date)}</p>
              <h3 className="group-hover:text-brand-700 mt-1 line-clamp-2 font-semibold text-slate-900">{a.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section className="container-page pb-14">
      <div className="card flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bingung pilih HP?</h2>
          <p className="mt-1 text-slate-600">
            Tanya admin kami lewat WhatsApp — gratis konsultasi, info stok & promo terbaru.
          </p>
        </div>
        <a href={waLink()} target="_blank" rel="noopener" className="btn-wa shrink-0 !px-6 !py-3">
          <WhatsAppIcon className="size-5" /> Chat via WhatsApp
        </a>
      </div>
    </section>
  )
}
