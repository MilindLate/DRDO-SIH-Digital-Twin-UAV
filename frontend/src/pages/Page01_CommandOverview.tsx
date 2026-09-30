/**
 * S01 — Command Overview
 * Full redesign: arc gauges, animated params, heatmap, radar chart
 * DEMONSTRATION SYSTEM
 */
import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtTS, healthColor, healthLabel, severityColor } from '../utils/formatters'
import ArcGauge from '../components/ArcGauge'
import ThermalHeatmap from '../components/ThermalHeatmap'
import SubsystemRadar from '../components/SubsystemRadar'
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { Activity, Zap, AlertTriangle, Clock, Wifi, WifiOff, Shield } from 'lucide-react'

function Sparkline({ data, color = '#00b4d8', refVal }: { data: number[], color?: string, refVal?: number }) {
  const pts = data.map((v, i) => ({ v }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={pts} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        {refVal !== undefined && <ReferenceLine y={refVal} stroke={color} strokeOpacity={0.3} strokeDasharray="2 2" />}
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ParamCard({ label, value, unit, color, trend, spark }: {
  label: string, value: string | number, unit: string, color: string, trend?: number, spark?: number[]
}) {
  const arrow = trend === undefined ? '' : trend > 0.05 ? '↑' : trend < -0.05 ? '↓' : '→'
  return (
    <div className="hud-corner bg-surface border border-border rounded p-2 flex flex-col gap-1 min-w-0 hover:border-accent/40 transition-colors">
      <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted uppercase tracking-wider truncate">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[clamp(14px,1.3vw,16px)] font-bold font-mono leading-none transition-all duration-300"
          style={{ color, textShadow: `0 0 8px ${color}60` }}>
          {value}
        </span>
        <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">{unit}</span>
        {arrow && <span className="text-[clamp(10px,0.9vw,12px)] font-bold" style={{ color }}>{arrow}</span>}
      </div>
      {spark && spark.length > 2 && (
        <Sparkline data={spark} color={color} />
      )}
    </div>
  )
}

export default function Page01_CommandOverview() {
  const { telemetry: t, health: h, activeFaults, wsConnected, historyBuffer } = useStore()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])

  const rpm    = t?.rpm ?? 0
  const cht    = t?.cht_c ?? 80
  const egt    = t?.egt_c ?? 250
  const oilP   = t?.oil_pressure_kpa ?? 350
  const oilT   = t?.oil_temperature_c ?? 70
  const fuel   = t?.fuel_flow_lph ?? 0
  const vib    = t?.vibration_rms_g ?? 0
  const batV   = t?.battery_voltage_v ?? 12.6
  const altV   = t?.alternator_voltage_v ?? 14.1
  const throt  = t?.throttle_pct ?? 0
  const alt    = t?.altitude_m ?? 0
  const load   = t?.engine_load_pct ?? 0
  const phase  = t?.mission_phase ?? 'GROUND'
  const state  = t?.engine_state ?? 'OFF'

  const overallH = h?.overall_health ?? 85
  const rul      = 1200 - ((h as any)?.operating_hours ?? 0) * 0.8

  // Extract sparkline history from buffer
  const rpmHist  = historyBuffer?.map(r => r.rpm ?? 0).slice(-60) ?? []
  const chtHist  = historyBuffer?.map(r => r.cht_c ?? 0).slice(-60) ?? []
  const oilHist  = historyBuffer?.map(r => r.oil_pressure_kpa ?? 0).slice(-60) ?? []
  const vibHist  = historyBuffer?.map(r => r.vibration_rms_g ?? 0).slice(-60) ?? []

  const critFaults = activeFaults.filter(f => f.severity === 'CRITICAL')
  const warnFaults = activeFaults.filter(f => f.severity === 'WARNING')

  const hColor = overallH >= 85 ? '#22c55e' : overallH >= 70 ? '#86efac' : overallH >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col h-full gap-2 p-2 bg-bg overflow-hidden text-text-primary">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">ENGINE</span>
          <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-display text-accent">ENG-001</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">UAV</span>
          <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-display text-text-primary">UAV-001</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">PHASE</span>
          <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-mono text-accent">{phase}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">STATE</span>
          <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-mono"
            style={{ color: state === 'OFF' ? '#64748b' : '#22c55e' }}>{state}</span>
        </div>

        <div className="flex-1" />

        {/* Fault counts */}
        {critFaults.length > 0 && (
          <div className="flex items-center gap-1 bg-critical/10 border border-critical rounded px-2 py-0.5 animate-pulse">
            <AlertTriangle size={10} className="text-critical" />
            <span className="text-[clamp(9px,0.8vw,11px)] font-bold font-mono text-critical">CRIT: {critFaults.length}</span>
          </div>
        )}
        {warnFaults.length > 0 && (
          <div className="flex items-center gap-1 bg-warning/10 border border-warning rounded px-2 py-0.5">
            <AlertTriangle size={10} className="text-warning" />
            <span className="text-[clamp(9px,0.8vw,11px)] font-bold font-mono text-warning">WARN: {warnFaults.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {wsConnected ? <Wifi size={10} className="text-healthy" /> : <WifiOff size={10} className="text-critical" />}
          <span className={`text-[clamp(9px,0.8vw,11px)] font-mono ${wsConnected ? 'text-healthy' : 'text-critical'}`}>
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">
          {now.toLocaleTimeString([], { hour12: false })} UTC
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 gap-2 min-h-0">

        {/* LEFT: Overall health + radar */}
        <div className="flex flex-col gap-2 w-[200px] shrink-0">

          {/* Health score big display */}
          <div className="hud-corner bg-surface border border-border rounded p-3 flex flex-col items-center">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1 tracking-wider">ENGINE HEALTH INDEX</div>
            <div className="relative">
              <ArcGauge
                value={overallH} min={0} max={100}
                label="" unit="%"
                warnThreshold={70} critThreshold={50}
                size={140} inverse showZones
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: 24 }}>
                <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">{healthLabel(overallH)}</span>
              </div>
            </div>
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mt-1">DEMONSTRATION MODEL</div>
          </div>

          {/* RUL display */}
          <div className="hud-corner bg-surface border border-border rounded p-2 text-center">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted">RUL EST.</div>
            <div className="text-[clamp(18px,1.7vw,22px)] font-bold font-mono" style={{ color: hColor, textShadow: `0 0 8px ${hColor}` }}>
              {Math.max(0, Math.round(rul))}
              <span className="text-[clamp(10px,0.9vw,12px)] text-text-muted ml-1">h</span>
            </div>
            <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">SIMULATION-BASED</div>
          </div>

          {/* Radar */}
          <div className="bg-surface border border-border rounded p-1 flex flex-col items-center flex-1">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1">SUBSYSTEM HEALTH RADAR</div>
            <SubsystemRadar size={175} />
          </div>
        </div>

        {/* CENTER: Arc gauges + params grid */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">

          {/* Arc gauges row */}
          <div className="bg-surface border border-border rounded p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider">CRITICAL PARAMETERS [SIMULATED]</div>
            <div className="flex justify-around items-center gap-1">
              <ArcGauge value={rpm} min={0} max={6000} label="RPM" unit="rpm"
                warnThreshold={5500} critThreshold={5800} size={110} showZones glowColor="#00b4d8" />
              <ArcGauge value={cht} min={0} max={250} label="CHT" unit="°C"
                warnThreshold={200} critThreshold={220} size={110} showZones />
              <ArcGauge value={egt} min={0} max={800} label="EGT" unit="°C"
                warnThreshold={700} critThreshold={750} size={110} showZones />
              <ArcGauge value={oilP} min={0} max={600} label="OIL P" unit="kPa"
                warnThreshold={180} critThreshold={140} size={110} inverse showZones />
              <ArcGauge value={vib} min={0} max={2} label="VIB" unit="g"
                warnThreshold={0.5} critThreshold={1.0} size={110} showZones />
            </div>
          </div>

          {/* Param cards grid */}
          <div className="grid grid-cols-4 gap-1.5 flex-1">
            <ParamCard label="OIL TEMP" value={fmt(oilT, 1)} unit="°C"
              color={oilT > 115 ? '#ef4444' : oilT > 105 ? '#f59e0b' : '#22c55e'} />
            <ParamCard label="FUEL FLOW" value={fmt(fuel, 1)} unit="L/h"
              color="#00b4d8" spark={historyBuffer?.map(r => r.fuel_flow_lph ?? 0).slice(-40)} />
            <ParamCard label="BATTERY" value={fmt(batV, 1)} unit="V"
              color={batV < 11.8 ? '#ef4444' : batV < 12.2 ? '#f59e0b' : '#22c55e'} />
            <ParamCard label="ALTERNATOR" value={fmt(altV, 1)} unit="V"
              color={altV < 13.5 ? '#f59e0b' : '#22c55e'} />
            <ParamCard label="THROTTLE" value={fmt(throt, 0)} unit="%"
              color="#00b4d8" spark={historyBuffer?.map(r => r.throttle_pct ?? 0).slice(-40)} />
            <ParamCard label="ENGINE LOAD" value={fmt(load, 0)} unit="%"
              color={load > 90 ? '#ef4444' : load > 80 ? '#f59e0b' : '#94a3b8'}
              spark={historyBuffer?.map(r => r.engine_load_pct ?? 0).slice(-40)} />
            <ParamCard label="ALTITUDE" value={fmt(alt, 0)} unit="m"
              color="#94a3b8" />
            <ParamCard label="AMBIENT T" value={fmt(t?.ambient_temperature_c, 1)} unit="°C"
              color="#94a3b8" />

            {/* RPM sparkline full width */}
            {rpmHist.length > 4 && (
              <div className="col-span-2 hud-corner bg-surface border border-border rounded p-2">
                <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1">RPM — 60s TREND</div>
                <Sparkline data={rpmHist} color="#00b4d8" refVal={5500} />
              </div>
            )}
            {chtHist.length > 4 && (
              <div className="col-span-2 hud-corner bg-surface border border-border rounded p-2">
                <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1">CHT — 60s TREND</div>
                <Sparkline data={chtHist} color={cht > 200 ? '#ef4444' : '#f59e0b'} refVal={200} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Faults + thermal heatmap */}
        <div className="flex flex-col gap-2 w-[200px] shrink-0">

          {/* Active faults */}
          <div className="bg-surface border border-border rounded p-2 flex flex-col gap-1" style={{ maxHeight: 180 }}>
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted tracking-wider">ACTIVE FAULTS</div>
            {activeFaults.length === 0 ? (
              <div className="flex items-center gap-1 mt-2">
                <Shield size={12} className="text-healthy" />
                <span className="text-[clamp(9px,0.8vw,11px)] font-mono text-healthy">NO ACTIVE FAULTS</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 overflow-y-auto scroll-thin">
                {activeFaults.slice(0, 5).map((f, i) => (
                  <div key={i} className="rounded p-1 border" style={{
                    borderColor: `${severityColor(f.severity)}40`,
                    background: `${severityColor(f.severity)}08`
                  }}>
                    <div className="text-[clamp(8px,0.7vw,10px)] font-bold font-mono" style={{ color: severityColor(f.severity) }}>
                      {f.severity}
                    </div>
                    <div className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary truncate">{f.fault_type}</div>
                    {f.confidence && (
                      <div className="text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted">{Math.round(f.confidence * 100)}% conf</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thermal heatmap */}
          <div className="bg-surface border border-border rounded p-2 flex-1">
            <ThermalHeatmap />
          </div>

          {/* DT sync status */}
          <div className="bg-surface border border-border rounded p-2">
            <div className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1">DT SYNC STATUS</div>
            <div className="space-y-1">
              {[
                { label: 'DATA SOURCE', val: 'SIMULATOR', color: '#00b4d8' },
                { label: 'UPDATE RATE', val: '1.0 Hz', color: '#22c55e' },
                { label: 'LATENCY', val: '<50ms', color: '#22c55e' },
                { label: 'ML ENGINE', val: 'ACTIVE', color: '#22c55e' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted">{row.label}</span>
                  <span className="text-[clamp(8px,0.7vw,10px)] font-mono font-bold" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 pt-1 border-t border-border text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center">
              SIMULATED — NOT REAL ECU DATA
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="flex items-center gap-3 bg-surface border border-border rounded px-3 py-1 shrink-0 text-[clamp(9px,0.8vw,11px)] font-mono">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
          <span className="text-healthy">SYSTEM OPERATIONAL</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span className="text-text-muted">Overall Health: <span style={{ color: hColor, fontWeight: 700 }}>{Math.round(overallH)}%</span></span>
        <div className="w-px h-3 bg-border" />
        <span className="text-text-muted">Faults: <span className="text-warning font-bold">{activeFaults.length}</span></span>
        <div className="w-px h-3 bg-border" />
        <span className="text-text-muted">Phase: <span className="text-accent">{phase}</span></span>
        <div className="flex-1" />
        <span className="text-text-muted opacity-50">DEMONSTRATION / RESEARCH PROTOTYPE — NOT FOR OPERATIONAL USE</span>
      </div>
    </div>
  )
}
