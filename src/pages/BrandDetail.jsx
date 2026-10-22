import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { useModels } from '../lib/data'
import { waLink } from '../lib/wa'
import { GridSkeleton, ProductGrid } from '../components/ProductCard'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Img from '../components/Img'
import { WhatsAppIcon } from '../components/icons'
import Seo from '../components/Seo'
import NotFound from './NotFound'

const newestFirst = (a, b) => (b.date ?? '').localeCompare(a.date ?? '')

export default function BrandDetail() {
  const { slug } = useParams()
  const { data: models, error, retry } = useModels()
  const contentRef = useRef(null)
  const retried = useRef(false)

  // "Coba lagi" unmounts itself, which drops focus to <body>. Once the retry settles, land on the
  // list heading (or the retry button if it failed again), unless the user already moved focus.
  useEffect(() => {
    if (!retried.current || (!models && !error)) return
    retried.current = false
    if (document.activeElement && document.activeElement !== document.body) return
    contentRef.current?.querySelector(models ? 'h2[tabindex="-1"]' : '[role="alert"] button')?.focus()
  }, [models, error])

  const brand = brands.find((b) => b.slug === slug)
  if (!brand) return <NotFound />
  // One card per phone model, newest first like the catalogue's default order
  const list = models?.filter((m) => m.brand === slug).sort(newestFirst)
  const logo = site.brandLogos[slug]

  return (
    <>
      <Seo
        title={`HP ${brand.name}`}
        description={`Daftar harga & spesifikasi HP ${brand.name} terbaru di Complete Selular.`}
      />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {/* Decorative: the heading text already names the brand */}
            {logo && (
              <span className="border-line grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white sm:h-12 sm:w-20">
                <Img img={logo} alt="" eager className="size-full scale-125 object-contain" />
              </span>
            )}
            {brand.name}
          </span>
        }
        subtitle={`Daftar harga & spesifikasi HP ${brand.name} terbaru.`}
        crumbs={[{ to: '/semua-brand', label: 'Brand' }, { label: brand.name }]}
      />
      <div ref={contentRef} className="container-page py-3 sm:py-4">
        {error && !models ? (
          <ErrorState
            onRetry={() => {
              retried.current = true
              retry()
            }}
            title="Gagal memuat produk"
          />
        ) : !list ? (
          <GridSkeleton />
        ) : (
          <>
            {/* Always there once loaded, so a successful retry has a heading to land on */}
            <div className="card mb-3 flex min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
              <h2 tabIndex={-1} className="text-ink rounded text-sm focus-visible:outline-offset-4">
                <b className="font-extrabold">{list.length}</b> produk {brand.name}
              </h2>
              {list.length > 0 && (
                <Link
                  to={`/katalog?brand=${slug}`}
                  className="border-line text-ink hover:border-brand-300 hover:text-brand-700 inline-flex h-10 items-center rounded-lg border bg-white px-3 text-sm font-bold transition-colors pointer-coarse:h-11"
                >
                  Filter & urutkan
                </Link>
              )}
            </div>
            {list.length ? <ProductGrid products={list} priorityCount={2} /> : <BrandEmpty brand={brand} />}
          </>
        )}
      </div>
    </>
  )
}

function BrandEmpty({ brand }) {
  return (
    <EmptyState
      as="h3"
      title="Belum ada produk"
      actions={
        <>
          <Link to="/katalog" className="btn-ghost">
            Lihat semua produk
          </Link>
          <a
            href={waLink(`Halo admin Complete Selular, saya cari HP *${brand.name}*. Apakah stoknya tersedia?`)}
            target="_blank"
            rel="noopener"
            className="btn-wa"
          >
            <WhatsAppIcon className="size-4" /> Tanya stok via WhatsApp
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
        </>
      }
    >
      Produk {brand.name} belum tampil di website. Tanyakan stok terbaru langsung ke admin kami.
    </EmptyState>
  )
}
