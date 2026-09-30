// S07 — RUL & Degradation
import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { api } from '../services/api'
import { fmt } from '../utils/formatters'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'

export default function Page07_RULDegradation() {
  const { health: h, operatingHours } = useStore()
  const [rul, setRul] = useState<any>(null)
  const [rulHistory, setRulHistory] = useState<any[]>([])

  useEffect(() => {
    api.rul.latest().then((d: any) => setRul(d)).catch(() => {})
    api.rul.history().then((d: any) => setRulHistory(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const score = h?.overall_health ?? 82
  const estRul = rul?.rul_hours ?? Math.max(0, (1500 - (operatingHours + 342.5)) * 0.88)
  const threshold = rul?.maintenance_threshold_pct ?? 30

  // Build degradation projection (simple linear extrapolation [SIMULATED])
  const rate = rul?.degradation_rate_pct_per_h ?? 0.012
  const projectionPoints = Array.from({ length: 20 }, (_, i) => {
    const futureH = score - rate * i * 10
    const futureRul = estRul - i * 10 * (rate / 0.012)
    return { step: i * 10, health: Math.max(0, futureH), rul: Math.max(0, futureRul), ci_low: Math.max(0, futureH * 0.85), ci_high: Math.min(100, futureH * 1.15) }
  })

  const factors = rul?.factors || { base_rul_hours: estRul / 0.88, health_factor: 0.88, thermal_penalty: 0.97, vibration_penalty: 0.98, fault_penalty: 1.0 }

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S07</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">RUL & DEGRADATION</h1></div>
        <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SIMULATION-BASED ESTIMATE — Not validated against real failure data</span>
      </div>

      <div className="flex flex-1 gap-2 p-2 min-h-0">
        {/* RUL Display */}
        <div className="w-52 flex flex-col gap-2 shrink-0">
          <div className="bg-surface border border-border rounded-sm p-3">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">RUL ESTIMATE [SIMULATED]</div>
            <div className="text-[clamp(24px,2.5vw,36px)] font-bold font-mono text-warning">{Math.round(estRul)}</div>
            <div className="text-[clamp(10px,0.9vw,12px)] text-text-muted font-mono">hours remaining</div>
            <div className="mt-2 flex gap-2 text-[clamp(9px,0.8vw,11px)] font-mono">
              <div className="flex-1 text-center bg-surface-alt rounded-sm py-1">
                <div className="text-text-muted">LOW (80%)</div>
                <div className="text-healthy font-bold">{Math.round(estRul * 0.85)}h</div>
              </div>
              <div className="flex-1 text-center bg-surface-alt rounded-sm py-1">
                <div className="text-text-muted">HIGH (80%)</div>
                <div className="text-warning font-bold">{Math.round(estRul * 1.15)}h</div>
              </div>
            </div>
            <div className="mt-2 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono text-center">±15% at 80% confidence [SIMULATED]</div>
          </div>

          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">RUL FACTORS [SIM]</div>
            {Object.entries(factors).map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono truncate">{k.replace(/_/g, ' ')}</span>
                <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary">{typeof v === 'number' ? (v > 10 ? Math.round(v as number) + 'h' : (v as number).toFixed(3)) : String(v)}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1">TIME TO THRESHOLD</div>
            <div className="text-[clamp(16px,1.5vw,18px)] font-bold font-mono text-critical">
              {Math.round(rul?.estimated_hours_to_threshold ?? estRul * 0.65)}h
            </div>
            <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">until health &lt; {threshold}% [SIM]</div>
          </div>

          <div className="bg-warning/10 border border-warning rounded-sm p-2">
            <p className="text-[clamp(8px,0.7vw,10px)] text-warning font-mono leading-relaxed">
              ⚠ SIMULATION-BASED ESTIMATE ONLY. This RUL prediction is not validated against real engine failure data. Do NOT use for maintenance decisions without proper engineering validation.
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="bg-surface border border-border rounded-sm p-2 flex-1 min-h-0">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1">DEGRADATION PROJECTION [SIMULATED — Not validated]</div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={projectionPoints}>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="step" tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} label={{ value: 'Future Hours (PROJECTED)', fill: '#64748b', fontSize: 8, position: 'insideBottom' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
                <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5}
                  label={{ value: `MAINT THRESHOLD ${threshold}%`, fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }} />
                <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1} />
                <Area type="monotone" dataKey="ci_high" stroke="none" fill="#0077b6" fillOpacity={0.1} />
                <Area type="monotone" dataKey="ci_low" stroke="none" fill="#0a0f1e" fillOpacity={1} />
                <Line type="monotone" dataKey="health" stroke="#00b4d8" strokeWidth={2} dot={false} name="Health %" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {rulHistory.length > 0 && (
            <div className="bg-surface border border-border rounded-sm p-2 h-36">
              <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1">HISTORICAL RUL ESTIMATES [SIMULATED]</div>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={rulHistory.slice(-50).map((r: any, i: number) => ({ i, rul: r.rul_hours }))}>
                  <Line type="monotone" dataKey="rul" stroke="#f59e0b" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
