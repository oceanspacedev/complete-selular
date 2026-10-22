import site from '../data/site.json'
export function waLink(text = 'Halo admin Complete Selular, saya tahu dari website. Boleh tanya produk/promonya?') {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`
}
export const waProduct = (name, price) =>
  waLink(
    `Halo admin Complete Selular, saya tertarik dengan *${name}*${price ? ` (${price})` : ''}. Apakah stoknya tersedia?`,
  )
