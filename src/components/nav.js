import { BookOpen, GitCompareArrows, House, Info, LayoutGrid, MapPin, SquarePlay, Store, Tag, Tags } from 'lucide-react'

// Each destination is defined once so the header, bottom nav, "Lainnya" sheet and footer always
// use the same name for it. `match` lists the detail routes that belong to that section.
const beranda = { to: '/', label: 'Beranda', icon: House }
const katalog = { to: '/katalog', label: 'Katalog', icon: LayoutGrid, match: ['/product/'] }
const brand = { to: '/semua-brand', label: 'Brand', icon: Tags, match: ['/brand/'] }
const promo = { to: '/promo', label: 'Promo', icon: Tag }
const artikel = { to: '/artikel-review', label: 'Artikel', icon: BookOpen, match: ['/artikel/'] }
const video = { to: '/video-review', label: 'Video', icon: SquarePlay }
const cabang = { to: '/daftar-toko-cabang', label: 'Cabang', icon: MapPin }
const tentang = { to: '/tentang-kami', label: 'Tentang Kami', icon: Info }
const bandingkan = { to: '/bandingkan', label: 'Bandingkan', icon: GitCompareArrows }
const marketplace = { to: '/marketplace', label: 'Marketplace', icon: Store }

// All nine fit beside the logo from 1024px only because Layout tightens the header there (logo,
// gaps and item padding): check the 1024 width after adding or renaming an item
export const mainNav = [beranda, katalog, brand, promo, artikel, video, cabang, marketplace, tentang]
export const bottomNav = [beranda, katalog, promo, cabang]
export const moreNav = [brand, artikel, video, bandingkan, marketplace, tentang]
export const footerNav = {
  belanja: [katalog, brand, promo, bandingkan, marketplace],
  informasi: [tentang, cabang, artikel, video],
}

// 'page' when the item is exactly this URL, 'section' when a detail page inside it is open, else null
export function navMatch(item, pathname) {
  if (pathname === item.to) return 'page'
  if (item.to === '/') return null
  const prefixes = [`${item.to}/`, ...(item.match ?? [])]
  return prefixes.some((p) => pathname.startsWith(p)) ? 'section' : null
}

// Value for aria-current: "page" on the exact URL, "true" (current section) on its detail pages
export const ariaCurrent = (match) => (match === 'page' ? 'page' : match ? 'true' : undefined)
