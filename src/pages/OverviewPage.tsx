import { Card } from '../components/ui/primitives'
import { Scorecards } from '../components/scorecards/Scorecards'
import { TrendChart } from '../components/charts/TrendChart'
import { RankChart } from '../components/charts/RankChart'
import { GrowthChart } from '../components/charts/GrowthChart'
import { CompositionChart } from '../components/charts/CompositionChart'
import { QualityHeatmap } from '../components/charts/QualityHeatmap'
import { ChoroplethMap } from '../components/map/ChoroplethMap'
import { useFilters } from '../hooks/useFilters'

export function OverviewPage() {
  const { geo, filters } = useFilters()

  return (
    <div className="space-y-3">
      {/* ZONA ATAS — KPI SCORECARDS */}
      <Scorecards />

      {/* ZONA TENGAH — TREN + PETA */}
      <div className="grid gap-3 xl:grid-cols-2">
        <Card
          title="Tren Fasilitas 2018–2024"
          info="CBQ 1 — pola jumlah setiap jenis fasilitas per tahun, satu skala unit. Tahun tanpa nilai valid ditampilkan sebagai garis putus, bukan nol."
        >
          <TrendChart />
        </Card>
        <Card
          title={`Persebaran Wilayah ${filters.tahun}`}
          info="Choropleth jumlah fasilitas per kabupaten/kota pada tahun fokus. Klik wilayah untuk memfilter dashboard."
          right={<span className="text-[10px] text-slate-400">klik wilayah = filter</span>}
        >
          {geo ? (
            <ChoroplethMap />
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-center">
              <p className="text-sm text-slate-500">GeoJSON diperlukan</p>
              <p className="max-w-xs text-xs text-slate-400">
                Letakkan file batas administrasi 27 kabupaten/kota Jawa Barat di
                src/data/jabar_kabkota.geojson (dengan properti KDPKAB & WADMKK).
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ZONA BAWAH — CBQ 2–5 */}
      <div className="grid gap-3 xl:grid-cols-2">
        <Card
          title={`Peringkat Wilayah ${filters.tahun}`}
          info="CBQ 2 — peringkat kompetisi: nilai seri = peringkat sama. Batang biru muda = data belum lengkap (peringkat berbasis nilai parsial)."
        >
          <RankChart />
        </Card>
        <Card
          title="Pertumbuhan 2018–2024"
          info="CBQ 3 — growth = (N2024 − N2018) / N2018 × 100% per jenis. Cakupan tetap 2018–2024. N/A bila dasar 2018 = 0 atau periode tidak tersedia."
        >
          <GrowthChart />
        </Card>
        <Card
          title={`Komposisi Jenis per Wilayah ${filters.tahun}`}
          info="CBQ 4 — 100% stacked bar tanpa Posyandu. Segmen abu-abu = kategori tidak tersedia; wilayah tidak dinormalisasi ke 100%."
        >
          <CompositionChart />
        </Card>
        <Card
          title="Kualitas Data"
          info="CBQ 5 — sebaran zero_suspected / zero_unverified per jenis × tahun (dataset penuh, tanpa filter). Merah = perlu verifikasi ke produsen data, bukan bukti kesalahan."
        >
          <QualityHeatmap />
        </Card>
      </div>
    </div>
  )
}
