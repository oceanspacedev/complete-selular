export default function PageLoader() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Memuat">
      <div className="skeleton mb-6 h-8 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  )
}
