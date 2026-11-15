import { useMemo, useState } from 'react'
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
} from 'recharts'
import { useFilters } from '../../hooks/useFilters'
import { rankByRegion, type RankEntry } from '../../lib/aggregations'
import { completenessHint, formatNumber } from '../../lib/format'
import { EmptyState } from '../ui/primitives'

interface RankTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: RankEntry }>
}

function RankTooltip({ active, payload }: RankTooltipProps) {
  const e = payload?.[0]?.payload
  if (!active || !e) return null
  const hint = completenessHint(e)
  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <p className="font-semibold text-slate-700">
        #{e.rank} · {e.nama}
      </p>
      <p className="mt-1">
        <span className="text-slate-500">Jumlah:</span>{' '}
        <span className="font-semibold">{formatNumber(e.value)} unit</span>
      </p>
      <p className="mt-0.5 text-slate-500">
        {e.validRecords}/{e.expectedRecords} observasi tersedia
        {e.suspectedRecords > 0 && ` · ${e.suspectedRecords} zero_suspected`}
      </p>
      {hint && <p className="mt-1 text-amber-600">⚠ {hint}</p>}
    </div>
  )
}

export function RankChart() {
  const { rows } = useFilters()
  const [topN, setTopN] = useState<5 | 10 | 0>(10)
  const [order, setOrder] = useState<'tertinggi' | 'terendah'>('tertinggi')

  const entries = useMemo(() => rankByRegion(rows, order), [rows, order])
  const withValue = entries.filter((e) => e.value !== null)
  const shown =
    topN === 0 ? withValue : order === 'tertinggi'
      ? withValue.slice(0, topN)
      : withValue.slice(-topN)

  const data = shown.map((e) => ({ ...e, val: e.value ?? 0 }))

  if (withValue.length === 0) {
    return <EmptyState message="Tidak ada nilai valid untuk peringkat pada filter ini." />
  }

  const height = Math.max(180, shown.length * 28 + 40)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {([5, 10, 0] as const).map((n) => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                topN === n ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {n === 0 ? 'Semua' : `Top ${n}`}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(['tertinggi', 'terendah'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrder(o)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                order === o ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {o === 'tertinggi' ? 'Tertinggi' : 'Terendah'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v: number) => v.toLocaleString('id-ID')}
            />
            <YAxis
              type="category"
              dataKey="nama"
              tick={{ fontSize: 10 }}
              tickLine={false}
              width={132}
            />
            <ReTooltip content={<RankTooltip />} />
            <Bar dataKey="val" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((e) => (
                <Cell key={e.kode} fill={e.isComplete ? '#2563eb' : '#93c5fd'} />
              ))}
              <LabelList
                dataKey="val"
                position="right"
                formatter={(v) => Number(v).toLocaleString('id-ID')}
                style={{ fontSize: 10, fill: '#475569' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-600" /> lengkap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-300" /> belum lengkap
        </span>
      </div>
    </div>
  )
}
