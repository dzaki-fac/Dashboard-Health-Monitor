import type { ReactNode } from 'react'
import { Info, AlertTriangle, Inbox, XCircle, Loader2 } from 'lucide-react'

export function Card({
  title,
  subtitle,
  info,
  right,
  children,
  className = '',
}: {
  title?: string
  subtitle?: string
  /** Teks tooltip ikon (i) di samping judul — untuk penjelasan teknis/definisi KPI. */
  info?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      {(title || right) && (
        <header className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {info && <InfoTooltip text={info} />}
          </div>
          {right}
        </header>
      )}
      {subtitle && <p className="-mt-1 mb-2 text-[11px] text-slate-400">{subtitle}</p>}
      {children}
    </section>
  )
}

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help items-center">
      <Info className="h-3.5 w-3.5 text-slate-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-700 shadow-md group-hover:block">
        {text}
      </span>
    </span>
  )
}

export function Badge({
  tone = 'slate',
  children,
}: {
  tone?: 'slate' | 'amber' | 'red' | 'green' | 'blue'
  children: ReactNode
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function IncompleteBadge({ hint }: { hint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone="amber">
        <AlertTriangle className="h-3 w-3" /> Data belum lengkap
      </Badge>
      <span className="hidden">{hint}</span>
    </span>
  )
}

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
      <XCircle className="h-6 w-6 text-red-500" />
      <p className="text-sm font-medium text-red-700">Gagal memuat data</p>
      <p className="max-w-md text-xs text-red-600">{message}</p>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <Inbox className="h-6 w-6 text-slate-300" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
