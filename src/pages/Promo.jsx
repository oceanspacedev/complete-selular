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
  // With an odd count the first (newest) poster spans both phone columns, so no tile is left alone.
  const featureFirst = items.length % 2 === 1

  return (
    <>
      <Seo title="Promo" description="Promo dan penawaran terbaru Complete Selular." />
      <PageHeader
        title="Yuk Ikutin Promonya!"
        crumbs={[{ label: 'Promo' }]}
        subtitle="Buat kamu yang ingin upgrade smartphone, berikut promo yang tersedia."
      >
        <a
          href={waLink('Halo admin Complete Selular, bagaimana cara mendapatkan promo yang sedang berlangsung?')}
          target="_blank"
          rel="noopener"
          className="btn-wa mt-3"
        >
          <WhatsAppIcon className="size-4" /> Cara dapetin promo
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      </PageHeader>
      <div className="band mt-2 mb-2 py-4 sm:py-6">
        <div className="container-page">
          {items.length ? (
            // A grid (not CSS columns) keeps reading order, tab order and visual order the same.
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {items.map((it, i) => {
                const wide = featureFirst && i === 0
                return (
                  <li key={it.thumb.src} className={wide ? 'col-span-2 sm:col-span-1' : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpen(i)}
                      className="group border-line hover:border-brand-300 flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-left transition-colors"
                      aria-label={`Lihat ${it.title ? `promo ${i + 1}: ${it.title}` : `poster promo ${i + 1}`}`}
                    >
                      {/* Posters come in A-series (1:1.41) and 2:3 shapes; one shared frame keeps the rows
                        even, and object-contain shows each poster edge to edge, text included. */}
                      <span className="block overflow-hidden bg-slate-100">
                        <Img
                          img={tileImage(it)}
                          eager={i < 3}
                          sizes={`(min-width: 1200px) 224px, (min-width: 1024px) 19vw, (min-width: 640px) 31vw, ${wide ? '100vw' : '50vw'}`}
                          alt=""
                          className="aspect-[5/7] w-full object-contain"
                        />
                      </span>
                      {it.title && (
                        <span className="group-hover:text-brand-700 text-ink border-line line-clamp-2 border-t px-3 py-2 text-[13px] font-bold">
                          {it.title}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
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
          )}
        </div>
      </div>
      <Lightbox items={items} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </>
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
