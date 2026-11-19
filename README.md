# Jabar Health Monitor

Dashboard interaktif **Pemantauan dan Analisis Persebaran Fasilitas Kesehatan Jawa Barat, 2018–2024** untuk proyek *Perancangan Dashboard Smart City* (Visualisasi Data). Dibangun dengan pendekatan **Goal-Driven**: setiap visualisasi menjawab satu Critical Business Question (CBQ) melalui KPI yang didefinisikan eksplisit — bukan grafik "karena kolomnya ada".

Seluruh angka dihitung saat runtime dari `src/data/healthcare_dashboard_ready.csv` (hasil pipeline cleaning `smart-city-clean-data/`). **Tidak ada angka dummy atau hasil analisis yang di-hardcode.**

## Cara menjalankan

```bash
npm install
npm run dev        # buka http://localhost:5173
```

Perintah lain:

```bash
npm test           # unit test + test integrasi dataset (vitest, 38 test)
npm run build      # build produksi (tsc + vite build)
npm run preview    # pratinjau hasil build
```

## Tech stack

React 19 + Vite + TypeScript · Tailwind CSS v4 · Recharts · Leaflet + React Leaflet · Lucide React · Papa Parse · Vitest.

## Struktur folder

```text
src/
├── components/
│   ├── layout/Header.tsx            # header + navigasi 4 halaman
│   ├── filters/GlobalFilters.tsx    # filter global + Reset
│   ├── scorecards/Scorecards.tsx    # Zona atas: 5 KPI cards
│   ├── charts/
│   │   ├── TrendChart.tsx           # CBQ 1 — line chart (satu skala Y, semua jenis)
│   │   ├── RankChart.tsx            # CBQ 2 — horizontal bar peringkat
│   │   ├── GrowthChart.tsx          # CBQ 3 — diverging bar 2018–2024
│   │   ├── CompositionChart.tsx     # CBQ 4 — 100% stacked (tanpa Posyandu)
│   │   └── QualityHeatmap.tsx       # CBQ 5 — heatmap kualitas data
│   ├── map/ChoroplethMap.tsx        # choropleth 27 kab/kota (Leaflet)
│   └── ui/primitives.tsx            # Card, Badge, tooltip, loading/error/empty state
├── hooks/
│   ├── useDataset.ts                # memuat CSV + GeoJSON, state loading/error
│   └── useFilters.tsx               # konteks filter global + cakupan turunannya
├── lib/
│   ├── dataLoader.ts                # parse CSV, validasi kolom, normalisasi GeoJSON
│   ├── aggregations.ts              # agregasi berkontrak kelengkapan + CBQ 1-5
│   ├── kpiCalculations.ts           # 5 KPI scorecard
│   ├── format.ts                    # formatter angka & skala warna
│   └── __tests__/                   # unit test + test integrasi dataset aktual
├── pages/                           # Overview, Region, Quality, Methodology
├── data/
│   ├── healthcare_dashboard_ready.csv   # dataset hasil cleaning (945 baris)
│   └── jabar_kabkota.geojson            # batas 27 kab/kota (properti KDPKAB/WADMKK)
├── types/index.ts
├── App.tsx
└── main.tsx
```

## Cara mengganti dataset

Timpa `src/data/healthcare_dashboard_ready.csv` dengan file baru yang kolomnya sama
(lihat `src/lib/dataLoader.ts` → `REQUIRED_COLUMNS`). Loader memvalidasi kolom wajib,
domain `status_verifikasi`, dan konsistensi `valid_positive` ↔ `jumlah_faskes_viz`;
data tidak valid memunculkan **error state**, bukan angka salah. Pratinjau audit
dataset (total baris, distribusi status) tampil di halaman **Kualitas Data**.

## Cara memasukkan GeoJSON

Timpa `src/data/jabar_kabkota.geojson`. Format yang didukung: FeatureCollection dengan
properti `KDPKAB` (format `"32.01"`) dan `WADMKK` (nama resmi), yang dinormalisasi otomatis
menjadi `kode_kabupaten_kota` BPS (3201–3279) + `nama_kabupaten_kota`. Join ke data
memakai kode (bukan nama), dan ketidakcocokan dilaporkan di banner kuning atas.

## Cara menghitung KPI (logika)

Semua logika terpisah dari komponen React (mudah diuji, ada di `lib/`):

