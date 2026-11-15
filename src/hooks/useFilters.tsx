import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Row } from '../types'
import type { JabarGeoJson } from '../lib/dataLoader'

export interface Filters {
  /** tahun fokus; untuk grafik tren seluruh 2018–2024 tetap ditampilkan */
  tahun: number
  /** 'SEMUA' atau jenis_faskes */
  jenis: string
  /** 'SEMUA' atau kode_kabupaten_kota (string agar mudah dipakai di <select>) */
  kabupaten: string
}

export const DEFAULT_FILTERS: Filters = {
  tahun: 2024,
  jenis: 'SEMUA',
  kabupaten: 'SEMUA',
}

interface FilterContextValue {
  filters: Filters
  setFilters: (f: Partial<Filters>) => void
  reset: () => void
  /** cakupan filter dasar: tahun + jenis + kabupaten */
  rows: Row[]
  /** cakupan untuk tren: jenis + kabupaten saja (seluruh tahun 2018–2024) */
  trendRows: Row[]
  /** cakupan untuk growth: jenis + kabupaten saja (2018 & 2024) */
  growthRows: Row[]
  allRows: Row[]
  geo: JabarGeoJson
  namaKabupaten: (kode: number) => string
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({
  rows,
  geo,
  children,
}: {
  rows: Row[]
  geo: JabarGeoJson
  children: ReactNode
}) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS)

  const setFilters = (f: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...f }))
  const reset = () => setFiltersState(DEFAULT_FILTERS)

  const { rows: scoped, trendRows, growthRows } = useMemo(() => {
    const byJenisKab = rows.filter(
      (r) =>
        (filters.jenis === 'SEMUA' || r.jenis_faskes === filters.jenis) &&
        (filters.kabupaten === 'SEMUA' ||
          String(r.kode_kabupaten_kota) === filters.kabupaten),
    )
    const scoped = byJenisKab.filter(
      (r) => filters.tahun === 0 || r.tahun === filters.tahun,
    )
    return { rows: scoped, trendRows: byJenisKab, growthRows: byJenisKab }
  }, [rows, filters])

  const namaKabupaten = (kode: number) =>
    rows.find((r) => r.kode_kabupaten_kota === kode)?.nama_kabupaten_kota ??
    geo.features.find((f) => f.properties.kode_kabupaten_kota === kode)
      ?.properties.nama_kabupaten_kota ??
    String(kode)

  return (
    <FilterContext.Provider
      value={{ filters, setFilters, reset, rows: scoped, trendRows, growthRows, allRows: rows, geo, namaKabupaten }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters harus dipakai di dalam FilterProvider')
  return ctx
}
