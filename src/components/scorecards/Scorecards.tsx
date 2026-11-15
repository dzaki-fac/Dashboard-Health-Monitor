import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFilters } from '../../hooks/useFilters'
import {
  kpiGrowth,
  kpiPositiveShare,
  kpiSuspected,
  kpiTotalFaskes,
  kpiWilayahTeramati,
} from '../../lib/kpiCalculations'
import { completenessHint, formatNumber, formatPct } from '../../lib/format'
import { JENIS_LABEL } from '../../types'
import { InfoTooltip, IncompleteBadge } from '../ui/primitives'

function ScoreCard({
  label,
  value,
  unit,
  tooltip,
  tone = 'text-slate-900',
  status,
  secondary,
}: {
  label: string
  value: ReactNode
  unit?: string
  tooltip: string
  tone?: string
  /** Indikator status — hanya bila ada peringatan yang penting. */
  status?: ReactNode
  /** Keterangan kecil di bawah angka. */
  secondary?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <InfoTooltip text={tooltip} />
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`text-[26px] font-bold leading-none tabular-nums ${tone}`}>
          {value}
        </span>
        {unit && <span className="text-[11px] text-slate-400">{unit}</span>}
      </div>
      {(status || secondary) && (
        <div className="mt-2 flex items-center gap-1.5">
          {status}
          {secondary && (
            <span className="text-[10px] tabular-nums text-slate-400">{secondary}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function Scorecards() {
  const { rows, growthRows, filters } = useFilters()

  const total = kpiTotalFaskes(rows)
  const growth = kpiGrowth(growthRows).entry
  const nWilayah = kpiWilayahTeramati(rows)
  const posShare = kpiPositiveShare(rows)
  const suspected = kpiSuspected(rows)

  const totalHint = completenessHint(total)
  const scopeJenis =
    filters.jenis === 'SEMUA' ? 'seluruh jenis' : JENIS_LABEL[filters.jenis]
  const scope = `Cakupan: tahun ${filters.tahun} · ${scopeJenis} · ${
    filters.kabupaten === 'SEMUA' ? 'seluruh 27 kab/kota' : 'wilayah terpilih'
  }`

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <ScoreCard
        label="Total Fasilitas"
        value={formatNumber(total.value)}
        unit="unit"
        tooltip={`${scope}. Nol yang diduga kesenjangan pelaporan (zero_suspected) tidak ikut dijumlahkan.`}
        status={!total.isComplete ? <IncompleteBadge hint={totalHint ?? ''} /> : undefined}
      />
      <ScoreCard
        label="Pertumbuhan 2018–2024"
        value={growth?.feasible ? formatPct(growth.pctChange) : 'N/A'}
        tone={
          growth?.feasible && (growth.pctChange ?? 0) < 0
            ? 'text-red-600'
            : 'text-slate-900'
        }
        tooltip={`(N2024 − N2018) / N2018 × 100% · cakupan tetap 2018–2024, tidak mengikuti filter tahun. Dihitung hanya bila dasar 2018 > 0 dan kedua periode tersedia.${growth?.reason ? ` Saat ini: ${growth.reason}.` : ''}`}
        secondary={growth?.feasible ? `${growth.absChange! > 0 ? '+' : ''}${formatNumber(growth.absChange)} unit` : undefined}
        status={
          growth && !growth.feasible ? (
            <IncompleteBadge hint={growth.reason ?? 'Tidak layak dihitung'} />
          ) : undefined
        }
      />
      <ScoreCard
        label="Wilayah Teramati"
        value={formatNumber(nWilayah)}
        unit="/ 27 kab/kota"
        tooltip={`${scope}. Jumlah kabupaten/kota dengan observasi dalam cakupan filter aktif.`}
      />
      <ScoreCard
        label="Baris Positif"
        value={formatPct(posShare.pct)}
        tooltip={`${scope}. Persentase observasi dengan jumlah_faskes > 0 (${formatNumber(posShare.positive)} dari ${formatNumber(posShare.total)} baris). Bukan ukuran kelengkapan pelaporan resmi.`}
        secondary={`${formatNumber(posShare.positive)}/${formatNumber(posShare.total)} baris`}
      />
      <ScoreCard
        label="Perlu Verifikasi"
        value={formatNumber(suspected)}
        unit="obs."
        tooltip={`Jumlah observasi zero_suspected pada tahun ${filters.tahun}: nol yang diduga kesenjangan pelaporan, dikecualikan dari visualisasi hingga terverifikasi ke produsen data.`}
        tone={suspected > 0 ? 'text-amber-600' : 'text-slate-900'}
        status={
          suspected > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <AlertTriangle className="h-3 w-3" /> zero_suspected
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
