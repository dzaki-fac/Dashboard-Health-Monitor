import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useFilters } from '../../hooks/useFilters'
import { growthForScope, type GrowthEntry } from '../../lib/aggregations'
import { formatNumber, formatPct } from '../../lib/format'
import { JENIS_LABEL } from '../../types'
import { EmptyState } from '../ui/primitives'

interface GrowthTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: GrowthEntry }>
}

function GrowthTooltip({ active, payload }: GrowthTooltipProps) {
  const e = payload?.[0]?.payload
  if (!active || !e) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <p className="font-semibold text-slate-700">{JENIS_LABEL[e.label] ?? e.label}</p>
      {e.feasible ? (
        <table className="mt-1.5 text-slate-600">
          <tbody>
            <tr>
              <td className="pr-3">N2018:</td>
              <td className="font-semibold tabular-nums">{formatNumber(e.n2018)}</td>
            </tr>
            <tr>
              <td className="pr-3">N2024:</td>
              <td className="font-semibold tabular-nums">{formatNumber(e.n2024)}</td>
            </tr>
            <tr>
              <td className="pr-3">Absolut:</td>
              <td className="font-semibold tabular-nums">
                {e.absChange! > 0 ? '+' : ''}
                {formatNumber(e.absChange)} unit
              </td>
            </tr>
            <tr>
              <td className="pr-3">Relatif:</td>
              <td className="font-semibold tabular-nums">{formatPct(e.pctChange)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="mt-1 text-amber-600">
          N/A — {e.reason}
        </p>
      )}
      {(e.baseIncomplete || e.endIncomplete) && (
        <p className="mt-1 text-[10px] text-amber-600">
          Catatan: nilai periode terkait bersifat parsial (ada observasi tidak tersedia).
        </p>
      )}
    </div>
  )
}

/**
 * CBQ 3 — Diverging bar chart pertumbuhan relatif 2018–2024 per jenis fasilitas.
 * Baseline 0%; hanya kombinasi yang layak (N2018>0, kedua periode lengkap) yang digambar.
 */
export function GrowthChart() {
  const { growthRows } = useFilters()

  const { feasible, na } = useMemo(() => {
    const entries = growthForScope(growthRows)
    return {
      feasible: entries.filter((e) => e.feasible),
      na: entries.filter((e) => !e.feasible),
    }
  }, [growthRows])

  if (feasible.length === 0 && na.length === 0) {
    return <EmptyState message="Tidak ada data untuk perhitungan pertumbuhan." />
  }

  const data = feasible.map((e) => ({ ...e, pct: e.pctChange ?? 0 }))

  return (
    <div>
      <div style={{ height: Math.max(160, feasible.length * 44 + 40) }}>
        {feasible.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tickFormatter={(v: string) => JENIS_LABEL[v] ?? v}
                tick={{ fontSize: 11 }}
                tickLine={false}
                width={92}
              />
              <ReTooltip content={<GrowthTooltip />} />
              <ReferenceLine x={0} stroke="#334155" />
              <Bar dataKey="pct" barSize={20} radius={[0, 3, 3, 0]}>
                {data.map((e) => (
                  <Cell
                    key={e.key}
                    fill={(e.pct ?? 0) >= 0 ? '#16a34a' : '#dc2626'}
                  />
                ))}
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                  style={{ fontSize: 10, fill: '#475569' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {na.length > 0 && (
        <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          {na.map((e) => (
            <p key={e.key}>
              <span className="font-medium">{JENIS_LABEL[e.label] ?? e.label}</span> — N/A: {e.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
