const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
export const formatPrice = (n) => (n ? rupiah.format(n).replace(/\s/g, '') : 'Hubungi kami')
export const formatDate = (iso) => date.format(new Date(iso))
