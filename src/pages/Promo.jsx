import { useState } from 'react'
import { X } from 'lucide-react'
import site from '../data/site.json'
import { waLink } from '../lib/wa'
import PageHeader from '../components/PageHeader'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { WhatsAppIcon } from '../components/icons'

export default function Promo() {
  const [open, setOpen] = useState(null)
  const { items } = site.promos
  return (
    <>
      <Seo title="Promo" description="Promo dan penawaran terbaru Complete Selular." />
      <PageHeader
        title="Yuk Ikutin Promonya!"
        subtitle="Buat kamu yang ingin upgrade smartphone, berikut promo yang tersedia."
      >
        <a
          href={waLink('Halo admin Complete Selular, bagaimana cara mendapatkan promo yang sedang berlangsung?')}
          target="_blank"
          rel="noopener"
          className="btn-wa mt-6"
        >
          <WhatsAppIcon className="size-4" /> Cara dapetin promo
        </a>
      </PageHeader>
      <div className="container-page py-10">
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {items.map((it, i) => (
            <button
              key={it.thumb.src}
              type="button"
              onClick={() => setOpen(it)}
              className="group card block w-full break-inside-avoid overflow-hidden"
              aria-label={`Lihat promo ${i + 1}`}
            >
              <Img
                img={it.thumb}
                alt=""
                className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
          <Img img={open.full} alt="" className="max-h-[85vh] w-auto rounded-2xl" />
        </div>
      )}
    </>
  )
}
