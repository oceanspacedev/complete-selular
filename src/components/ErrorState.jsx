import { waLink } from '../lib/wa'
import { WhatsAppIcon } from './icons'

// Shown when a data request fails for a reason other than "not found" (offline, server error).
export default function ErrorState({ onRetry, title = 'Gagal memuat data', as: Heading = 'h2', className = '' }) {
  return (
    <div role="alert" className={`card flex flex-col items-center px-4 py-8 text-center sm:py-10 ${className}`}>
      <Heading className="text-ink text-base font-extrabold text-balance">{title}</Heading>
      <p className="text-muted mt-1 max-w-sm text-sm">Periksa koneksi internet kamu, lalu coba lagi.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary">
            Coba lagi
          </button>
        )}
        <a href={waLink()} target="_blank" rel="noopener" className="btn-ghost">
          <WhatsAppIcon className="size-4" /> Tanya via WhatsApp
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      </div>
    </div>
  )
}
