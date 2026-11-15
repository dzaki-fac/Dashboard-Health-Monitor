import { describe, it, expect } from 'vitest'
import type { Row, StatusVerifikasi } from '../../types'

import {
  aggregate,
  combineAggregate,
  rankByRegion,
  growthForScope,
  compositionByRegion,
  qualityMatrix,
  positiveRowShare,
} from '../aggregations'
import {
  kpiTotalFaskes,
  kpiGrowth,
  kpiWilayahTeramati,
  kpiPositiveShare,
  kpiSuspected,
} from '../kpiCalculations'

function mkRow(
  o: Partial<Row> & { kode: number; tahun: number; nama?: string },
): Row {
  const status: StatusVerifikasi = o.status_verifikasi ?? 'valid_positive'
  const jumlah = o.jumlah_faskes ?? 0
  const viz =
    o.jumlah_faskes_viz !== undefined
      ? o.jumlah_faskes_viz
      : status === 'zero_suspected' || status === 'missing_source'
        ? null
        : jumlah
  return {
    id: o.kode * 10 + o.tahun,
    kode_provinsi: 32,
    nama_provinsi: 'JAWA BARAT',
    kode_kabupaten_kota: o.kode,
    nama_kabupaten_kota: o.nama ?? `KAB ${o.kode}`,
    jenis_faskes: o.jenis_faskes ?? 'PUSKESMAS',
    jumlah_faskes: jumlah,
    satuan: 'UNIT',
    tahun: o.tahun,
    status_verifikasi: status,
    catatan_cleaning: '',
    jumlah_faskes_viz: viz,
  }
}

const J = (r: Row) => r.jenis_faskes
void J

describe('aggregate — kontrak kelengkapan', () => {
  it('kasus 1 — data seluruhnya tersedia: isComplete true, value = sum', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2020, jumlah_faskes: 5, jumlah_faskes_viz: 5 }),
      mkRow({ kode: 3202, tahun: 2020, jumlah_faskes: 7, jumlah_faskes_viz: 7 }),
    ]
    const agg = aggregate(rows)
    expect(agg).toEqual({
      value: 12,
      expectedRecords: 2,
      validRecords: 2,
      suspectedRecords: 0,
      isComplete: true,
    })
  })

  it('kasus 2 — sebagian NaN (zero_suspected): value parsial, isComplete false, suspected terhitung', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2020, jumlah_faskes: 5, jumlah_faskes_viz: 5 }),
      mkRow({ kode: 3202, tahun: 2020, status_verifikasi: 'zero_suspected' }),
    ]
    const agg = aggregate(rows)
    expect(agg.value).toBe(5) // HANYA nilai tersedia yang dijumlahkan
    expect(agg.expectedRecords).toBe(2)
    expect(agg.validRecords).toBe(1)
    expect(agg.suspectedRecords).toBe(1)
    expect(agg.isComplete).toBe(false)
  })

  it('kasus 3 — seluruh nilai NaN: value null (bukan 0)', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2019, status_verifikasi: 'zero_suspected' }),
      mkRow({ kode: 3202, tahun: 2019, status_verifikasi: 'zero_suspected' }),
    ]
    const agg = aggregate(rows)
    expect(agg.value).toBeNull()
    expect(agg.isComplete).toBe(false)
  })

  it('kasus 8 — filter menghasilkan nol observasi: value null, expected 0, isComplete false', () => {
    const agg = aggregate([])
    expect(agg.value).toBeNull()
    expect(agg.expectedRecords).toBe(0)
    expect(agg.isComplete).toBe(false)
  })

  it('combineAggregate menggabungkan kontrak dengan benar', () => {
    const parts = [
      { value: 5, expectedRecords: 2, validRecords: 2, suspectedRecords: 0, isComplete: true },
      { value: null, expectedRecords: 2, validRecords: 0, suspectedRecords: 2, isComplete: false },
    ]
    const combined = combineAggregate(parts)
    expect(combined.value).toBe(5)
    expect(combined.expectedRecords).toBe(4)
    expect(combined.validRecords).toBe(2)
    expect(combined.isComplete).toBe(false)
  })
})

