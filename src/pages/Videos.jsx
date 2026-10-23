import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard } from 'lucide-react'
import site from '../data/site.json'
import { useVideos } from '../lib/data'
import { readableTitle } from '../lib/format'
import PageHeader from '../components/PageHeader'
import LiteYouTube from '../components/LiteYouTube'
import Seo from '../components/Seo'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { YouTubeIcon } from '../components/icons'

// Same rhythm as Home: white bands on the grey canvas, 8px apart
const SECTION = 'band mt-2 py-4 sm:py-6'

// The scraper tags each video's orientation; older untagged snapshots only held the shop's Shorts.
const isShort = (v) => (v.orientation ? v.orientation === 'portrait' : true)
const watchUrl = (v) =>
  isShort(v) ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`

// "DAFTAR HP 5 JUTAAN TERBARU OKTOBER 2026" / "DAFTAR HP MURAH MERIAH OKTOBER 2026": the channel's
// monthly buying guide, one Short per budget.
const SERIES = /^daftar\s+hp\s+(?:(\d+)\s*jutaan|murah)/i
const MONTH = /\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\b/i

// Catalog price filter (see PRICE_RANGES in Catalog.jsx) that matches a "N jutaan" budget
const catalogRange = (n) =>
  n < 2
    ? { id: 'u2', label: 'di bawah 2 juta' }
    : n < 5
      ? { id: '2-5', label: '2 – 5 juta' }
      : n < 10
        ? { id: '5-10', label: '5 – 10 juta' }
        : { id: '10-20', label: '10 – 20 juta' }

function splitVideos(list) {
  const [featured, ...others] = list
  const series = []
  const rest = []
  for (const v of others) {
    const m = v.title.match(SERIES)
    if (m) series.push({ video: v, budget: m[1] ? Number(m[1]) : 0 })
    else rest.push(v)
  }
  // A lone guide video is just another video, not a section with one chip
  if (series.length < 2) return { featured, series: [], rest: others }
  // "Murah meriah" (budget 0) first, then 1 jt, 2 jt, …; the newest upload wins a duplicate budget
  series.sort((a, b) => a.budget - b.budget)
  const unique = series.filter((s, i) => i === 0 || s.budget !== series[i - 1].budget)
  const month = series.map((s) => s.video.title.match(MONTH)).find(Boolean)
  return {
    featured,
    series: unique,
    month: month && `${month[1][0].toUpperCase()}${month[1].slice(1).toLowerCase()} ${month[2]}`,
    rest: [...rest, ...series.filter((s) => !unique.includes(s)).map((s) => s.video)],
  }
}

export default function Videos() {
  const { data, error, retry } = useVideos()
  const channel = site.socials.find((s) => s.name === 'youtube')?.url
  // One frame shape per grid keeps the rows even; mixed lists fall back to 16:9.
  const portrait = !data?.length || data.every(isShort)
  const groups = useMemo(() => (data?.length ? splitVideos(data) : null), [data])
  const box = useRef(null)
  const retried = useRef(false)

  // "Coba lagi" unmounts while the list reloads; land on the page heading (or the new retry button
  // when it failed again) rather than letting keyboard focus fall back to <body>.
  useEffect(() => {
    if (!retried.current || !(data || error)) return
    retried.current = false
    const target = data
      ? box.current?.closest('main')?.querySelector('h1')
      : box.current?.querySelector('[role="alert"] button')
    if (data && target && !target.hasAttribute('tabindex')) {
      target.tabIndex = -1
      target.classList.add('focus:outline-none')
    }
    target?.focus()
  }, [data, error])

  return (
    <>
      <Seo
        title="Video Review"
        description="Unboxing, komparasi, dan review HP terbaru dari channel YouTube Complete Selular."
      />
      <PageHeader title="Video Review" />
      <div ref={box} className="mb-2">
        {error ? (
          <div className={SECTION}>
            <div className="container-page">
              <ErrorState
                title="Gagal memuat video"
                onRetry={() => {
                  retried.current = true
                  retry()
                }}
              />
            </div>
          </div>
        ) : !data ? (
          <VideosSkeleton portrait={portrait} />
        ) : !groups ? (
          <div className={SECTION}>
            <div className="container-page">
              <EmptyState
                title="Belum ada video"
                icon={Clapperboard}
                actions={channel && <ChannelLink href={channel} label="Buka channel YouTube" />}
              >
                Video review terbaru akan tampil di sini.
              </EmptyState>
            </div>
          </div>
        ) : (
          <>
            <Featured video={groups.featured} channel={channel} />
            {groups.series.length > 0 && <BudgetGuide series={groups.series} month={groups.month} />}
            {groups.rest.length > 0 && (
              <section aria-labelledby="video-lain" className={SECTION}>
                <div className="container-page">
                  <h2 id="video-lain" className="text-ink mb-3 text-base font-extrabold sm:mb-4 sm:text-xl">
                    Review &amp; unboxing
                  </h2>
                  <ul className={gridClass(portrait)}>
                    {groups.rest.map((v) => (
                      <li key={v.id} className="min-w-0">
                        <LiteYouTube
                          video={v}
                          portrait={portrait}
                          sizes={portrait ? GRID_SIZES_PORTRAIT : GRID_SIZES_LANDSCAPE}
                        />
                        <h3 className="text-ink mt-2 line-clamp-2 text-sm font-bold">{readableTitle(v.title)}</h3>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}

// Shorts stay at a phone-like size: never wider than 360px, and on phones about half the viewport
// tall (a full-height Short would push its title and buttons off screen).
const PLAYER_PORTRAIT = 'mx-auto w-[min(100%,340px,calc(52svh*9/16))] md:mx-0 md:w-[min(360px,calc(66svh*9/16))]'
const PLAYER_LANDSCAPE = 'w-full md:w-[min(100%,560px)]'
const PLAYER_SIZES = '(min-width: 768px) 360px, 300px'
const GRID_SIZES_PORTRAIT =
  '(min-width: 1200px) 220px, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 31vw, 50vw'
const GRID_SIZES_LANDSCAPE = '(min-width: 1200px) 368px, (min-width: 1024px) 31vw, (min-width: 640px) 47vw, 100vw'

function Featured({ video, channel }) {
  const short = isShort(video)
  return (
    <section aria-labelledby="video-terbaru" className={SECTION}>
      <div className="container-page flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        <LiteYouTube
          video={video}
          portrait={short}
          priority
          sizes={PLAYER_SIZES}
          className={`shrink-0 ${short ? PLAYER_PORTRAIT : PLAYER_LANDSCAPE}`}
        />
        <div className="min-w-0 md:max-w-md">
          <p className="text-muted text-sm font-semibold">Video terbaru</p>
          <h2 id="video-terbaru" className="text-ink mt-1 text-xl font-extrabold text-balance">
            {readableTitle(video.title)}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Slightly narrower padding keeps both buttons on one row at 375px */}
            <YouTubeLink video={video} className="max-sm:px-3!" />
            {channel && <ChannelLink href={channel} label="Langganan channel" className="max-sm:px-3!" />}
          </div>
        </div>
      </div>
    </section>
  )
}

function BudgetGuide({ series, month }) {
  const [selected, setSelected] = useState(0)
  const { video, budget } = series[selected] ?? series[0]
  const range = catalogRange(budget)
  const short = isShort(video)

  return (
    <section aria-labelledby="per-budget" className={SECTION}>
      <div className="container-page">
        <h2 id="per-budget" className="text-ink text-base font-extrabold sm:text-xl">
          Daftar HP per budget
        </h2>
        {month && <p className="text-muted mt-1 text-sm">Update {month}</p>}

        <div className="mt-3 grid gap-4 sm:mt-4 md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-8">
          <div role="group" aria-label="Pilih budget" className="flex flex-wrap gap-2 md:col-start-2">
            {series.map((s, i) => {
              const active = i === selected
              return (
                <button
                  key={s.video.id}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-pressed={active}
                  className={`chip ${
                    active
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-line text-ink hover:border-brand-300 bg-white font-medium'
                  }`}
                >
                  {s.budget ? `${s.budget} jt` : 'Murah meriah'}
                </button>
              )
            })}
          </div>

          <LiteYouTube
            video={video}
            portrait={short}
            sizes={PLAYER_SIZES}
            className={`md:col-start-1 md:row-span-2 md:row-start-1 ${short ? PLAYER_PORTRAIT : PLAYER_LANDSCAPE}`}
          />

          <div className="min-w-0 md:col-start-2 md:max-w-md">
            <div aria-live="polite">
              <h3 className="text-ink text-base font-extrabold text-balance">{readableTitle(video.title)}</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/katalog?harga=${range.id}`} className="btn-primary">
                Lihat HP {range.label}
              </Link>
              <YouTubeLink video={video} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const gridClass = (portrait) =>
  portrait
    ? 'grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 md:grid-cols-4 lg:grid-cols-5'
    : 'grid gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-y-5 lg:grid-cols-3'

