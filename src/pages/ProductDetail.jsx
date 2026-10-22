import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import site from '../data/site.json'
import { useModels, useProduct } from '../lib/data'
import { formatPrice, productFeatures, productKind, specGroups } from '../lib/format'
import { displayName } from '../lib/variants'
import { waProduct } from '../lib/wa'
import { compare, useCompare } from '../lib/compare'
import { absoluteUrl, clampText, productTitle } from '../lib/seo'
import Breadcrumbs from '../components/Breadcrumbs'
import Img from '../components/Img'
import Seo from '../components/Seo'
import Rail from '../components/Rail'
import ProductCard, { RAIL_SIZES } from '../components/ProductCard'
import SectionHeader from '../components/SectionHeader'
import PageLoader from '../components/PageLoader'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { WhatsAppIcon } from '../components/icons'

export default function ProductDetail() {
  const { slug } = useParams()
  const { data: p, error, retry } = useProduct(slug)

  // "Coba lagi" unmounts itself; once the retry settles (product shown or a new error), focus the heading
  // that replaced it
  const retried = useRef(false)
  const settled = !!p || !!error
  useEffect(() => {
    if (!retried.current || !settled) return
    retried.current = false
    const h1 = document.querySelector('main h1')
    if (!h1) return
    h1.tabIndex = -1
    h1.focus()
  }, [settled, error])

  if (error?.notFound) return <ProductNotFound slug={slug} />
  if (error)
    return (
      <div className="container-page py-3 sm:py-4">
        <Seo title="Gagal memuat produk" noindex />
        <ErrorState
          as="h1"
          title="Gagal memuat produk"
          onRetry={() => {
            retried.current = true
            retry()
          }}
        />
      </div>
    )
  if (!p) return <PageLoader variant="product" />
  return <ProductView key={p.slug} p={p} />
}

