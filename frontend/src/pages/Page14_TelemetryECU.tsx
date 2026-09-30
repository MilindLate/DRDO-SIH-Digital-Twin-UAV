// S14 — Telemetry / ECU Data Source
import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fmtTS, fmt } from '../utils/formatters'

export default function Page14_TelemetryECU() {
  const { telemetry: t, telemetryHistory, wsConnected } = useStore()
  const [pktCount, setPktCount] = useState(0)
  const [rate, setRate] = useState(0)
  const [lastRateTs, setLastRateTs] = useState(Date.now())

  useEffect(() => {
    if (t) {
      setPktCount(c => c + 1)
      const now = Date.now()
      setRate(Math.round(1000 / Math.max(1, now - lastRateTs) * 10) / 10)
      setLastRateTs(now)
    }
  }, [t])

  const pipeline = [
    { stage: 'DATA SOURCE', detail: 'SIMULATOR (physics model)', status: 'ACTIVE' },
    { stage: 'PROTOCOL ADAPTER', detail: 'WebSocket / JSON', status: 'ACTIVE' },
    { stage: 'VALIDATION', detail: 'Range & type checks', status: 'ACTIVE' },
    { stage: 'TIME SYNC', detail: 'UTC ISO8601', status: 'ACTIVE' },
    { stage: 'DIGITAL TWIN', detail: 'State update 1 Hz', status: 'ACTIVE' },
    { stage: 'AI ENGINE', detail: 'IsolationForest + RandomForest', status: 'ACTIVE' },
    { stage: 'DASHBOARD', detail: 'React WebSocket client', status: wsConnected ? 'ACTIVE' : 'DISCONNECTED' },
  ]

  const recentRecords = telemetryHistory.slice(-8).reverse()

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S14</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">TELEMETRY / ECU DATA SOURCE</h1></div>
        <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">SOURCE: SIMULATOR — Replace with CAN/ECU/FADEC</span>
      </div>

      <div className="flex-1 p-2 flex gap-2 min-h-0">
        <div className="w-80 flex flex-col gap-2 shrink-0">
          {/* Data source status */}
          <div className="bg-surface border border-border rounded-sm p-3">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">DATA SOURCE STATUS</div>
            {[
              ['Source', 'SIMULATOR [DEMONSTRATION]'],
              ['Protocol', 'WebSocket / JSON (simulated)'],
              ['Connection', wsConnected ? 'CONNECTED' : 'DISCONNECTED'],
              ['Data Rate', `${rate.toFixed(1)} rec/s`],
              ['Total Packets', pktCount],
              ['Last Packet', fmtTS(t?.timestamp)],
              ['Packet Loss', '0% [SIMULATED]'],
              ['Latency', '<1ms [LOCAL]'],
              ['CAN Bus', 'NOT CONNECTED [FUTURE]'],
              ['FADEC Link', 'NOT CONNECTED [FUTURE]'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{k}</span>
                <span className={`text-[clamp(9px,0.8vw,11px)] font-mono ${
                  v === 'CONNECTED' ? 'text-healthy' : v === 'DISCONNECTED' ? 'text-critical' :
                  String(v).includes('FUTURE') ? 'text-text-muted' : 'text-text-secondary'
                }`}>{String(v)}</span>
              </div>
            ))}
          </div>

          {/* CAN integration note */}
          <div className="bg-advisory/5 border border-advisory/30 rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-advisory font-mono mb-1">FUTURE CAN/ECU INTEGRATION PATH</div>
            <div className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono space-y-0.5">
              <p>• Replace <span className="text-accent">RealtimeSimulator</span> with CAN bus reader</p>
              <p>• Implement protocol adapter (MAVLink / DroneCAN / custom)</p>
              <p>• Add ECU parameter mapping in engine_config.yaml</p>
              <p>• Real sensor → digital twin synchronisation</p>
              <p>• Timestamp alignment with GPS/PPS</p>
            </div>
          </div>

          {/* Data quality */}
          <div className="bg-surface border border-border rounded-sm p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2">DATA QUALITY STATISTICS</div>
            {[
              ['Total Parameters', '28'],
              ['Valid Range', '100% [SIM]'],
              ['Missing Values', '0%'],
              ['Outliers', '0%'],
              ['Quality Flag', `${t?.quality_flag ?? 100} / 100`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5">
                <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{k}</span>
                <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-healthy">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline + raw stream */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Pipeline */}
          <div className="bg-surface border border-border rounded-sm p-3">
            <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-3">TELEMETRY PIPELINE [SIMULATED]</div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {pipeline.map((s, i) => (
                <React.Fragment key={s.stage}>
                  <div className={`flex flex-col items-center min-w-[90px] p-2 border rounded-sm
                    ${s.status === 'ACTIVE' ? 'border-healthy/40 bg-healthy/5' :
                      s.status === 'DISCONNECTED' ? 'border-critical/40 bg-critical/5' :
                      'border-border bg-surface-alt'}`}>
                    <div className="text-[clamp(7px,0.6vw,9px)] font-mono font-bold text-text-secondary text-center">{s.stage}</div>
                    <div className={`text-[clamp(6px,0.5vw,8px)] font-mono mt-0.5 text-center ${s.status === 'ACTIVE' ? 'text-healthy' : 'text-critical'}`}>{s.status}</div>
                    <div className="text-[clamp(6px,0.5vw,8px)] text-text-muted font-mono mt-0.5 text-center leading-tight">{s.detail}</div>
                  </div>
                  {i < pipeline.length - 1 && <div className="text-accent font-mono text-[clamp(10px,0.9vw,12px)] shrink-0">→</div>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Raw stream */}
          <div className="bg-surface border border-border rounded-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-2 py-1 border-b border-border text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono shrink-0">
              RAW TELEMETRY STREAM (last {recentRecords.length} records) [SIMULATED]
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[clamp(8px,0.7vw,10px)]">
              {recentRecords.map((r: any, i: number) => (
                <div key={i} className={`px-2 py-1 border-b border-border/20 ${i === 0 ? 'bg-accent/5' : ''}`}>
                  <span className="text-text-muted">{fmtTS(r.timestamp)}</span>
                  {' | '}
                  <span className="text-accent">RPM:</span><span className="text-text-primary">{fmt(r.rpm, 0)}</span>
                  {' | '}
                  <span className="text-accent">CHT:</span><span className="text-text-primary">{fmt(r.cht_c, 1)}</span>
                  {' | '}
                  <span className="text-accent">EGT:</span><span className="text-text-primary">{fmt(r.egt_c, 1)}</span>
                  {' | '}
                  <span className="text-accent">OilP:</span><span className="text-text-primary">{fmt(r.oil_pressure_kpa, 0)}</span>
                  {' | '}
                  <span className="text-accent">Vib:</span><span className="text-text-primary">{fmt(r.vibration_rms_g, 4)}</span>
                  {' | '}
                  <span className="text-text-muted">{r.engine_state}/{r.mission_phase}</span>
                  {' | '}
                  <span className="text-text-muted">SRC:{r.data_source ?? 'SIM'}</span>
                </div>
              ))}
              {recentRecords.length === 0 && (
                <div className="px-2 py-4 text-text-muted text-center">Waiting for telemetry data...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
