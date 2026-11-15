import { describe, it, expect } from 'vitest'
import { loadRows, loadGeoJson, checkJoin } from '../dataLoader'
import { trendData, rankByRegion, growthForScope, compositionByRegion, qualityMatrix, aggregate } from '../aggregations'
import { TAHUN_LIST } from '../../types'

/** Uji integrasi terhadap dataset & GeoJSON AKTUAL yang dipakai aplikasi */
describe('dataset aktual (healthcare_dashboard_ready.csv)', () => {
  const rows = loadRows()
  const geo = loadGeoJson()

  it('dataset 945 baris, 27 wilayah, 7 tahun, 5 jenis', () => {
    expect(rows).toHaveLength(945)
    expect(new Set(rows.map((r) => r.kode_kabupaten_kota)).size).toBe(27)
    expect(new Set(rows.map((r) => r.tahun))).toEqual(new Set(TAHUN_LIST))
    expect(new Set(rows.map((r) => r.jenis_faskes)).size).toBe(5)
  })

  it('distribusi status sesuai dokumentasi cleaning: 678 valid_positive, 199 zero_unverified, 68 zero_suspected', () => {
    const counts: Record<string, number> = {}
    for (const r of rows) counts[r.status_verifikasi] = (counts[r.status_verifikasi] ?? 0) + 1
    expect(counts['valid_positive']).toBe(678)
    expect(counts['zero_unverified']).toBe(199)
    expect(counts['zero_suspected']).toBe(68)
  })

  it('zero_suspected selalu memiliki jumlah_faskes_viz null', () => {
    expect(rows.filter((r) => r.status_verifikasi === 'zero_suspected').every((r) => r.jumlah_faskes_viz === null)).toBe(true)
  })

  it('Posyandu 2019 seluruhnya zero_suspected → tren 2019 null (tidak digambar sebagai 0)', () => {
    const trend = trendData(rows)
    const point2019 = trend.find((t) => t.tahun === 2019)!
    expect(point2019.series['POSYANDU'].value).toBeNull()
    expect(point2019.series['POSYANDU'].suspectedRecords).toBe(27)
    // tahun lain Posyandu positif
    expect(trend.find((t) => t.tahun === 2018)!.series['POSYANDU'].value).toBeGreaterThan(0)
  })

  it('join data ↔ GeoJSON cocok untuk seluruh 27 wilayah', () => {
    const join = checkJoin(rows, geo)
    expect(join.dataOnly).toEqual([])
    expect(join.geoOnly).toEqual([])
    expect(geo.features).toHaveLength(27)
  })

  it('kualitas data: RS Bersalin 2021–2024 seluruhnya zero_suspected/zero_unverified', () => {
    const matrix = qualityMatrix(rows)
    const rsb = matrix.find((m) => m.jenis === 'RUMAH SAKIT BERSALIN')!
    for (const tahun of [2021, 2022, 2023, 2024]) {
      const cell = rsb.cells.find((c) => c.tahun === tahun)!
      expect(cell.zeroSuspected + cell.zeroUnverified).toBe(27)
      expect(cell.positive).toBe(0)
    }
  })

  it('growth per jenis Jabar utuh: RS Umum layak; RS Bersalin jatuh ke 0 dengan catatan parsial', () => {
    const entries = growthForScope(rows)
    const rsu = entries.find((e) => e.key === 'RUMAH SAKIT UMUM')!
    expect(rsu.feasible).toBe(true)
    expect(rsu.n2018).toBeGreaterThan(0)
    // RS Bersalin 2024: 19 wilayah zero_unverified (viz=0, valid) + 8 zero_suspected
    // → nilai 2024 tersedia sebagian: 0; growth = (0-62)/62 = -100% + catatan parsial
    const rsb = entries.find((e) => e.key === 'RUMAH SAKIT BERSALIN')!
    expect(rsb.feasible).toBe(true)
    expect(rsb.n2018).toBe(62)
    expect(rsb.n2024).toBe(0)
    expect(rsb.pctChange).toBe(-100)
    expect(rsb.endIncomplete).toBe(true)
  })

  it('komposisi 2024: wilayah dengan RS Bersalin suspected memiliki total share < 100%', () => {
    const comp2024 = compositionByRegion(rows.filter((r) => r.tahun === 2024))
    const incomplete = comp2024.filter((c) => !c.isComplete)
    for (const c of incomplete) {
      const total = Object.values(c.shares).reduce((s, v) => s + v, 0)
      expect(total).toBeLessThan(100)
      expect(total).toBeGreaterThan(0)
    }
    expect(incomplete.length).toBeGreaterThan(0)
  })

  it('peringkat 2024 semua jenis: 27 wilayah, 27 nilai valid', () => {
    const ranked = rankByRegion(rows.filter((r) => r.tahun === 2024), 'tertinggi')
    expect(ranked).toHaveLength(27)
    expect(ranked.filter((e) => e.value !== null)).toHaveLength(27)
    expect(ranked[0].rank).toBe(1)
  })

  it('total agregasi seluruh 2018 menghasilkan nilai, bukan null', () => {
    expect(aggregate(rows.filter((r) => r.tahun === 2018)).value).toBeGreaterThan(0)
  })
})
