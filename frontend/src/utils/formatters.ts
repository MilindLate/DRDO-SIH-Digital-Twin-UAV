// Utility formatters
import { LIMITS } from '../types'

export function fmt(v: number | undefined | null, decimals = 1, unit = ''): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(decimals)}${unit ? ' ' + unit : ''}`
}

export function fmtTS(iso?: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour12: false }) }
  catch { return iso }
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function healthColor(score?: number): string {
  if (score == null) return 'text-text-muted'
  if (score >= 85) return 'text-healthy'
  if (score >= 70) return 'text-green-300'
  if (score >= 50) return 'text-warning'
  if (score >= 30) return 'text-orange-500'
  return 'text-critical'
}

export function healthBgColor(score?: number): string {
  if (score == null) return '#64748b'
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#86efac'
  if (score >= 50) return '#f59e0b'
  if (score >= 30) return '#f97316'
  return '#ef4444'
}

export function healthLabel(score?: number): string {
  if (score == null) return 'UNKNOWN'
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'HEALTHY'
  if (score >= 50) return 'DEGRADED'
  if (score >= 30) return 'POOR'
  return 'CRITICAL'
}

export function severityColor(s?: string): string {
  switch (s) {
    case 'CRITICAL': return '#ef4444'
    case 'WARNING':  return '#f59e0b'
    case 'ADVISORY': return '#3b82f6'
    default:         return '#64748b'
  }
}

export function severityBg(s?: string): string {
  switch (s) {
    case 'CRITICAL': return 'bg-critical/20 border-critical text-critical'
    case 'WARNING': return 'bg-warning/20 border-warning text-warning'
    case 'ADVISORY': return 'bg-advisory/20 border-advisory text-advisory'
    default: return 'bg-surface-alt border-border text-text-muted'
  }
}

export function paramStatus(param: string, value?: number): 'ok' | 'warn' | 'crit' | 'unknown' {
  if (value == null) return 'unknown'
  const lim = LIMITS[param as keyof typeof LIMITS]
  if (!lim) return 'ok'
  const [nMin, nMax] = lim.normal
  if (value >= nMin && value <= nMax) return 'ok'
  const [wMin, wMax] = lim.warning
  if (param === 'oil_pressure_kpa') {
    if (value < wMin) return 'crit'
    if (value < nMin) return 'warn'
    return 'ok'
  }
  if (value > wMax) return 'crit'
  if (value > nMax) return 'warn'
  return 'ok'
}

export function statusColor(s: string): string {
  switch (s) { case 'ok': return 'text-healthy'; case 'warn': return 'text-warning'; case 'crit': return 'text-critical'; default: return 'text-text-muted' }
}
