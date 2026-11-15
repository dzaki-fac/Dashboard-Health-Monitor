import type { AggregateResult, Row } from '../types'
import { TAHUN_LIST } from '../types'

/**
 * Agregasi jumlah dengan kontrak kelengkapan.
 * TIDAK memakai sum() yang mengabaikan NaN begitu saja:
 * - jumlah_faskes_viz null (zero_suspected / missing_source) tidak dijumlahkan,
 *   tetapi tetap terhitung di expectedRecords & suspectedRecords.
 * - isComplete false berarti nilai bersifat PARSIAL.
 */
export function aggregate(rows: Row[]): AggregateResult {
  const expectedRecords = rows.length
  let value = 0
  let validRecords = 0
  let suspectedRecords = 0

  for (const r of rows) {
    if (r.status_verifikasi === 'zero_suspected') suspectedRecords++
    if (r.jumlah_faskes_viz !== null) {
      value += r.jumlah_faskes_viz
      validRecords++
    }
  }

  return {
    value: validRecords > 0 ? value : null,
    expectedRecords,
    validRecords,
    suspectedRecords,
    isComplete: expectedRecords > 0 && validRecords === expectedRecords,
  }
}

/** Gabungkan beberapa hasil agregasi (mis. lintas jenis/wilayah) */
export function combineAggregate(parts: AggregateResult[]): AggregateResult {
  let value = 0
  let validRecords = 0
  let suspectedRecords = 0
  let expectedRecords = 0
  for (const p of parts) {
    expectedRecords += p.expectedRecords
    validRecords += p.validRecords
    suspectedRecords += p.suspectedRecords
    if (p.value !== null) value += p.value
  }
  return {
    value: validRecords > 0 ? value : null,
    expectedRecords,
    validRecords,
    suspectedRecords,
    isComplete: expectedRecords > 0 && validRecords === expectedRecords,
  }
}

export interface GroupResult extends AggregateResult {
  key: string
}

