import { useMemo, useState } from 'react'
import { Header, type PageId } from './components/layout/Header'
import { FilterProvider, useFilters } from './hooks/useFilters'
import { useDataset } from './hooks/useDataset'
import { LoadingState, ErrorState, EmptyState } from './components/ui/primitives'
import { OverviewPage } from './pages/OverviewPage'
import { RegionPage } from './pages/RegionPage'
import { QualityPage } from './pages/QualityPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { GlobalFilters } from './components/filters/GlobalFilters'

function DashboardBody() {
  const { allRows } = useFilters()
  const [page, setPage] = useState<PageId>('overview')

  const kabupatenList = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of allRows) m.set(r.kode_kabupaten_kota, r.nama_kabupaten_kota)
    return [...m.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama))
  }, [allRows])

  return (
    <div className="min-h-screen">
      <Header page={page} onNavigate={setPage} />
      <main className="mx-auto max-w-7xl space-y-3 px-4 py-3">
        {page !== 'methodology' && (
          <GlobalFilters kabupatenList={kabupatenList} />
        )}

        {page === 'overview' && <OverviewPage />}
        {page === 'region' && <RegionPage />}
        {page === 'quality' && <QualityPage />}
        {page === 'methodology' && <MethodologyPage />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-5 pt-1 text-center text-[10px] text-slate-400">
        Sumber data: Dinas Kesehatan Provinsi Jawa Barat via Galura Jabar (od_15936) — hasil cleaning tim.
      </footer>
    </div>
  )
}

export default function App() {
  const { loading, error, rows, geo, joinWarning } = useDataset()

  if (loading) return <LoadingState label="Memuat dataset healthcare_dashboard_ready.csv…" />
  if (error) return <ErrorState message={error} />
  if (rows.length === 0 || !geo) {
    return (
      <EmptyState message="Dataset atau GeoJSON tidak tersedia. Periksa folder src/data." />
    )
  }

  return (
    <FilterProvider rows={rows} geo={geo}>
      {joinWarning && (
        <div className="bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-700">
          ⚠ {joinWarning}
        </div>
      )}
      <DashboardBody />
    </FilterProvider>
  )
}
