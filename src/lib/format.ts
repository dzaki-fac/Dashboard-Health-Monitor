import type { AggregateResult } from '../types'

/** Format angka gaya Indonesia: 1.234.567 */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A'
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

/** Format persen dengan 1 desimal */
export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A'
  return `${n.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

/** Skala warna choropleth (biru, semakin intens = semakin besar) */
export function choroplethColor(value: number | null, max: number): string {
  if (value === null) return '#e2e8f0' // abu-abu: tanpa nilai valid
  if (max <= 0) return '#eff6ff'
  const t = Math.sqrt(value / max) // skala sqrt agar distribusi lebih terbaca
  const steps = ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a8a']
  const idx = Math.min(steps.length - 1, Math.floor(t * steps.length))
  return steps[idx]
}

/** Teks bantuan untuk hasil agregasi parsial */
export function completenessHint(agg: AggregateResult): string | null {
  if (agg.isComplete) return null
  const missing = agg.expectedRecords - agg.validRecords
  return `${missing} observasi tidak tersedia (termasuk ${agg.suspectedRecords} zero_suspected); nilai bersifat parsial`
}