/** Group by lalu aggregate per kunci */
export function aggregateBy(rows: Row[], keyFn: (r: Row) => string): GroupResult[] {
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = keyFn(r)
    const arr = groups.get(k)
    if (arr) arr.push(r)
    else groups.set(k, [r])
  }
  return [...groups.entries()]
    .map(([key, rs]) => ({ key, ...aggregate(rs) }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/* ------------------------------------------------------------------ */
/* CBQ 1 — Tren: total per jenis × tahun                              */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  tahun: number
  /** per jenis: hasil agregasi (value null bila tidak ada nilai valid) */
  series: Record<string, AggregateResult>
}

export function trendData(rows: Row[]): TrendPoint[] {
  return TAHUN_LIST.map((tahun) => {
    const tahunRows = rows.filter((r) => r.tahun === tahun)
    const byJenis = new Map<string, Row[]>()
    for (const r of tahunRows) {
      const arr = byJenis.get(r.jenis_faskes)
      if (arr) arr.push(r)
      else byJenis.set(r.jenis_faskes, [r])
    }
    const series: Record<string, AggregateResult> = {}
    for (const [jenis, rs] of byJenis) {
      series[jenis] = combineAggregate(
        groupByKab(rs).map((rs2) => aggregate(rs2)),
      )
    }
    return { tahun, series }
  })
}

function groupByKab(rows: Row[]): Row[][] {
  const m = new Map<number, Row[]>()
  for (const r of rows) {
    const arr = m.get(r.kode_kabupaten_kota)
    if (arr) arr.push(r)
    else m.set(r.kode_kabupaten_kota, [r])
  }
  return [...m.values()]
}

/* ------------------------------------------------------------------ */
/* CBQ 2 — Peringkat wilayah                                          */
/* ------------------------------------------------------------------ */

export interface RankEntry extends AggregateResult {
  nama: string
  kode: number
  /** peringkat kompetisi; nilai seri = peringkat sama */
  rank: number | null
}

export function rankByRegion(
  rows: Row[],
  order: 'tertinggi' | 'terendah',
): RankEntry[] {
  const byKab = new Map<number, Row[]>()
  for (const r of rows) {
    const arr = byKab.get(r.kode_kabupaten_kota)
    if (arr) arr.push(r)
    else byKab.set(r.kode_kabupaten_kota, [r])
  }
  const entries: RankEntry[] = [...byKab.entries()].map(([kode, rs]) => ({
    kode,
    nama: rs[0].nama_kabupaten_kota,
    ...combineAggregate(groupByJenis(rs).map((rs2) => aggregate(rs2))),
    rank: null,
  }))

  const withValue = entries.filter((e) => e.value !== null)
  // peringkat kompetisi: nilai sama = peringkat sama (konsisten untuk seri)
  const sorted = [...withValue].sort((a, b) =>
    order === 'tertinggi' ? b.value! - a.value! : a.value! - b.value!,
  )
  let currentRank = 0
  let prevValue: number | null = null
  sorted.forEach((e, i) => {
    if (e.value !== prevValue) {
      currentRank = i + 1
      prevValue = e.value
    }
    e.rank = currentRank
  })

  // wilayah tanpa nilai valid sama sekali tidak diberi peringkat
  return order === 'tertinggi'
    ? [...sorted, ...entries.filter((e) => e.value === null)]
    : [...entries.filter((e) => e.value === null), ...sorted]
}

function groupByJenis(rows: Row[]): Row[][] {
  const m = new Map<string, Row[]>()
  for (const r of rows) {
    const arr = m.get(r.jenis_faskes)
    if (arr) arr.push(r)
    else m.set(r.jenis_faskes, [r])
  }
  return [...m.values()]
}

/* ------------------------------------------------------------------ */
/* CBQ 3 — Pertumbuhan 2018–2024                                      */
/* ------------------------------------------------------------------ */

export interface GrowthEntry {
  key: string
  label: string
  n2018: number | null
  n2024: number | null
  absChange: number | null
  pctChange: number | null
  feasible: boolean
  /** alasan N/A bila tidak layak dihitung */
  reason?: string
  baseIncomplete?: boolean
  endIncomplete?: boolean
}

export function growthForScope(rows: Row[]): GrowthEntry[] {
  const base = aggregateBy(rows.filter((r) => r.tahun === 2018), (r) => r.jenis_faskes)
  const end = aggregateBy(rows.filter((r) => r.tahun === 2024), (r) => r.jenis_faskes)
  const baseMap = new Map(base.map((b) => [b.key, b]))
  const endMap = new Map(end.map((b) => [b.key, b]))
  const keys = [...new Set([...baseMap.keys(), ...endMap.keys()])].sort()

  return keys.map((jenis) => {
    const b = baseMap.get(jenis)
    const e = endMap.get(jenis)
    const n2018 = b?.value ?? null
    const n2024 = e?.value ?? null

    if (!b || b.validRecords === 0) {
      return {
        key: jenis,
        label: jenis,
        n2018: null,
        n2024,
        absChange: null,
        pctChange: null,
        feasible: false,
        reason: 'Nilai dasar 2018 tidak tersedia',
        baseIncomplete: true,
        endIncomplete: e ? !e.isComplete : true,
      }
    }
    if (!e || e.validRecords === 0) {
      return {
        key: jenis,
        label: jenis,
        n2018,
        n2024: null,
        absChange: null,
        pctChange: null,
        feasible: false,
        reason: 'Nilai akhir 2024 tidak tersedia',
        baseIncomplete: !b.isComplete,
        endIncomplete: true,
      }
    }
    if (n2018 === null || n2018 <= 0) {
      return {
        key: jenis,
        label: jenis,
        n2018,
        n2024,
        absChange: null,
        pctChange: null,
        feasible: false,
        reason: 'Nilai dasar 2018 = 0 atau tidak positif',
        baseIncomplete: !b.isComplete,
        endIncomplete: !e.isComplete,
      }
    }
    const absChange = (n2024 ?? 0) - n2018
    return {
      key: jenis,
      label: jenis,
      n2018,
      n2024,
      absChange,
      pctChange: (absChange / n2018) * 100,
      feasible: true,
      baseIncomplete: !b.isComplete,
      endIncomplete: !e.isComplete,
    }
  })
}

/* ------------------------------------------------------------------ */
/* CBQ 4 — Komposisi per wilayah (tanpa Posyandu)                      */
/* ------------------------------------------------------------------ */

export interface CompositionEntry {
  nama: string
  kode: number
  /** share % per jenis, dihitung terhadap DENOMINATOR EKSPEKTASI (bukan hanya nilai tersedia) */
  shares: Record<string, number>
  /** porsi yang tidak tersedia (zero_suspected dsb.) dalam % */
  missingShare: number
  isComplete: boolean
  missingCategories: string[]
  total: number | null
}

export const COMPOSITION_JENIS = [
  'RUMAH SAKIT UMUM',
  'RUMAH SAKIT KHUSUS',
  'RUMAH SAKIT BERSALIN',
  'PUSKESMAS',
]

export function compositionByRegion(rows: Row[]): CompositionEntry[] {
  // cakupan: tahun fokus + jenis filter + kabupaten filter sudah diterapkan di caller
  const byKab = new Map<number, Row[]>()
  for (const r of rows) {
    const arr = byKab.get(r.kode_kabupaten_kota)
    if (arr) arr.push(r)
    else byKab.set(r.kode_kabupaten_kota, [r])
  }

  const entries: CompositionEntry[] = []
  for (const [kode, rs] of [...byKab.entries()].sort((a, b) =>
    a[1][0].nama_kabupaten_kota.localeCompare(b[1][0].nama_kabupaten_kota),
  )) {
    const shares: Record<string, number> = {}
    let available = 0
    let validRecords = 0
    let expectedRecords = 0
    let suspectedCount = 0
    const missingCategories: string[] = []

    for (const jenis of COMPOSITION_JENIS) {
      const subset = rs.filter((r) => r.jenis_faskes === jenis)
      const agg = aggregate(subset)
      expectedRecords += agg.expectedRecords
      validRecords += agg.validRecords
      available += agg.value ?? 0
      suspectedCount += agg.suspectedRecords
      if (agg.validRecords === 0) missingCategories.push(jenis)
    }

    /**
     * Denominasi kategori: nilai tersedia + perkiraan MINIMAL kontribusi
     * kategori yang tidak tersedia (setiap fasilitas minimal 1 unit, jadi
     * suspected_count unit). Dengan ini wilayah yang tidak lengkap TIDAK
     * dinormalisasi ke 100%: total barisnya < 100% dengan segmen abu-abu.
     */
    const denominator = available + suspectedCount

    for (const jenis of COMPOSITION_JENIS) {
      const subset = rs.filter((r) => r.jenis_faskes === jenis)
      const agg = aggregate(subset)
      shares[jenis] = denominator > 0 ? ((agg.value ?? 0) / denominator) * 100 : 0
    }

    entries.push({
      nama: rs[0].nama_kabupaten_kota,
      kode,
      shares,
      missingShare: denominator > 0 ? (suspectedCount / denominator) * 100 : 0,
      isComplete: validRecords === expectedRecords && expectedRecords > 0,
      missingCategories,
      total: validRecords > 0 ? available : null,
    })
  }
  return entries
}

/* ------------------------------------------------------------------ */
/* CBQ 5 — Kualitas data                                              */
/* ------------------------------------------------------------------ */

export interface QualityCell {
  jenis: string
  tahun: number
  positive: number
  zeroUnverified: number
  zeroSuspected: number
  total: number
  rows: Row[]
}

export function qualityMatrix(rows: Row[]): { jenis: string; cells: QualityCell[] }[] {
  const result: { jenis: string; cells: QualityCell[] }[] = []
  for (const jenis of [...new Set(rows.map((r) => r.jenis_faskes))].sort()) {
    const cells: QualityCell[] = TAHUN_LIST.map((tahun) => {
      const cellRows = rows.filter(
        (r) => r.jenis_faskes === jenis && r.tahun === tahun,
      )
      return {
        jenis,
        tahun,
        positive: cellRows.filter((r) => r.jumlah_faskes > 0).length,
        zeroUnverified: cellRows.filter((r) => r.status_verifikasi === 'zero_unverified').length,
        zeroSuspected: cellRows.filter((r) => r.status_verifikasi === 'zero_suspected').length,
        total: cellRows.length,
        rows: cellRows,
      }
    })
    result.push({ jenis, cells })
  }
  return result
}

/** Proporsi baris positif dalam cakupan (BUKAN tingkat kelengkapan pelaporan resmi) */
export function positiveRowShare(rows: Row[]): {
  positive: number
  total: number
  pct: number | null
} {
  const total = rows.length
  const positive = rows.filter((r) => r.jumlah_faskes > 0).length
  return { positive, total, pct: total > 0 ? (positive / total) * 100 : null }
}
