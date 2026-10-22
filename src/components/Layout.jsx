import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ArrowRight, ChevronRight, CircleAlert, GitCompareArrows, Menu, Search, X } from 'lucide-react'
import site from '../data/site.json'
import branches from '../data/branches.json'
import { ariaCurrent, bottomNav, footerNav, mainNav, moreNav, navMatch } from './nav'
import { socials, WhatsAppIcon } from './icons'
import { waLink } from '../lib/wa'
import { useCompare, useCompareNotice } from '../lib/compare'
import Dialog from './Dialog'
import Img from './Img'

// Navigation state that asks Layout to start the next page at the top even when only the query
// string changes (a new search on /katalog, tapping the tab you are already on).
const RESET = { resetScroll: true }

// On Home the first screen ends with the perks row exactly where the floating buttons sit, so they
// wait until the shopper scrolls a little (the hero has its own calls to action, the footer the WhatsApp number).
const HOME_FLOAT_OFFSET = 320

export default function Layout() {
  const { pathname } = useLocation()
  // Called before useScrolledPast so a new page is already scrolled to the top when that hook measures
  useRouteChangeEffects()
  const floatHidden = !useScrolledPast(HOME_FLOAT_OFFSET, pathname === '/')
  // Product pages render their own sticky buy bar below lg, so the floating extras step aside there
  const onProduct = pathname.startsWith('/product/')
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="bg-brand-600 fixed top-3 left-3 z-50 -translate-y-[150%] rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Lewati ke konten
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CompareBar hideBelowLg={onProduct} hidden={floatHidden} />
      <a
        href={waLink()}
        target="_blank"
        rel="noopener"
        aria-label="Chat admin via WhatsApp (buka di tab baru)"
        className={`site-fab bg-wa-600 hover:bg-wa-700 fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 size-14 place-items-center rounded-full text-white shadow-lg shadow-slate-900/25 transition-[background-color,scale,translate,opacity,visibility] duration-200 active:scale-95 lg:bottom-6 ${onProduct ? 'hidden lg:grid' : 'grid'} ${floatHidden ? 'invisible translate-y-3 opacity-0' : ''}`}
      >
        <WhatsAppIcon className="size-7" />
      </a>
      <CompareToast />
      <BottomNav />
    </div>
  )
}

