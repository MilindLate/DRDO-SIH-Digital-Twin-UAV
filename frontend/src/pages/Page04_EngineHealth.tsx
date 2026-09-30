/**
 * S04 — Engine Health
 * Radar chart + animated health bars + degradation trend + thermal heatmap
 * DEMONSTRATION MODEL
 */
import React from 'react'
import { useStore } from '../store'
import { fmt, healthBgColor, healthLabel } from '../utils/formatters'
import SubsystemRadar from '../components/SubsystemRadar'
import ThermalHeatmap from '../components/ThermalHeatmap'
import ArcGauge from '../components/ArcGauge'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid
} from 'recharts'

const SUBSYSTEMS = [
  { key: 'thermal_health',     label: 'THERMAL',     weight: '20%' },
  { key: 'mechanical_health',  label: 'MECHANICAL',  weight: '20%' },
  { key: 'lubrication_health', label: 'LUBRICATION', weight: '15%' },
  { key: 'combustion_health',  label: 'COMBUSTION',  weight: '15%' },
  { key: 'fuel_system_health', label: 'FUEL SYSTEM', weight: '10%' },
  { key: 'electrical_health',  label: 'ELECTRICAL',  weight: '10%' },
  { key: 'sensor_health',      label: 'SENSORS',     weight: '5%'  },
  { key: 'vibration_health',   label: 'VIBRATION',   weight: '5%'  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded px-2 py-1">
      <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-[clamp(9px,0.8vw,11px)] font-mono" style={{ color: p.color }}>
          {p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Page04_EngineHealth() {
  const { health: h, healthHistory, operatingHours } = useStore()

  const overall = h?.overall_health ?? 85
  const overallColor = healthBgColor(overall)

  // Health trajectory chart data
  const chartData = healthHistory.length > 1
    ? healthHistory.slice(-120).map((rec, i) => ({
        t: i,
        overall: rec.overall_health ?? 85,
        thermal: rec.thermal_health ?? 85,
        mech:    rec.mechanical_health ?? 85,
        lube:    rec.lubrication_health ?? 85,
      }))
    : Array.from({ length: 20 }, (_, i) => ({
        t: i, overall: 90 - i * 0.2, thermal: 88 - i * 0.15,
        mech: 95 - i * 0.1, lube: 87 - i * 0.25
      }))

  // Degradation rate
  const degradRate = h?.degradation_rate ?? 0.002
  const projData = (() => {
    const last = chartData[chartData.length - 1]?.overall ?? overall
    return Array.from({ length: 30 }, (_, i) => ({
      t: chartData.length + i,
      projected: Math.max(0, last - degradRate * i * 50),
    }))
  })()

  const confidence = h?.health_confidence ?? 0.92

  return (
    <div className="flex flex-col h-full gap-2 p-2 bg-bg overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded px-3 py-1.5 shrink-0">
        <span className="font-display text-[clamp(10px,0.9vw,12px)] text-accent tracking-widest">S04 ENGINE HEALTH</span>
        <div className="w-px h-4 bg-border" />
        <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">WEIGHTED HEALTH INDEX — DEMONSTRATION MODEL</span>
        <div className="flex-1" />
        <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">
          OP HRS: <span className="text-accent font-bold">{fmt(operatingHours, 1)}</span>
        </span>
        <div className="w-px h-4 bg-border" />
        <span className="text-[clamp(9px,0.8vw,11px)] font-mono" style={{ color: overallColor }}>
          {healthLabel(overall)}
        </span>
      </div>

      <div className="flex flex-1 gap-2 min-h-0">

        {/* LEFT: Overall health + subsystem bars */}
        <div className="flex flex-col gap-2 w-[210px] shrink-0">

          {/* Big health gauge */}
          <div className="bg-surface border border-border rounded p-3 flex flex-col items-center hud-corner">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1 tracking-wider">ENGINE HEALTH INDEX</div>
            <ArcGauge
              value={overall} min={0} max={100} label="" unit="%"
              warnThreshold={70} critThreshold={50}
              size={150} inverse showZones
            />
            <div className="mt-1 text-center">
              <div className="text-[clamp(16px,1.5vw,18px)] font-bold font-display" style={{ color: overallColor, textShadow: `0 0 12px ${overallColor}` }}>
                {healthLabel(overall)}
              </div>
              <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">
                Confidence: <span className="text-accent font-bold">{(confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">Degradation: <span className="text-warning font-bold">{(degradRate * 100).toFixed(4)}%/h</span></div>
            </div>
          </div>

          {/* Subsystem health bars */}
          <div className="bg-surface border border-border rounded p-2 flex-1">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider">SUBSYSTEM BREAKDOWN</div>
            <div className="space-y-2">
              {SUBSYSTEMS.map(({ key, label, weight }) => {
                const val = (h as any)?.[key] ?? 85
                const color = healthBgColor(val)
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted">{weight}</span>
                        <span className="text-[clamp(9px,0.8vw,11px)] font-bold font-mono" style={{ color, textShadow: `0 0 4px ${color}60` }}>
                          {Math.round(val)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden relative">
                      {/* Warning threshold marker at 70 */}
                      <div className="absolute top-0 bottom-0 w-px bg-warning/40 z-10" style={{ left: '70%' }} />
                      {/* Critical threshold marker at 50 */}
                      <div className="absolute top-0 bottom-0 w-px bg-critical/40 z-10" style={{ left: '50%' }} />
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(2, val)}%`,
                          background: `linear-gradient(90deg, ${color}aa, ${color})`,
                          boxShadow: `0 0 5px ${color}80`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-border text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center">
              SIMULATED WEIGHTS — CONFIGURABLE
            </div>
          </div>
        </div>

        {/* CENTER: Trajectory + degradation chart */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">

          {/* Health trajectory chart */}
          <div className="bg-surface border border-border rounded p-2" style={{ height: '45%' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted tracking-wider">HEALTH TRAJECTORY — LIVE HISTORY + PROJECTION</span>
              <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">SIMULATED</span>
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={[...chartData, ...projData]} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="grad-overall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00b4d8" stopOpacity="0.3" />
                    <stop offset="95%" stopColor="#00b4d8" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="grad-proj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity="0.2" />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.4)" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'WARN', fill: '#f59e0b', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'CRIT', fill: '#ef4444', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
                <Area type="monotone" dataKey="overall"   stroke="#00b4d8" fill="url(#grad-overall)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="thermal"   stroke="#f97316" fill="none" strokeWidth={1} strokeOpacity={0.6} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="mech"      stroke="#22c55e" fill="none" strokeWidth={1} strokeOpacity={0.6} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="projected" stroke="#f59e0b" fill="url(#grad-proj)"    strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom row: degradation bars + contributors */}
          <div className="grid grid-cols-2 gap-2 flex-1">

            {/* Thermal heatmap */}
            <div className="bg-surface border border-border rounded p-2">
              <ThermalHeatmap />
            </div>

            {/* Major contributors */}
            <div className="bg-surface border border-border rounded p-2">
              <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider">MAJOR HEALTH CONTRIBUTORS</div>
              <div className="space-y-2">
                {SUBSYSTEMS
                  .map(s => ({ label: s.label, val: (h as any)?.[s.key] ?? 85 }))
                  .sort((a, b) => a.val - b.val)
                  .slice(0, 5)
                  .map(({ label, val }) => {
                    const impact = (100 - val).toFixed(1)
                    const color = healthBgColor(val)
                    return (
                      <div key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary">{label}</span>
                          <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">−{impact} pts</span>
                        </div>
                        <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(100, parseFloat(impact) * 2)}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })
                }
              </div>
              <div className="mt-3 border-t border-border pt-2 text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">
                <div className="flex justify-between">
                  <span>Degradation Rate</span>
                  <span className="text-warning font-bold">{(degradRate * 100).toFixed(4)}%/h</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>TBO Remaining</span>
                  <span className="text-accent font-bold">{Math.max(0, 1500 - (operatingHours ?? 0)).toFixed(0)} h [SIM]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Radar chart */}
        <div className="flex flex-col gap-2 w-[200px] shrink-0">
          <div className="bg-surface border border-border rounded p-2 flex flex-col items-center">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1 tracking-wider text-center">HEALTH RADAR</div>
            <SubsystemRadar size={185} />
            <div className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center mt-1">DEMONSTRATION MODEL</div>
          </div>

          {/* Health thresholds legend */}
          <div className="bg-surface border border-border rounded p-2 flex-1">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider">THRESHOLDS [CONFIGURABLE]</div>
            <div className="space-y-1.5">
              {[
                { label: 'EXCELLENT', range: '85–100', color: '#22c55e' },
                { label: 'HEALTHY',   range: '70–85',  color: '#86efac' },
                { label: 'DEGRADED',  range: '50–70',  color: '#f59e0b' },
                { label: 'POOR',      range: '30–50',  color: '#f97316' },
                { label: 'CRITICAL',  range: '0–30',   color: '#ef4444' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: row.color }} />
                  <span className="text-[clamp(8px,0.7vw,10px)] font-mono" style={{ color: row.color }}>{row.label}</span>
                  <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted ml-auto">{row.range}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">
                <div className="flex justify-between">
                  <span>Warning</span><span className="text-warning font-bold">{'< 70'}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span>Critical</span><span className="text-critical font-bold">{'< 50'}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span>Maintenance</span><span className="text-critical font-bold">{'< 30'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
