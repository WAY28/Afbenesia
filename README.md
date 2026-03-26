# 📊 Kelas Kilat Digital Marketing – Batch 05 (v2)

**Penyelenggara:** Afbenesia | **Tanggal:** 18 Oktober 2025

---

## 🚀 Fitur Utama

| Fitur | Keterangan |
|---|---|
| ✅ **Google Sheets Sync** | Data peserta ditarik langsung dari Google Sheets via Apps Script |
| 🔄 **Auto Refresh** | Data otomatis diperbarui setiap 30 detik (polling) |
| 🔍 **Pencarian Real-time** | Cari nama, institusi, atau ID peserta |
| 🏷️ **Filter Status** | Filter Semua / Lunas / Belum Bayar |
| 📊 **Statistik Live** | Counter animasi total, lunas, belum bayar, % pelunasan |
| 📄 **Pagination** | 20 peserta per halaman, navigasi halaman |
| ↕️ **Sort Kolom** | Klik header tabel untuk mengurutkan |
| 📥 **Export CSV** | Download data peserta dalam format CSV |
| 🟡 **Live Indicator** | Badge menunjukkan status koneksi (Live/Demo) |
| 📱 **Fully Responsive** | Mobile, tablet, laptop, desktop |
| 🎭 **Fallback Dummy** | 150 peserta dummy jika Sheets belum terhubung |

---

## 📁 Struktur Folder

```
/afbenesia-dm05
 ├── index.html
 ├── css/
 │    └── style.css
 ├── js/
 │    ├── script.js            ← Logika utama + Google Sheets fetch
 │    └── dummy-data.js        ← 150 data dummy (fallback)
 ├── google-apps-script/
 │    └── Code.gs              ← Script yang di-deploy ke Google Sheets
 ├── assets/
 └── README.md
```

---

## ⚙️ Setup Google Sheets (Langkah demi Langkah)

### STEP 1 — Siapkan Google Sheets dari Google Form

1. Buka Google Form kamu → klik tab **"Responses"**
2. Klik ikon **Google Sheets** (hijau) → "Create a new spreadsheet"
3. Spreadsheet akan berisi sheet bernama **"Form Responses 1"** dengan kolom otomatis

---

### STEP 2 — Deploy Apps Script

1. Di Google Sheets → **Extensions → Apps Script**
2. Hapus semua kode, paste isi `google-apps-script/Code.gs`
3. Sesuaikan variabel `COL` dengan nama kolom di sheet kamu
4. Klik **Run → testGetPeserta** untuk verifikasi
5. **Deploy → New deployment** → Type: Web App → Execute as: Me → Who has access: Anyone
6. Copy URL hasil deployment

### STEP 3 — Pasang URL ke Website

Buka `js/script.js`, ganti baris:
```javascript
const APPS_SCRIPT_URL = 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI';
```
dengan URL Apps Script kamu.

---

## 🔄 Alur Data Otomatis

```
Google Form diisi peserta
        ↓
Google Sheets menyimpan response
        ↓
Landing page polling setiap 30 detik
        ↓
Tabel peserta diperbarui otomatis
```

---

## 🛠 Teknologi

- HTML5 + CSS3 + Vanilla JavaScript (zero dependency)
- Google Apps Script (backend gratis, no API key)
- Google Sheets sebagai database
- Google Fonts: Syne + DM Sans

---

## 🚀 Cara Menjalankan

**Demo (tanpa Sheets):** Buka `index.html` langsung di browser — tampil 150 dummy data.

**Live (dengan Sheets):** Ikuti Step 1-3, lalu buka via Live Server atau hosting (GitHub Pages, Netlify, dll).

> ⚠️ Buka via `file://` mungkin blokir fetch di beberapa browser. Gunakan Live Server.

---

*Afbenesia — Batch 05 Digital Marketing, 2025*"# Afbenesia" 