// True once the window has scrolled more than `offset` px; always true while `active` is false
function useScrolledPast(offset, active) {
  const [past, setPast] = useState(() => !active || typeof window === 'undefined' || window.scrollY > offset)
  useLayoutEffect(() => {
    if (!active) {
      setPast(true)
      return
    }
    const update = () => setPast(window.scrollY > offset)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [offset, active])
  return past
}

/* ---------- Route changes: scroll + focus ---------- */

const SCROLL_STORE = 'cs-scroll'
let scrollPositions

function positions() {
  if (!scrollPositions) {
    try {
      scrollPositions = JSON.parse(sessionStorage.getItem(SCROLL_STORE)) || {}
    } catch {
      scrollPositions = {}
    }
  }
  return scrollPositions
}

function rememberScroll(key) {
  const all = positions()
  // Re-insert so the most recently used entries survive pruning
  delete all[key]
  all[key] = window.scrollY
}

function savePositions() {
  const all = positions()
  for (const k of Object.keys(all).slice(0, -50)) delete all[k]
  try {
    sessionStorage.setItem(SCROLL_STORE, JSON.stringify(all))
  } catch {}
}

// Link that had focus when the shopper left each history entry: { href, inMain, index }
const lastFocus = {}

function rememberFocus(key) {
  const el = document.activeElement
  delete lastFocus[key]
  // Links inside a dialog (the "Lainnya" sheet) are gone once it closes
  const href = el?.matches?.('a[href]') && !el.closest('dialog') && el.getAttribute('href')
  if (!href) return
  const main = document.getElementById('main')
  const inMain = !!main?.contains(el)
  lastFocus[key] = { href, inMain, index: sameLinks(inMain ? main : document, href).indexOf(el) }
  const keys = Object.keys(lastFocus)
  if (keys.length > 50) delete lastFocus[keys[0]]
}

// The same product can be linked twice on a page (two Home rails), so the position among them is kept too
function sameLinks(scope, href) {
  return [...scope.querySelectorAll('a[href]')].filter(
    (a) => a.getAttribute('href') === href && !a.closest('dialog') && isVisible(a),
  )
}

const isVisible = (el) => el.getClientRects().length > 0

// New pages (PUSH/REPLACE) start at the top with focus on their <h1>, so screen readers announce
// the page. Back/forward (POP) returns to where the shopper was — scroll position and the link they
// left from. We restore that ourselves because the browser restores before lazy routes and data
// have rendered, and lands near the footer.
function useRouteChangeEffects() {
  const location = useLocation()
  const navType = useNavigationType()
  const keyRef = useRef(location.key)
  const prev = useRef(null)

  // Rendering a new location: the DOM still shows the page we are leaving, so this is its true
  // position (scroll events alone can miss the last one, and by commit time it may be clamped)
  if (keyRef.current !== location.key) {
    rememberScroll(keyRef.current)
    rememberFocus(keyRef.current)
  }

  useEffect(() => {
    const restoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const onScroll = () => rememberScroll(keyRef.current)
    const onHide = () => {
      rememberScroll(keyRef.current)
      savePositions()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onHide)
      history.scrollRestoration = restoration
    }
  }, [])

  useLayoutEffect(() => {
    keyRef.current = location.key
    const from = prev.current
    prev.current = location
    if (!from || from.key === location.key) {
      // First render: only a reload or back/forward into this document should restore
      const type = performance.getEntriesByType?.('navigation')?.[0]?.type
      if (type === 'reload' || type === 'back_forward') return restoreScroll(positions()[location.key])
      delete positions()[location.key]
      return
    }
    const samePage = from.pathname === location.pathname
    if (navType === 'POP') {
      const stopScroll = restoreScroll(positions()[location.key])
      // On the same page (filters, search) the controls stay mounted: only step in if focus was lost
      const focusKept = samePage && document.activeElement && document.activeElement !== document.body
      const stopFocus = focusKept ? undefined : focusWhenReady(findLink(lastFocus[location.key]))
      return () => {
        stopScroll?.()
        stopFocus?.()
      }
    }
    // The product page swaps variants in place (new URL, same page): the shopper stays where they
    // were, with focus on the option they just picked
    if (location.state?.variantSwitch) return
    // Filters and sorting on the same page keep the shopper's place
    if (samePage && !location.state?.resetScroll) return
    window.scrollTo(0, 0)
    return focusWhenReady(findHeading)
  }, [location, navType])
}

function restoreScroll(y = 0) {
  const fits = () => document.documentElement.scrollHeight - window.innerHeight >= y - 1
  if (fits()) {
    window.scrollTo(0, y)
    return
  }
  // The page is still growing (lazy route chunk, data fetch, restored "load more"). Wait at the top:
  // a clamped scroll would sit on the footer and scroll anchoring would keep it there as content
  // arrives. Stop as soon as the shopper scrolls or taps so we never yank the page away from them.
  window.scrollTo(0, 0)
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown']
  const check = () => {
    if (!fits()) return
    window.scrollTo(0, y)
    stop()
  }
  const resized = new ResizeObserver(check)
  const mutated = new MutationObserver(check)
  const timer = setTimeout(stop, 4000)
  function stop() {
    resized.disconnect()
    mutated.disconnect()
    clearTimeout(timer)
    events.forEach((e) => window.removeEventListener(e, stop, true))
  }
  resized.observe(document.body)
  mutated.observe(document.body, { childList: true, subtree: true })
  events.forEach((e) => window.addEventListener(e, stop, { capture: true, passive: true }))
  return stop
}

