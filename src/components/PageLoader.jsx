// Skeleton shaped like the page that is loading, so content does not jump when it arrives.
//   variant "grid"    — listing pages (default): compact header band, then a card grid on the canvas
//   variant "product" — breadcrumb + gallery card + info card, with the product page's own spacing
//   variant "article" — narrow reading column
export default function PageLoader({ variant = 'grid' }) {
  if (variant === 'product')
    return (
      <div role="status" className="container-page py-3 sm:py-4">
        <span className="sr-only">Memuat…</span>
        <div aria-hidden>
          {/* Same height and gap as <Breadcrumbs> */}
          <div className="mb-2 flex h-4 items-center">
            <div className="skeleton h-3 w-56 max-w-full rounded" />
          </div>
          <div className="grid gap-3 md:grid-cols-[5fr_6fr] md:gap-4">
            {/* min-w-0 + self-start as in the real gallery: a stretched square would widen its column */}
            <div className="card min-w-0 p-3 sm:p-4 md:self-start">
              <div className="skeleton aspect-[4/3] rounded-lg sm:aspect-square" />
              {/* Most products have several photos, so the thumbnail strip is part of the shape */}
              <div className="mt-3 flex gap-2 overflow-hidden">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton size-14 shrink-0 rounded-lg sm:size-16" />
                ))}
              </div>
            </div>
            <div className="card min-w-0 space-y-3 p-4 sm:p-5">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-6 w-3/4 rounded" />
              <div className="skeleton h-8 w-40 rounded" />
              <div className="flex gap-2 pt-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="skeleton h-12 w-24 rounded-lg" />
                ))}
              </div>
              <div className="skeleton h-11 w-full rounded-lg sm:w-64" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton h-9 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  if (variant === 'article')
    return (
      <div role="status" className="container-page py-4 sm:py-6">
        <span className="sr-only">Memuat…</span>
        <div className="mx-auto max-w-3xl space-y-3" aria-hidden>
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-7 w-full rounded" />
          <div className="skeleton h-7 w-2/3 rounded" />
          <div className="skeleton mt-4 aspect-[16/9] rounded-lg" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-4 w-full rounded" />
          ))}
        </div>
      </div>
    )
  return (
    <div role="status">
      <span className="sr-only">Memuat…</span>
      <div aria-hidden>
        {/* Same box as <PageHeader>: breadcrumb line, h1, one-line subtitle */}
        <div className="band">
          <div className="container-page py-4 sm:py-5">
            <div className="mb-2 flex h-4 items-center">
              <div className="skeleton h-3 w-32 rounded" />
            </div>
            <div className="skeleton h-7 w-56 rounded sm:h-8" />
            <div className="skeleton mt-2 h-4 w-72 max-w-full rounded" />
          </div>
        </div>
        <div className="container-page py-3 sm:py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton aspect-[3/4.4] rounded-[var(--radius-card)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
