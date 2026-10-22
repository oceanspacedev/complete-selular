import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

// Native <dialog> + showModal(): the browser provides the focus trap, Escape, inert background
// and focus return. We add backdrop-click to close, scroll lock and consistent styling.
//   variant "sheet"    — bottom sheet on phones, centred card from sm up (menus, filters)
//   variant "lightbox" — full-screen dark viewer for images
export default function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  variant = 'sheet',
  className = '',
  children,
}) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [open])

  const styles = {
    sheet:
      'dialog-sheet m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-xl bg-white p-0 pb-[env(safe-area-inset-bottom)] text-ink shadow-[var(--shadow-lift)] backdrop:bg-slate-900/50 sm:m-auto sm:max-w-md sm:rounded-xl',
    lightbox: 'dialog-fade m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-slate-950/90',
  }

  return (
    <dialog
      ref={ref}
      // The title only renders while open, so the reference would point nowhere otherwise
      aria-labelledby={open ? titleId : undefined}
      className={`${styles[variant]} ${className}`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <>
          <div
            className={
              variant === 'lightbox'
                ? 'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 p-3 text-white sm:p-4'
                : // Sticky so the close button stays in reach when a long sheet scrolls
                  'border-line sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white py-1.5 pr-1.5 pl-4'
            }
          >
            <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-ink text-[15px] font-bold'}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className={`pointer-events-auto grid size-10 shrink-0 place-items-center rounded-lg pointer-coarse:size-11 ${
                variant === 'lightbox'
                  ? 'bg-white/15 text-white hover:bg-white/25'
                  : 'text-muted hover:text-ink hover:bg-slate-100'
              } ${hideTitle ? 'ml-auto' : ''}`}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  )
}
