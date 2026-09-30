/**
 * Thermal Heatmap — Cylinder Head Temperature visualization
 * Shows per-cylinder CHT derived from main CHT + simulated spread
 * SIMULATED — DEMONSTRATION ONLY
 */
import React, { useMemo } from 'react'
import { useStore } from '../store'

function tempToColor(t: number, minT: number, maxT: number) {
  const norm = Math.max(0, Math.min(1, (t - minT) / Math.max(1, maxT - minT)))
  // Blue → Cyan → Green → Yellow → Orange → Red
  if (norm < 0.2) return `hsl(${240 - norm * 5 * 60},80%,50%)`
  if (norm < 0.4) return `hsl(${180 - (norm - 0.2) * 5 * 60},80%,50%)`
  if (norm < 0.6) return `hsl(${120 - (norm - 0.4) * 5 * 30},80%,50%)`
  if (norm < 0.8) return `hsl(${60 - (norm - 0.6) * 5 * 30},80%,55%)`
  return `hsl(${Math.max(0, 30 - (norm - 0.8) * 5 * 30)},90%,52%)`
}

const CYLINDER_LABELS = ['CYL 1\nFront-L', 'CYL 2\nFront-R', 'CYL 3\nRear-L', 'CYL 4\nRear-R']

export default function ThermalHeatmap({ className = '' }: { className?: string }) {
  const { telemetry: t } = useStore()
  const cht = t?.cht_c ?? 120

  // Simulate per-cylinder variation [SIMULATED — not real per-cylinder data]
  const cylTemps = useMemo(() => {
    const spread = [0, 8, -5, 12]  // typical uneven heat distribution [SIMULATED]
    const fuelFlow = t?.fuel_flow_lph ?? 20
    const fuelBias = fuelFlow > 25 ? 15 : 0  // high fuel flow heats cyl1 [SIMULATED]
    return spread.map((s, i) => {
      const bias = [5, -3, 8, -2][i]
      const cylFuelBias = i === 0 ? fuelBias : 0
      return Math.max(60, cht + s + bias + cylFuelBias)
    })
  }, [cht, t?.fuel_flow_lph])

  const minT = Math.min(...cylTemps) - 5
  const maxT = Math.max(...cylTemps) + 5

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">CYLINDER THERMAL MAP [SIMULATED]</span>
        <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">Avg: {Math.round(cht)}°C</span>
      </div>

      {/* 2x2 heatmap grid */}
      <div className="grid grid-cols-2 gap-1">
        {cylTemps.map((temp, i) => {
          const color = tempToColor(temp, minT, maxT)
          const label = CYLINDER_LABELS[i]
          const [line1, line2] = label.split('\n')
          const isCritical = temp > 230
          const isWarn = temp > 200

          return (
            <div key={i}
              className={`relative rounded overflow-hidden border transition-all duration-500 ${isCritical ? 'border-critical' : isWarn ? 'border-warning' : 'border-border/40'}`}
              style={{ background: `${color}18`, minHeight: 64 }}
            >
              {/* Heat fill bar */}
              <div className="absolute inset-0 transition-all duration-700"
                style={{
                  background: `linear-gradient(135deg, ${color}25 0%, ${color}08 100%)`,
                }} />

              {/* Content */}
              <div className="relative p-2 flex flex-col items-center justify-center h-full">
                <div className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center">{line1}</div>
                <div className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center mb-1">{line2}</div>
                <div className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono transition-all duration-300"
                  style={{ color, textShadow: `0 0 8px ${color}80` }}>
                  {Math.round(temp)}°C
                </div>
                {isCritical && <span className="text-[clamp(7px,0.6vw,9px)] font-mono text-critical mt-0.5 animate-pulse">CRITICAL</span>}
                {isWarn && !isCritical && <span className="text-[clamp(7px,0.6vw,9px)] font-mono text-warning mt-0.5">WARN</span>}
              </div>

              {/* Heat intensity fill from bottom */}
              <div className="absolute bottom-0 left-0 right-0 transition-all duration-700"
                style={{
                  height: `${Math.max(5, ((temp - minT) / (maxT - minT)) * 100)}%`,
                  background: `linear-gradient(to top, ${color}30, transparent)`,
                }} />
            </div>
          )
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted">{Math.round(minT)}°C</span>
        <div className="flex-1 h-2 rounded"
          style={{ background: 'linear-gradient(90deg, hsl(240,80%,50%), hsl(180,80%,50%), hsl(120,80%,50%), hsl(60,80%,55%), hsl(0,90%,52%)' }} />
        <span className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted">{Math.round(maxT)}°C</span>
      </div>
      <p className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center">SIMULATED per-cylinder data — not real ECU per-cylinder values</p>
    </div>
  )
}
