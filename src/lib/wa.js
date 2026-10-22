import site from '../data/site.json'

// wa.me only accepts the number as plain digits with the country code.
const number = String(site.whatsapp).replace(/\D/g, '')

export function waLink(text = 'Halo Admin Complete Selular, saya mau tanya produk dan promo yang tersedia.') {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

// name: product or model name; price: already formatted (e.g. "Rp5.599.000"); url: product page, so the
// admin knows the exact listing. options.variant ("8/256GB") and options.color ("Biru") are the shopper's
// picks on the product page; a variant already spelled out in the name is not repeated.
export function waProduct(name, price, url, { variant, color } = {}) {
  const item = [
    `*${name}*`,
    variant && !name.toLowerCase().includes(variant.toLowerCase()) && `varian ${variant}`,
    color && `warna ${color}`,
  ]
    .filter(Boolean)
    .join(' ')
  const ask = price
    ? color
      ? `Apakah stok warna ${color} masih tersedia?`
      : 'Apakah stoknya masih tersedia?'
    : color
      ? `Boleh info harga dan ketersediaan warna ${color}?`
      : 'Boleh info harga dan ketersediaan stoknya?'
  const lines = [`Halo Admin Complete Selular, saya tertarik dengan ${item}${price ? ` (${price})` : ''}.`, ask, url]
  return waLink(lines.filter(Boolean).join('\n'))
}
