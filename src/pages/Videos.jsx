import { useEffect, useRef } from 'react'
import { Clapperboard } from 'lucide-react'
import site from '../data/site.json'
import { useVideos } from '../lib/data'
import PageHeader from '../components/PageHeader'
import LiteYouTube from '../components/LiteYouTube'
import Seo from '../components/Seo'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { YouTubeIcon } from '../components/icons'

// The scraper tags each video's orientation; older untagged snapshots only held the shop's Shorts.
const isShort = (v) => (v.orientation ? v.orientation === 'portrait' : true)

export default function Videos() {
  const { data, error, retry } = useVideos()
  const channel = site.socials.find((s) => s.name === 'youtube')?.url
  // One frame shape per page keeps the grid rows even; mixed lists fall back to 16:9.
  const portrait = !data?.length || data.every(isShort)
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
      <PageHeader title="Video Review" subtitle="Unboxing, komparasi, dan rekomendasi HP dari channel YouTube kami.">
        {channel && <ChannelLink href={channel} className="mt-3" />}
      </PageHeader>
      <div ref={box} className="band mt-2 mb-2 py-4 sm:py-6">
        <div className="container-page">
          {error ? (
            <ErrorState
              title="Gagal memuat video"
              onRetry={() => {
                retried.current = true
                retry()
              }}
            />
          ) : !data ? (
            <VideosSkeleton portrait={portrait} />
          ) : !data.length ? (
            <EmptyState
              title="Belum ada video"
              icon={Clapperboard}
              actions={channel && <ChannelLink href={channel} label="Buka channel YouTube" />}
            >
              Video review terbaru akan tampil di sini.
            </EmptyState>
          ) : (
            <ul className={gridClass(portrait)}>
              {data.map((v, i) => (
                <li key={v.id}>
                  <LiteYouTube
                    video={v}
                    portrait={portrait}
                    priority={i === 0}
                    sizes={
                      portrait
                        ? '(min-width: 1200px) 220px, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 31vw, 50vw'
                        : '(min-width: 1200px) 368px, (min-width: 1024px) 31vw, (min-width: 640px) 47vw, 100vw'
                    }
                  />
                  <h2 className="text-ink mt-2 line-clamp-2 text-sm font-bold">{v.title}</h2>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

const gridClass = (portrait) =>
  portrait
    ? 'grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 md:grid-cols-4 lg:grid-cols-5'
    : 'grid gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-y-5 lg:grid-cols-3'

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
      <div className={gridClass(portrait)} aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className={`skeleton rounded-lg ${portrait ? 'aspect-[9/16]' : 'aspect-video'}`} />
            <div className="skeleton mt-2.5 h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
