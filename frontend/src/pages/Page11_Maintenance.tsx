// S11 — Maintenance Center
import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmt } from '../utils/formatters'

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-critical border-critical bg-critical/10',
  HIGH: 'text-warning border-warning bg-warning/10',
  MEDIUM: 'text-advisory border-advisory bg-advisory/10',
  LOW: 'text-text-muted border-border bg-surface-alt',
}

export default function Page11_Maintenance() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.maintenance.list().then((d: any) => { setRecords(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function complete(id: string) {
    try {
      await api.maintenance.complete(id)
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED' } : r))
    } catch {}
  }

  const pending = records.filter(r => r.status !== 'COMPLETED')
  const completed = records.filter(r => r.status === 'COMPLETED')

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S11</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">MAINTENANCE CENTER</h1></div>
        <div className="flex items-center gap-2">
          <span className="text-warning font-mono text-[clamp(10px,0.9vw,12px)]">{pending.length} Pending</span>
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-warning px-1 text-warning">
            NOT certified maintenance instructions
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-center py-8 text-text-muted font-mono text-[clamp(12px,1.1vw,14px)]">Loading...</div>}

        {/* Pending recommendations */}
        {pending.length > 0 && (
          <div>
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono px-1 mb-1">PENDING ACTIONS ({pending.length})</div>
            <div className="space-y-2">
              {pending.map(r => (
                <div key={r.id} className="bg-surface border border-border rounded-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[clamp(8px,0.7vw,10px)] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${PRIORITY_COLOR[r.priority] ?? PRIORITY_COLOR.LOW}`}>
                          {r.priority}
                        </span>
                        <span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">{r.affected_subsystem}</span>
                      </div>
                      <h3 className="text-[clamp(10px,0.9vw,12px)] font-bold font-mono text-text-primary">{r.title}</h3>
                      <p className="text-[clamp(9px,0.8vw,11px)] text-text-secondary font-mono mt-1">{r.reason ?? r.description}</p>
                      {r.estimated_remaining_hours && (
                        <p className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono mt-1">
                          Est. remaining: {fmt(r.estimated_remaining_hours, 0)} h [SIM]
                        </p>
                      )}
                      {r.evidence && r.evidence.length > 0 && (
                        <div className="mt-1 text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">
                          Evidence: {r.evidence.map((e: any) => e.source ?? e.parameter).join(', ')}
                        </div>
                      )}
                    </div>
                    <button onClick={() => complete(r.id)}
                      className="px-2 py-1 text-[clamp(9px,0.8vw,11px)] font-mono border border-healthy text-healthy rounded-sm hover:bg-healthy/10 transition-colors shrink-0">
                      ✓ COMPLETE
                    </button>
                  </div>
                  <div className="mt-2 p-1.5 bg-warning/5 border border-warning/30 rounded-sm">
                    <p className="text-[clamp(8px,0.7vw,10px)] text-warning font-mono">{r.disclaimer ?? 'DEMONSTRATION MODEL — Not a certified maintenance instruction. Require qualified engineering validation.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono px-1 mb-1">COMPLETED ({completed.length})</div>
            <div className="space-y-1">
              {completed.map(r => (
                <div key={r.id} className="bg-surface border border-border/50 rounded-sm px-3 py-2 flex items-center justify-between opacity-60">
                  <div>
                    <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">[COMPLETED]</span>
                    <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary ml-2">{r.title}</span>
                  </div>
                  <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">{r.affected_subsystem}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-healthy font-mono text-[clamp(12px,1.1vw,14px)]">No maintenance actions pending</div>
              <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mt-1">System within normal parameters [SIMULATED]</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
