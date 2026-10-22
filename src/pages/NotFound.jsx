import { Link } from 'react-router-dom'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <Seo title="Halaman tidak ditemukan" />
      <p className="text-brand-600 text-7xl font-extrabold">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-slate-600">Mungkin halamannya sudah dipindah. Yuk lihat produk terbaru kami.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary">
          Ke Beranda
        </Link>
        <Link to="/katalog" className="btn-ghost">
          Lihat Katalog
        </Link>
      </div>
    </div>
  )
}
