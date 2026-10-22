import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { useModels, usePosts } from '../lib/data'
import { formatDate, productKind, readableTitle } from '../lib/format'
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_URL } from '../lib/seo'
import { waLink } from '../lib/wa'
import ProductCard, { CardSkeleton, GridSkeleton, ProductGrid, RAIL_SIZES } from '../components/ProductCard'
import Rail, { RailSkeleton } from '../components/Rail'
import SectionHeader from '../components/SectionHeader'
import ErrorState from '../components/ErrorState'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { GoogleIcon, WhatsAppIcon } from '../components/icons'

// Sections only pad their top, so the gap between any two of them is the same.
// Every section is a white band; the 8px canvas gap between bands does the separating.
const SECTION = 'band mt-2 py-4 sm:py-6'
const ratingScore = site.rating.score.toLocaleString('id-ID')
const ratingCount = site.rating.count.toLocaleString('id-ID')

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: site.name,
    url: `${SITE_URL}/`,
    // site.logo is white-on-transparent (invisible on Google's white UI); the app icon is on brand blue
    logo: absoluteUrl('/img/site/icon-512.png'),
    description: DEFAULT_DESCRIPTION,
    foundingDate: String(site.since),
    sameAs: site.socials.map((s) => s.url),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: `+${site.whatsapp}`,
      contactType: 'customer service',
      areaServed: 'ID',
      availableLanguage: 'id',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: `${SITE_URL}/`,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/katalog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
]

// Keeps the order of `list` but lets price-less ("Hubungi kami") models take at most one slot in
// three, so every screenful of cards still shows prices.
function preferPriced(list, size) {
  const rank = new Map(list.map((m, i) => [m, i]))
  const priced = list.filter((m) => m.minPrice)
  const unpriced = list.filter((m) => !m.minPrice)
  const out = []
  let unpricedCount = 0
  while (out.length < size && (priced.length || unpriced.length)) {
    const allowed = unpricedCount < Math.ceil((out.length + 1) / 3)
    const takeUnpriced = !priced.length || (allowed && unpriced.length && rank.get(unpriced[0]) < rank.get(priced[0]))
    if (takeUnpriced) unpricedCount++
    out.push(takeUnpriced ? unpriced.shift() : priced.shift())
  }
  return out
}

const DEVICES = new Set(['phone', 'tablet'])
const newestFirst = (a, b) => (b.date ?? '').localeCompare(a.date ?? '')

// Newest models, handsets and tablets first: a new case or watch is not what "Produk Terbaru"
// promises, so accessories only fill in when there are not enough phones.
function pickLatest(models, size = 12) {
  const byDate = [...models].sort(newestFirst)
  const isDevice = (m) => DEVICES.has(productKind(m.name))
  return preferPriced([...byDate.filter(isDevice), ...byDate.filter((m) => !isDevice(m))], size)
}

// The admin's picks are variant slugs (often several capacities of one phone): one card per model.
function pickFeatured(modelOf, redirectOf, size) {
  const seen = new Set()
  const list = []
  for (const slug of site.featured) {
    const m = modelOf(slug) ?? modelOf(redirectOf(slug))
    if (m && !seen.has(m.key)) {
      seen.add(m.key)
      list.push(m)
    }
  }
  return preferPriced(list, size)
}

// Twelve cards fill 2, 3 and 4 columns evenly; the 5-column layout drops the last two.
const FEATURED_COUNT = 12
const FEATURED_GRID = 'xl:[&>*:nth-child(n+11)]:hidden'

// The retry button unmounts together with the error message. Park focus on the section heading
// first so keyboard and screen-reader users are not dropped back to the top of the page.
function useRetryFocus(retry) {
  const ref = useRef(null)
  const onRetry = () => {
    const heading = ref.current?.querySelector('h2')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    retry()
  }
  return [ref, onRetry]
}

