import { useEffect, useState } from 'react'
import type { Row } from '../types'
import {
  loadRows,
  loadGeoJson,
  checkJoin,
  DataValidationError,
  type JabarGeoJson,
} from '../lib/dataLoader'

export interface DatasetState {
  loading: boolean
  error: string | null
  rows: Row[]
  geo: JabarGeoJson | null
  joinWarning: string | null
}

/**
 * Memuat dataset CSV + GeoJSON lokal dengan state loading / error / empty.
 * Data dibaca dari file lokal — tidak ada angka dummy.
 */
export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({
    loading: true,
    error: null,
    rows: [],
    geo: null,
    joinWarning: null,
  })

  useEffect(() => {
    try {
      const rows = loadRows()
      if (rows.length === 0) {
        setState({
          loading: false,
          error: 'Dataset kosong. Periksa file CSV.',
          rows: [],
          geo: null,
          joinWarning: null,
        })
        return
      }
      const geo = loadGeoJson()
      const join = checkJoin(rows, geo)
      let joinWarning: string | null = null
      if (join.dataOnly.length > 0 || join.geoOnly.length > 0) {
        joinWarning = `Wilayah tidak cocok antara data & GeoJSON — data: ${join.dataOnly.join(', ') || '-'}; geo: ${join.geoOnly.join(', ') || '-'}`
      }
      setState({ loading: false, error: null, rows, geo, joinWarning })
    } catch (e) {
      const msg =
        e instanceof DataValidationError
          ? e.message
          : 'Gagal memuat dataset. Periksa file data/healthcare_dashboard_ready.csv dan data/jabar_kabkota.geojson'
      setState({ loading: false, error: msg, rows: [], geo: null, joinWarning: null })
    }
  }, [])

  return state
}
