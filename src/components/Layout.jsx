import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { GitCompareArrows, Home, LayoutGrid, MapPin, Menu, Search, Tag, X } from 'lucide-react'
import site from '../data/site.json'
import branches from '../data/branches.json'
import { mainNav, moreNav } from './nav'
import { socialIcons, WhatsAppIcon } from './icons'
import { waLink } from '../lib/wa'
import { useCompare } from '../lib/compare'
import Img from './Img'
export default function Layout() {
  const { pathname } = useLocation()
  // Block body on purpose: newer Chromium returns a Promise from scrollTo,
  // which React would mistake for an effect cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="btn-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
        Lewati ke konten
      </a>
      <Header />
      <main id="main" className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CompareBar />
      <a
        href={waLink()}
        target="_blank"
        rel="noopener"
        aria-label="Chat WhatsApp"
        className="fixed right-4 bottom-20 z-30 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg shadow-green-600/30 transition-transform hover:scale-105 lg:bottom-6"
      >
        <WhatsAppIcon className="size-7" />
      </a>
      <BottomNav />
    </div>
  )
}
function SearchForm({ autoFocus, onDone }) {
  const navigate = useNavigate()
  const ref = useRef(null)
  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault()
        const q = ref.current?.value.trim()
        navigate(q ? `/katalog?q=${encodeURIComponent(q)}` : '/katalog')
        onDone?.()
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        type="search"
        name="q"
        autoFocus={autoFocus}
        placeholder="Cari HP, tablet, brand…"
        aria-label="Cari produk"
        className="ring-brand-500 h-10 w-full rounded-full bg-slate-100 pr-4 pl-10 text-sm transition outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2"
      />
    </form>
  )
}
function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const compareCount = useCompare().length
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0" aria-label="Complete Selular — Beranda">
          <Img img={site.logoAlt} priority alt="Complete Selular" className="h-9 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Navigasi utama">
          {mainNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Search is a toggle at every width so the 8-item nav never overflows */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label={searchOpen ? 'Tutup pencarian' : 'Buka pencarian'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link
            to="/bandingkan"
            className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label={`Bandingkan produk (${compareCount})`}
          >
            <GitCompareArrows className="size-5" />
            {compareCount > 0 && (
              <span className="bg-accent-500 absolute top-1 right-1 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white">
                {compareCount}
              </span>
            )}
          </Link>
          <a
            href={waLink()}
            target="_blank"
            rel="noopener"
            className="btn-primary hidden !py-2 whitespace-nowrap md:inline-flex lg:hidden xl:inline-flex"
          >
            <WhatsAppIcon className="size-4" />
            Chat Admin
          </a>
        </div>
      </div>
      {searchOpen && (
        <div className="container-page max-w-2xl pb-3">
          <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  )
}
function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])
  const items = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/katalog', label: 'Katalog', icon: LayoutGrid },
    { to: '/promo', label: 'Promo', icon: Tag },
    { to: '/daftar-toko-cabang', label: 'Cabang', icon: MapPin },
  ]
  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-20 rounded-3xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {moreNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="block rounded-2xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${moreOpen ? 'text-brand-600' : 'text-slate-500'}`}
          >
            <Menu className="size-5" />
            Lainnya
          </button>
        </div>
      </nav>
    </>
  )
}
function CompareBar() {
  const items = useCompare()
  const { pathname } = useLocation()
  if (!items.length || pathname === '/bandingkan') return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-20 lg:bottom-6">
      <Link
        to="/bandingkan"
        className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        <GitCompareArrows className="size-4" />
        Bandingkan {items.length} produk
      </Link>
    </div>
  )
}
function Footer() {
  const year = new Date().getFullYear()
  const cities = [...new Set(branches.map((b) => b.city))].slice(0, 6)
  return (
    <footer className="bg-brand-950 pb-24 text-slate-300 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Img img={site.logo} alt="Complete Selular" className="h-10 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Sejak {site.since}, Complete Selular menemani masyarakat Indonesia dengan smartphone dan aksesoris
            berkualitas di {site.branchCount} cabang.
          </p>
          <div className="mt-5 flex gap-2">
            {site.socials.map((s) => {
              const Icon = socialIcons[s.name]
              return (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                  aria-label={s.name}
                  className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon className="size-[18px]" />
                </a>
              )
            })}
          </div>
        </div>

        <FooterCol title="Belanja">
          <FooterLink to="/katalog">Semua Produk</FooterLink>
          <FooterLink to="/semua-brand">Brand</FooterLink>
          <FooterLink to="/promo">Promo</FooterLink>
          <FooterLink to="/bandingkan">Bandingkan</FooterLink>
          <FooterLink to="/marketplace">Marketplace</FooterLink>
        </FooterCol>

        <FooterCol title="Informasi">
          <FooterLink to="/tentang-kami">Tentang Kami</FooterLink>
          <FooterLink to="/daftar-toko-cabang">Toko Cabang</FooterLink>
          <FooterLink to="/artikel-review">Artikel & Review</FooterLink>
          <FooterLink to="/video-review">Video Review</FooterLink>
        </FooterCol>

        <FooterCol title="Hubungi Kami">
          <a
            href={waLink()}
            target="_blank"
            rel="noopener"
            className="hover:text-brand-200 inline-flex items-center gap-2 text-white"
          >
            <WhatsAppIcon className="size-4" /> +62 811-2110-1168
          </a>
          <p className="text-sm text-slate-400">Cabang di {cities.join(', ')} &amp; kota lainnya.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {site.payments.map((p) => (
              <span key={p.name} className="rounded-md bg-white px-2 py-1">
                <Img img={p.img} alt={p.name} className="h-5 w-auto" />
              </span>
            ))}
          </div>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs text-slate-500">
          © {year} Complete Selular. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
function FooterCol({ title, children }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      <div className="flex flex-col gap-2.5 text-sm">{children}</div>
    </div>
  )
}
function FooterLink({ to, children }) {
  return (
    <Link to={to} className="text-slate-400 transition-colors hover:text-white">
      {children}
    </Link>
  )
}
