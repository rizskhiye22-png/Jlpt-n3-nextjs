# Latihan JLPT N3

Aplikasi latihan soal JLPT N3 (9 periode, Desember 2019 – Desember 2024) dengan
gerbang lisensi dan proteksi anti-scraping.

**Stack:** Next.js 16.3 (App Router, Turbopack) · React 19 · Tailwind CSS 4.3 · Motion · lucide-react

## Menjalankan

```bash
npm install
npm run license -- --secret > .env.local   # buat LICENSE_SECRET & SESSION_SECRET
npm run license -- 5                       # buat 5 kode lisensi
npm run dev                                # http://localhost:3000
```

Produksi: `npm run build && npm run start`. Di Vercel, isi `LICENSE_SECRET` dan
`SESSION_SECRET` di Environment Variables (nilainya harus sama dengan yang dipakai
saat membuat kode lisensi).

## Mengelola lisensi

| Kebutuhan | Caranya |
|---|---|
| Buat kode baru | `npm run license -- 20` (butuh `LICENSE_SECRET` yang sama dengan server) |
| Cabut satu lisensi | Tambahkan ID-nya (12 karakter setelah `N3-`, tanpa tanda `-`) ke `LICENSE_REVOKED`, pisahkan dengan koma. Sesi yang sedang aktif langsung ikut ditolak. |
| Keluarkan semua orang | Ganti `SESSION_SECRET` (semua orang harus memasukkan kode lagi) |
| Batalkan semua kode | Ganti `LICENSE_SECRET` |

Kode lisensi ditandatangani HMAC-SHA256, jadi tidak perlu database dan tidak bisa
dipalsukan tanpa secret.

## Lapisan perlindungan

1. **Gerbang lisensi** — `/exam/*` dan semua API konten wajib sesi yang valid.
   Sesi = cookie `httpOnly` + `SameSite=Lax` + bertanda tangan HMAC, berlaku 30 hari.
2. **Pemeriksaan dua lapis** — `proxy.ts` menyaring di depan, lalu setiap halaman
   (`requireSession`) dan API (`guardApi`) memverifikasi ulang. Jangan hanya
   mengandalkan proxy untuk otorisasi.
3. **Kunci jawaban tidak pernah dikirim bersama soal.** `/api/questions` hanya
   berisi teks soal dan pilihan. Jawaban + pembahasan keluar dari `/api/check`
   satu per satu setelah pengguna menjawab.
4. **Batas laju per lisensi** — muat soal 20/menit, cek jawaban 40/menit,
   penilaian mode ujian 12/jam, total 3.000/hari. Aktivasi 8 percobaan/10 menit per IP.
5. **Data & gambar di luar `public/`** — JSON di `data/` hanya diimpor di server;
   gambar di `private/img/` dilayani lewat `/api/img/<token>` dengan nama file
   disamarkan HMAC.
6. **Anti-bot** — user-agent skrip/headless (curl, python, puppeteer, playwright,
   scrapy, dll.) ditolak; permintaan API lintas situs ditolak; `robots.txt`
   memblokir `/exam` dan `/api` serta crawler AI; header `X-Robots-Tag: noindex`.
7. **Header keamanan** — CSP ketat, `X-Frame-Options: DENY`, `nosniff`,
   `Referrer-Policy`, `Permissions-Policy`, HSTS (produksi).
8. **Pencegah ringan di tampilan** — watermark ID lisensi samar di kartu soal,
   salin/klik-kanan dinonaktifkan di area soal, konten disembunyikan saat dicetak.

### Batasan yang perlu diketahui

- Tidak ada cara 100% mencegah pemegang lisensi menyalin manual atau memotret
  layar. Watermark membantu melacak asal bocoran.
- Pembatas laju disimpan di memori — cukup untuk satu server. Untuk
  serverless/multi-instance (mis. Vercel), ganti isi `lib/rate-limit.ts` dengan
  penyimpanan bersama seperti Upstash Redis.
- Batas jumlah perangkat per lisensi butuh database; belum diterapkan.
- User-agent bisa dipalsukan; filter bot hanya menyaring scraper sederhana.
  Lapisan utama tetap lisensi + batas laju.

## Struktur

```
app/
  page.tsx                  Beranda (publik)
  aktivasi/                 Form kode lisensi
  exam/[slug]/              Ringkasan periode (butuh lisensi)
  exam/[slug]/[chapter]/    Layar latihan (butuh lisensi)
  api/license|logout|questions|check|img
components/practice.tsx     Layar latihan: mode latihan/ujian, navigator, hasil
lib/security.ts             Lisensi, sesi, deteksi bot (Web Crypto)
lib/session-server.ts       requireSession, guardApi
lib/exams.ts                Loader data (server-only)
proxy.ts                    Lapis pertama (Next.js 16: pengganti middleware)
data/                       JSON soal
private/img/                Ilustrasi soal (WebP)
```

## Catatan data

- Audio 聴解 tidak disertakan; pengguna memutar audio resmi sendiri.
- Soal yang ilustrasinya belum tersedia (gambar lama berisi potongan teks, jadi dihapus):
  2020-12 聴解 問題1 no.3 & 6 dan 問題4 no.1–4 · 2022-07 聴解 問題1 no.5 dan 問題4 no.2–4 ·
  2022-12 聴解 問題1 no.3 · 2023-12 聴解 問題4 no.3.
- Pembahasan 聴解 Desember 2024 di data asli tersalin sama ke semua bagian dan perlu
  ditulis ulang.
