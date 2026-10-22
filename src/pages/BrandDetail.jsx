import { useParams } from 'react-router-dom'
import site from '../data/site.json'
import { brands } from '../data/brands.json'
import { useProducts } from '../lib/data'
import { GridSkeleton, ProductGrid } from '../components/ProductCard'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Img from '../components/Img'
import Seo from '../components/Seo'
import NotFound from './NotFound'

export default function BrandDetail() {
  const { slug } = useParams()
  const { data } = useProducts()
  const brand = brands.find((b) => b.slug === slug)
  if (!brand) return <NotFound />
  const list = data?.filter((p) => p.brand === slug)

  return (
    <>
      <Seo title={`HP ${brand.name}`} description={`Daftar harga HP ${brand.name} terbaru di Complete Selular.`} />
      <PageHeader
        title={brand.name}
        subtitle={`Daftar harga & spesifikasi ${brand.name} terbaru.`}
        crumbs={[{ to: '/semua-brand', label: 'Brand' }, { label: brand.name }]}
      >
        {site.brandLogos[slug] && (
          <Img img={site.brandLogos[slug]} alt="" className="mt-5 h-12 w-auto object-contain" />
        )}
      </PageHeader>
      <div className="container-page py-10">
        {!list ? (
          <GridSkeleton />
        ) : list.length ? (
          <ProductGrid products={list} priorityCount={4} />
        ) : (
          <EmptyState title="Belum ada produk">Produk {brand.name} akan segera hadir.</EmptyState>
        )}
      </div>
    </>
  )
}
