import { Activity } from 'lucide-react'

export type PageId = 'overview' | 'region' | 'quality' | 'methodology'

const NAV: { id: PageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'region', label: 'Analisis Wilayah' },
  { id: 'quality', label: 'Kualitas Data' },
  { id: 'methodology', label: 'Metodologi' },
]

export function Header({
  page,
  onNavigate,
}: {
  page: PageId
  onNavigate: (p: PageId) => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-brand-900">
              Jabar Health Monitor
            </h1>
            <p className="text-[11px] text-slate-500">
              Persebaran Fasilitas Kesehatan Jawa Barat, 2018–2024
            </p>
          </div>
        </div>
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                page === n.id
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-slate-600 hover:text-brand-700'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
