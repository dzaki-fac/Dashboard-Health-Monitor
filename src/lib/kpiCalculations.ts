import type { Row, AggregateResult } from '../types'
import {
  aggregate,
  combineAggregate,
  growthForScope,
  positiveRowShare,
  type GrowthEntry,
} from './aggregations'

/* ------------------------------------------------------------------ */
/* KPI Scorecard                                                       */
/* ------------------------------------------------------------------ */

export interface TotalFaskesKpi extends AggregateResult {
  unit: string
  periode: string
}

/** Card 1 — total fasilitas pada cakupan filter aktif */
export function kpiTotalFaskes(rows: Row[]): TotalFaskesKpi {
  const agg = combineAggregate(
    groupByRegion(rows).map((rs) => aggregate(rs)),
  )
  return { ...agg, unit: 'unit', periode: 'tahun fokus' }
}

function groupByRegion(rows: Row[]): Row[][] {
  const m = new Map<number, Row[]>()
  for (const r of rows) {
    const arr = m.get(r.kode_kabupaten_kota)
    if (arr) arr.push(r)
    else m.set(r.kode_kabupaten_kota, [r])
  }
  return [...m.values()]
}

/** Card 2 — pertumbuhan 2018–2024 (cakupan: jenis & wilayah filter; tahun TETAP 2018–2024) */
export function kpiGrowth(rows: Row[]): {
  entry: GrowthEntry | null
} {
  const entries = growthForScope(rows)
  if (entries.length === 1) return { entry: entries[0] }
  // cakupan > 1 jenis: agregasikan seluruh jenis menjadi satu seri
  const merged = mergeGrowth(entries)
  return { entry: merged }
}

function mergeGrowth(entries: GrowthEntry[]): GrowthEntry {
  const n2018 = entries.reduce((s, e) => s + (e.n2018 ?? 0), 0)
  const n2024 = entries.reduce((s, e) => s + (e.n2024 ?? 0), 0)
  const anyNa2018 = entries.some((e) => e.n2018 === null)
  const anyNa2024 = entries.some((e) => e.n2024 === null)
  if (anyNa2018 || anyNa2024 || n2018 <= 0) {
    const reason = anyNa2018
      ? 'Nilai dasar 2018 tidak tersedia pada beberapa jenis'
      : anyNa2024
        ? 'Nilai akhir 2024 tidak tersedia pada beberapa jenis'
        : 'Nilai dasar 2018 = 0 atau tidak positif'
    return {
      key: '__merged__',
      label: 'Seluruh jenis',
      n2018: anyNa2018 ? null : n2018,
      n2024: anyNa2024 ? null : n2024,
      absChange: null,
      pctChange: null,
      feasible: false,
      reason,
    }
  }
  return {
    key: '__merged__',
    label: 'Seluruh jenis',
    n2018,
    n2024,
    absChange: n2024 - n2018,
    pctChange: ((n2024 - n2018) / n2018) * 100,
    feasible: true,
  }
}

/** Card 3 — jumlah wilayah dalam cakupan filter */
export function kpiWilayahTeramati(rows: Row[]): number {
  return new Set(rows.map((r) => r.kode_kabupaten_kota)).size
}

/** Card 4 — proporsi baris positif dalam cakupan */
export function kpiPositiveShare(rows: Row[]): { pct: number | null; positive: number; total: number } {
  const s = positiveRowShare(rows)
  return { pct: s.pct, positive: s.positive, total: s.total }
}

/** Card 5 — jumlah observasi zero_suspected dalam cakupan */
export function kpiSuspected(rows: Row[]): number {
  return rows.filter((r) => r.status_verifikasi === 'zero_suspected').length
}
