import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import { useFilters } from '../../hooks/useFilters'
import { trendData } from '../../lib/aggregations'
import { formatNumber } from '../../lib/format'
import { JENIS_FASKES, JENIS_COLORS, JENIS_LABEL } from '../../types'
import { TAHUN_LIST } from '../../types'
import { Badge, EmptyState } from '../ui/primitives'

interface TrendPoint {
  tahun: number
  [jenis: string]: number | null
}

/**
 * Domain Y per panel: mengikuti rentang seri itu sendiri (free scale), praktik
 * standar small multiples. Kalau dipaksa mulai dari nol, panel Posyandu (53rb)
 * dan RS Khusus (±60) jadi garis datar dan trennya tidak terbaca. Konsekuensinya
 * tinggi antar panel tidak sebanding — karena itu tiap panel diberi label sumbu
 * nilai absolut dan chart diberi catatan eksplisit.
 */
function seriesDomain(values: Array<number | null>): [number, number] {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (nums.length === 0) return [0, 1]
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (min === max) return max === 0 ? [0, 1] : [max * 0.9, max * 1.1]
  const pad = (max - min) * 0.25
  return [Math.max(0, min - pad), max + pad]
}

/**
 * Format tick ringkas (53405 → "53,4rb"). Jumlah desimal mengikuti sempitnya
 * rentang domain agar dua tick berbeda tidak tercetak sama (mis. 1,07rb vs 1,11rb).
 */
function formatTickShort(v: number, range: number): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  const span = Number.isFinite(range) ? range : 0
  if (Math.abs(n) >= 1000) {
    const rb = n / 1000
    const spanRb = span / 1000
    const digits = spanRb < 0.2 ? 2 : spanRb < 2 ? 1 : 0
    return `${rb.toLocaleString('id-ID', { maximumFractionDigits: digits })}rb`
  }
  const digits = span < 2 ? 1 : 0
  return n.toLocaleString('id-ID', { maximumFractionDigits: digits })
}

interface TrendTooltipProps {
  active?: boolean
  label?: string | number
  payload?: Array<{ value?: number | string | null; payload?: TrendPoint; dataKey?: string | number }>
  incompleteJenis?: Set<string>
}

function TrendTooltip({ active, label, payload, incompleteJenis }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  const value = p?.value
  if (value === null || value === undefined) return null
  const jenis = String(p.dataKey)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-700">
        {JENIS_LABEL[jenis] ?? jenis} · {label}
      </p>
      <p className="flex items-center gap-1.5 font-semibold tabular-nums text-slate-800">
        {formatNumber(Number(value))}
        <span className="font-normal text-slate-500">unit</span>
        {incompleteJenis?.has(jenis) && (
          <span className="rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-700">
            parsial
          </span>
        )}
      </p>
    </div>
  )
}

/**
 * CBQ 1 — Tren jumlah fasilitas 2018–2024 dalam bentuk small multiples.
 * Tiap jenis punya panel & skala Y sendiri: rentang magnitudonya sangat berbeda
 * (Posyandu ±54.000 vs RS Khusus ±70), sehingga satu skala bersama membuat
 * semua jenis selain Posyandu menempel di garis nol.
 */
export function TrendChart() {
  const { trendRows, filters } = useFilters()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const { data, incompleteJenis } = useMemo(() => {
    const trend = trendData(trendRows)
    const rows: TrendPoint[] = trend.map((t) => {
      const point: TrendPoint = { tahun: t.tahun }
      for (const jenis of JENIS_FASKES) {
        const agg = t.series[jenis]
        point[jenis] = agg && agg.value !== null ? agg.value : null
      }
      return point
    })
    const incomplete = new Set<string>()
    for (const jenis of JENIS_FASKES) {
      const partial = trend.some(
        (t) => t.series[jenis] && !t.series[jenis].isComplete && t.series[jenis].validRecords > 0,
      )
      if (partial) incomplete.add(jenis)
    }
    return { data: rows, incompleteJenis: incomplete }
  }, [trendRows])

  const hasAnyIncomplete = incompleteJenis.size > 0

  const toggleJenis = (jenis: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(jenis)) next.delete(jenis)
      else next.add(jenis)
      return next
    })
  }

  if (data.every((d) => JENIS_FASKES.every((j) => d[j] === null))) {
    return <EmptyState message="Tidak ada data valid untuk tren pada filter ini." />
  }

  return (
    <div>
      {hasAnyIncomplete && (
        <div className="mb-1.5">
          <Badge tone="amber">Nilai parsial — garis putus</Badge>
        </div>
      )}

      <div className="divide-y divide-slate-300 border-y border-slate-300">
        {JENIS_FASKES.map((jenis) => {
          const isHidden = hidden.has(jenis)
          const domain = seriesDomain(data.map((d) => d[jenis]))
          const span = domain[1] - domain[0]
          return (
            <div
              key={jenis}
              className="grid grid-cols-[76px_1fr] items-center gap-1.5 py-2 hover:bg-slate-50/70 sm:grid-cols-[92px_1fr]"
            >
              <button
                onClick={() => toggleJenis(jenis)}
                title={isHidden ? `Tampilkan ${JENIS_LABEL[jenis]}` : `Sembunyikan ${JENIS_LABEL[jenis]}`}
                className={`flex items-center gap-1.5 truncate text-left text-[11px] font-medium transition-opacity ${
                  isHidden ? 'text-slate-300 line-through' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: isHidden ? '#cbd5e1' : JENIS_COLORS[jenis] }}
                />
                <span className="truncate">{JENIS_LABEL[jenis]}</span>
              </button>

              <div className="h-12">
                {!isHidden && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data}
                      margin={{ top: 8, right: 40, bottom: 10, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="tahun"
                        type="number"
                        domain={[2018, 2024]}
                        ticks={TAHUN_LIST}
                        hide
                      />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        domain={domain}
                        allowDataOverflow
                        tickFormatter={(v: number) => formatTickShort(v, span)}
                      />
                      <ReTooltip
                        content={<TrendTooltip incompleteJenis={incompleteJenis} />}
                      />
                      <ReferenceLine
                        x={filters.tahun}
                        stroke="#1e40af"
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey={jenis}
                        stroke={JENIS_COLORS[jenis]}
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      >
                        <LabelList
                          dataKey={jenis}
                          content={(props) => {
                            const { x, y, value, index } = props as {
                              x?: number
                              y?: number
                              value?: number | null
                              index?: number
                            }
                            if (value === null || value === undefined) return null
                            if (index !== data.length - 1) return null
                            return (
                              <text
                                x={(x ?? 0) + 5}
                                y={y ?? 0}
                                dominantBaseline="middle"
                                fontSize={9}
                                fill="#475569"
                              >
                                {formatNumber(Number(value))}
                              </text>
                            )
                          }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-[76px_1fr] gap-1.5 pt-1 sm:grid-cols-[92px_1fr]">
          <span />
          <div className="flex justify-between pl-[42px] pr-[40px] text-[10px] text-slate-500">
            {TAHUN_LIST.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
        Tiap panel punya skala Y sendiri (tidak mulai dari nol) agar bentuk tren
        terbaca — tinggi antar panel tidak sebanding, bandingkan arah & polanya.
        Angka di ujung kanan = nilai terakhir. Klik nama jenis untuk menyembunyikan.
      </p>
    </div>
  )
}