- **Kontrak agregasi** (`aggregate`): setiap hasil memuat `value` (jumlah nilai
  tersedia), `expectedRecords`, `validRecords`, `suspectedRecords`, `isComplete`.
  Nilai NaN **tidak dijumlahkan diam-diam**; bila `isComplete = false`, UI
  menandai **"Data belum lengkap"** dan nilai parsial tidak diklaim sebagai total.
- **KPI cards** (`kpiCalculations.ts`): Total Fasilitas; Pertumbuhan 2018–2024
  (cakupan tetap 2018–2024, `N/A` + alasan bila dasar ≤ 0 atau periode tak tersedia);
  Wilayah Teramati; Proporsi Baris Positif (tooltip: *bukan ukuran kelengkapan
  pelaporan resmi*); Data Perlu Verifikasi (`zero_suspected`).
- **Ranking** (`rankByRegion`): competition ranking — nilai seri = peringkat sama;
  wilayah tanpa nilai valid tidak diberi peringkat.
- **Growth** (`growthForScope`): `(N2024 − N2018) / N2018 × 100%`, hanya bila
  `N2018 > 0` dan kedua periode tersedia; peringkat nilai parsial diberi tanda ⚠.
- **Komposisi** (`compositionByRegion`): share dihitung terhadap **denominasi
  minimal** = nilai tersedia + 1 unit per kategori `zero_suspected`, sehingga
  wilayah yang tidak lengkap **tidak dinormalisasi menjadi 100%** (segmen abu-abu).
  Posyandu dikecualikan hanya dari analisis komposisi.
- **Kualitas data** (`qualityMatrix`): matriks jenis × tahun dari dataset penuh.

## Perlakuan nilai nol

| Status | Nilai asli | `jumlah_faskes_viz` | Perlakuan UI |
|---|---|---|---|
| `valid_positive` | dipakai | nilai | apa adanya |
| `zero_unverified` | 0 (dipertahankan) | 0 | dihitung 0, ditandai belum terverifikasi |
| `zero_suspected` | 0 (dipertahankan) | **NaN** | dikecualikan dari KPI; badge "Data belum lengkap"; tidak pernah ditampilkan sebagai 0 |
| `zero_confirmed` | 0 | 0 | (belum muncul di dataset ini) |
| `missing_source` | — | NaN | data tidak tersedia (skema disiapkan) |

Distribusi aktual (diverifikasi oleh test): 678 `valid_positive`, 199
`zero_unverified`, 68 `zero_suspected` dari 945 baris.

## Layout Overview (tiga zona, sesuai rancangan laporan)

Tab **Overview** memuat seluruh visualisasi utama 5 CBQ dalam satu halaman:

- **Zona atas** — 5 KPI scorecards + filter global (Overview First).
- **Zona tengah** — grid 2 kolom: Line chart tren (CBQ 1) · Choropleth peta (persebaran).
- **Zona bawah** — grid 2 kolom responsif: Peringkat wilayah (CBQ 2) · Growth diverging
  (CBQ 3) · Komposisi 100% stacked (CBQ 4) · Heatmap kualitas data (CBQ 5).

Semua kartu di Overview memakai ulang komponen chart yang sama dengan tab analisis
mendalam (satu sumber logika di `lib/`, tanpa duplikasi). Tab lain tetap tersedia
untuk analisis per CBQ yang lebih dalam (tabel rincian, toggling metrik, pencarian).

## Penerapan Munzner Level 3 & Rules of Thumb

- **What**: tables (dataset) → tren = 1D temporal + 1D magnitude; peringkat = 1D
  kategorikal + 1D magnitude; komposisi = 1D kategorikal dalam wilayah; kualitas
  data = 2D matrix (jenis × tahun).
- **Why**: discover distribution/trends, locate extremes, compare growth,
  identify composition, verify data quality.
- **Idiom & encoding**: line+point (position X temporal, position Y magnitude,
  color hue identity); bar (length = magnitude); diverging bar (baseline 0);
  choropleth (color luminance, spatial region); heatmap (color saturation).
- **No unjustified 3D**: semua 2D.
- **Eyes beat memory**: KPI bersandingan, warna kategori konsisten global
  (`JENIS_COLORS`), sumbu berlabel, perbandingan dalam satu tampilan.
- **Shneiderman's Mantra**: Overview first (scorecards) → Zoom & Filter (filter
  global, klik peta, toggle legend, Top-5/10/Semua) → Details on demand
  (tooltip, klik sel heatmap → daftar wilayah, tabel observasi dengan pencarian).

