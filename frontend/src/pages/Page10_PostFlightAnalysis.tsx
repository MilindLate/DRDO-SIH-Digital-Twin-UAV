// S10 — Post-Flight Analysis
import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmt } from '../utils/formatters'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { Mission } from '../types'

export default function Page10_PostFlightAnalysis() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [selected, setSelected] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [telHistory, setTelHistory] = useState<any[]>([])

  useEffect(() => {
    api.missions.list().then((d: any) => setMissions(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    api.missions.get(selected).then((d: any) => setData(d)).catch(() => {})
    api.missions.replay(selected).then((r: any) => setTelHistory(r.telemetry ?? [])).catch(() => {})
  }, [selected])

  const m = data || {}

  function downloadReport() {
    if (!data) return
    const blob = new Blob([JSON.stringify({ mission: data, telemetry_summary: {
      total_records: telHistory.length,
      max_cht: m.max_cht_c, max_egt: m.max_egt_c, min_oil_pressure: m.min_oil_pressure_kpa
    }}, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `post-flight-${selected}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S10</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">POST-FLIGHT ANALYSIS</h1></div>
        <div className="flex items-center gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="bg-surface-alt border border-border text-text-primary text-[clamp(10px,0.9vw,12px)] font-mono px-2 py-1 rounded-sm">
            <option value="">— Select Mission —</option>
            {missions.map(ms => <option key={ms.mission_id} value={ms.mission_id}>{ms.mission_id} — {ms.description}</option>)}
          </select>
          {data && <button onClick={downloadReport} className="px-2 py-1 text-[clamp(9px,0.8vw,11px)] font-mono border border-accent text-accent rounded-sm hover:bg-accent/10">⬇ REPORT JSON</button>}
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SIMULATED DATA</span>
        </div>
      </div>

      {!data ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted font-mono text-[clamp(12px,1.1vw,14px)]">Select a completed mission to analyse</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Summary cards */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'Duration', value: fmt(m.actual_duration_hours, 2), unit: 'h' },
              { label: 'Fuel Used', value: fmt(m.total_fuel_consumed_l, 1), unit: 'L' },
              { label: 'Max CHT', value: fmt(m.max_cht_c, 1), unit: '°C' },
              { label: 'Max EGT', value: fmt(m.max_egt_c, 1), unit: '°C' },
              { label: 'Min Oil Pres.', value: fmt(m.min_oil_pressure_kpa, 0), unit: 'kPa' },
              { label: 'Fault Events', value: String(m.fault_count ?? 0), unit: '' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-surface border border-border rounded-sm p-2 text-center">
                <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{label} [SIM]</div>
                <div className="text-[clamp(16px,1.5vw,18px)] font-bold font-mono text-text-primary">{value}</div>
                <div className="text-[clamp(8px,0.7vw,10px)] text-text-secondary font-mono">{unit}</div>
              </div>
            ))}
          </div>

          {/* Parameter charts */}
          {telHistory.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { param: 'cht_c', label: 'CHT [°C] [SIM]', color: '#f59e0b', ref: 220 },
                { param: 'egt_c', label: 'EGT [°C] [SIM]', color: '#ef4444', ref: 750 },
                { param: 'oil_pressure_kpa', label: 'Oil Pressure [kPa] [SIM]', color: '#22c55e', ref: 200 },
                { param: 'vibration_rms_g', label: 'Vibration RMS [g] [SIM]', color: '#00b4d8', ref: 0.5 },
              ].map(({ param, label, color, ref }) => {
                const pts = telHistory.filter((r: any) => r[param] != null).map((r: any, i: number) => ({ i, v: r[param] }))
                return (
                  <div key={param} className="bg-surface border border-border rounded-sm p-2">
                    <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1">{label}</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={pts}>
                        <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="i" hide />
                        <YAxis tick={{ fill: '#64748b', fontSize: 8 }} domain={['auto', 'auto']} />
                        <ReferenceLine y={ref} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={0.8} />
                        <Tooltip contentStyle={{ background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 }} />
                        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              })}
            </div>
          )}

          {/* Mission info */}
          <div className="bg-surface border border-border rounded-sm p-3">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">MISSION SUMMARY</div>
            <div className="grid grid-cols-3 gap-4 text-[clamp(9px,0.8vw,11px)] font-mono">
              {Object.entries({
                'Mission ID': m.mission_id, 'Type': m.mission_type, 'Status': m.status,
                'Avg RPM': fmt(m.avg_rpm, 0), 'Max Vibration': fmt(m.max_vibration_rms_g, 4) + ' g',
                'Anomalies': m.anomaly_count ?? 0,
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/30 py-0.5">
                  <span className="text-text-muted">{k}</span>
                  <span className="text-text-secondary">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono">ALL DATA SIMULATED — NOT FOR OPERATIONAL USE</div>
          </div>
        </div>
      )}
    </div>
  )
}