function ProductView({ p }) {
  const kind = productKind(p.name)
  const name = displayName(p.name)
  const price = formatPrice(p.price)
  const images = p.gallery?.length ? p.gallery : [p.image].filter(Boolean)
  const features = productFeatures(p.features, kind)
  const groups = specGroups(p.specs)
  const url = absoluteUrl(`/product/${p.slug}`)
  const wa = waProduct(name, p.price ? price : undefined, url)
  const crumbs = [
    { to: '/katalog', label: 'Katalog' },
    p.brand && p.brandName && { to: `/brand/${p.brand}`, label: p.brandName },
    { label: name },
  ].filter(Boolean)
  const description = clampText(
    `${p.price ? `Harga ${p.name} ${price}` : `Beli ${p.name}`} di Complete Selular. ` +
      features.map((f) => `${f.label} ${f.value}`).join(', '),
    160,
  )
  const ctaRef = useRef(null)
  const ctaOffscreen = useOffscreen(ctaRef)

  return (
    <>
      <Seo
        title={productTitle(p.name)}
        description={description}
        image={images[0]?.src}
        type="product"
        jsonLd={productJsonLd(p, { url, description, images, crumbs })}
      />
      <div className="container-page py-3 sm:py-4">
        <Breadcrumbs items={crumbs} />

        <div className="grid gap-3 md:grid-cols-[5fr_6fr] md:gap-4">
          <Gallery key={p.slug} name={name} images={images} />

          <div className="card flex min-w-0 flex-col p-4 sm:p-5">
            {p.brandName && (
              <Link
                to={`/brand/${p.brand}`}
                className="text-brand-700 hover:text-brand-800 -my-1 self-start py-1 text-[13px] font-bold hover:underline"
              >
                {p.brandName}
              </Link>
            )}
            <h1 tabIndex={-1} className="text-ink mt-1 text-lg font-bold text-balance focus:outline-none sm:text-xl">
              {name}
            </h1>

            <div className="mt-3">
              {p.price ? (
                <>
                  <p className="text-ink text-2xl font-extrabold tabular-nums">{price}</p>
                  <p className="text-muted mt-0.5 text-xs">Harga dapat berubah sewaktu-waktu. Cek stok via WhatsApp.</p>
                </>
              ) : (
                <>
                  <p className="text-ink text-lg font-bold">{price}</p>
                  <p className="text-muted mt-0.5 text-xs">Tanyakan harga dan stok terbaru lewat WhatsApp.</p>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                ref={ctaRef}
                href={wa}
                target="_blank"
                rel="noopener"
                className="btn-wa w-full sm:w-auto sm:flex-1 md:w-full md:flex-none lg:w-auto lg:flex-1"
              >
                <WhatsAppIcon className="size-4" /> Beli via WhatsApp
                <span className="sr-only"> (buka di tab baru)</span>
              </a>
              <CompareToggle p={p} name={name} />
            </div>

            {features.length > 0 && (
              <div className="border-line mt-4 border-t pt-4">
                <h2 className="text-ink text-[13px] font-bold">Spesifikasi utama</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                  {features.map((f) => (
                    <div key={f.key} className="min-w-0">
                      <dt className="text-muted text-xs">{f.label}</dt>
                      <dd className="text-ink text-sm wrap-break-word">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {groups.length > 0 && (
                  <a
                    href="#spesifikasi"
                    className="text-brand-700 hover:text-brand-800 mt-1 inline-flex min-h-10 items-center text-[13px] font-bold hover:underline"
                  >
                    Lihat spesifikasi lengkap
                  </a>
                )}
              </div>
            )}

            <Marketplaces />
          </div>
        </div>

        {groups.length > 0 && <Specs groups={groups} />}
      </div>

      <Related p={p} kind={kind} />

      <BuyBar name={name} price={price} hasPrice={!!p.price} href={wa} hidden={!ctaOffscreen} />
    </>
  )
}

function Gallery({ name, images }) {
  const [active, setActive] = useState(0)
  const img = images[active]
  return (
    <div className="card min-w-0 p-3 sm:p-4 md:sticky md:top-20 md:self-start lg:top-[7.75rem]">
      {/* White frame: product shots have opaque white backgrounds, so a tinted panel would show their edges */}
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white sm:aspect-square sm:p-4 lg:p-8">
        <Img
          img={img}
          priority
          noUpscale={isLowRes(img)}
          sizes="(min-width: 1200px) 480px, (min-width: 1024px) 40vw, (min-width: 768px) 40vw, 90vw"
          alt={images.length > 1 ? `${name}, gambar ${active + 1} dari ${images.length}` : name}
          className="size-full object-contain"
        />
      </div>
      {images.length > 1 && (
        // p-1 leaves room for the focus outline, which the scroller would otherwise clip
        <ul className="-mx-1 mt-2 flex scrollbar-none gap-2 overflow-x-auto p-1" aria-label="Pilih gambar">
          {images.map((g, i) => (
            <li key={g.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Gambar ${i + 1} dari ${images.length}`}
                aria-current={i === active ? 'true' : undefined}
                className={`block size-14 rounded-lg border bg-white p-1 transition-colors sm:size-16 ${
                  i === active ? 'border-brand-600 ring-brand-600 ring-1' : 'border-line hover:border-brand-300'
                }`}
              >
                <Img img={g} noUpscale={isLowRes(g)} sizes="64px" alt="" className="size-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Older data has no lowRes flag yet; anything under 400px would be blown up in the gallery.
const isLowRes = (img) => !!img && (img.lowRes ?? Math.max(img.w || 0, img.h || 0) < 400)

function CompareToggle({ p, name }) {
  const list = useCompare()
  const selected = list.includes(p.slug)
  const [refused, setRefused] = useState(false)
  const full = refused && !selected && list.length >= compare.max
  return (
    <>
      <button
        type="button"
        onClick={() => setRefused(!compare.toggle(p.slug, name).ok)}
        aria-pressed={selected}
        title={selected ? 'Hapus dari perbandingan' : 'Tambahkan ke perbandingan'}
        className={`w-full sm:w-auto md:w-full lg:w-auto ${
          selected ? 'btn border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100 border' : 'btn-ghost'
        }`}
      >
        {selected && <Check className="size-4" strokeWidth={3} aria-hidden />}
        Bandingkan
      </button>
      {/* Not a live region: lib/compare announces every change to screen readers already */}
      {full ? (
        <p className="text-ink basis-full text-[13px]">
          <b className="font-bold">Maksimal {compare.max} produk.</b>{' '}
          <Link to="/bandingkan" className="text-brand-700 font-bold underline underline-offset-2">
            Hapus salah satu di halaman Bandingkan
          </Link>
        </p>
      ) : (
        selected && (
          <p className="text-muted basis-full text-[13px]">
            Masuk daftar perbandingan ({list.length} dari {compare.max}).{' '}
            <Link to="/bandingkan" className="text-brand-700 font-bold underline underline-offset-2">
              Lihat perbandingan
            </Link>
          </p>
        )
      )}
    </>
  )
}

function Marketplaces() {
  return (
    <div className="border-line mt-4 border-t pt-4">
      <p className="text-ink mb-2 text-[13px] font-bold">Atau beli di toko resmi kami</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
        {site.marketplaces.map((m) => {
          // A square-ish logo is just an icon (e.g. Lazada's heart), so show the name next to it
          const showName = !m.img || m.img.w / m.img.h < 2
          return (
            <li key={m.name}>
              <a
                href={m.url}
                target="_blank"
                rel="noopener"
                className="border-line hover:border-brand-300 flex h-11 items-center justify-center gap-2 rounded-lg border bg-white px-3 transition-colors"
              >
                {m.img && <Img img={m.img} alt="" className="h-5 w-auto max-w-[5.5rem] object-contain" />}
                <span className={showName ? 'text-ink text-[13px] font-semibold' : 'sr-only'}>{m.name}</span>
                <span className="sr-only"> (buka di tab baru)</span>
                <ExternalLink aria-hidden className="text-muted size-3.5 shrink-0" />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Specs({ groups }) {
  // Long sheets collapse on phones; on wider screens every group starts open.
  const wide = useMediaQuery('(min-width: 768px)')
  return (
    <section id="spesifikasi" className="card mt-3 p-4 sm:mt-4 sm:p-5">
      <SectionHeader title="Spesifikasi Lengkap" />
      <div className="gap-4 md:columns-2">
        {groups.map((g, i) => (
          <details
            key={g.key}
            open={wide || i < 2}
            className="group border-line mb-3 break-inside-avoid overflow-hidden rounded-lg border"
          >
            <summary className="focus-ring-inset bg-canvas group-open:border-line flex min-h-11 list-none items-center justify-between gap-3 px-3 py-2 group-open:border-b [&::-webkit-details-marker]:hidden">
              <h3 className="text-ink text-sm font-bold">{g.group}</h3>
              <span className="text-muted flex items-center gap-1.5 text-xs">
                {g.rows.length} spesifikasi
                <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <dl className="divide-line divide-y">
              {g.rows.map((r, j) => (
                <div
                  key={`${r.key}-${j}`}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2 text-sm"
                >
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="text-ink wrap-break-word">{r.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </section>
  )
}

const words = (s) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !/^\d+(gb|tb|mb)$/.test(w)),
  )

function Related({ p, kind }) {
  const { data: models } = useModels()
  if (!models) return null
  // Other listings of the same kind of device (no cases under a phone), then the closest price and the
  // most similar name — name first when this product has no price.
  const own = words(p.name)
  // Share of name words in common, so "iPhone 18 Pro" ranks above "iPhone 17" for an iPhone 18 Pro Max
  const shared = (m) => {
    const other = words(m.name)
    const common = [...other].filter((w) => own.has(w)).length
    return common / (own.size + other.size - common || 1)
  }
  // Relative distance between the two prices
  const gap = (m) => {
    if (!p.price) return m.minPrice ? 1 : 2
    if (!m.minPrice) return 1
    const d = p.price < m.minPrice ? m.minPrice - p.price : p.price > m.maxPrice ? p.price - m.maxPrice : 0
    return d / p.price
  }
  const rank = (a, b) => (p.price ? gap(a) - gap(b) || shared(b) - shared(a) : shared(b) - shared(a) || gap(a) - gap(b))
  const pool = models.filter((m) => m.slug !== p.slug && productKind(m.name) === kind)
  const sameBrand = pool.filter((m) => m.brand === p.brand).sort(rank)
  const byBrand = !!p.brandName && sameBrand.length >= 4
  const related = (byBrand ? sameBrand : [...sameBrand, ...pool.filter((m) => m.brand !== p.brand).sort(rank)]).slice(
    0,
    10,
  )
  if (!related.length) return null
  return (
    <section className="band mb-2 py-4 sm:py-6">
      <div className="container-page">
        <SectionHeader
          title={byBrand ? `Lainnya dari ${p.brandName}` : 'Produk serupa'}
          to={byBrand ? `/brand/${p.brand}` : '/katalog'}
        />
        <Rail>
          {related.map((m) => (
            <ProductCard key={m.key} p={m} sizes={RAIL_SIZES} />
          ))}
        </Rail>
      </div>
    </section>
  )
}

// Price + WhatsApp CTA pinned above the mobile bottom nav while the in-page CTA is out of view.
// site-fab: on very short viewports (landscape phones, high zoom) it steps aside for the in-page CTA.
function BuyBar({ name, price, hasPrice, href, hidden }) {
  return (
    <div
      className={`site-fab border-line fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-white transition-[translate,opacity,visibility] duration-200 lg:hidden ${
        hidden ? 'invisible translate-y-3 opacity-0' : ''
      }`}
    >
      <div className="container-page flex items-center gap-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-muted truncate text-xs">{name}</p>
          <p
            className={`tabular-nums ${hasPrice ? 'text-ink text-base font-extrabold' : 'text-ink text-sm font-bold'}`}
          >
            {price}
          </p>
        </div>
        <a href={href} target="_blank" rel="noopener" className="btn-wa shrink-0 px-4">
          <WhatsAppIcon className="size-4" /> Beli via WhatsApp
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      </div>
    </div>
  )
}

function ProductNotFound({ slug }) {
  // "iphone-16-pro-128gb" → "iphone 16 pro": drop storage and single-digit RAM tokens
  const q = slug
    .split('-')
    .filter((w) => w && !/^\d+(gb|tb|mb)$/i.test(w) && !/^\d$/.test(w))
    .slice(0, 4)
    .join(' ')
  return (
    <div className="container-page py-3 sm:py-4">
      <Seo title="Produk tidak ditemukan" noindex />
      <EmptyState
        as="h1"
        title="Produk tidak ditemukan"
        actions={
          <>
            {q && (
              <Link to={`/katalog?q=${encodeURIComponent(q)}`} className="btn-primary">
                Cari “{q}”
              </Link>
            )}
            <Link to="/katalog" className="btn-ghost">
              Lihat Katalog
            </Link>
          </>
        }
      >
        Produk ini mungkin sudah tidak dijual atau alamatnya berubah. Coba cari model serupa di katalog kami.
      </EmptyState>
    </div>
  )
}

function productJsonLd(p, { url, description, images, crumbs }) {
  const trail = [{ to: '/', label: 'Beranda' }, ...crumbs]
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      // The last crumb is this exact listing, capacity included
      name: i === trail.length - 1 ? p.name : c.label,
      item: c.to ? absoluteUrl(c.to) : url,
    })),
  }
  // Google flags a Product without offers/reviews as an invalid item, so price-less products
  // ("Hubungi kami") only get the breadcrumb trail.
  if (!p.price) return [breadcrumbs]
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.slug,
      url,
      description,
      image: images.map((g) => absoluteUrl(g.src)),
      ...(p.brandName && { brand: { '@type': 'Brand', name: p.brandName } }),
      offers: {
        '@type': 'Offer',
        url,
        price: p.price,
        priceCurrency: 'IDR',
        seller: { '@type': 'Organization', name: 'Complete Selular' },
      },
    },
    breadcrumbs,
  ]
}

function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// True once the observer has seen the element outside the part of the viewport not covered by the
// fixed header (4rem) and the bottom nav + buy bar (~8.5rem). Starts false so the bar never flashes
// on load while the in-page CTA is in view.
function useOffscreen(ref) {
  const [offscreen, setOffscreen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setOffscreen(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), {
      rootMargin: '-64px 0px -136px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return offscreen
}