Dokumentasi lengkap (termasuk tabel pemetaan CBQ → KPI → Idiom → Marks → Why)
ada di halaman **Metodologi** di dalam aplikasi.

## Fitur interaktif

- Filter global: tahun fokus (default 2024), jenis, kabupaten/kota, Reset —
  memengaruhi semua komponen; grafik tren tetap menampilkan 2018–2024 dengan
  penanda garis "fokus {tahun}".
- Legend tren interaktif (klik nama jenis untuk menyembunyikan seri); garis terputus
  pada tahun tanpa nilai (Posyandu 2019 tidak digambar sebagai 0). Tren memakai
  **small multiples**: satu panel per jenis dengan skala Y sendiri, karena rasio
  magnitudo antar jenis mencapai ±770:1 (Posyandu ±54.000 vs RS Khusus ±70) sehingga
  satu skala bersama membuat semua jenis selain Posyandu menempel di nol. Yang
  dibandingkan adalah bentuk tren, bukan tinggi antar panel.
- Peta: hover tooltip rinci, klik wilayah = set filter kabupaten, legend skala
  biru + kategori "tanpa nilai valid (≠ 0)".
- Peringkat: Top 5/10/Semua, tertinggi/terendah, tanda parsial.
- Heatmap: pilih metrik (suspected/unverified/positif), klik sel → daftar 27
  wilayah dengan status per wilayah.
- Tabel observasi di halaman Kualitas Data: filter status + pencarian.

## Test

`npm test` menjalankan 38 test (vitest) yang mencakup 8 kasus wajib:
(1) data lengkap, (2) sebagian NaN, (3) seluruh NaN → value null bukan 0,
(4) dasar growth = 0 → N/A + alasan, (5) ranking nilai seri, (6) wilayah tidak
ada di GeoJSON, (7) dataset kosong, (8) filter tanpa hasil — plus test
**integrasi terhadap CSV & GeoJSON aktual** (945 baris; distribusi status;
Posyandu 2019 null; join 27/27 cocok; growth per jenis).

## Keterbatasan

- Satu sumber data (Dinkes Jabar via od_15936); belum ada verifikasi silang
  daftar fasilitas independen.
- Proporsi baris positif ≠ tingkat kelengkapan pelaporan resmi.
- Baseline 2018 tampak kurang lengkap (34 anomali YoY terkonsentrasi 2018→2019).
- RS Bersalin praktis berhenti dilaporkan pasca-2018; growth −100% untuk jenis
  ini mencerminkan data, bukan penutupan RS terverifikasi.
- Jumlah absolut belum memperhitungkan penduduk/kapasitas/akses — dashboard
  bukan alat menyimpulkan kecukupan layanan.
- Bundle > 500 kB (Recharts + Leaflet); code-splitting opsional untuk produksi.

## Verifikasi terhadap kriteria dosen

| Kriteria | Status |
|---|---|
| Dashboard berjalan (`npm run dev`, tanpa error runtime — dicek browser console) | ✅ |
| Semua angka dari CSV (tidak ada hardcode) | ✅ |
| 5 CBQ terjawab (tren, peringkat, growth, komposisi, kualitas) + peta | ✅ |
| KPI memperlakukan NaN dengan kontrak kelengkapan | ✅ |
| Filter global berfungsi lintas komponen | ✅ |
| Tooltip & legend di semua grafik | ✅ |
| Choropleth dengan GeoJSON asli 27 kab/kota (join kode BPS) | ✅ |
| Layout tiga zona (scorecards / analisis utama / rincian) | ✅ |
| Semua visual 2D | ✅ |
| Visual encoding terdokumentasi (halaman Metodologi) | ✅ |
| Mantra Shneiderman berfungsi | ✅ |
| Responsif (grid Tailwind, desktop-first) | ✅ |
| Data tidak lengkap diberi penjelasan (badge + tooltip + alasan N/A) | ✅ |
| Test KPI dijalankan dan dilaporkan (38/38 lulus) | ✅ |

## Tim

Devano Trestanto · Dzaki Fathul 'Alim Cahyo · Dehar Zaidan Dzaki Amirullah ·
Galang Bintang Ramadhan — Supervisor: Dinar Mutiara Kusumo Nugraheni, S.T.,
M.InfoTech.(Comp)., Ph.D. — Universitas Diponegoro.

Sumber data: Dinas Kesehatan Provinsi Jawa Barat via Galura Jabar (od_15936).