export default function Home() {
  const { data: models, error, retry, modelOf, redirectOf } = useModels()
  const [latestRef, retryLatest] = useRetryFocus(retry)
  const latest = useMemo(() => (models ? pickLatest(models) : []), [models])
  // modelOf/redirectOf are new functions every render but only change meaning with the models
  const featured = useMemo(() => (models ? pickFeatured(modelOf, redirectOf, FEATURED_COUNT) : []), [models])

  // Most visits continue to a product page, so fetch its code while the browser is idle.
  useEffect(() => {
    const warm = () => import('./ProductDetail')
    if (!window.requestIdleCallback) {
      const timer = setTimeout(warm, 3000)
      return () => clearTimeout(timer)
    }
    const handle = requestIdleCallback(warm, { timeout: 5000 })
    return () => cancelIdleCallback(handle)
  }, [])

  return (
    <>
      <Seo jsonLd={jsonLd} />
      <h1 className="sr-only">Complete Selular — toko HP, tablet &amp; aksesoris resmi</h1>
      <Hero />

      <section ref={latestRef} className={`${SECTION} [&_h2:focus]:outline-none`}>
        <div className="container-page">
          <SectionHeader title="Produk Terbaru" to="/katalog" />
          {error && !models ? (
            <ErrorState onRetry={retryLatest} title="Gagal memuat produk" as="h3" />
          ) : models ? (
            <Rail>
              {latest.map((m) => (
                <ProductCard key={m.key} p={m} showNewBadge={false} sizes={RAIL_SIZES} />
              ))}
            </Rail>
          ) : (
            <RailSkeleton label="Memuat produk terbaru…">
              <CardSkeleton />
            </RailSkeleton>
          )}
        </div>
      </section>

      <BrandStrip />
      <PromoRail />

      {!error && (!models || featured.length > 0) && (
        <section className={SECTION}>
          <div className="container-page">
            <SectionHeader title="Khusus Buatmu" to="/katalog" />
            {models ? (
              <ProductGrid products={featured} className={FEATURED_GRID} />
            ) : (
              <GridSkeleton count={FEATURED_COUNT} className={FEATURED_GRID} label="Memuat produk pilihan…" />
            )}
          </div>
        </section>
      )}

      <PaymentStrip />
      <LatestArticles />
      <HelpStrip />
    </>
  )
}

// Every numeric key of a site.hero entry is one width of the same banner ({ src, w, h }).
function bannerImage(banner) {
  const files = Object.keys(banner ?? {})
    .filter((k) => /^\d+$/.test(k) && banner[k]?.src)
    .map((k) => banner[k])
    .sort((a, b) => a.w - b.w)
  if (!files.length) return null
  return { ...files[0], srcset: files.length > 1 ? files.map((f) => `${f.src} ${f.w}w`).join(', ') : undefined }
}

// The banner spans the page container: the viewport minus its side padding, at most 1152px.
// scripts/prerender.mjs preloads the same files and has to use this exact string.
const HERO_SIZES = '(min-width: 1200px) 1152px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)'

// Marketplace home pattern: the promo banner leads and nothing competes with it.
function Hero() {
  const banner = site.hero[0]
  const img = bannerImage(banner)
  if (!img) return null
  return (
    <section className="band">
      <div className="container-page py-3 sm:py-5">
        <Link to="/promo" className="block overflow-hidden rounded-lg">
          <Img
            img={img}
            sizes={HERO_SIZES}
            priority
            alt={banner.alt || 'OMG! Oktober makin gede promonya, diskon setiap harinya. Promo dan stok terbatas.'}
            className="aspect-[2560/871] w-full object-cover"
          />
          <span className="sr-only">Lihat semua promo</span>
        </Link>
      </div>
    </section>
  )
}

