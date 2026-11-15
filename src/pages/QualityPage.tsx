import { useMemo, useState } from 'react'
import { Card, Badge } from '../components/ui/primitives'
import { QualityHeatmap } from '../components/charts/QualityHeatmap'
import { useFilters } from '../hooks/useFilters'
import { datasetAudit } from '../lib/dataLoader'
import { STATUS_COLORS, STATUS_LABEL, type StatusVerifikasi } from '../types'

function statusTone(s: StatusVerifikasi): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (s === 'valid_positive') return 'green'
  if (s === 'zero_unverified') return 'amber'
  if (s === 'zero_suspected') return 'red'
  if (s === 'zero_confirmed') return 'blue'
  return 'slate'
}

export function QualityPage() {
  const { allRows } = useFilters()
  const audit = useMemo(() => datasetAudit(allRows), [allRows])
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | StatusVerifikasi>('SEMUA')

  const filtered = useMemo(
    () =>
      statusFilter === 'SEMUA'
        ? allRows
        : allRows.filter((r) => r.status_verifikasi === statusFilter),
    [allRows, statusFilter],
  )
  const [search, setSearch] = useState('')
  const shown = useMemo(
    () =>
      filtered
        .filter(
          (r) =>
            r.nama_kabupaten_kota.toLowerCase().includes(search.toLowerCase()) ||
            r.jenis_faskes.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 200),
    [filtered, search],
  )

  return (
    <div className="space-y-4">
      <Card
        title="Audit Dataset"
        info="Verifikasi hasil cleaning dari file CSV yang dijalankan aplikasi. Status: valid_positive = nilai asli; zero_unverified = 0 belum terverifikasi; zero_suspected = nol diduga kesenjangan pelaporan."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Total observasi</p>
            <p className="text-xl font-bold text-slate-800">{audit.total.toLocaleString('id-ID')}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Kabupaten/kota</p>
            <p className="text-xl font-bold text-slate-800">{audit.kabupaten}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Jenis fasilitas</p>
            <p className="text-xl font-bold text-slate-800">{audit.jenis.length}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Rentang tahun</p>
            <p className="text-xl font-bold text-slate-800">
              {audit.tahun[0]}–{audit.tahun[audit.tahun.length - 1]}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(audit.byStatus).map(([s, n]) => (
            <Badge key={s} tone={statusTone(s as StatusVerifikasi)}>
              {STATUS_LABEL[s as StatusVerifikasi]}: {n}
            </Badge>
          ))}
        </div>
      </Card>

      <Card
        title="Heatmap Kualitas Data"
        info="CBQ 5 — di mana nilai nol perlu diverifikasi (jenis × tahun, dataset penuh). Merah = perlu verifikasi ke produsen data, bukan bukti kesalahan."
      >
        <QualityHeatmap />
      </Card>

      <Card
        title="Tabel Observasi"
        info="Details on Demand — baris individual beserta status verifikasi dan nilai asli vs nilai visualisasi."
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'SEMUA' | StatusVerifikasi)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
          >
            <option value="SEMUA">Semua status</option>
            {(Object.keys(STATUS_LABEL) as StatusVerifikasi[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari wilayah / jenis…"
            className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
          />
          <span className="text-[11px] text-slate-400">
            {filtered.length.toLocaleString('id-ID')} baris
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-2 py-1.5">id</th>
                <th className="px-2 py-1.5">Wilayah</th>
                <th className="px-2 py-1.5">Jenis</th>
                <th className="px-2 py-1.5">Tahun</th>
                <th className="px-2 py-1.5 text-right">Jumlah (asli)</th>
                <th className="px-2 py-1.5 text-right">Viz</th>
                <th className="px-2 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 text-slate-400">{r.id}</td>
                  <td className="px-2 py-1">{r.nama_kabupaten_kota}</td>
                  <td className="px-2 py-1">{r.jenis_faskes}</td>
                  <td className="px-2 py-1">{r.tahun}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.jumlah_faskes}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-500">
                    {r.jumlah_faskes_viz ?? 'NaN'}
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className="inline-flex rounded px-1.5 py-0.5 font-medium"
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
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-slate-400">
                    Tidak ada baris yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
