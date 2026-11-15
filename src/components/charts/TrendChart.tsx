import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useFilters } from '../../hooks/useFilters'
import { trendData } from '../../lib/aggregations'
import { formatNumber } from '../../lib/format'
import {
  JENIS_FASKES,
  JENIS_COLORS,
  JENIS_LABEL,
  type AggregateResult,
} from '../../types'
import { Badge, EmptyState } from '../ui/primitives'

interface CustomPayloadItem {
  dataKey?: string | number
  value?: number | string | null
  payload?: { series: Record<string, AggregateResult> }
}
interface CustomTooltipProps {
  active?: boolean
  label?: string | number
  payload?: CustomPayloadItem[]
}

function TrendTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const series = payload[0]?.payload?.series
  if (!series) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-slate-700">Tahun {label}</p>
      <ul className="space-y-1">
        {payload.map((p) => {
          const jenis = String(p.dataKey)
          const agg = series[jenis]
          if (!agg || agg.value === null) return null
          const incomplete = !agg.isComplete
          return (
            <li key={jenis} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: JENIS_COLORS[jenis] }}
                />
                {JENIS_LABEL[jenis] ?? jenis}
              </span>
              <span className="flex items-center gap-1.5 font-semibold tabular-nums text-slate-800">
                {formatNumber(agg.value)}
                {incomplete && (
                  <span className="rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-700">
                    parsial
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-1.5 border-t border-slate-100 pt-1 text-[10px] text-slate-400">
        Nilai parsial = sebagian observasi tidak tersedia (zero_suspected dsb.)
      </p>
    </div>
  )
}

interface TrendRow {
  tahun: number
  series: Record<string, AggregateResult>
  [jenis: string]: number | null | Record<string, AggregateResult>
}

export function TrendChart() {
  const { trendRows, filters } = useFilters()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const data = useMemo<TrendRow[]>(() => {
    const trend = trendData(trendRows)
    // untuk recharts: tahun + field per jenis (null bila tidak ada nilai valid)
    return trend.map((t) => {
      const point: TrendRow = { tahun: t.tahun, series: t.series }
      for (const jenis of JENIS_FASKES) {
        const agg = t.series[jenis]
        point[jenis] = agg && agg.value !== null ? agg.value : null
      }
      return point
    })
  }, [trendRows])

  const visibleJenis = JENIS_FASKES.filter((j) => !hidden.has(j))
  const mainJenis = visibleJenis.filter((j) => j !== 'POSYANDU')
  const showPosyandu = visibleJenis.includes('POSYANDU')

  const anyIncomplete = data.some((d) =>
    JENIS_FASKES.some(
      (j) => d.series[j] && !d.series[j].isComplete && d.series[j].validRecords > 0,
    ),
  )

  const handleLegend = (jenis: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(jenis)) next.delete(jenis)
      else next.add(jenis)
      return next
    })
  }

  const renderLine = (jenis: string) => (
    <Line
      key={jenis}
      type="monotone"
      dataKey={jenis}
      name={JENIS_LABEL[jenis]}
      stroke={JENIS_COLORS[jenis]}
      strokeWidth={2}
      dot={{ r: 3 }}
      connectNulls={false}
    />
  )

  if (data.every((d) => JENIS_FASKES.every((j) => d[j] === null))) {
    return <EmptyState message="Tidak ada data valid untuk tren pada filter ini." />
  }

  return (
    <div>
      {anyIncomplete && (
        <div className="mb-1.5">
          <Badge tone="amber">Nilai parsial — garis putus</Badge>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="tahun" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v: number) => v.toLocaleString('id-ID')}
              width={64}
            />
            <ReTooltip content={<TrendTooltip />} />
            <Legend
              onClick={(data: unknown) => {
                const dk = (data as { dataKey?: unknown })?.dataKey
                if (typeof dk === 'string' || typeof dk === 'number') {
                  handleLegend(String(dk))
                }
              }}
              wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
            />
            <ReferenceLine
              x={filters.tahun}
              stroke="#1e40af"
              strokeDasharray="4 4"
              label={{
                value: `fokus ${filters.tahun}`,
                position: 'top',
                fontSize: 10,
                fill: '#1e40af',
              }}
            />
            {mainJenis.map(renderLine)}
            {showPosyandu && renderLine('POSYANDU')}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
