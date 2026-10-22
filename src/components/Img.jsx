// Always emits intrinsic width/height so the layout never shifts while images load.
export default function Img({ img, priority, alt = '', className, ...rest }) {
  if (!img) return <div className={`bg-slate-100 ${className ?? ''}`} aria-hidden />
  return (
    <img
      src={img.src}
      width={img.w}
      height={img.h}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={className}
      {...rest}
    />
  )
}
