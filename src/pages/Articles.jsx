import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { usePosts } from '../lib/data'
import { formatDate, readableTitle } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const GRID = 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4'

export default function Articles() {
  const { data, error, retry } = usePosts()
  // When every post shares one category, printing it on each card only repeats the page title.
  const showCategory = new Set(data?.map((p) => p.category)).size > 1
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
      <Seo title="Artikel & Review" description="Berita, tips, dan review gadget terbaru dari Complete Selular." />
      <PageHeader
        title="Artikel & Review"
        subtitle="Berita, tips, dan review gadget terbaru dari tim Complete Selular."
      />
      <div ref={box} className="container-page py-3 sm:py-4">
        {error ? (
          <ErrorState
            title="Gagal memuat artikel"
            onRetry={() => {
              retried.current = true
              retry()
            }}
          />
        ) : !data ? (
          <ArticlesSkeleton />
        ) : !data.length ? (
          <EmptyState
            title="Belum ada artikel"
            icon={Newspaper}
            actions={
              <Link to="/katalog" className="btn-primary">
                Lihat katalog
              </Link>
            }
          >
            Artikel dan review terbaru akan tampil di sini.
          </EmptyState>
        ) : (
          <ul className={GRID}>
            {data.map((post, i) => (
              <li key={post.slug}>
                <ArticleCard post={post} showCategory={showCategory} priority={i < 2} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

// Most covers are square posters with the headline baked in, so they sit whole (never cropped) in a
// square frame on a light grey background.
function ArticleCard({ post, showCategory, priority }) {
  return (
    <Link to={`/artikel/${post.slug}`} className="group card flex h-full flex-col overflow-hidden">
      <Img
        img={post.cover}
        priority={priority}
        sizes="(min-width: 1200px) 282px, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw"
        alt=""
        className="aspect-square w-full bg-slate-100 object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="text-muted flex flex-wrap items-center gap-x-1.5 text-xs">
          {showCategory && post.category && (
            <>
              <span className="text-brand-700 font-semibold">{post.category}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
        <h2 className="group-hover:text-brand-700 text-ink mt-1 line-clamp-3 text-sm font-bold">
          {readableTitle(post.title)}
        </h2>
      </div>
    </Link>
  )
}

function ArticlesSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Memuat artikel…</span>
      <div className={GRID} aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-square" />
            <div className="p-3">
              <div className="skeleton my-0.5 h-3 w-20 rounded" />
              <div className="skeleton mt-2 h-4 w-full rounded" />
              <div className="skeleton mt-2 h-4 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
