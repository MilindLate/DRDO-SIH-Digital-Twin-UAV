// S08 — Mission Simulator
import React, { useState } from 'react'
import { api } from '../services/api'
import { fmt } from '../utils/formatters'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'

const PRESETS = [
  { id: 'ISR_ENDURANCE', label: 'ISR Endurance', duration: 8, altitude: 2500, temp: 15, humidity: 60 },
  { id: 'HOT_WEATHER', label: 'Hot Weather Ops', duration: 6, altitude: 1500, temp: 42, humidity: 35 },
  { id: 'HIGH_ALTITUDE', label: 'High Altitude', duration: 5, altitude: 5500, temp: -2, humidity: 45 },
  { id: 'SHORT_RECON', label: 'Short Recon', duration: 2, altitude: 1000, temp: 18, humidity: 55 },
]

export default function Page08_MissionSimulator() {
  const [config, setConfig] = useState({
    mission_type: 'ISR_ENDURANCE', duration_hours: 8, altitude_m: 2500,
    ambient_temperature_c: 15, humidity_pct: 60,
  })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  function applyPreset(p: any) {
    setConfig({ mission_type: p.id, duration_hours: p.duration, altitude_m: p.altitude, ambient_temperature_c: p.temp, humidity_pct: p.humidity })
  }

  async function runSim() {
    setRunning(true)
    setResult(null)
    try {
      const r = await api.simulation.run(config) as any
      setResult(r)
    } catch (e) { console.error(e) }
    finally { setRunning(false) }
  }

  const sampleTelem = result?.sample_telemetry ?? []

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S08</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">MISSION SIMULATOR</h1></div>
        <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SIMULATED PREDICTION — Not validated</span>
      </div>

      <div className="flex flex-1 gap-2 p-2 min-h-0">
        {/* Config panel */}
        <div className="w-60 flex flex-col gap-2 shrink-0">
          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">MISSION PRESETS</div>
            <div className="grid grid-cols-1 gap-1">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className={`px-2 py-1.5 text-[clamp(9px,0.8vw,11px)] font-mono border rounded-sm text-left transition-colors
                    ${config.mission_type === p.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-sm p-2 flex flex-col gap-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">MISSION CONFIGURATION [CONFIGURABLE]</div>
            {[
              ['Duration (h)', 'duration_hours', 0, 24, 0.5],
              ['Altitude (m)', 'altitude_m', 0, 6000, 100],
              ['Ambient Temp (°C)', 'ambient_temperature_c', -20, 55, 1],
              ['Humidity (%)', 'humidity_pct', 0, 100, 5],
            ].map(([label, key, min, max, step]) => (
              <div key={key as string}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{label}</span>
                  <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-primary">{(config as any)[key as string]}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={(config as any)[key as string]}
                  onChange={e => setConfig(c => ({ ...c, [key as string]: parseFloat(e.target.value) }))}
                  className="w-full h-1 accent-accent" />
              </div>
            ))}
          </div>

          <button onClick={runSim} disabled={running}
            className={`py-2 rounded-sm text-[clamp(12px,1.1vw,14px)] font-bold font-mono border transition-colors
              ${running ? 'border-border text-text-muted' : 'border-accent text-accent bg-accent/10 hover:bg-accent/20'}`}>
            {running ? 'SIMULATING...' : '▶ RUN SIMULATION'}
          </button>

          {result && (
            <div className="bg-surface border border-border rounded-sm p-2">
              <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">PREDICTED RESULTS</div>
              {[
                ['Max CHT', `${fmt(result.predicted_max_cht, 1)} °C [SIM]`],
                ['Max EGT', `${fmt(result.predicted_max_egt, 1)} °C [SIM]`],
                ['Fuel Consumed', `${fmt(result.predicted_fuel_consumed, 1)} L [SIM]`],
                ['Steps', result.total_steps],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-0.5 border-b border-border/30">
                  <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{k}</span>
                  <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary">{v}</span>
                </div>
              ))}
              <div className="mt-1 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono">SIMULATED PREDICTION — Not validated</div>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {sampleTelem.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              {[
                { param: 'rpm', label: 'RPM [SIM]', color: '#00b4d8', ref: 5500 },
                { param: 'cht_c', label: 'CHT °C [SIM]', color: '#f59e0b', ref: 220 },
                { param: 'egt_c', label: 'EGT °C [SIM]', color: '#ef4444', ref: 750 },
                { param: 'oil_temperature_c', label: 'Oil Temp °C [SIM]', color: '#22c55e', ref: 110 },
              ].map(({ param, label, color, ref }) => (
                <div key={param} className="bg-surface border border-border rounded-sm p-2">
                  <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1">{label}</div>
                  <ResponsiveContainer width="100%" height="80%">
                    <LineChart data={sampleTelem.map((r: any, i: number) => ({ i, v: r[param] }))}>
                      <XAxis dataKey="i" hide />
                      <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                      <ReferenceLine y={ref} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={0.8} />
                      <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
                      <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 bg-surface border border-border rounded-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-muted font-mono text-[clamp(12px,1.1vw,14px)] mb-2">Configure mission and click RUN SIMULATION</div>
                <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">Predicted parameter trajectories will appear here [SIMULATED]</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
