import Papa from 'papaparse'
import type { Row, StatusVerifikasi } from '../types'
import { JENIS_FASKES } from '../types'
import csvRaw from '../data/healthcare_dashboard_ready.csv?raw'
import geoRaw from '../data/jabar_kabkota.geojson?raw'

export const REQUIRED_COLUMNS = [
  'id',
  'kode_provinsi',
  'nama_provinsi',
  'kode_kabupaten_kota',
  'nama_kabupaten_kota',
  'jenis_faskes',
  'jumlah_faskes',
  'satuan',
  'tahun',
  'status_verifikasi',
  'catatan_cleaning',
  'jumlah_faskes_viz',
] as const

export const VALID_STATUSES: StatusVerifikasi[] = [
  'valid_positive',
  'zero_confirmed',
  'zero_suspected',
  'zero_unverified',
  'missing_source',
]

/** Error validasi kolom/isi CSV */
export class DataValidationError extends Error {}

/**
 * Parse string CSV menjadi Row[] dengan validasi kolom & domain nilai.
 * Melempar DataValidationError bila struktur tidak valid.
 */
export function parseCsv(csvText: string): Row[] {
  if (!csvText || csvText.trim() === '') {
    throw new DataValidationError('CSV kosong: tidak ada baris data.')
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    throw new DataValidationError(
      `Gagal parsing CSV: ${parsed.errors[0].message}`,
    )
  }

  const data = parsed.data
  if (data.length === 0) {
    throw new DataValidationError('CSV kosong: tidak ada baris data.')
  }

  const missing = REQUIRED_COLUMNS.filter(
    (c) => !(c in data[0]),
  )
  if (missing.length > 0) {
    throw new DataValidationError(
      `Kolom wajib tidak ditemukan: ${missing.join(', ')}`,
    )
  }

  return data.map((raw, i) => {
    const vizRaw = (raw['jumlah_faskes_viz'] ?? '').trim()
    // sel kosong pada kolom viz = nilai tidak tersedia (zero_suspected dsb.)
    const jumlahViz = vizRaw === '' ? null : Number(vizRaw)

    const status = raw['status_verifikasi'] as StatusVerifikasi
    if (!VALID_STATUSES.includes(status)) {
      throw new DataValidationError(
        `Baris ${i + 2}: status_verifikasi tidak dikenal "${status}"`,
      )
    }

    const jumlah = Number(raw['jumlah_faskes'])
    const tahun = Number(raw['tahun'])
    if (!Number.isFinite(jumlah) || jumlah < 0) {
      throw new DataValidationError(
        `Baris ${i + 2}: jumlah_faskes bukan bilangan nonnegatif`,
      )
    }
    if (!Number.isInteger(tahun)) {
      throw new DataValidationError(`Baris ${i + 2}: tahun tidak valid`)
    }

    const row: Row = {
      id: Number(raw['id']),
      kode_provinsi: Number(raw['kode_provinsi']),
      nama_provinsi: raw['nama_provinsi'],
      kode_kabupaten_kota: Number(raw['kode_kabupaten_kota']),
      nama_kabupaten_kota: raw['nama_kabupaten_kota'],
      jenis_faskes: raw['jenis_faskes'],
      jumlah_faskes: jumlah,
      satuan: raw['satuan'],
      tahun,
      status_verifikasi: status,
      catatan_cleaning: raw['catatan_cleaning'] ?? '',
      jumlah_faskes_viz:
        jumlahViz !== null && Number.isFinite(jumlahViz) ? jumlahViz : null,
    }
    if (row.jumlah_faskes_viz === null && status === 'valid_positive') {
      throw new DataValidationError(
        `Baris ${i + 2}: valid_positive tetapi jumlah_faskes_viz kosong`,
      )
    }
    return row
  })
}

/** Muat dataset utama (import ?raw agar bekerja pada dev maupun build) */
export function loadRows(): Row[] {
  return parseCsv(csvRaw)
}

export interface RegionFeature {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: {
    kode_kabupaten_kota: number
    nama_kabupaten_kota: string
    [key: string]: unknown
  }
}

export interface JabarGeoJson {
  type: 'FeatureCollection'
  features: RegionFeature[]
}

/**
 * Normalisasi GeoJSON batas Jabar: standarkan properti ke
 * kode_kabupaten_kota (BPS 32xx, integer) + nama_kabupaten_kota.
 */
export function normalizeGeoJson(raw: string): JabarGeoJson {
  const geo = JSON.parse(raw) as {
    type: string
    features: Array<{
      type: string
      geometry: GeoJSON.Geometry
      properties: Record<string, unknown>
    }>
  }
  if (geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
    throw new DataValidationError('GeoJSON bukan FeatureCollection')
  }
  const features: RegionFeature[] = geo.features.map((f) => {
    const p = f.properties
    // sumber KDPKAB "32.76" -> 3276; fallback: KDPPUM + KDPKAB
    const kodeRaw = String(p['KDPKAB'] ?? p['kode_kabupaten_kota'] ?? '')
    const kode = Number(kodeRaw.replace('.', ''))
    const nama = String(p['WADMKK'] ?? p['nama_kabupaten_kota'] ?? '')
    if (!Number.isFinite(kode) || kode < 3200 || kode > 3299) {
      throw new DataValidationError(
        `GeoJSON: kode wilayah tidak valid "${kodeRaw}"`,
      )
    }
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...p,
        kode_kabupaten_kota: kode,
        nama_kabupaten_kota: nama.toUpperCase(),
      },
    }
  })
  return { type: 'FeatureCollection', features }
}

export function loadGeoJson(): JabarGeoJson {
  return normalizeGeoJson(geoRaw)
}

/** Validasi join data ↔ GeoJSON (laporan wilayah yang tidak cocok) */
export function checkJoin(
  rows: Row[],
  geo: JabarGeoJson,
): { geoOnly: number[]; dataOnly: number[] } {
  const geoCodes = new Set(geo.features.map((f) => f.properties.kode_kabupaten_kota))
  const dataCodes = new Set(rows.map((r) => r.kode_kabupaten_kota))
  const geoOnly = [...geoCodes].filter((c) => !dataCodes.has(c))
  const dataOnly = [...dataCodes].filter((c) => !geoCodes.has(c))
  return { geoOnly, dataOnly }
}

/** Verifikasi cepat kelengkapan dataset sesuai dokumentasi cleaning */
export function datasetAudit(rows: Row[]): {
  total: number
  byStatus: Record<string, number>
  jenis: string[]
  tahun: number[]
  kabupaten: number
} {
  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.status_verifikasi] = (byStatus[r.status_verifikasi] ?? 0) + 1
  return {
    total: rows.length,
    byStatus,
    jenis: [...new Set(rows.map((r) => r.jenis_faskes))].sort(),
    tahun: [...new Set(rows.map((r) => r.tahun))].sort((a, b) => a - b),
    kabupaten: new Set(rows.map((r) => r.kode_kabupaten_kota)).size,
  }
}

export { JENIS_FASKES }