function BrandStrip() {
  const withLogo = brands
    .filter((b) => site.brandLogos[b.slug])
    .sort((a, b) => b.total - a.total)
    .slice(0, 16)
  return (
    <section className={SECTION}>
      <div className="container-page">
        <SectionHeader title="Belanja per Brand" to="/semua-brand" />
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {withLogo.map((b) => (
            <li key={b.slug}>
              <Link
                to={`/brand/${b.slug}`}
                className="border-line hover:border-brand-300 flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg border bg-white transition-colors"
              >
                {/* The logo files carry ~25% whitespace on every side; scale it away so the marks read */}
                <Img img={site.brandLogos[b.slug]} alt={b.name} className="size-full scale-125 object-contain" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// The store's promo posters (portrait) as a rail, like Eraspace's member-special cards
function PromoRail() {
  const items = site.promos?.items ?? []
  if (!items.length) return null
  return (
    <section className={SECTION}>
      <div className="container-page">
        <SectionHeader title="Promo Spesial" to="/promo" />
        <Rail itemClass="w-[38%] sm:w-[24%] lg:w-[16%]">
          {items.map((it, i) => (
            <Link
              key={it.thumb.src}
              to="/promo"
              className="border-line block overflow-hidden rounded-lg border bg-white"
              aria-label={`Lihat ${it.title ?? `promo ${i + 1}`}`}
            >
              <Img
                img={it.thumb}
                alt=""
                sizes="(min-width: 1024px) 180px, (min-width: 640px) 24vw, 38vw"
                className="aspect-[2/3] w-full object-cover"
              />
            </Link>
          ))}
        </Rail>
      </div>
    </section>
  )
}

// Ways to pay plus the Google rating: the reassurance a first-time buyer looks for, stated plainly
function PaymentStrip() {
  return (
    <section className={SECTION}>
      <div className="container-page grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-ink text-base font-extrabold sm:text-lg">Cicilan &amp; pembayaran</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {site.payments.map((p) => (
              <li
                key={p.name}
                className="border-line flex h-10 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white p-1.5"
              >
                <Img img={p.img} alt={p.name} className="size-full object-contain" />
              </li>
            ))}
          </ul>
        </div>
        <p className="border-line text-ink flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
          <GoogleIcon className="size-6" />
          <span className="flex text-amber-400" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </span>
          <span>
            <b>{ratingScore}</b> dari {ratingCount} ulasan Google
          </span>
        </p>
      </div>
    </section>
  )
}

function LatestArticles() {
  const { data, error, retry } = usePosts()
  const [ref, onRetry] = useRetryFocus(retry)
  if (data && !data.length) return null
  // Four cards: the fourth fills the 2×2 grid on tablets and is dropped again in the 3-column row.
  const slot = (i) => (i === 3 ? 'hidden sm:block lg:hidden' : undefined)
  return (
    <section ref={ref} className={`${SECTION} [&_h2:focus]:outline-none`}>
      <div className="container-page">
        <SectionHeader title="Artikel & Review" to="/artikel-review" />
        {error ? (
          <ErrorState onRetry={onRetry} title="Gagal memuat artikel" as="h3" />
        ) : data ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.slice(0, 4).map((a, i) => (
              <li key={a.slug} className={slot(i)}>
                <Link to={`/artikel/${a.slug}`} className="group card block h-full overflow-hidden">
                  <Img
                    img={a.cover}
                    alt=""
                    sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
                    // Covers are mostly square posters with text on them: show them whole, never cropped
                    className="aspect-[4/3] w-full bg-slate-100 object-contain"
                  />
                  <div className="p-3">
                    <p className="text-muted text-xs">
                      <time dateTime={a.date}>{formatDate(a.date)}</time>
                    </p>
                    <h3 className="group-hover:text-brand-700 text-ink mt-1 line-clamp-3 text-sm font-bold">
                      {readableTitle(a.title)}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Memuat artikel…</span>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} aria-hidden className={`card overflow-hidden ${slot(i) ?? ''}`}>
                <div className="skeleton aspect-[4/3]" />
                {/* Same line boxes as the real card: 16px date, then 24px title lines */}
                <div className="p-3">
                  <div className="skeleton my-0.5 h-3 w-24 rounded" />
                  <div className="skeleton mt-2 h-4 w-full rounded" />
                  <div className="skeleton mt-2 mb-1 h-4 w-full rounded sm:mb-0 xl:mb-1" />
                  <div className="skeleton mt-2 mb-1 hidden h-4 w-1/2 rounded sm:block xl:hidden" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// One plain line of help instead of a promotional card
function HelpStrip() {
  return (
    <section className={`${SECTION} mb-2`}>
      <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink text-sm">
          <b>Bingung pilih HP?</b> Tanya admin soal stok, cicilan dan promo — gratis.
        </p>
        <a href={waLink()} target="_blank" rel="noopener" className="btn-wa self-start sm:self-auto">
          <WhatsAppIcon className="size-4" /> Chat via WhatsApp
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      </div>
    </section>
  )
}
