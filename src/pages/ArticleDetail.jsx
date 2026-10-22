import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePost, usePosts } from '../lib/data'
import { formatDate, readableTitle } from '../lib/format'
import { SITE_NAME, SITE_URL, absoluteUrl } from '../lib/seo'
import Breadcrumbs from '../components/Breadcrumbs'
import SectionHeader from '../components/SectionHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import PageLoader from '../components/PageLoader'
import ErrorState from '../components/ErrorState'
import NotFound from './NotFound'

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: post, error, retry } = usePost(slug)
  const { data: all } = usePosts()
  const body = useMemo(() => (post ? prepareBody(post) : null), [post])
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  const retried = useRef(false)

  // "Coba lagi" unmounts while the article reloads, which would drop keyboard focus to <body>.
  useEffect(() => {
    if (!retried.current || !(post || error)) return
    retried.current = false
    if (post) headingRef.current?.focus()
    else errorRef.current?.querySelector('[role="alert"] button')?.focus()
  }, [post, error])

  if (error?.notFound) return <NotFound />
  if (error) {
    return (
      <div ref={errorRef} className="container-page max-w-3xl py-4 sm:py-6">
        <Seo title="Artikel" noindex />
        <Breadcrumbs items={[{ to: '/artikel-review', label: 'Artikel' }, { label: 'Gagal memuat' }]} />
        <ErrorState
          as="h1"
          title="Gagal memuat artikel"
          onRetry={() => {
            retried.current = true
            retry()
          }}
        />
      </div>
    )
  }
  if (!post) return <PageLoader variant="article" />

  const hero = post.cover?.srcset ? post.cover : (post.coverLarge ?? post.cover)
  const heroRatio = hero?.w && hero?.h ? hero.w / hero.h : 1
  const description = excerpt(post)
  const showCategory = new Set(all?.map((p) => p.category)).size > 1
  const more = all?.filter((a) => a.slug !== slug).slice(0, 3) ?? []

  // The body is raw HTML, so its internal links are plain <a> tags; send them through the
  // router instead of reloading the whole app.
  const onBodyClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[href]')
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const url = new URL(a.href, window.location.href)
    const sameOrigin = url.origin === window.location.origin
    // Old WordPress permalinks were /<slug>/ on the production domain; posts now live under /artikel/.
    const legacySlug = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1]
    const legacyPost =
      (sameOrigin || url.origin === new URL(SITE_URL).origin) && all?.some((p) => p.slug === legacySlug)
    if (!sameOrigin && !legacyPost) return
    // Leave in-page anchors and files (images, PDFs) to the browser.
    if (!legacyPost && (url.pathname === window.location.pathname || /\.\w{2,5}$/.test(url.pathname))) return
    e.preventDefault()
    navigate(legacyPost ? `/artikel/${legacySlug}` : url.pathname + url.search + url.hash)
  }

  return (
    <>
      <Seo
        title={post.title}
        description={description}
        image={(post.coverLarge ?? post.cover)?.src}
        type="article"
        jsonLd={articleJsonLd(post, description, post.coverLarge ?? post.cover)}
      />
      <article className="band">
        <div className="container-page max-w-3xl py-4 sm:py-6">
          <Breadcrumbs items={[{ to: '/artikel-review', label: 'Artikel' }, { label: post.title }]} />
          {showCategory && post.category && <p className="text-brand-700 text-[13px] font-bold">{post.category}</p>}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-ink mt-1 text-xl leading-snug font-extrabold text-balance focus:outline-none sm:text-2xl"
          >
            {readableTitle(post.title)}
          </h1>
          <time dateTime={post.date} className="text-muted mt-1.5 block text-[13px]">
            {formatDate(post.date)}
          </time>
          {/* Most covers are square posters: capped in height and centred on a tinted band (never
              cropped) so the opening paragraph still shows on tablets and desktops. */}
          {hero && (
            <div className="mt-4 flex justify-center overflow-hidden rounded-lg bg-slate-100">
              <Img
                img={hero}
                priority
                sizes={`(min-width: 768px) ${Math.round(Math.min(720, HERO_MAX_H * heroRatio))}px, calc(100vw - 32px)`}
                alt={body.coverAlt}
                className="h-auto max-w-full"
                style={{ width: `min(100%, min(45vh, ${HERO_MAX_H}px) * ${heroRatio})` }}
              />
            </div>
          )}
          {/* Article HTML comes from our own WordPress snapshot (scripts/scrape.mjs strips scripts/iframes). */}
          <div className="prose-cs mt-5" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: body.html }} />
          <Link to="/artikel-review" className="btn-ghost mt-6">
            Semua artikel
          </Link>
        </div>
      </article>

      {more.length > 0 && (
        <section className="band mt-2 mb-2 py-4 sm:py-6">
          <div className="container-page">
            <SectionHeader title="Baca juga" to="/artikel-review" />
            <ul className="grid gap-2 sm:gap-3 lg:grid-cols-3">
              {more.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/artikel/${a.slug}`}
                    className="group border-line hover:border-brand-300 flex h-full items-center gap-3 rounded-lg border p-2 transition-colors"
                  >
                    <div className="w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                      <Img img={a.cover} sizes="64px" alt="" className="aspect-square w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <time dateTime={a.date} className="text-muted block text-xs">
                        {formatDate(a.date)}
                      </time>
                      <h3 className="group-hover:text-brand-700 text-ink mt-0.5 line-clamp-3 text-sm font-bold">
                        {readableTitle(a.title)}
                      </h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}

const HERO_MAX_H = 420

const stem = (src = '') =>
  src
    .split('/')
    .pop()
    .replace(/\.\w+$/, '')
    .replace(/-\d{3,4}$/, '')
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]

function prepareBody(post) {
  const { html, coverAlt } = splitCover(post)
  const title = plain(post.title ?? '')
  return {
    html: dropRepeatedAlts(html, title),
    coverAlt: plain(coverAlt) === title ? '' : coverAlt,
  }
}

// Most posts repeat their cover as the first picture of the body. Keep the sharp, eagerly
// loaded hero and drop the copy from the body so the poster is shown once.
function splitCover(post) {
  const html = post.html ?? ''
  const cover = post.coverLarge ?? post.cover
  const m = cover && html.match(/(<a\b[^>]*>\s*)?(<img\b[^>]*>)(\s*<\/a>)?/i)
  if (!m || stem(attr(m[2], 'src')) !== stem(cover.src)) return { html, coverAlt: '' }
  // Drop a link that only wrapped the image too, so no empty link is left behind.
  const keep = m[1] && !m[3] ? m[1] : ''
  return {
    html: html.slice(0, m.index) + keep + html.slice(m.index + m[0].length),
    coverAlt: attr(m[2], 'alt') ?? '',
  }
}

const ENTITIES = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}
const decode = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
    const code = /x/i.test(e[1]) ? parseInt(e.slice(2), 16) : Number(e.slice(1))
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
  })
// Comparable text: tags and entities gone, case and spacing folded, edge punctuation trimmed.
const plain = (s) =>
  decode(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

// Spec-card pictures are often labelled with just the model name from the heading right above
// ("1. Poco X5 5G" over an image called "Poco X5 5G"), so a screen reader would announce it twice;
// such an image adds no text, so it becomes decorative.
function dropRepeatedAlts(html, title) {
  let heading = title
  return html.replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi, (tag, level, inner) => {
    if (level) {
      heading = plain(inner).replace(/^\d+[.)]\s*/, '')
      return tag
    }
    const alt = attr(tag, 'alt')
    return alt && plain(alt).replace(/^\d+[.)]\s*/, '') === heading
      ? tag.replace(/\salt=(["'])[\s\S]*?\1/i, ' alt=""')
      : tag
  })
}

// Older WordPress excerpts open with the title, a "Penulis : … | Editor : …" byline and a
// "Completeselular –" dateline before the first real sentence.
function excerpt(post) {
  const text = (post.excerpt ?? '').replace(/\s+/g, ' ').trim()
  const preamble = text.match(/^.{0,240}?Complete\s?selular\s*[–—-]\s*/i)?.[0]
  return preamble
    ? text.slice(preamble.length)
    : text.replace(/^.{0,200}?Penulis\s*:[^|]*\|\s*Editor\s*:\s*\S+\s*/i, '')
}

// WordPress stores `date` in the shop's local time (WIB) without an offset.
const withZone = (date) => (date && !/(Z|[+-]\d\d:?\d\d)$/.test(date) ? `${date}+07:00` : date)

function articleJsonLd(post, description, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image: image ? [absoluteUrl(image.src)] : undefined,
    datePublished: withZone(post.date),
    dateModified: withZone(post.modified ?? post.date),
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/img/site/icon-512.png') },
    },
    mainEntityOfPage: absoluteUrl(`/artikel/${post.slug}`),
  }
}