function YouTubeLink({ video, className = '' }) {
  return (
    <a href={watchUrl(video)} target="_blank" rel="noopener" className={`btn-ghost ${className}`}>
      Tonton di YouTube
      <span className="sr-only"> (buka di tab baru)</span>
    </a>
  )
}

// YouTube's own red, darkened so the white label passes 4.5:1 (#ff0000 is only 4.0:1).
function ChannelLink({ href, label = 'Langganan channel YouTube', className = '' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`btn bg-[#cc0000] text-white hover:bg-[#a80000] ${className}`}
    >
      <YouTubeIcon className="size-4" /> {label}
      <span className="sr-only"> (buka di tab baru)</span>
    </a>
  )
}

function VideosSkeleton({ portrait }) {
  return (
    <div role="status">
      <span className="sr-only">Memuat video…</span>
      <div aria-hidden>
        <div className={SECTION}>
          <div className="container-page flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div
              className={`skeleton shrink-0 rounded-lg ${portrait ? `aspect-[9/16] ${PLAYER_PORTRAIT}` : `aspect-video ${PLAYER_LANDSCAPE}`}`}
            />
            <div className="w-full md:max-w-md">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton mt-2 h-6 w-3/4 rounded" />
              <div className="skeleton mt-2 h-4 w-full rounded" />
              <div className="mt-4 flex gap-2">
                <div className="skeleton h-10 w-36 rounded-lg" />
                <div className="skeleton h-10 w-40 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        <div className={SECTION}>
          <div className="container-page">
            <div className="skeleton mb-4 h-6 w-48 rounded" />
            <div className={gridClass(portrait)}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i}>
                  <div className={`skeleton rounded-lg ${portrait ? 'aspect-[9/16]' : 'aspect-video'}`} />
                  <div className="skeleton mt-2.5 h-4 w-3/4 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
