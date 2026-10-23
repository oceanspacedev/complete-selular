import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LoaderCircle, Tag } from 'lucide-react'
import site from '../data/site.json'
import { waLink } from '../lib/wa'
import { absoluteUrl } from '../lib/seo'
import PageHeader from '../components/PageHeader'
import Dialog from '../components/Dialog'
import EmptyState from '../components/EmptyState'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { WhatsAppIcon } from '../components/icons'

// Offer the 1200px file to tiles too, so dense phone screens get a sharp poster on the wide tile.
const tileImage = (it) =>
  it.thumb.srcset || !it.full
    ? it.thumb
    : { ...it.thumb, srcset: `${it.thumb.src} ${it.thumb.w}w, ${it.full.src} ${it.full.w}w` }

export default function Promo() {
  const { items } = site.promos
  const [open, setOpen] = useState(null) // index of the poster in the lightbox

  return (
    <>
      <Seo title="Promo" description="Promo dan penawaran terbaru Complete Selular." />
      <PageHeader title="Promo" />
      {items.length ? (
        <>
          <PromoSpotlight item={items[0]} onOpen={() => setOpen(0)} />
          {items.length > 1 && (
            <section aria-labelledby="promo-lain" className="band mt-2 mb-2 py-5 sm:py-7">
              <div className="container-page">
                <h2 id="promo-lain" className="text-ink mb-4 text-base font-extrabold sm:text-xl">
                  Promo lainnya
                </h2>
                {/* A grid (not CSS columns) keeps reading order, tab order and visual order the same. */}
                <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
                  {items.slice(1).map((it, n) => {
                    const i = n + 1
                    return (
                      <li key={it.thumb.src}>
                        <button
                          type="button"
                          onClick={() => setOpen(i)}
                          className="group block w-full text-left"
                          aria-label={`Lihat ${it.title ? `promo ${i + 1}: ${it.title}` : `poster promo ${i + 1}`}`}
                        >
                          {/* Posters come in A-series and 2:3 shapes; one frame keeps rows even and
                              object-contain shows each poster edge to edge, text included. */}
                          <span className="card block overflow-hidden transition-shadow duration-200 group-hover:shadow-[var(--shadow-lift)]">
                            <Img
                              img={tileImage(it)}
                              eager={n < 4}
                              sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 50vw"
                              alt=""
                              className="aspect-[5/7] w-full bg-white object-contain"
                            />
                          </span>
                          {it.title && (
                            <span className="group-hover:text-brand-700 text-ink mt-2 line-clamp-2 block text-[13px] leading-snug font-bold sm:text-sm">
                              {it.title}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="band mt-2 mb-2 py-4 sm:py-6">
          <div className="container-page">
            <EmptyState
              title="Belum ada promo"
              icon={Tag}
              actions={
                <a href={waLink()} target="_blank" rel="noopener" className="btn-wa">
                  <WhatsAppIcon className="size-4" /> Tanya admin
                  <span className="sr-only"> (buka di tab baru)</span>
                </a>
              }
            >
              Promo terbaru akan tampil di sini. Tanyakan penawaran hari ini ke admin kami.
            </EmptyState>
          </div>
        </div>
      )}
      <Lightbox items={items} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </>
  )
}

// The newest promo leads: the poster big, what it offers in words, and the two things to do next
function PromoSpotlight({ item, onOpen }) {
  return (
    <section aria-labelledby="promo-terbaru" className="band mt-2 py-5 sm:py-7">
      <div className="container-page grid items-center gap-5 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <button
          type="button"
          onClick={onOpen}
          className="group card mx-auto block w-full max-w-[18rem] overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)] md:max-w-none"
          aria-label={`Perbesar poster ${item.title ?? 'promo terbaru'}`}
        >
          <Img
            img={tileImage(item)}
            priority
            sizes="(min-width: 1024px) 352px, (min-width: 768px) 288px, 288px"
            alt=""
            className="aspect-[5/7] w-full bg-white object-contain"
          />
        </button>
        <div className="min-w-0">
          <p className="text-accent-600 text-sm font-bold">Promo terbaru</p>
          <h2
            id="promo-terbaru"
            className="text-ink mt-1 text-2xl leading-tight font-extrabold text-balance sm:text-3xl"
          >
            {item.title ?? 'Promo spesial bulan ini'}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onOpen} className="btn-primary">
              Lihat poster
            </button>
            <a
              href={waLink(
                `Halo admin Complete Selular, saya mau ikut promo "${item.title ?? 'terbaru'}". Bagaimana caranya?`,
              )}
              target="_blank"
              rel="noopener"
              className="btn-wa"
            >
              <WhatsAppIcon className="size-4" /> Tanya promo ini
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Lightbox({ items, index, onChange, onClose }) {
  const open = index != null
  const total = items.length
  const item = open ? items[index] : null
  const touch = useRef(null)
  const go = (step) => onChange((i) => (i + step + total) % total)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        onChange((i) => (i + (e.key === 'ArrowRight' ? 1 : -1) + total) % total)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onChange, total])

  // Warm the cache for the neighbours so prev/next feel instant.
  useEffect(() => {
    if (!open || total < 2) return
    for (const step of [1, -1]) new Image().src = items[(index + step + total) % total].full.src
  }, [open, index, items, total])

  const onTouchStart = (e) => {
    touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
  }
  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    if (!start || total < 2) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }
  const closeOnEmpty = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const label = open ? `Promo ${index + 1} dari ${total}` : ''

  return (
    <Dialog open={open} onClose={onClose} variant="lightbox" title={label}>
      {item && (
        <div
          className="flex h-full flex-col px-4 pt-19 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={closeOnEmpty}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <p className="sr-only" aria-live="polite">
            {label}
          </p>
          <div className="[container-type:size] grid min-h-0 flex-1 place-items-center" onClick={closeOnEmpty}>
            <Poster key={item.full.src} item={item} alt={item.alt ?? item.title ?? `Poster promo ${index + 1}`} />
          </div>
          <div className="mt-4 flex items-center justify-center gap-3" onClick={closeOnEmpty}>
            {total > 1 && (
              <NavButton label="Promo sebelumnya" onClick={() => go(-1)}>
                <ChevronLeft className="size-6" aria-hidden />
              </NavButton>
            )}
            <a
              href={waLink(
                `Halo admin Complete Selular, saya mau tanya promo ${item.title ? `"${item.title}"` : 'ini'}: ${absoluteUrl(item.full.src)}`,
              )}
              target="_blank"
              rel="noopener"
              className="btn-wa"
            >
              <WhatsAppIcon className="size-4" /> Tanya promo ini
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
            {total > 1 && (
              <NavButton label="Promo berikutnya" onClick={() => go(1)}>
                <ChevronRight className="size-6" aria-hidden />
              </NavButton>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

function NavButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-95"
    >
      {children}
    </button>
  )
}

// Sized from the poster's own aspect ratio to fit the free area (container query units), so the
// box exists before the full image arrives. The cached tile thumbnail stays underneath the whole
// time, so the full poster fades in over it instead of over an empty box.
function Poster({ item, alt }) {
  const [loaded, setLoaded] = useState(false)
  const { w, h } = item.full
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-white/5"
      style={{ width: `min(100cqw, 100cqh * ${w / h})`, aspectRatio: `${w} / ${h}` }}
    >
      <Img img={item.thumb} eager alt="" className="absolute inset-0 size-full object-cover" />
      <Img
        img={item.full}
        eager
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`relative size-full object-contain transition-opacity duration-200 ${loaded ? '' : 'opacity-0'}`}
      />
      {!loaded && (
        <span
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-slate-950/60 text-white"
          aria-hidden
        >
          <LoaderCircle className="size-5 motion-safe:animate-spin" />
        </span>
      )}
    </div>
  )
}
