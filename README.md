# 📊 Kelas Kilat Digital Marketing – Batch 05

**Penyelenggara:** Afbenesia | **Tanggal:** 18 Oktober 2025

---

## 📌 Tentang Project

Website landing page sekaligus dashboard peserta untuk **Kelas Kilat Digital Marketing Batch 05** yang diselenggarakan oleh Afbenesia. Halaman ini menampilkan daftar peserta secara real-time yang tersinkronisasi langsung dari Google Sheets melalui Google Apps Script, dilengkapi fitur pencarian, filter status pembayaran, statistik live, dan ekspor data.

---

## 🚀 Fitur Utama

| Fitur | Keterangan |
|---|---|
| ✅ **Google Sheets Sync** | Data peserta ditarik langsung dari Google Sheets via Apps Script |
| 🔄 **Auto Refresh** | Data otomatis diperbarui setiap 30 detik |
| 🔍 **Pencarian Real-time** | Cari berdasarkan nama, institusi, atau ID peserta |
| 🏷️ **Filter Status** | Filter Semua / Lunas / Belum Bayar |
| 📊 **Statistik Live** | Counter animasi total, lunas, belum bayar, % pelunasan |
| 📄 **Pagination** | 20 peserta per halaman |
| ↕️ **Sort Kolom** | Klik header tabel untuk mengurutkan data |
| 📥 **Export Excel** | Download data peserta langsung dalam format `.xlsx` yang sudah terformat rapi |
| 🟢 **Live Indicator** | Badge status koneksi (Live / Offline) |
| 📱 **Fully Responsive** | Mendukung mobile, tablet, laptop, dan desktop |

---

## 📁 Struktur Folder

```
/afbenesia-dm05
 ├── index.html               ← Halaman utama
 ├── css/
 │    └── style.css           ← Semua styling
 ├── js/
 │    └── script.js           ← Logika utama + Google Sheets fetch + Export Excel
 ├── assets/
 │    └── afbenesia.jpg       ← Logo Afbenesia
 └── README.md
```

---

## 🛠 Teknologi

- **HTML5 + CSS3 + Vanilla JavaScript** — tanpa framework, zero dependency
- **Google Apps Script** — backend gratis, tidak perlu API key
- **Google Sheets** — sebagai database peserta
- **SheetJS (xlsx.js)** — library ekspor Excel, dimuat otomatis via CDN saat dibutuhkan
- **Google Fonts** — Syne + DM Sans

---

## ⚙️ Setup Google Sheets

### STEP 1 — Siapkan Spreadsheet dari Google Form

1. Buka Google Form kamu → klik tab **"Responses"**
2. Klik ikon **Google Sheets** (hijau) → pilih "Create a new spreadsheet"
3. Spreadsheet otomatis berisi sheet **"Form Responses 1"**

### STEP 2 — Deploy Apps Script

1. Di Google Sheets → **Extensions → Apps Script**
2. Hapus semua kode yang ada, lalu paste kode Apps Script kamu
3. Sesuaikan variabel kolom dengan nama kolom di sheet
4. Klik **Run → testGetPeserta** untuk verifikasi
5. **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone** ⚠️ wajib diset ini
6. Copy URL hasil deployment

### STEP 3 — Pasang URL ke Website

Buka `js/script.js`, isi variabel berikut di baris paling atas:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXX/exec';
```

---

## 🔄 Alur Data

```
Google Form diisi peserta
        ↓
Google Sheets menyimpan response
        ↓
Website polling setiap 30 detik
        ↓
Tabel peserta diperbarui otomatis
```

---

## 🚀 Cara Menjalankan

**Mode Live (dengan Google Sheets):**
1. Selesaikan setup di atas (Step 1–3)
2. Upload semua file ke hosting (Netlify, Vercel, GitHub Pages, dll)
3. Buka URL website — data akan langsung muncul dari Sheets

> ⚠️ Jangan buka via `file://` di browser karena fetch akan diblokir. Gunakan Live Server atau hosting.

---

## 📝 Catatan Tambahan

- Jika URL Apps Script belum diisi atau salah, website akan menampilkan **banner peringatan kuning** dengan pesan error yang jelas — tidak ada data dummy.
- Pastikan deployment Apps Script selalu menggunakan setting **"Who has access: Anyone"**, jika tidak data tidak akan bisa diambil.
- Fitur Export Excel menggunakan SheetJS yang dimuat dari CDN — membutuhkan koneksi internet saat tombol diklik.
- Logo disimpan di folder `assets/` dan digunakan di navbar, footer, dan favicon.

---

*Afbenesia — Batch 05 Digital Marketing, 2025*
