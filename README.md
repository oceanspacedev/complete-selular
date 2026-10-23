# Complete Selular — Website (React + Tailwind)

Redesign completeselular.co.id dengan **React 18 + Vite + Tailwind CSS v4**. Ini masih **prototype**: data dan gambar berupa snapshot yang diambil dari situs WordPress lama.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
```

## Memperbarui data dari situs lama

```bash
npm run scrape                                # ±12 produk per brand, 24 artikel
node scripts/scrape.mjs --per-brand 40 --refresh
```

Script ini mengambil:

- Produk, brand, dan artikel dari WP REST API.
- Harga, spesifikasi, dan galeri dari HTML halaman produk.
- Data cabang, tentang kami, promo, dan video dari halaman terkait.

Semua gambar diunduh lalu dikonversi ke WebP di `public/img/`. Response HTTP disimpan di cache `.cache/`, jadi re-run berjalan cepat. Pakai `--refresh` untuk mengambil ulang.

Setelah scrape, jalankan `npm run banners` untuk membuat ulang banner carousel di Beranda (produk terbaru, cicilan, cabang). Harga, partner cicilan, jumlah cabang, dan rating diambil dari data hasil scrape. Hasilnya `public/img/banners/house-*.webp` dan `src/data/banners.json`. Script ini memakai font Segoe UI, jadi jalankan di Windows.

| Lokasi | Isi |
| --- | --- |
| `src/data/*.json` | Data kecil yang ikut di-bundle: site, brand, cabang |
| `public/data/*.json` | Data produk, artikel, dan video yang di-fetch saat dibutuhkan |
| `public/img/**` | Gambar WebP hasil download |

## Struktur

```
src/
  components/   Layout (header, bottom nav, footer), ProductCard, Rail, Img, Seo, …
  pages/        Home, Catalog, ProductDetail, Brands, BrandDetail, Promo, Branches,
                About, Articles, ArticleDetail, Videos, Compare, Marketplace, NotFound
  lib/          data hooks, format Rupiah, link WhatsApp, store "Bandingkan"
  index.css     design tokens (warna brand) + utility Tailwind
```

URL dibuat sama dengan situs lama (`/product/:slug`, `/brand/:slug`, `/katalog`, `/promo`, `/daftar-toko-cabang`, `/tentang-kami`, …) supaya link lama dan SEO tetap jalan.

## Deploy ke cPanel

1. Jalankan `npm run build`. Hasilnya ada di folder `dist/`, dan `.htaccess` sudah ikut di dalamnya.
2. Buka cPanel → File Manager → `public_html`. **Backup dulu situs WordPress lama.**
3. Upload seluruh isi `dist/` (bukan folder `dist` itu sendiri) ke `public_html`. Pastikan file `.htaccess` ikut ter-upload; aktifkan "Show hidden files" bila perlu.

`.htaccess` mengarahkan semua URL ke `index.html` (SPA), memaksa HTTPS, serta mengaktifkan gzip dan cache 1 tahun untuk aset.

## Selanjutnya (produksi)

Agar admin tetap bisa update produk lewat WordPress, ada dua pilihan:

- Jadikan WordPress *headless* di subdomain (mis. `admin.completeselular.co.id`), tambahkan snippet PHP `register_rest_field` untuk harga/spesifikasi, lalu jalankan scrape + build secara terjadwal.
- Atau ganti loader di `src/lib/data.js` agar membaca langsung dari REST API.
