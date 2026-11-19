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

interface GrowthLabelProps {
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  value?: number | string | null
}

/** Label nilai: di dalam batang bila muat, di luar ujung batang bila tidak. */
function GrowthValueLabel({ viewBox, value }: GrowthLabelProps) {
  const v = Number(value ?? 0)
  if (!viewBox || !Number.isFinite(v)) return null
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox
  // pada batang negatif recharts memberi width negatif; normalkan ke kiri/kanan
  const left = Math.min(x, x + width)
  const right = Math.max(x, x + width)
  const negative = v < 0
  const text = `${v > 0 ? '+' : ''}${formatPct(v)}`
  // perkiraan lebar teks @ fontSize 10 + padding kiri-kanan di dalam batang
  const fitsInside = Math.abs(width) >= text.length * 5.6 + 14
  return (
    <text
      x={fitsInside ? left + 6 : negative ? left - 6 : right + 6}
      y={y + height / 2}
      textAnchor={fitsInside ? 'start' : negative ? 'end' : 'start'}
      dominantBaseline="middle"
      fontSize={10}
      fill={fitsInside ? '#ffffff' : '#475569'}
    >
      {text}
    </text>
  )
}

/** Batas absolut "bulat" untuk domain diverging simetris. */
function niceBound(maxAbs: number): number {
  const steps = [5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000]
  return steps.find((s) => s >= maxAbs) ?? Math.ceil(maxAbs / 100) * 100
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
      feasible: entries
        .filter((e) => e.feasible)
        .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0)),
      na: entries.filter((e) => !e.feasible),
    }
  }, [growthRows])

  if (feasible.length === 0 && na.length === 0) {
    return <EmptyState message="Tidak ada data untuk perhitungan pertumbuhan." />
  }

  const data = feasible.map((e) => ({ ...e, pct: e.pctChange ?? 0 }))

  // domain simetris: sisi positif & negatif harus berskala sama
  const bound = niceBound(Math.max(1, ...data.map((d) => Math.abs(d.pct))))
  const domain: [number, number] = [-bound * 1.1, bound * 1.1]
  const half = bound / 2
  const ticks = Number.isInteger(half)
    ? [-bound, -half, 0, half, bound]
    : [-bound, 0, bound]

  return (
    <div>
      <div style={{ height: Math.max(160, feasible.length * 44 + 40) }}>
        {feasible.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                domain={domain}
                ticks={ticks}
                tick={{ fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v)}%`}
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
              <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
              <Bar
                dataKey="pct"
                barSize={20}
                radius={[3, 3, 3, 3]}
                minPointSize={() => 5}
              >
                {data.map((e) => (
                  <Cell
                    key={e.key}
                    fill={
                      e.pct > 0 ? '#16a34a' : e.pct < 0 ? '#dc2626' : '#94a3b8'
                    }
                    fillOpacity={e.baseIncomplete || e.endIncomplete ? 0.6 : 1}
                  />
                ))}
                <LabelList dataKey="pct" content={<GrowthValueLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600" /> pertumbuhan (+)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-600" /> penurunan (−)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" /> tetap (0%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600 opacity-60" /> nilai
          parsial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-1 rounded-sm bg-slate-300" /> batang &lt; 5px
          diperbesar
        </span>
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