describe('rankByRegion — peringkat', () => {
  const mk = (kode: number, nilai: number | null) => {
    const r = mkRow({ kode, tahun: 2020 })
    r.jumlah_faskes = nilai ?? 0
    r.jumlah_faskes_viz = nilai
    return r
  }

  it('kasus 5 — nilai seri: peringkat sama (kompetisi ranking)', () => {
    const rows = [
      mk(3201, 10), // rank 1
      mk(3202, 10), // rank 1 (seri)
      mk(3203, 7), // rank 3 (bukan 2)
    ]
    const ranked = rankByRegion(rows, 'tertinggi').filter((e) => e.value !== null)
    const byKode = new Map(ranked.map((e) => [e.kode, e.rank]))
    expect(byKode.get(3201)).toBe(1)
    expect(byKode.get(3202)).toBe(1)
    expect(byKode.get(3203)).toBe(3)
  })

  it('wilayah tanpa nilai valid tidak mendapat peringkat', () => {
    const rows = [mk(3201, 10)]
    rows.push(mkRow({ kode: 3202, tahun: 2020, status_verifikasi: 'zero_suspected' }))
    const ranked = rankByRegion(rows, 'tertinggi')
    const noValue = ranked.find((e) => e.kode === 3202)
    expect(noValue?.rank).toBeNull()
    expect(noValue?.value).toBeNull()
  })

  it('order terendah mengurutkan dari nilai terkecil', () => {
    const rows = [mk(3201, 10), mk(3202, 3), mk(3203, 7)]
    const ranked = rankByRegion(rows, 'terendah')
    expect(ranked[0].kode).toBe(3202)
    expect(ranked[0].rank).toBe(1)
  })
})

describe('growthForScope — pertumbuhan', () => {
  it('growth dihitung bila N2018 > 0 dan kedua periode tersedia', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2018, jumlah_faskes: 10, jumlah_faskes_viz: 10 }),
      mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 15, jumlah_faskes_viz: 15 }),
    ]
    const g = growthForScope(rows).find((e) => e.key === 'PUSKESMAS')!
    expect(g.feasible).toBe(true)
    expect(g.pctChange).toBeCloseTo(50)
    expect(g.absChange).toBe(5)
  })

  it('kasus 4 — nilai awal growth = 0: N/A dengan alasan', () => {
    const rows = [
      mkRow({
        kode: 3201,
        tahun: 2018,
        jumlah_faskes: 0,
        status_verifikasi: 'zero_unverified',
      }),
      mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 15, jumlah_faskes_viz: 15 }),
    ]
    const g = growthForScope(rows).find((e) => e.key === 'PUSKESMAS')!
    expect(g.feasible).toBe(false)
    expect(g.pctChange).toBeNull()
    expect(g.reason).toMatch(/Nilai dasar 2018/)
  })

  it('N/A bila 2018 seluruhnya zero_suspected (nilai dasar tidak tersedia)', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2018, status_verifikasi: 'zero_suspected' }),
      mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 15, jumlah_faskes_viz: 15 }),
    ]
    const g = growthForScope(rows).find((e) => e.key === 'PUSKESMAS')!
    expect(g.feasible).toBe(false)
    expect(g.reason).toMatch(/dasar 2018 tidak tersedia/)
  })
})

describe('compositionByRegion — komposisi', () => {
  it('share dihitung terhadap denominasi minimal (tidak dinormalisasi bila tak lengkap)', () => {
    const jenis = ['RUMAH SAKIT UMUM', 'RUMAH SAKIT KHUSUS', 'RUMAH SAKIT BERSALIN', 'PUSKESMAS']
    const rows = jenis.map((j) =>
      mkRow({ kode: 3201, tahun: 2024, jenis_faskes: j, jumlah_faskes: 10, jumlah_faskes_viz: 10 }),
    )
    // RS Bersalin zero_suspected: nilai tidak tersedia (denominasi minimal +1 unit)
    rows[2].status_verifikasi = 'zero_suspected'
    rows[2].jumlah_faskes = 0
    rows[2].jumlah_faskes_viz = null

    const comp = compositionByRegion(rows)[0]
    const total = Object.values(comp.shares).reduce((s, v) => s + v, 0)
    expect(total).toBeLessThan(100) // TIDAK dinormalisasi ke 100%
    expect(total).toBeGreaterThan(0)
    expect(comp.isComplete).toBe(false)
    // denominasi minimal = 30 tersedia + 1 (suspected minimal 1 unit) = 31
    expect(comp.missingShare).toBeCloseTo((1 / 31) * 100, 3)
    expect(comp.shares['RUMAH SAKIT UMUM']).toBeCloseTo((10 / 31) * 100, 3)
  })

  it('wilayah lengkap: total share = 100%', () => {
    const jenis = ['RUMAH SAKIT UMUM', 'RUMAH SAKIT KHUSUS', 'RUMAH SAKIT BERSALIN', 'PUSKESMAS']
    const rows = jenis.map((j) =>
      mkRow({ kode: 3201, tahun: 2024, jenis_faskes: j, jumlah_faskes: 5, jumlah_faskes_viz: 5 }),
    )
    const comp = compositionByRegion(rows)[0]
    const total = Object.values(comp.shares).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(100)
    expect(comp.isComplete).toBe(true)
  })
})

