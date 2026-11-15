export type StatusVerifikasi =
  | 'valid_positive'
  | 'zero_confirmed'
  | 'zero_suspected'
  | 'zero_unverified'
  | 'missing_source'

/** Satu baris healthcare_dashboard_ready.csv */
export interface Row {
  id: number
  kode_provinsi: number
  nama_provinsi: string
  kode_kabupaten_kota: number
  nama_kabupaten_kota: string
  jenis_faskes: string
  jumlah_faskes: number
  satuan: string
  tahun: number
  status_verifikasi: StatusVerifikasi
  catatan_cleaning: string
  /** nilai siap-visualisasi; NaN (zero_suspected/missing_source) diparse ke null */
  jumlah_faskes_viz: number | null
}

export const JENIS_FASKES = [
  'RUMAH SAKIT UMUM',
  'RUMAH SAKIT KHUSUS',
  'RUMAH SAKIT BERSALIN',
  'PUSKESMAS',
  'POSYANDU',
] as const
export type JenisFaskes = (typeof JENIS_FASKES)[number]

/** Warna kategori konsisten (Munzner: identity channel — color hue) */
export const JENIS_COLORS: Record<string, string> = {
  'RUMAH SAKIT UMUM': '#1d4ed8',
  'RUMAH SAKIT KHUSUS': '#0f766e',
  'RUMAH SAKIT BERSALIN': '#9333ea',
  PUSKESMAS: '#16a34a',
  POSYANDU: '#d97706',
}

export const JENIS_LABEL: Record<string, string> = {
  'RUMAH SAKIT UMUM': 'RS Umum',
  'RUMAH SAKIT KHUSUS': 'RS Khusus',
  'RUMAH SAKIT BERSALIN': 'RS Bersalin',
  PUSKESMAS: 'Puskesmas',
  POSYANDU: 'Posyandu',
}

export const STATUS_COLORS: Record<StatusVerifikasi, string> = {
  valid_positive: '#16a34a',
  zero_confirmed: '#0ea5e9',
  zero_suspected: '#dc2626',
  zero_unverified: '#d97706',
  missing_source: '#94a3b8',
}

export const STATUS_LABEL: Record<StatusVerifikasi, string> = {
  valid_positive: 'Positif (valid)',
  zero_confirmed: 'Nol terkonfirmasi',
  zero_suspected: 'Nol diduga kesenjangan pelaporan',
  zero_unverified: 'Nol belum terverifikasi',
  missing_source: 'Data tidak tersedia',
}

/** Hasil agregasi dengan kontrak kelengkapan data (wajib, lihat README) */
export interface AggregateResult {
  /** jumlah nilai tersedia; null bila tidak ada nilai valid sama sekali */
  value: number | null
  /** jumlah observasi dalam cakupan */
  expectedRecords: number
  /** observasi dengan nilai numerik tersedia (jumlah_faskes_viz) */
  validRecords: number
  /** observasi zero_suspected (nilai tidak dipakai untuk viz) */
  suspectedRecords: number
  /** seluruh observasi dalam cakupan memiliki nilai numerik */
  isComplete: boolean
}

export const TAHUN_MIN = 2018
export const TAHUN_MAX = 2024
export const TAHUN_LIST = Array.from(
  { length: TAHUN_MAX - TAHUN_MIN + 1 },
  (_, i) => TAHUN_MIN + i,
)
