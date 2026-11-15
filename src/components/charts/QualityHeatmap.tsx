import { useMemo, useState } from 'react'
import { useFilters } from '../../hooks/useFilters'
import { qualityMatrix, type QualityCell } from '../../lib/aggregations'
import { STATUS_COLORS } from '../../types'
import { Badge, EmptyState } from '../ui/primitives'

type Metric = 'zero_suspected' | 'zero_unverified' | 'positive'

const METRIC_LABEL: Record<Metric, string> = {
  zero_suspected: 'zero_suspected',
  zero_unverified: 'zero_unverified',
  positive: 'Positif',
}

const METRIC_COLOR: Record<Metric, [string, string]> = {
  zero_suspected: ['#fef2f2', '#dc2626'], // merah: perlu verifikasi (BUKAN bukti kesalahan terkonfirmasi)
  zero_unverified: ['#fffbeb', '#d97706'], // amber: belum terverifikasi
  positive: ['#f0fdf4', '#16a34a'], // hijau: positif
}

function cellColor(metric: Metric, value: number, max: number): string {
  if (value === 0) return '#f8fafc'
  const [low, high] = METRIC_COLOR[metric]
  // interpolasi sederhana: gunakan opacity terhadap warna intens
  const t = max > 0 ? 0.25 + 0.75 * (value / max) : 0.25
  const r = parseInt(low.slice(1, 3), 16)
  const g = parseInt(low.slice(3, 5), 16)
  const b = parseInt(low.slice(5, 7), 16)
  const hr = parseInt(high.slice(1, 3), 16)
  const hg = parseInt(high.slice(3, 5), 16)
  const hb = parseInt(high.slice(5, 7), 16)
  const mix = (a: number, c: number) => Math.round(a + (c - a) * t)
  return `rgb(${mix(r, hr)}, ${mix(g, hg)}, ${mix(b, hb)})`
}

export function QualityHeatmap() {
  const { allRows } = useFilters()
  const [metric, setMetric] = useState<Metric>('zero_suspected')
  const [selected, setSelected] = useState<QualityCell | null>(null)

  const matrix = useMemo(() => qualityMatrix(allRows), [allRows])

  const maxVal = useMemo(() => {
    let m = 0
    for (const row of matrix)
      for (const c of row.cells) {
        const v =
          metric === 'positive' ? c.positive : metric === 'zero_suspected' ? c.zeroSuspected : c.zeroUnverified
        if (v > m) m = v
      }
    return m
  }, [matrix, metric])

  if (matrix.length === 0) return <EmptyState message="Tidak ada data kualitas." />

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Tampilkan:</span>
        {(['zero_suspected', 'zero_unverified', 'positive'] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMetric(m)
              setSelected(null)
            }}
            className={`rounded-md px-2.5 py-1 font-medium ${
              metric === m
                ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-medium text-slate-500">
                Jenis fasilitas
              </th>
              {[2018, 2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
                <th key={y} className="px-1 py-1 font-medium text-slate-500">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ jenis, cells }) => (
              <tr key={jenis}>
                <td className="sticky left-0 z-10 max-w-36 truncate bg-white px-2 py-1 text-slate-700">
                  {jenis}
                </td>
                {cells.map((c) => {
                  const v =
                    metric === 'positive'
                      ? c.positive
                      : metric === 'zero_suspected'
                        ? c.zeroSuspected
                        : c.zeroUnverified
                  const bg = cellColor(metric, v, maxVal)
                  const isSel =
                    selected &&
                    selected.jenis === c.jenis &&
                    selected.tahun === c.tahun
                  return (
                    <td key={c.tahun} className="p-0">
                      <button
                        onClick={() => setSelected(isSel ? null : c)}
                        title={`${jenis} · ${c.tahun}\nPositif: ${c.positive}\nzero_unverified: ${c.zeroUnverified}\nzero_suspected: ${c.zeroSuspected}\nTotal: ${c.total} wilayah`}
                        className={`h-10 w-full cursor-pointer text-xs font-semibold tabular-nums transition-transform hover:scale-105 ${
                          isSel ? 'outline outline-2 outline-brand-600' : ''
                        }`}
                        style={{ backgroundColor: bg }}
                      >
                        {v === 0 ? '–' : v}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
        <span>Skala: 0 → {maxVal} wilayah</span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: METRIC_COLOR[metric][1] }}
          />
          intensitas tinggi
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-slate-200"
            style={{ backgroundColor: '#f8fafc' }}
          />
          nol kasus
        </span>
        <span>klik sel = rincian wilayah</span>
      </div>

      {selected && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-700">
              {selected.jenis} · {selected.tahun}
            </p>
            <Badge tone="slate">{selected.total} wilayah</Badge>
            <Badge tone="green">{selected.positive} positif</Badge>
            <Badge tone="amber">{selected.zeroUnverified} zero_unverified</Badge>
            <Badge tone="red">{selected.zeroSuspected} zero_suspected</Badge>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Wilayah</th>
                  <th className="px-2 py-1">Jumlah (asli)</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {selected.rows
                  .slice()
                  .sort((a, b) => a.nama_kabupaten_kota.localeCompare(b.nama_kabupaten_kota))
                  .map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-slate-700">{r.nama_kabupaten_kota}</td>
                      <td className="px-2 py-1 tabular-nums">{r.jumlah_faskes}</td>
                      <td className="px-2 py-1">
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                          style={{
                            backgroundColor: `${STATUS_COLORS[r.status_verifikasi]}18`,
                            color: STATUS_COLORS[r.status_verifikasi],
                          }}
                        >
                          {r.status_verifikasi}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