// While a lazy page loads, React keeps the previous page in the DOM but hidden, so only visible
// elements count
function findHeading(main) {
  const h1 = [...main.querySelectorAll('h1')].find(isVisible)
  if (!h1) return null
  if (!h1.hasAttribute('tabindex')) h1.tabIndex = -1
  h1.classList.add('focus:outline-none')
  return h1
}

const findLink = (target) => (main) => {
  if (!target) return main
  const links = sameLinks(target.inMain ? main : document, target.href)
  return links[target.index] ?? links[0] ?? null
}

// Focuses what find(main) returns, without scrolling. Lazy pages and their data render later, so it
// keeps watching <main> and settles for <main> itself after 3 s.
function focusWhenReady(find) {
  const main = document.getElementById('main')
  if (!main) return
  let observer, fallback
  const events = ['pointerdown', 'keydown']
  const stop = () => {
    clearTimeout(start)
    clearTimeout(fallback)
    observer?.disconnect()
    events.forEach((e) => window.removeEventListener(e, stop, true))
  }
  const focus = (el) => {
    stop()
    el.focus({ preventScroll: true })
  }
  const attempt = () => {
    const el = find(main)
    if (el) focus(el)
    return !!el
  }
  // Deferred so a closing dialog (the "Lainnya" sheet) hands focus back first and we move it on from there
  const start = setTimeout(() => {
    if (attempt()) return
    observer = new MutationObserver(attempt)
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
    fallback = setTimeout(() => focus(main), 3000)
  })
  // Never pull focus away from something the shopper started using in the meantime
  events.forEach((e) => window.addEventListener(e, stop, true))
  return stop
}

/* ---------- Header ---------- */

// Icon buttons sit on the navy header band
const iconButton =
  'relative grid size-10 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 active:bg-white/20 pointer-coarse:size-11 aria-[current=page]:bg-white aria-[current=page]:text-navy-700'