describe('qualityMatrix & positiveRowShare', () => {
  it('menghitung kasus per sel jenis × tahun', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2019, jumlah_faskes: 100, jumlah_faskes_viz: 100 }),
      mkRow({ kode: 3202, tahun: 2019, status_verifikasi: 'zero_suspected' }),
      mkRow({ kode: 3203, tahun: 2019, status_verifikasi: 'zero_unverified' }),
    ]
    const matrix = qualityMatrix(rows)
    const cell = matrix.find((m) => m.jenis === 'PUSKESMAS')!.cells.find((c) => c.tahun === 2019)!
    expect(cell.positive).toBe(1)
    expect(cell.zeroSuspected).toBe(1)
    expect(cell.zeroUnverified).toBe(1)
    expect(cell.total).toBe(3)
  })

  it('proporsi baris positif', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2020, jumlah_faskes: 5, jumlah_faskes_viz: 5 }),
      mkRow({ kode: 3202, tahun: 2020, status_verifikasi: 'zero_unverified' }),
    ]
    expect(positiveRowShare(rows).pct).toBeCloseTo(50)
  })
})

describe('KPI calculations', () => {
  it('kpiTotalFaskes: kontrak kelengkapan + unit', () => {
    const rows = [mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 5, jumlah_faskes_viz: 5 })]
    const kpi = kpiTotalFaskes(rows)
    expect(kpi.value).toBe(5)
    expect(kpi.isComplete).toBe(true)
    expect(kpi.unit).toBe('unit')
  })

  it('kpiGrowth multi-jenis: N/A bila ada jenis dengan dasar 2018 tidak tersedia', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2018, jumlah_faskes: 10, jumlah_faskes_viz: 10 }),
      mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 20, jumlah_faskes_viz: 20 }),
      mkRow({ kode: 3201, tahun: 2018, jenis_faskes: 'POSYANDU', status_verifikasi: 'zero_suspected' }),
      mkRow({ kode: 3201, tahun: 2024, jenis_faskes: 'POSYANDU', jumlah_faskes: 500, jumlah_faskes_viz: 500 }),
    ]
    const { entry } = kpiGrowth(rows)
    expect(entry?.feasible).toBe(false)
    expect(entry?.reason).toMatch(/dasar 2018/)
  })

  it('kpiGrowth multi-jenis lengkap: digabung benar', () => {
    const rows = [
      mkRow({ kode: 3201, tahun: 2018, jumlah_faskes: 10, jumlah_faskes_viz: 10 }),
      mkRow({ kode: 3201, tahun: 2024, jumlah_faskes: 20, jumlah_faskes_viz: 20 }),
      mkRow({ kode: 3201, tahun: 2018, jenis_faskes: 'POSYANDU', jumlah_faskes: 100, jumlah_faskes_viz: 100 }),
      mkRow({ kode: 3201, tahun: 2024, jenis_faskes: 'POSYANDU', jumlah_faskes: 150, jumlah_faskes_viz: 150 }),
    ]
    const { entry } = kpiGrowth(rows)
    expect(entry?.n2018).toBe(110)
    expect(entry?.n2024).toBe(170)
    expect(entry?.feasible).toBe(true)
    expect(entry?.pctChange).toBeCloseTo(54.54, 1)
  })

  it('kasus 8 — KPI pada cakupan kosong aman', () => {
    expect(kpiTotalFaskes([]).value).toBeNull()
    expect(kpiWilayahTeramati([])).toBe(0)
    expect(kpiPositiveShare([]).pct).toBeNull()
    expect(kpiSuspected([])).toBe(0)
  })
})
