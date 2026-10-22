import { Component, lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PageLoader from './components/PageLoader'
import ErrorState from './components/ErrorState'
const Catalog = lazy(() => import('./pages/Catalog'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Brands = lazy(() => import('./pages/Brands'))
const BrandDetail = lazy(() => import('./pages/BrandDetail'))
const Promo = lazy(() => import('./pages/Promo'))
const Branches = lazy(() => import('./pages/Branches'))
const About = lazy(() => import('./pages/About'))
const Articles = lazy(() => import('./pages/Articles'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const Videos = lazy(() => import('./pages/Videos'))
const Compare = lazy(() => import('./pages/Compare'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const NotFound = lazy(() => import('./pages/NotFound'))
// Paths mirror the old WordPress URLs so existing links and search results keep working.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="katalog" element={<Lazy el={<Catalog />} />} />
        <Route path="semua-produk" element={<Navigate to="/katalog" replace />} />
        <Route path="product/:slug" element={<Lazy el={<ProductDetail />} loader="product" />} />
        <Route path="semua-brand" element={<Lazy el={<Brands />} />} />
        <Route path="brand/:slug" element={<Lazy el={<BrandDetail />} />} />
        <Route path="promo" element={<Lazy el={<Promo />} />} />
        <Route path="daftar-toko-cabang" element={<Lazy el={<Branches />} />} />
        <Route path="tentang-kami" element={<Lazy el={<About />} />} />
        <Route path="artikel-review" element={<Lazy el={<Articles />} />} />
        <Route path="seputar-gadgets" element={<Navigate to="/artikel-review" replace />} />
        <Route path="artikel/:slug" element={<Lazy el={<ArticleDetail />} loader="article" />} />
        <Route path="video-review" element={<Lazy el={<Videos />} />} />
        <Route path="bandingkan" element={<Lazy el={<Compare />} />} />
        <Route path="marketplace" element={<Lazy el={<Marketplace />} />} />
        <Route path="*" element={<Lazy el={<NotFound />} />} />
      </Route>
    </Routes>
  )
}
// The skeleton matches the page that is loading so nothing jumps when it arrives
function Lazy({ el, loader = 'grid' }) {
  const { pathname } = useLocation()
  return (
    <ChunkBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader variant={loader} />}>{el}</Suspense>
    </ChunkBoundary>
  )
}
// A page's code chunk can fail to download (flaky connection, or a deploy replaced the old files).
// Without this the whole app would go blank; instead show a retry inside the normal layout.
class ChunkBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="container-page py-10">
        <ErrorState title="Halaman gagal dimuat" onRetry={() => window.location.reload()} />
      </div>
    )
  }
}
