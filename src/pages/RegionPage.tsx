import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, EmptyState } from '../components/ui/primitives'
import { GrowthChart } from '../components/charts/GrowthChart'
import { RankChart } from '../components/charts/RankChart'
import { CompositionChart } from '../components/charts/CompositionChart'
import { useFilters } from '../hooks/useFilters'
import { growthForScope, rankByRegion } from '../lib/aggregations'
import { completenessHint, formatNumber, formatPct } from '../lib/format'
import { JENIS_LABEL } from '../types'

function RegionDetailTable() {
  const { rows, filters } = useFilters()
  const [search, setSearch] = useState('')

  const entries = useMemo(() => rankByRegion(rows, 'tertinggi'), [rows])
  const filtered = entries.filter((e) =>
    e.nama.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Card
      title="Detail Observasi per Wilayah"
      subtitle={`Tahun ${filters.tahun} · ${filters.jenis === 'SEMUA' ? 'semua jenis' : JENIS_LABEL[filters.jenis]}`}
    >
      <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari wilayah…"
          className="w-full text-xs outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] text-slate-500">
            <tr>
              <th className="px-3 py-2">Peringkat</th>
              <th className="px-3 py-2">Wilayah</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2 text-right">Observasi</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.kode}
                className="border-t border-slate-100 hover:bg-slate-50"
                title={completenessHint(e) ?? undefined}
              >
                  <td className="px-3 py-1.5 font-semibold text-brand-800">
                    {e.rank ?? '—'}
                  </td>
                  <td className="px-3 py-1.5">{e.nama}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatNumber(e.value)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                    {e.validRecords}/{e.expectedRecords}
                  </td>
                  <td className="px-3 py-1.5">
                    {e.isComplete ? (
                      <span className="text-green-600">lengkap</span>
                    ) : (
                      <span className="text-amber-600">⚠ parsial</span>
                    )}
                  </td>
                </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Tidak ada wilayah yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.some((e) => !e.isComplete) && (
        <p className="mt-2 text-[11px] text-amber-600">
          ⚠ Wilayah dengan status "parsial" memiliki observasi tidak tersedia; peringkatnya
          dihitung dari nilai parsial dan tidak boleh dibandingkan setara tanpa kehati-hatian.
        </p>
      )}
    </Card>
  )
}

function RegionGrowthTable() {
  const { growthRows } = useFilters()
  const entries = useMemo(() => growthForScope(growthRows), [growthRows])
  const withData = entries.filter((e) => e.n2018 !== null || e.n2024 !== null)

  if (withData.length === 0) return <EmptyState message="Tidak ada data growth." />

  return (
    <Card
      title="Rincian Pertumbuhan per Jenis"
      subtitle="2018 → 2024 · cakupan tetap"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[11px] text-slate-500">
            <tr>
              <th className="px-3 py-2">Jenis</th>
              <th className="px-3 py-2 text-right">N2018</th>
              <th className="px-3 py-2 text-right">N2024</th>
              <th className="px-3 py-2 text-right">Δ Absolut</th>
              <th className="px-3 py-2 text-right">Δ Relatif</th>
              <th className="px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {withData.map((e) => (
              <tr key={e.key} className="border-t border-slate-100">
                <td className="px-3 py-1.5">{JENIS_LABEL[e.label] ?? e.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(e.n2018)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(e.n2024)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {e.absChange === null ? 'N/A' : e.absChange > 0 ? `+${formatNumber(e.absChange)}` : formatNumber(e.absChange)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatPct(e.pctChange)}
                </td>
                <td className="px-3 py-1.5 text-[11px]">
                  {e.feasible ? (
                    (e.baseIncomplete || e.endIncomplete) ? (
                      <span className="text-amber-600">⚠ ada nilai parsial</span>
                    ) : (
                      <span className="text-green-600">layak</span>
                    )
                  ) : (
                    <span className="text-amber-600">N/A — {e.reason}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function RegionPage() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        <Card
          title="Peringkat Wilayah"
          info="CBQ 2 — peringkat kompetisi: nilai seri = peringkat sama. Batang biru muda = data belum lengkap."
        >
          <RankChart />
        </Card>
        <Card
          title="Pertumbuhan 2018–2024 per Jenis"
          info="CBQ 3 — growth = (N2024 − N2018) / N2018 × 100%. Cakupan tetap 2018–2024. N/A bila dasar 2018 = 0 atau periode tidak tersedia."
        >
          <GrowthChart />
        </Card>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Card
          title="Komposisi Jenis per Wilayah"
          info="CBQ 4 — 100% stacked bar tanpa Posyandu. Segmen abu-abu = kategori tidak tersedia; wilayah tidak dinormalisasi ke 100%."
        >
          <CompositionChart />
        </Card>
        <RegionGrowthTable />
      </div>
      <RegionDetailTable />
    </div>
  )
}
