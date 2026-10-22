// Always emits intrinsic width/height so the layout never shifts while images load.
//   img       { src, w, h, srcset? } from the scraped data
//   sizes     forwarded when the image has a srcset
//   priority  the page's LCP image: eager + fetchpriority=high (use once per page)
//   eager     above the fold but not the LCP (e.g. the logo)
//   noUpscale never render wider/taller than the source pixels (tiny admin uploads stay crisp)
export default function Img({ img, priority, eager, noUpscale, sizes, alt = '', className = '', style, ...rest }) {
  if (!img) return <div className={`bg-slate-100 ${className}`} aria-hidden />
  return (
    <img
      src={img.src}
      srcSet={img.srcset}
      sizes={img.srcset ? sizes : undefined}
      width={img.w}
      height={img.h}
      alt={alt}
      loading={priority || eager ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={className}
      style={noUpscale ? { maxWidth: img.w, maxHeight: img.h, margin: 'auto', ...style } : style}
      {...rest}
    />
  )
}
