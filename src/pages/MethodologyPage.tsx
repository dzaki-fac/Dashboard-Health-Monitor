import { Card } from '../components/ui/primitives'

const MAPPING_ROWS = [
  {
    cbq: 'CBQ 1 — Bagaimana tren jumlah setiap jenis fasilitas kesehatan di Jawa Barat 2018–2024?',
    kpi: 'Total fasilitas per jenis × tahun (unit)',
    idiom: 'Small multiples line chart (satu panel per jenis)',
    mark: 'Line + point',
    magnitude: 'Position (sumbu Y, skala per panel)',
    identity: 'Color hue (jenis) · Position X (tahun)',
    why: 'Discover/Compare — melihat pola kenaikan/penurunan antar tahun (Munzner Why: discover distribution/trend)',
    viz: 'TrendChart',
  },
  {
    cbq: 'CBQ 2 — Kabupaten/kota mana yang memiliki jumlah fasilitas tertinggi dan terendah?',
    kpi: 'Jumlah fasilitas per kab/kota + peringkat',
    idiom: 'Horizontal bar chart',
    mark: 'Bar',
    magnitude: 'Length (sumbu X)',
    identity: 'Position + text label (wilayah)',
    why: 'Locate/Identify/Compare — menemukan wilayah puncak & terbawah (locate extreme)',
    viz: 'RankChart + peta choropleth',
  },
  {
    cbq: 'CBQ 3 — Jenis fasilitas apa yang tumbuh paling cepat/lambat 2018–2024?',
    kpi: 'Δ absolut & Δ relatif (%) 2018→2024',
    idiom: 'Diverging bar chart (baseline 0%)',
    mark: 'Bar',
    magnitude: 'Position & length relatif terhadap baseline 0',
    identity: 'Color hue (positif vs negatif)',
    why: 'Compare — membandingkan pertumbuhan antar jenis; nilai N/A dikecualikan dengan alasan',
    viz: 'GrowthChart',
  },
  {
    cbq: 'CBQ 4 — Bagaimana komposisi jenis fasilitas di setiap kabupaten/kota?',
    kpi: 'Proporsi jenis per wilayah (%) — tanpa Posyandu',
    idiom: '100% stacked horizontal bar chart',
    mark: 'Bar segments',
    magnitude: 'Length (proporsi)',
    identity: 'Color hue (jenis fasilitas)',
    why: 'Identify/Compare — melihat struktur pelayanan tiap wilayah',
    viz: 'CompositionChart',
  },
  {
    cbq: 'CBQ 5 — Pada kombinasi jenis/tahun/wilayah mana nilai nol perlu diverifikasi?',
    kpi: 'Baris nol, baris positif, proporsi baris positif',
    idiom: 'Heatmap (matrix) + scorecard',
    mark: 'Rectangular cells',
    magnitude: 'Color saturation/luminance',
    identity: 'Position (jenis × tahun) + color hue (status)',
    why: 'Discover/Verify — menemukan sel bermasalah untuk verifikasi lanjutan',
    viz: 'QualityHeatmap',
  },
  {
    cbq: 'Peta persebaran (pendukung CBQ 2)',
    kpi: 'Jumlah fasilitas per wilayah (tahun fokus)',
    idiom: 'Choropleth map',
    mark: 'Area/polygon',
    magnitude: 'Color luminance (biru bertingkat)',
    identity: 'Spatial region (kode BPS)',
    why: 'Locate — melihat pola geografis antarwilayah',
    viz: 'ChoroplethMap',
  },
]

