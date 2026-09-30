// S05 — Fault Diagnosis
import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { api } from '../services/api'
import { fmtTS, severityBg } from '../utils/formatters'
import { FaultEvent } from '../types'

export default function Page05_FaultDiagnosis() {
  const { activeFaults } = useStore()
  const [allFaults, setAllFaults] = useState<FaultEvent[]>([])
  const [selected, setSelected] = useState<FaultEvent | null>(null)

  useEffect(() => {
    api.faults.list().then((d: any) => setAllFaults(d)).catch(() => {})
  }, [])

  const displayed = allFaults.length > 0 ? allFaults : activeFaults
  const critCount = displayed.filter(f => f.severity === 'CRITICAL').length
  const warnCount = displayed.filter(f => f.severity === 'WARNING').length

  async function ack(fault_id?: string) {
    if (!fault_id) return
    try {
      await api.faults.acknowledge(fault_id)
      setAllFaults(prev => prev.map(f => f.fault_id === fault_id ? { ...f, status: 'ACKNOWLEDGED' } : f))
    } catch {}
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div>
          <span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S05</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">FAULT DIAGNOSIS</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge label="CRITICAL" count={critCount} color={critCount > 0 ? 'text-critical border-critical bg-critical/10' : 'text-text-muted border-border'} />
          <Badge label="WARNING" count={warnCount} color={warnCount > 0 ? 'text-warning border-warning bg-warning/10' : 'text-text-muted border-border'} />
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">PROBABLE FAULT — Requires engineering confirmation</span>
        </div>
      </div>

      <div className="flex flex-1 gap-2 p-2 min-h-0">
        {/* Fault list */}
        <div className="w-80 bg-surface border border-border rounded-sm flex flex-col overflow-hidden shrink-0">
          <div className="px-2 py-1 border-b border-border text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">
            FAULT EVENTS ({displayed.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayed.length === 0 && (
              <div className="flex items-center justify-center h-24">
                <span className="text-healthy text-[clamp(10px,0.9vw,12px)] font-mono">NO FAULTS DETECTED</span>
              </div>
            )}
            {displayed.map((f, i) => (
              <button key={i} onClick={() => setSelected(f)}
                className={`w-full text-left p-2 border-b border-border/40 hover:bg-surface-alt transition-colors
                  ${selected?.fault_id === f.fault_id ? 'bg-accent/10' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[clamp(8px,0.7vw,10px)] font-mono font-bold px-1 py-0.5 rounded border ${severityBg(f.severity)}`}>
                    {f.severity}
                  </span>
                  <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary truncate flex-1">{f.label ?? f.fault_type}</span>
                  <span className={`text-[clamp(8px,0.7vw,10px)] font-mono ${f.status === 'ACKNOWLEDGED' ? 'text-text-muted' : 'text-accent'}`}>
                    {f.status ?? 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{f.affected_subsystem ?? '—'}</span>
                  <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">
                    {f.confidence ? `${(f.confidence * 100).toFixed(0)}% conf` : ''}
                  </span>
                </div>
                <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono mt-0.5">{fmtTS(f.detection_timestamp)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fault detail */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {selected ? (
            <>
              {/* Header */}
              <div className={`bg-surface border rounded-sm p-3 border-${selected.severity === 'CRITICAL' ? 'critical' : selected.severity === 'WARNING' ? 'warning' : 'border'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-[clamp(9px,0.8vw,11px)] font-mono font-bold px-2 py-0.5 rounded-sm border inline-block mb-2 ${severityBg(selected.severity)}`}>
                      {selected.severity}
                    </div>
                    <h2 className="text-[clamp(14px,1.3vw,16px)] font-bold font-mono text-text-primary">{selected.label ?? selected.fault_type}</h2>
                    <p className="text-[clamp(10px,0.9vw,12px)] text-text-secondary font-mono mt-1">
                      Fault ID: {selected.fault_id ?? '—'} · Subsystem: {selected.affected_subsystem ?? '—'} · Detected: {fmtTS(selected.detection_timestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selected.status !== 'ACKNOWLEDGED' && (
                      <button onClick={() => ack(selected.fault_id)}
                        className="px-3 py-1 text-[clamp(10px,0.9vw,12px)] font-mono border border-accent text-accent rounded-sm hover:bg-accent/10 transition-colors">
                        ACKNOWLEDGE
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">Model Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 bg-surface-alt rounded-full">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(selected.confidence ?? 0.5) * 100}%` }} />
                    </div>
                    <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-mono text-accent">{((selected.confidence ?? 0.5) * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">DEMONSTRATION MODEL</span>
                </div>
              </div>

              {/* Evidence */}
              {selected.evidence && selected.evidence.length > 0 && (
                <div className="bg-surface border border-border rounded-sm p-3">
                  <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">DIAGNOSTIC EVIDENCE</div>
                  <table className="w-full text-[clamp(9px,0.8vw,11px)] font-mono">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="text-left py-1">PARAMETER</th>
                        <th className="text-left py-1">OBSERVATION</th>
                        <th className="text-right py-1">VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.evidence.map((e: any, i: number) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-1 text-accent">{e.parameter}</td>
                          <td className="py-1 text-text-secondary">{e.observation}</td>
                          <td className="py-1 text-right text-text-primary">{e.value?.toFixed ? e.value.toFixed(3) : e.value ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommended inspection */}
              {selected.recommended_inspection && (
                <div className="bg-surface border border-border rounded-sm p-3">
                  <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">RECOMMENDED INSPECTION</div>
                  <p className="text-[clamp(10px,0.9vw,12px)] text-text-secondary font-mono leading-relaxed">{selected.recommended_inspection}</p>
                  <div className="mt-3 p-2 bg-warning/10 border border-warning rounded-sm">
                    <p className="text-[clamp(9px,0.8vw,11px)] text-warning font-mono">
                      ⚠ PROBABLE FAULT / DEMONSTRATION DETECTION — This AI diagnosis requires confirmation by qualified engineering personnel. NOT a certified fault diagnosis.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 bg-surface border border-border rounded-sm flex items-center justify-center">
              <p className="text-[clamp(10px,0.9vw,12px)] text-text-muted font-mono">Select a fault event to view diagnosis details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`px-2 py-0.5 border rounded-sm text-[clamp(9px,0.8vw,11px)] font-mono flex items-center gap-1 ${color}`}>
      {label}: <span className="font-bold">{count}</span>
    </div>
  )
}
