import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  normalizeGeoJson,
  checkJoin,
  datasetAudit,
  DataValidationError,
  REQUIRED_COLUMNS,
} from '../dataLoader'

const HEADER = REQUIRED_COLUMNS.join(',') + '\n'
const line = (o: Partial<Record<string, string>>) =>
  REQUIRED_COLUMNS.map((c) => o[c] ?? '').join(',') + '\n'
const row = (o: Partial<Record<string, string>>) =>
  ({
    id: '1',
    kode_provinsi: '32',
    nama_provinsi: 'JAWA BARAT',
    kode_kabupaten_kota: '3201',
    nama_kabupaten_kota: 'KABUPATEN BOGOR',
    jenis_faskes: 'PUSKESMAS',
    jumlah_faskes: '10',
    satuan: 'UNIT',
    tahun: '2020',
    status_verifikasi: 'valid_positive',
    catatan_cleaning: 'x',
    jumlah_faskes_viz: '10',
    ...o,
  }) as Record<string, string>

describe('parseCsv', () => {
  it('kasus 1 — data lengkap: parse sukses dan nilai numerik benar', () => {
    const rows = parseCsv(HEADER + line(row({})))
    expect(rows).toHaveLength(1)
    expect(rows[0].jumlah_faskes_viz).toBe(10)
    expect(rows[0].kode_kabupaten_kota).toBe(3201)
  })

  it('kasus 2 — sebagian NaN (zero_suspected): jumlah_faskes_viz null, jumlah_faskes tetap dibaca', () => {
    const rows = parseCsv(
      HEADER +
        line(
          row({
            id: '2',
            jumlah_faskes: '0',
            status_verifikasi: 'zero_suspected',
            jumlah_faskes_viz: '',
          }),
        ),
    )
    expect(rows[0].jumlah_faskes_viz).toBeNull()
    expect(rows[0].jumlah_faskes).toBe(0)
  })

  it('kasus 3 — kolom wajib hilang: melempar DataValidationError', () => {
    expect(() =>
      parseCsv('id,jumlah_faskes\n1,5\n'),
    ).toThrow(DataValidationError)
  })

  it('kasus 7 — dataset kosong: melempar DataValidationError', () => {
    expect(() => parseCsv('')).toThrow(/kosong/)
    expect(() => parseCsv('\n\n')).toThrow(/kosong/)
  })

  it('valid_positive dengan viz kosong = tidak valid', () => {
    expect(() => parseCsv(HEADER + line(row({ jumlah_faskes_viz: '' })))).toThrow(
      DataValidationError,
    )
  })
})

describe('normalizeGeoJson & checkJoin', () => {
  const geoRawSample = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [106.8, -6.5] },
        properties: { KDPKAB: '32.01', WADMKK: 'Kab. Bogor' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [107.6, -6.9] },
        properties: { KDPKAB: '32.77', WADMKK: 'Kota Banjar' },
      },
    ],
  })

  it('kode "32.01" dinormalisasi menjadi 3201 (integer BPS)', () => {
    const geo = normalizeGeoJson(geoRawSample)
    expect(geo.features[0].properties.kode_kabupaten_kota).toBe(3201)
    expect(geo.features[0].properties.nama_kabupaten_kota).toBe('KAB. BOGOR')
  })

  it('kasus 6 — wilayah tidak ditemukan di GeoJSON: terdeteksi di dataOnly', () => {
    const geo = normalizeGeoJson(geoRawSample)
    const rows = parseCsv(
      HEADER +
        line(row({ kode_kabupaten_kota: '3299', nama_kabupaten_kota: 'WILAYAH FIKTIF' })),
    )
    const join = checkJoin(rows, geo)
    expect(join.dataOnly).toContain(3299)
    expect(join.geoOnly).toContain(3277)
  })

  it('kode tidak valid di GeoJSON melempar error', () => {
    const bad = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { KDPKAB: '99.01', WADMKK: 'X' },
        },
      ],
    })
    expect(() => normalizeGeoJson(bad)).toThrow(DataValidationError)
  })
})

describe('datasetAudit', () => {
  it('menghitung distribusi status, jenis, tahun, wilayah', () => {
    const rows = parseCsv(
      HEADER +
        line(row({ id: '1', jenis_faskes: 'PUSKESMAS', tahun: '2018' })) +
        line(
          row({
            id: '2',
            jenis_faskes: 'PUSKESMAS',
            tahun: '2019',
            jumlah_faskes: '0',
            status_verifikasi: 'zero_suspected',
            jumlah_faskes_viz: '',
          }),
        ),
    )
    const audit = datasetAudit(rows)
    expect(audit.total).toBe(2)
    expect(audit.byStatus['valid_positive']).toBe(1)
    expect(audit.byStatus['zero_suspected']).toBe(1)
    expect(audit.kabupaten).toBe(1)
    expect(audit.tahun).toEqual([2018, 2019])
  })
})
