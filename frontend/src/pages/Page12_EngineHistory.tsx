// S12 — Engine History
import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmt } from '../utils/formatters'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'

export default function Page12_EngineHistory() {
  const [engine, setEngine] = useState<any>(null)
  const [missions, setMissions] = useState<any[]>([])
  const [healthHist, setHealthHist] = useState<any[]>([])

  useEffect(() => {
    api.engines.list().then((d: any) => Array.isArray(d) && d.length > 0 && setEngine(d[0])).catch(() => {})
    api.missions.list().then((d: any) => setMissions(Array.isArray(d) ? d : [])).catch(() => {})
    api.health.history('ENG-001', 200).then((d: any) => setHealthHist(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const totalHours = (engine?.total_operating_hours ?? 342.5) + 0
  const missionData = missions.map((m, i) => ({ i, cht: m.max_cht_c ?? 0, egt: m.max_egt_c ?? 0, vib: m.max_vibration_rms_g ?? 0 }))
  const healthChartData = healthHist.slice(-100).map((h: any, i: number) => ({ i, v: h.overall_health }))

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S12</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">ENGINE HISTORY</h1></div>
        <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SIMULATED HISTORICAL DATA</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Total Hours', value: fmt(totalHours, 1), unit: 'h [SIM]' },
            { label: 'Mission Count', value: String(engine?.mission_count ?? missions.length), unit: 'missions' },
            { label: 'TBO Hours', value: fmt(engine?.tbo_hours ?? 1500, 0), unit: 'h [CONFIGURABLE]' },
            { label: 'Remaining TBO', value: fmt(Math.max(0, (engine?.tbo_hours ?? 1500) - totalHours), 0), unit: 'h [ESTIMATED]' },
            { label: 'Engine Model', value: 'Generic Piston', unit: '[SIMULATED]' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-surface border border-border rounded-sm p-2">
              <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{label}</div>
              <div className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono text-text-primary">{value}</div>
              <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{unit}</div>
            </div>
          ))}
        </div>

        {/* Health history chart */}
        <div className="bg-surface border border-border rounded-sm p-2">
          <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">HEALTH INDEX HISTORY [SIMULATED]</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={healthChartData}>
              <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="i" hide />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8 }} />
              <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
              <Line type="monotone" dataKey="v" stroke="#00b4d8" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Per-mission charts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">MAX CHT & EGT BY MISSION [SIM]</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={missionData}>
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
                <Bar dataKey="cht" name="Max CHT °C" fill="#f59e0b" />
                <Bar dataKey="egt" name="Max EGT °C" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">MAX VIBRATION BY MISSION [SIM]</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={missionData}>
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fill: '#64748b', fontSize: 8 }} domain={[0, 2]} />
                <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
                <Bar dataKey="vib" name="Max Vibration g" fill="#00b4d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mission table */}
        <div className="bg-surface border border-border rounded-sm p-2">
          <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">MISSION LOG [SIMULATED]</div>
          <table className="w-full text-[clamp(9px,0.8vw,11px)] font-mono">
            <thead><tr className="border-b border-border text-text-muted">
              <th className="text-left py-0.5">MISSION ID</th><th className="text-left py-0.5">TYPE</th>
              <th className="text-left py-0.5">DURATION</th><th className="text-right py-0.5">MAX CHT</th>
              <th className="text-right py-0.5">MAX EGT</th><th className="text-right py-0.5">FAULTS</th>
              <th className="text-right py-0.5">FUEL</th>
            </tr></thead>
            <tbody>
              {missions.map((m, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-surface-alt">
                  <td className="py-1 text-accent">{m.mission_id}</td>
                  <td className="py-1 text-text-secondary">{m.mission_type}</td>
                  <td className="py-1">{fmt(m.actual_duration_hours, 1)}h</td>
                  <td className="py-1 text-right">{fmt(m.max_cht_c, 1)}°C</td>
                  <td className="py-1 text-right">{fmt(m.max_egt_c, 1)}°C</td>
                  <td className={`py-1 text-right ${m.fault_count > 0 ? 'text-warning' : 'text-healthy'}`}>{m.fault_count ?? 0}</td>
                  <td className="py-1 text-right">{fmt(m.total_fuel_consumed_l, 1)}L</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono">ALL DATA SIMULATED — DEMONSTRATION SYSTEM</div>
        </div>
      </div>
    </div>
  )
}
