import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useFilters } from '../../hooks/useFilters'
import { compositionByRegion, COMPOSITION_JENIS, type CompositionEntry } from '../../lib/aggregations'
import { formatPct } from '../../lib/format'
import { JENIS_LABEL } from '../../types'
import { EmptyState } from '../ui/primitives'

interface CompTooltipProps {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number }>
  label?: string
}

function CompTooltip({ active, payload, label }: CompTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
  const missing = 100 - total
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <p className="font-semibold text-slate-700">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex justify-between gap-4">
            <span className="text-slate-600">
              {JENIS_LABEL[String(p.dataKey)] ?? String(p.dataKey)}
            </span>
            <span className="font-semibold tabular-nums">{formatPct(p.value ?? 0)}</span>
          </li>
        ))}
        {missing > 0.05 && (
          <li className="flex justify-between gap-4 border-t border-slate-100 pt-1 text-amber-600">
            <span>Belum terverifikasi / tidak tersedia</span>
            <span className="font-semibold tabular-nums">{formatPct(missing)}</span>
          </li>
        )}
      </ul>
      {missing > 0.05 && (
        <p className="mt-1 text-[10px] text-amber-600">
          ⚠ Tidak dinormalisasi ke 100% — ada kategori tanpa nilai.
        </p>
      )}
    </div>
  )
}

/**
 * CBQ 4 — 100% stacked bar komposisi per wilayah.
 * Posyandu dikecualikan dari analisis komposisi (perbedaan skala).
 * Share dihitung terhadap denominasi ekspektasi penuh, sehingga wilayah dengan
 * data kategori tidak tersedia memiliki total baris < 100% (tidak dinormalisasi).
 */
export function CompositionChart() {
  const { rows, filters } = useFilters()

  const entries = useMemo(() => compositionByRegion(rows), [rows])
  const data = entries.map((e: CompositionEntry) => ({
    nama: e.nama,
    incomplete: !e.isComplete,
    ...e.shares,
    _missing: e.missingShare,
  }))

  if (entries.length === 0 || filters.jenis === 'POSYANDU') {
    return (
      <EmptyState message="Tidak ada data komposisi. Analisis komposisi mengecualikan Posyandu — pilih jenis lain atau Semua jenis." />
    )
  }

  const height = Math.max(240, entries.length * 26 + 60)

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${Math.round(Number(v))}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="nama"
              tick={{ fontSize: 10 }}
              tickLine={false}
              width={132}
            />
            <ReTooltip content={<CompTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {COMPOSITION_JENIS.filter(
              (j) => filters.jenis === 'SEMUA' || j === filters.jenis,
            ).map((jenis) => {
              const colors: Record<string, string> = {
                'RUMAH SAKIT UMUM': '#1d4ed8',
                'RUMAH SAKIT KHUSUS': '#0f766e',
                'RUMAH SAKIT BERSALIN': '#9333ea',
                PUSKESMAS: '#16a34a',
              }
              return (
                <Bar
                  key={jenis}
                  dataKey={jenis}
                  name={JENIS_LABEL[jenis]}
                  stackId="comp"
                  fill={colors[jenis]}
                  barSize={16}
                />
              )
            })}
            {/* segmen abu-abu: porsi kategori yang tidak tersedia (tidak dinormalisasi) */}
            <Bar dataKey="_missing" name="Tidak tersedia / belum terverifikasi" stackId="comp" fill="#e2e8f0" barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