export function MethodologyPage() {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <Card title="Domain & User Persona">
        <p className="leading-relaxed">
          <strong>Domain:</strong> pelayanan kesehatan tingkat provinsi — persebaran
          fasilitas kesehatan (RS Umum, RS Khusus, RS Bersalin, Puskesmas, Posyandu)
          di 27 kabupaten/kota Jawa Barat, 2018–2024.
        </p>
        <p className="mt-2 leading-relaxed">
          <strong>User persona:</strong> Pengelola Fasilitas Kesehatan — Dinas
          Kesehatan Provinsi Jawa Barat. Kebutuhan: memantau perkembangan fasilitas,
          membandingkan antarwilayah, menemukan jenis yang tumbuh cepat/lambat,
          membandingkan komposisi, mengidentifikasi data yang perlu verifikasi, dan
          melihat distribusi geografis.
        </p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-relaxed text-amber-800">
          <strong>Batas interpretasi:</strong> dashboard adalah alat bantu evaluasi,
          bukan sistem untuk menyimpulkan kecukupan layanan. Jumlah absolut belum
          memperhitungkan jumlah penduduk, kapasitas (tempat tidur), dan aksesibilitas;
          wilayah dengan jumlah kecil belum tentu "kekurangan" fasilitas.
        </p>
      </Card>

      <Card title="Pendekatan Goal-Driven">
        <p className="leading-relaxed">
          Seluruh visualisasi dirancang terbalik dari tujuan analisis: setiap grafik
          menjawab satu Critical Business Question (CBQ) dengan KPI yang
          didefinisikan eksplisit (definisi, satuan, formula, perlakuan nol,
          keterbatasan). Tidak ada grafik yang ditampilkan hanya karena "ada kolomnya".
        </p>
      </Card>

      <Card title="Pemetaan CBQ → KPI → Idiom → Marks & Channels → Why">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-[11px] text-slate-500">
              <tr>
                <th className="px-2 py-2">CBQ</th>
                <th className="px-2 py-2">KPI</th>
                <th className="px-2 py-2">Idiom visual</th>
                <th className="px-2 py-2">Marks</th>
                <th className="px-2 py-2">Magnitude channel</th>
                <th className="px-2 py-2">Identity channel</th>
                <th className="px-2 py-2">Why (task abstraction)</th>
              </tr>
            </thead>
            <tbody>
              {MAPPING_ROWS.map((r) => (
                <tr key={r.cbq} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-2 font-medium">{r.cbq}</td>
                  <td className="px-2 py-2">{r.kpi}</td>
                  <td className="px-2 py-2">{r.idiom}</td>
                  <td className="px-2 py-2">{r.mark}</td>
                  <td className="px-2 py-2">{r.magnitude}</td>
                  <td className="px-2 py-2">{r.identity}</td>
                  <td className="px-2 py-2">{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Rules of Thumb (Munzner)">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
            <li>
              <strong>No unjustified 3D:</strong> semua grafik & peta 2D; tidak ada
              perspektif dekoratif.
            </li>
            <li>
              <strong>Eyes beat memory:</strong> KPI cards bersandingan dengan grafik;
              sumbu/skala eksplisit; warna kategori konsisten lintas halaman;
              perbandingan antarwilayah dalam satu tampilan.
            </li>
            <li>
              <strong>Shneiderman's Mantra:</strong> Overview first (scorecards),
              Zoom &amp; Filter (filter global + klik peta + legend interaktif),
              Details on demand (tooltip, klik sel heatmap, tabel observasi).
            </li>
          </ul>
        </Card>
        <Card title="Layout Tiga Zona (Overview)">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
            <li>
              <strong>Zona atas</strong> — executive scorecards: 5 KPI cards dengan
              satuan, periode, dan tooltip.
            </li>
            <li>
              <strong>Zona tengah</strong> — analisis utama: tren (CBQ 1) dan peta
              choropleth (persebaran).
            </li>
            <li>
              <strong>Zona bawah/samping</strong> — analisis rincian: peringkat
              (CBQ 2), heatmap kualitas data (CBQ 5); halaman Analisis Wilayah
              memuat growth (CBQ 3) dan komposisi (CBQ 4).
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sumber Data & Metode Cleaning">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
            <li>
              Sumber: Dinas Kesehatan Provinsi Jawa Barat via Galura Jabar, dataset
              <em> od_15936 — Jumlah Fasilitas Kesehatan Berdasarkan Jenis di Jawa
              Barat</em>, 2018–2024, kode wilayah BPS.
            </li>
            <li>
              Cleaning: profiling, standardisasi konservatif, klasifikasi nilai nol
              berbasis bukti (R1–R5), validasi assert, dan laporan anomali — lihat
              <em> smart-city-clean-data/docs</em>.
            </li>
            <li>
              Aplikasi ini membaca hasil cleaning (<em>healthcare_dashboard_ready.csv</em>)
              apa adanya; tidak ada interpolasi atau perubahan nilai di sisi dashboard.
            </li>
          </ul>
        </Card>
        <Card title="Interpretasi Nilai Nol & Keterbatasan">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
            <li>
              <span className="font-medium text-green-700">valid_positive</span> — nilai
              dipakai apa adanya.
            </li>
            <li>
              <span className="font-medium text-amber-600">zero_unverified</span> — nol
              dipertahankan sebagai 0, ditandai belum terverifikasi.
            </li>
            <li>
              <span className="font-medium text-red-600">zero_suspected</span> — nol
              diduga kesenjangan pelaporan; <strong>tidak dianggap 0</strong> dalam
              visualisasi (jumlah_faskes_viz = NaN) dan ditandai "Data belum lengkap".
            </li>
            <li>
              <span className="font-medium text-slate-500">missing_source</span> —
              diperlakukan sebagai data tidak tersedia (skema disiapkan; belum muncul
              pada dataset ini).
            </li>
            <li>
              Keterbatasan: satu sumber data; % baris positif ≠ kelengkapan pelaporan
              resmi; baseline 2018 tampak kurang lengkap; RS Bersalin praktis berhenti
              dilaporkan pasca-2018; verifikasi produsen data masih diperlukan.
            </li>
          </ul>
        </Card>
      </div>

      <Card title="Agregasi & Perlakuan Nilai Tidak Tersedia">
        <p className="text-xs leading-relaxed">
          Setiap agregasi menghasilkan kontrak lengkap: <em>value</em> (jumlah nilai
          tersedia), <em>expectedRecords</em>, <em>validRecords</em>,{' '}
          <em>suspectedRecords</em>, dan <em>isComplete</em>. Bila ada observasi
          tidak tersedia, indikator ditandai <strong>Data belum lengkap</strong> dan
          nilai parsial tidak boleh diklaim sebagai total lengkap. Persentase
          pertumbuhan hanya dihitung bila nilai dasar &gt; 0, kedua periode tersedia,
          dan data pembanding layak — selain itu tampil <strong>N/A</strong> dengan
          alasan.
        </p>
      </Card>
    </div>
  )
}
