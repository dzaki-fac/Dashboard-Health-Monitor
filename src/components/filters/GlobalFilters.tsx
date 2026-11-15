import { RotateCcw } from 'lucide-react'
import { useFilters, DEFAULT_FILTERS } from '../../hooks/useFilters'
import { JENIS_FASKES, JENIS_LABEL, TAHUN_LIST } from '../../types'

export function GlobalFilters({
  kabupatenList,
}: {
  kabupatenList: { kode: number; nama: string }[]
}) {
  const { filters, setFilters, reset, rows } = useFilters()

  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Tahun fokus</span>
        <select
          value={filters.tahun}
          onChange={(e) => setFilters({ tahun: Number(e.target.value) })}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        >
          {TAHUN_LIST.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Jenis fasilitas</span>
        <select
          value={filters.jenis}
          onChange={(e) => setFilters({ jenis: e.target.value })}
          className="min-w-40 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        >
          <option value="SEMUA">Semua jenis</option>
          {JENIS_FASKES.map((j) => (
            <option key={j} value={j}>
              {JENIS_LABEL[j]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Kabupaten/Kota</span>
        <select
          value={filters.kabupaten}
          onChange={(e) => setFilters({ kabupaten: e.target.value })}
          className="min-w-44 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        >
          <option value="SEMUA">Semua wilayah</option>
          {kabupatenList.map((k) => (
            <option key={k.kode} value={String(k.kode)}>
              {k.nama}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={reset}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>

      <span className="ml-auto self-center text-[11px] tabular-nums text-slate-400">
        {rows.length.toLocaleString('id-ID')} observasi
      </span>
    </div>
  )
}

export { DEFAULT_FILTERS }
