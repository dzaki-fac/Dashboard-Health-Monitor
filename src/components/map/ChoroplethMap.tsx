import { useMemo } from 'react'
import { MapContainer, GeoJSON as LeafletGeoJSON, TileLayer } from 'react-leaflet'
import type { Layer } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFilters } from '../../hooks/useFilters'
import { aggregate } from '../../lib/aggregations'
import { choroplethColor, completenessHint, formatNumber } from '../../lib/format'
import { JENIS_LABEL } from '../../types'
import type { JabarGeoJson } from '../../lib/dataLoader'

const LEGEND_STEPS = [
  { color: '#eff6ff', label: 'terkecil' },
  { color: '#bfdbfe', label: '' },
  { color: '#93c5fd', label: '' },
  { color: '#60a5fa', label: '' },
  { color: '#3b82f6', label: '' },
  { color: '#1d4ed8', label: '' },
  { color: '#1e3a8a', label: 'terbesar' },
]

/**
 * CBQ peta — Choropleth persebaran fasilitas per kabupaten/kota.
 * Data digabung via kode_kabupaten_kota yang telah divalidasi.
 * Wilayah tanpa nilai valid (zero_suspected semua) diberi warna khusus,
 * TIDAK ditampilkan seolah bernilai nol.
 */
export function ChoroplethMap() {
  const { rows, geo, filters, setFilters } = useFilters()

  const noValidData = 'Tanpa nilai valid — tidak berarti nol'

  const valueByCode = useMemo(() => {
    const m = new Map<
      number,
      { value: number | null; agg: ReturnType<typeof aggregate>; nama: string }
    >()
    const byKab = new Map<number, ReturnType<typeof aggregate>[]>()
    for (const r of rows) {
      const arr = byKab.get(r.kode_kabupaten_kota)
      if (arr) arr.push(aggregate([r]))
      else byKab.set(r.kode_kabupaten_kota, [aggregate([r])])
    }
    // gabungkan per wilayah
    const combined = new Map<number, ReturnType<typeof aggregate>>()
    for (const [kode, parts] of byKab) {
      let value = 0
      let valid = 0
      let suspected = 0
      let expected = 0
      for (const p of parts) {
        expected += p.expectedRecords
        valid += p.validRecords
        suspected += p.suspectedRecords
        if (p.value !== null) value += p.value
      }
      combined.set(kode, {
        value: valid > 0 ? value : null,
        expectedRecords: expected,
        validRecords: valid,
        suspectedRecords: suspected,
        isComplete: expected > 0 && valid === expected,
      })
    }
    for (const [kode, agg] of combined) {
      m.set(kode, {
        value: agg.value,
        agg,
        nama: String(kode),
      })
    }
    return m
  }, [rows])

  const maxValue = useMemo(
    () =>
      Math.max(
        0,
        ...[...valueByCode.values()]
          .map((v) => v.value ?? 0)
          .filter((v) => v > 0),
      ),
    [valueByCode],
  )

  const style = (feature?: GeoJSON.Feature): L.PathOptions => {
    if (!feature) return {}
    const kode = (feature.properties as { kode_kabupaten_kota: number }).kode_kabupaten_kota
    const entry = valueByCode.get(kode)
    const hasValue = entry && entry.value !== null
    return {
      fillColor: hasValue ? choroplethColor(entry!.value, maxValue) : '#e2e8f0',
      fillOpacity: 0.9,
      color: hasValue ? '#ffffff' : '#dc2626',
      weight: hasValue ? 1 : 2,
      dashArray: hasValue ? undefined : '4 3',
    }
  }

  const onEachFeature = (feature: GeoJSON.Feature, layer: Layer) => {
    const kode = (feature.properties as { kode_kabupaten_kota: number }).kode_kabupaten_kota
    const namaGeo = (feature.properties as { nama_kabupaten_kota: string }).nama_kabupaten_kota
    const entry = valueByCode.get(kode)
    const jenisLabel = filters.jenis === 'SEMUA' ? 'Semua jenis' : JENIS_LABEL[filters.jenis]
    const hint = entry ? completenessHint(entry.agg) : null

    const html = `
      <div style="min-width:220px">
        <div style="font-weight:600;color:#1e3a8a">${namaGeo}</div>
        <div style="color:#475569;font-size:11px">${jenisLabel} · tahun ${filters.tahun}</div>
        <div style="margin-top:4px">
          ${
            entry && entry.value !== null
              ? `<b>${formatNumber(entry.value)}</b> unit`
              : '<span style="color:#dc2626;font-weight:600">Tanpa nilai valid</span>'
          }
        </div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">
          ${entry ? `${entry.agg.validRecords}/${entry.agg.expectedRecords} observasi tersedia` : ''}
        </div>
        ${hint ? `<div style="font-size:10px;color:#b45309;margin-top:2px">⚠ ${hint}</div>` : ''}
        ${entry && entry.value === null ? `<div style="font-size:10px;color:#dc2626;margin-top:2px">${noValidData}</div>` : ''}
      </div>
    `
    layer.bindTooltip(html, { sticky: true })
    ;(layer as L.Path).on('click', () => {
      setFilters({ kabupaten: String(kode) })
    })
  }

  if (!geo) return null

  return (
    <div className="relative">
      <MapContainer
        bounds={geoBounds(geo)}
        scrollWheelZoom={false}
        style={{ height: 380, width: '100%' }}
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LeafletGeoJSON
          key={`${filters.tahun}-${filters.jenis}-${filters.kabupaten}-${maxValue}`}
          data={geo as unknown as GeoJSON.FeatureCollection}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm">
        <p className="mb-1 text-[10px] font-semibold tabular-nums text-slate-600">
          0 — {formatNumber(maxValue)} unit
        </p>
        <div className="flex gap-0.5">
          {LEGEND_STEPS.map((s, i) => (
            <span key={i} style={{ backgroundColor: s.color }} className="h-3 w-5" />
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600">
          <span
            className="inline-block h-3 w-4 rounded-sm border-2 border-dashed"
            style={{ borderColor: '#dc2626', backgroundColor: '#e2e8f0' }}
          />
          tanpa nilai valid (≠ 0)
        </div>
      </div>
    </div>
  )
}

function geoBounds(geo: JabarGeoJson): L.LatLngBoundsExpression {
  let minLat = 90
  let maxLat = -90
  let minLng = 180
  let maxLng = -180
  const scan = (coords: unknown) => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number]
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      return
    }
    if (Array.isArray(coords)) coords.forEach(scan)
  }
  for (const f of geo.features) {
    if (f.geometry.type === 'Polygon') scan((f.geometry as GeoJSON.Polygon).coordinates)
    else if (f.geometry.type === 'MultiPolygon')
      scan((f.geometry as GeoJSON.MultiPolygon).coordinates)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ] as L.LatLngBoundsExpression
}
