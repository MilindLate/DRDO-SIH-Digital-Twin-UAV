// S13 — Sensor Quality Monitoring
import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { fmt, fmtTS } from '../utils/formatters'
import { SensorStatus } from '../types'

const STATUS_COLOR: Record<string, string> = {
  OK: 'text-healthy border-healthy bg-healthy/10',
  DEGRADED: 'text-warning border-warning bg-warning/10',
  FAILED: 'text-critical border-critical bg-critical/10',
  FROZEN: 'text-critical border-critical bg-critical/10',
  DRIFTING: 'text-warning border-warning bg-warning/10',
}

export default function Page13_SensorQuality() {
  const [sensors, setSensors] = useState<SensorStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => {
      api.sensors.status().then((d: any) => { setSensors(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
    }
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const okCount = sensors.filter(s => s.status === 'OK').length
  const failCount = sensors.filter(s => ['FAILED', 'FROZEN', 'CRITICAL'].includes(s.status)).length
  const avgQuality = sensors.length > 0 ? sensors.reduce((a, s) => a + s.quality_score, 0) / sensors.length : 0

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S13</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">SENSOR QUALITY MONITOR</h1></div>
        <div className="flex items-center gap-3">
          <span className={`text-[clamp(9px,0.8vw,11px)] font-mono ${okCount === sensors.length ? 'text-healthy' : 'text-warning'}`}>
            OK: {okCount}/{sensors.length}
          </span>
          {failCount > 0 && <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-critical">FAULT: {failCount}</span>}
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">Avg Quality: {avgQuality.toFixed(1)}%</span>
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SIMULATED SENSOR DATA</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {/* Summary dashboard */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[
            { label: 'All Sensors', value: sensors.length, color: 'text-text-primary' },
            { label: 'Nominal (OK)', value: okCount, color: 'text-healthy' },
            { label: 'Degraded', value: sensors.filter(s => s.status === 'DEGRADED').length, color: 'text-warning' },
            { label: 'Failed/Frozen', value: failCount, color: failCount > 0 ? 'text-critical' : 'text-text-muted' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface border border-border rounded-sm p-2 text-center">
              <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{label}</div>
              <div className={`text-[clamp(20px,2vw,28px)] font-bold font-mono ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Sensor table */}
        <div className="bg-surface border border-border rounded-sm overflow-hidden">
          <table className="w-full text-[clamp(9px,0.8vw,11px)] font-mono">
            <thead className="border-b border-border bg-surface-alt">
              <tr className="text-text-muted">
                <th className="text-left px-2 py-1.5">SENSOR</th>
                <th className="text-left px-2 py-1.5">PARAMETER</th>
                <th className="text-right px-2 py-1.5">CURRENT VALUE</th>
                <th className="text-right px-2 py-1.5">UNIT</th>
                <th className="text-right px-2 py-1.5">QUALITY %</th>
                <th className="text-right px-2 py-1.5">RATE Hz</th>
                <th className="text-left px-2 py-1.5">LAST UPDATE</th>
                <th className="text-center px-2 py-1.5">STATUS</th>
                <th className="text-right px-2 py-1.5">CONFIDENCE</th>
                <th className="text-center px-2 py-1.5">FLAGS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4 text-text-muted">Loading sensor data...</td></tr>
              ) : sensors.map(s => (
                <tr key={s.sensor_id} className="border-b border-border/30 hover:bg-surface-alt">
                  <td className="px-2 py-1.5 text-accent">{s.sensor_id}</td>
                  <td className="px-2 py-1.5 text-text-secondary">{s.sensor_name}</td>
                  <td className="px-2 py-1.5 text-right font-bold text-text-primary">
                    {s.current_value != null ? s.current_value.toFixed(3) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-text-muted">{s.unit}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={s.quality_score >= 95 ? 'text-healthy' : s.quality_score >= 80 ? 'text-warning' : 'text-critical'}>
                      {s.quality_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-text-secondary">{s.data_rate_hz}</td>
                  <td className="px-2 py-1.5 text-text-muted">{fmtTS(s.last_update)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 border rounded-sm text-[clamp(8px,0.7vw,10px)] ${STATUS_COLOR[s.status] ?? 'text-text-muted border-border'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-text-secondary">
                    {(s.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-2 py-1.5 text-center text-text-muted">
                    {s.is_frozen && <span className="text-critical mr-0.5">FRZ</span>}
                    {s.is_outlier && <span className="text-warning mr-0.5">OUT</span>}
                    {s.is_drifting && <span className="text-warning">DRF</span>}
                    {!s.is_frozen && !s.is_outlier && !s.is_drifting && <span className="text-healthy">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 p-2 bg-advisory/5 border border-advisory/30 rounded-sm">
          <p className="text-[clamp(8px,0.7vw,10px)] text-advisory font-mono">
            NOTE: AI predictions (anomaly detection, fault classification) are less reliable when sensor quality scores are low. 
            SIMULATED sensor data — replace with real ECU/FADEC sensor feeds in production integration.
          </p>
        </div>
      </div>
    </div>
  )
}
