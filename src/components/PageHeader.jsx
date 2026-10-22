import Breadcrumbs from './Breadcrumbs'

// Compact white band at the top of a page: breadcrumb trail, one heading, an optional one-line subtitle.
//   crumbs  trail after "Beranda"; defaults to the title. Pages with a marketing-style title should pass
//           the short page name instead, e.g. crumbs={[{ label: 'Promo' }]}
export default function PageHeader({ title, subtitle, crumbs, children }) {
  return (
    <header className="band">
      <div className="container-page py-4 sm:py-5">
        <Breadcrumbs items={crumbs ?? [{ label: title }]} />
        <h1 className="text-ink text-xl font-extrabold text-balance sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-muted mt-1 max-w-2xl text-sm text-pretty">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