export function SearchForm({ autoFocus, onDone, onEscape, defaultQuery, withButton, className = '' }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const ref = useRef(null)
  const current = defaultQuery ?? (pathname === '/katalog' ? (new URLSearchParams(search).get('q') ?? '') : '')
  return (
    <form
      role="search"
      aria-label="Cari produk"
      className={`flex w-full gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        const q = ref.current?.value.trim()
        navigate(q ? `/katalog?q=${encodeURIComponent(q)}` : '/katalog', { state: RESET })
        onDone?.()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onEscape) {
          e.preventDefault()
          onEscape()
        }
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500"
        />
        <input
          ref={ref}
          type="search"
          name="q"
          defaultValue={current}
          autoFocus={autoFocus}
          enterKeyHint="search"
          placeholder="Cari HP, tablet, brand…"
          aria-label="Cari produk"
          className="ring-brand-300 text-ink h-11 w-full rounded-lg border border-slate-300 bg-white pr-4 pl-10 text-base transition outline-none focus:ring-2 sm:h-10 sm:text-sm"
        />
      </div>
      {withButton && (
        <button type="submit" className="btn-primary h-11">
          Cari
        </button>
      )}
    </form>
  )
}

// Marketplace-style header: a navy band with the logo and an always-visible search field,
// then (desktop) a darker strip with the section links.
function Header() {
  const compareCount = useCompare().length
  const { pathname, search } = useLocation()
  return (
    <header className="site-header bg-navy-700 sticky top-0 z-40 text-white">
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 sm:flex-nowrap sm:py-3">
        <Link to="/" state={RESET} className="shrink-0 rounded-lg" aria-label="Complete Selular — Beranda">
          <Img img={site.logo} eager sizes="160px" alt="Complete Selular" className="h-8 w-auto sm:h-9" />
        </Link>

        {/* Full-width second row on phones, between logo and icons from sm */}
        <SearchForm
          key={pathname}
          className="order-last basis-full sm:order-none sm:mx-auto sm:max-w-xl sm:basis-auto"
        />

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <a
            href={waLink()}
            target="_blank"
            rel="noopener"
            className="hidden h-10 items-center gap-2 rounded-lg border border-white/60 px-3 text-sm font-bold whitespace-nowrap transition-colors hover:bg-white/10 md:inline-flex"
          >
            <WhatsAppIcon className="size-4" /> Chat Admin
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
          <Link
            to="/bandingkan"
            className={iconButton}
            aria-current={pathname === '/bandingkan' ? 'page' : undefined}
            aria-label={compareCount ? `Bandingkan produk, ${compareCount} dipilih` : 'Bandingkan produk'}
          >
            <GitCompareArrows className="size-5" aria-hidden />
            {compareCount > 0 && (
              <span
                aria-hidden
                className="bg-accent-600 ring-navy-700 absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white ring-2"
              >
                {compareCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav className="bg-navy-800 hidden lg:block" aria-label="Navigasi utama">
        <ul className="container-page flex h-11 items-stretch gap-1">
          {mainNav.map((n) => {
            const match = navMatch(n, pathname)
            return (
              <li key={n.to} className="flex">
                <Link
                  to={n.to}
                  state={RESET}
                  aria-current={ariaCurrent(match)}
                  className={`focus-ring-inset flex items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors ${match ? 'border-white text-white' : 'border-transparent text-white/75 hover:text-white'}`}
                >
                  {n.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

/* ---------- Bottom nav + "Lainnya" sheet (below lg) ---------- */

const tabClass =
  'group focus-ring-inset relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted select-none active:bg-slate-50'

// Active tab: brand colour plus a short bar on top, so the state does not rely on colour alone
function TabIcon({ icon: Icon, active }) {
  return (
    <>
      {active && <span aria-hidden className="bg-brand-600 absolute top-0 h-0.5 w-8 rounded-b" />}
      <Icon
        className={`size-[22px] ${active ? 'text-brand-600' : ''}`}
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden
      />
    </>
  )
}

function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = moreNav.some((n) => navMatch(n, pathname))

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  // The trigger disappears at lg; close the sheet rather than leave a modal nobody opened on screen
  useEffect(() => {
    if (!moreOpen) return
    const mq = window.matchMedia('(min-width: 64rem)')
    const onChange = () => mq.matches && setMoreOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [moreOpen])

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="site-bottom-nav border-line fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgb(51_53_56/0.06)] lg:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {bottomNav.map((n) => {
            const match = navMatch(n, pathname)
            return (
              <li key={n.to} className="flex">
                <Link to={n.to} state={RESET} aria-current={ariaCurrent(match)} className={tabClass}>
                  <TabIcon icon={n.icon} active={!!match} />
                  <span className={match ? 'text-brand-700' : undefined}>{n.label}</span>
                </Link>
              </li>
            )
          })}
          <li className="flex">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={tabClass}
            >
              <TabIcon icon={Menu} active={moreActive} />
              <span className={moreActive ? 'text-brand-700' : undefined}>Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>
      {/* From sm up the sheet sits above its trigger in the bottom-right corner instead of mid-screen,
          capped to the space above the nav so its header never slides off a short (landscape) screen */}
      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Menu lainnya"
        className="sm:mt-auto! sm:mr-4! sm:mb-[calc(5rem+env(safe-area-inset-bottom))]! sm:ml-auto! sm:max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom))]! sm:max-w-xs!"
      >
        <ul className="grid gap-1 p-3">
          {moreNav.map((n) => {
            const match = navMatch(n, pathname)
            const Icon = n.icon
            return (
              <li key={n.to}>
                <Link
                  to={n.to}
                  state={RESET}
                  aria-current={ariaCurrent(match)}
                  onClick={() => setMoreOpen(false)}
                  className={`focus-ring-inset flex min-h-12 items-center gap-3 rounded-lg px-3 transition-colors ${match ? 'bg-brand-50 text-brand-700 font-semibold' : 'font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100'}`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${match ? 'bg-brand-100' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1">{n.label}</span>
                  <ChevronRight className={`size-4 ${match ? '' : 'text-slate-400'}`} aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </Dialog>
    </>
  )
}

/* ---------- Compare pill + toast ---------- */

function CompareBar({ hideBelowLg, hidden }) {
  const n = useCompare().length
  const { pathname } = useLocation()
  if (!n || pathname === '/bandingkan') return null
  // With one product the compare page asks for a second one, so the label promises a view, not a comparison
  const action = n > 1 ? 'Bandingkan' : 'Lihat perbandingan'
  // The pill must fit beside the WhatsApp button: the longer one-product label sheds words sooner
  // (below 360px only the action is left; the header icon still shows the count)
  const countClass = n > 1 ? '' : 'max-[359px]:hidden'
  const wordClass = n > 1 ? 'max-[359px]:hidden' : 'max-[409px]:hidden'
  return (
    // The wrapper spans the free space beside the WhatsApp button but lets taps through to the page;
    // only the pill itself is clickable. It is vertically centred on the button.
    <div
      className={`site-fab pointer-events-none fixed inset-x-0 bottom-[calc(5.375rem+env(safe-area-inset-bottom))] z-30 flex justify-center pr-[5.25rem] pl-4 lg:bottom-[1.875rem] lg:justify-end ${hideBelowLg ? 'max-lg:hidden' : ''}`}
    >
      <Link
        to="/bandingkan"
        aria-label={`${n} produk dipilih, ${action.toLowerCase()}`}
        className={`pointer-events-auto flex min-h-11 items-center gap-2 rounded-full bg-slate-900 py-2 pr-4 pl-3.5 text-sm whitespace-nowrap text-white shadow-xl ring-1 ring-white/20 transition-[background-color,scale,translate,opacity,visibility] duration-200 hover:bg-slate-800 active:scale-[0.97] ${hidden ? 'invisible translate-y-3 opacity-0' : ''}`}
      >
        <GitCompareArrows className="size-4 shrink-0" aria-hidden />
        <span className={countClass}>
          {n} <span className={wordClass}>produk </span>dipilih
        </span>
        <span aria-hidden className={`text-slate-400 ${countClass}`}>
          ·
        </span>
        <span className="font-semibold">{action}</span>
      </Link>
    </div>
  )
}

// Visible counterpart of the compare announcements for a refused add ("Maksimal 3 produk"), which
// otherwise only reaches screen readers. compare.js already speaks it, so this is not a live region.
// It stays while hovered or focused so there is time to reach its link.
function CompareToast() {
  const notice = useCompareNotice()
  const { pathname } = useLocation()
  const [toast, setToast] = useState(null)
  const held = useRef(false)
  const timer = useRef()

  const hideAfter = (ms) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => !held.current && setToast(null), ms)
  }
  const hold = () => {
    held.current = true
    clearTimeout(timer.current)
  }
  const release = (e) => {
    const box = e.currentTarget
    // Still in use while either the pointer or the focus remains inside
    if (
      e.type === 'blur' ? box.contains(e.relatedTarget) || box.matches(':hover') : box.contains(document.activeElement)
    )
      return
    held.current = false
    hideAfter(2000)
  }
  const close = () => {
    held.current = false
    clearTimeout(timer.current)
    setToast(null)
  }

  useEffect(() => {
    if (notice?.kind !== 'full') {
      // A later add or remove makes "the list is full" stale
      if (notice && !held.current) setToast(null)
      return
    }
    held.current = false
    setToast(notice)
    hideAfter(5000)
  }, [notice])

  useEffect(close, [pathname])
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-[5.75rem] lg:justify-end [@media(max-height:30rem)]:bottom-4">
      <div
        key={toast.id}
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocus={hold}
        onBlur={release}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-slate-900 py-3 pr-2 pl-4 text-sm text-white shadow-xl ring-1 ring-white/15"
      >
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p>{toast.text}</p>
          {pathname !== '/bandingkan' && (
            <Link
              to="/bandingkan"
              className="text-brand-200 -my-1 mt-0.5 inline-flex min-h-9 items-center gap-1 font-semibold underline-offset-2 hover:text-white hover:underline pointer-coarse:min-h-11"
            >
              Buka Bandingkan <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Tutup pesan"
          className="-my-1 grid size-9 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white pointer-coarse:size-11"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ---------- Footer ---------- */

// site.json used to carry slugs; newer data has display names, which pass through unchanged
const PAYMENT_NAMES = {
  kredivo: 'Kredivo',
  akulaku: 'Akulaku',
  spaylater: 'SPayLater',
  homecredit: 'Home Credit',
  blibliinstore: 'Blibli InStore',
  baf: 'BAF',
  travelokaspayl: 'Traveloka PayLater',
  samsungfplus: 'Samsung Finance+',
}
const paymentName = (name) => PAYMENT_NAMES[name] ?? name

// "6281121101168" → "+62 811-2110-1168"
const formatPhone = (d) => `+${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9)}`

function Footer() {
  const year = new Date().getFullYear()
  const cities = [...new Set(branches.map((b) => b.city))].slice(0, 6)
  return (
    <footer className="site-footer bg-navy-900 pb-[calc(9.5rem+env(safe-area-inset-bottom))] text-[13px] text-slate-300 lg:pb-0">
      <div className="container-page py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-x-8">
          <div className="col-span-2 lg:col-span-1">
            <Img img={site.logo} alt="Complete Selular" className="h-8 w-auto" />
            <p className="mt-3 max-w-sm leading-relaxed">
              Toko HP, tablet &amp; aksesoris resmi sejak {site.since}, dengan {site.branchCount} cabang di Indonesia.
            </p>
            <ul className="mt-3 -ml-2 flex gap-1">
              {site.socials.map((s) => {
                const social = socials[s.name]
                if (!social) return null
                const Icon = social.icon
                return (
                  <li key={s.name}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Complete Selular di ${social.label} (buka di tab baru)`}
                      className="grid size-9 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white pointer-coarse:size-11"
                    >
                      <Icon className="size-[18px]" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <FooterCol title="Belanja" items={footerNav.belanja} />
          <FooterCol title="Informasi" items={footerNav.informasi} />

          <div className="col-span-2 lg:col-span-1">
            <h2 className="mb-2 text-[13px] font-bold text-white">Hubungi Kami</h2>
            <a
              href={waLink()}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline pointer-coarse:min-h-11"
            >
              <WhatsAppIcon className="size-4" />
              <span>
                <span className="sr-only">WhatsApp </span>
                {formatPhone(site.whatsapp)}
                <span className="sr-only"> (buka di tab baru)</span>
              </span>
            </a>
            <p className="mt-1 leading-relaxed">Cabang di {cities.join(', ')} &amp; kota lainnya.</p>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <h2 className="mb-2 text-[13px] font-bold text-white">Cicilan &amp; pembayaran</h2>
          <ul className="flex flex-wrap gap-2">
            {site.payments.map((p) => (
              <li
                key={p.name}
                className="flex h-8 w-16 items-center justify-center overflow-hidden rounded bg-white p-1"
              >
                {/* Fixed box + object-contain: wide or tall logos (BAF) scale down instead of spilling out */}
                <Img img={p.img} alt={paymentName(p.name)} className="size-full object-contain" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-3 text-xs text-slate-400">
          © {year} Complete Selular. Hak cipta dilindungi undang-undang.
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-bold text-white">{title}</h2>
      <ul className="flex flex-col items-start gap-1.5 pointer-coarse:gap-0">
        {items.map((n) => (
          <li key={n.to}>
            <Link
              to={n.to}
              state={RESET}
              className="inline-flex items-center text-slate-300 transition-colors hover:text-white hover:underline pointer-coarse:min-h-9"
            >
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
