import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePosts } from '../lib/data'
import { formatDate, readableTitle } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

// Every WordPress post sits in the one "Artikel Review" category, so the topic is read from the title.
// `id` is the ?topik= value; the first matching pattern wins.
export const TOPICS = [
  { id: 'rekomendasi', label: 'Rekomendasi', test: /rekomendasi|daftar hp|terbaik|hp murah/i },
  { id: 'tips', label: 'Tips & Cara', test: /tips|\bcara\b|segera lakukan|bahaya|mengenal|fungsi/i },
  { id: 'info', label: 'Info & Berita', test: /./ },
]
export const topicOf = (title = '') => TOPICS.find((t) => t.test.test(title))

const PARAM = 'topik'
const GRID = 'grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4'

export default function Articles() {
  const { data, error, retry } = usePosts()
  const [params, setParams] = useSearchParams()
  const box = useRef(null)
  const retried = useRef(false)

  const topic = TOPICS.find((t) => t.id === params.get(PARAM))?.id ?? ''
  const posts = useMemo(() => data?.map((p) => ({ ...p, topic: topicOf(p.title) })), [data])
  const shown = topic ? posts?.filter((p) => p.topic.id === topic) : posts
  const [featured, ...rest] = shown ?? []

  const choose = (id) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set(PARAM, id)
        else next.delete(PARAM)
        return next
      },
      { replace: true },
    )

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
      <PageHeader title="Artikel & Review">
        {posts?.length > 0 ? (
          <TopicChips posts={posts} active={topic} onChoose={choose} />
        ) : (
          !data && !error && <ChipsSkeleton />
        )}
      </PageHeader>
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
        ) : !featured ? (
          <EmptyState
            title={data.length ? 'Belum ada artikel di topik ini' : 'Belum ada artikel'}
            actions={
              data.length ? (
                <button type="button" onClick={() => choose('')} className="btn-primary">
                  Lihat semua artikel
                </button>
              ) : (
                <Link to="/katalog" className="btn-primary">
                  Lihat katalog
                </Link>
              )
            }
          >
            Artikel dan review terbaru akan tampil di sini.
          </EmptyState>
        ) : (
          <>
            <FeaturedCard post={featured} />
            {rest.length > 0 && (
              <ul className={`mt-2 sm:mt-3 ${GRID}`}>
                {rest.map((post) => (
                  <li key={post.slug}>
                    <ArticleCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  )
}

function TopicChips({ posts, active, onChoose }) {
  const items = [
    { id: '', label: 'Semua', count: posts.length },
    ...TOPICS.map((t) => ({ ...t, count: posts.filter((p) => p.topic.id === t.id).length })),
  ].filter((t) => t.count > 0)
  // Phones: one swipeable row. `relative` makes the row clip the chips' absolutely positioned
  // sr-only text too, which would otherwise widen the page.
  return (
    <div
      role="group"
      aria-label="Topik artikel"
      className="relative -mx-4 mt-3 flex scrollbar-none gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {items.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChoose(t.id)}
            aria-pressed={on}
            className={`chip focus-ring-inset min-h-8 shrink-0 gap-1 px-3 py-1 text-[13px] pointer-coarse:min-h-11 ${
              on
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-line text-ink hover:border-brand-300 bg-white font-medium'
            }`}
          >
            {t.label}{' '}
            <span className={`text-xs font-normal tabular-nums ${on ? 'text-brand-700' : 'text-muted'}`}>
              {t.count}
              <span className="sr-only"> artikel</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// The newest post of the current topic. Covers are square posters with the headline baked in, so they
// are shown whole on a grey band, never cropped.
function FeaturedCard({ post }) {
  return (
    <Link
      to={`/artikel/${post.slug}`}
      className="group card grid overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="flex aspect-[4/3] justify-center bg-slate-100">
        <Img
          img={post.cover}
          priority
          sizes="(min-width: 1200px) 460px, (min-width: 768px) 38vw, calc(100vw - 32px)"
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5 md:p-6">
        <p className="text-brand-700 text-[13px] font-bold">{post.topic.label}</p>
        <h2 className="group-hover:text-brand-700 text-ink mt-1 text-xl leading-snug font-extrabold text-balance sm:text-2xl">
          {readableTitle(post.title)}
        </h2>
        {post.excerpt && <p className="text-muted mt-2 line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <time dateTime={post.date} className="text-muted">
            {formatDate(post.date)}
          </time>
          <span className="text-brand-700 font-bold group-hover:underline" aria-hidden>
            Baca artikel
          </span>
        </p>
      </div>
    </Link>
  )
}

// Phones: a dense row (96px thumbnail left, text right). Tablet and up: a card with the square cover on top.
function ArticleCard({ post }) {
  return (
    <Link
      to={`/artikel/${post.slug}`}
      className="group card flex h-full gap-3 overflow-hidden p-2 sm:flex-col sm:gap-0 sm:p-0"
    >
      <Img
        img={post.cover}
        sizes="(min-width: 1280px) 282px, (min-width: 1024px) 31vw, (min-width: 640px) 47vw, 96px"
        alt=""
        className="size-24 shrink-0 rounded bg-slate-100 object-contain sm:aspect-square sm:h-auto sm:w-full sm:rounded-none"
      />
      <div className="flex min-w-0 flex-1 flex-col sm:p-3">
        <p className="text-muted flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="text-brand-700 font-bold">{post.topic.label}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
        <h2 className="group-hover:text-brand-700 text-ink mt-1 line-clamp-2 text-sm leading-snug font-bold sm:text-[15px]">
          {readableTitle(post.title)}
        </h2>
        {post.excerpt && <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-snug">{post.excerpt}</p>}
      </div>
    </Link>
  )
}

function ChipsSkeleton() {
  return (
    <div
      className="relative -mx-4 mt-3 flex scrollbar-none gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      aria-hidden
    >
      {[72, 120, 104, 112].map((w) => (
        <div key={w} className="skeleton h-8 shrink-0 rounded-lg" style={{ width: w }} />
      ))}
    </div>
  )
}

function ArticlesSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Memuat artikel…</span>
      <div aria-hidden>
        <div className="card grid overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="skeleton aspect-[4/3]" />
          <div className="flex flex-col justify-center p-4 sm:p-5 md:p-6">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton mt-2 h-6 w-full rounded sm:h-7" />
            <div className="skeleton mt-2 h-6 w-2/3 rounded sm:h-7" />
            <div className="skeleton mt-3 h-4 w-full rounded" />
            <div className="skeleton mt-2 h-4 w-5/6 rounded" />
            <div className="skeleton mt-4 h-3 w-40 rounded" />
          </div>
        </div>
        <div className={`mt-2 sm:mt-3 ${GRID}`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card flex gap-3 overflow-hidden p-2 sm:flex-col sm:gap-0 sm:p-0">
              <div className="skeleton size-24 shrink-0 rounded sm:aspect-square sm:h-auto sm:w-full sm:rounded-none" />
              <div className="min-w-0 flex-1 sm:p-3">
                <div className="skeleton my-0.5 h-3 w-28 rounded" />
                <div className="skeleton mt-2 h-4 w-full rounded" />
                <div className="skeleton mt-2 h-4 w-2/3 rounded" />
                <div className="skeleton mt-2 h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
