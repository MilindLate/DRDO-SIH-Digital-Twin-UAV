// S02 — Live Engine Monitor
import React from 'react'
import { useStore } from '../store'
import { fmt, fmtTS, paramStatus, statusColor } from '../utils/formatters'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Activity, Thermometer, Droplet, Battery, Zap, Wind } from 'lucide-react'

function LiveChart({ data, param, color, refLines }: {
  data: any[]; param: string; color: string; refLines?: { y: number; color: string }[]
}) {
  const pts = data.slice(-60).map((d, i) => ({ i, v: d[param] }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={pts}>
        <XAxis dataKey="i" hide />
        <YAxis hide domain={['auto', 'auto']} />
        {refLines?.map((r, i) => (
          <ReferenceLine key={i} y={r.y} stroke={r.color} strokeDasharray="3 3" strokeWidth={0.8} opacity={0.5} />
        ))}
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={2} isAnimationActive={false} style={{ filter: `drop-shadow(0 2px 4px ${color}80)` }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function StatRow({ label, value, unit, param, spark, note, highlight = false }: {
  label: string; value?: number; unit: string; param: string; spark?: any[]; note?: string; highlight?: boolean
}) {
  const st = paramStatus(param, value)
  const col = statusColor(st)
  const lineColor = st === 'ok' ? '#22c55e' : st === 'warn' ? '#f59e0b' : '#ef4444'
  
  if (highlight) {
    return (
      <div className="flex flex-col gap-1 mb-4 p-3 bg-[#0a121e] rounded border border-[rgba(255,255,255,0.05)]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[clamp(10px,0.9vw,12px)] text-text-muted font-mono">{label}</span>
            <span className="text-[clamp(8px,0.7vw,10px)] text-slate-500 font-mono">{note}</span>
          </div>
          <div className={`font-mono text-[clamp(20px,1.9vw,26px)] font-bold ${col}`}>
            {fmt(value, 1)} <span className="text-[clamp(11px,1vw,13px)] font-normal text-text-muted">{unit}</span>
          </div>
        </div>
        {spark && spark.length > 2 && <div className="mt-1"><LiveChart data={spark} param={param} color={lineColor} /></div>}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-0 group">
      <div className="flex flex-col flex-1">
        <span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono group-hover:text-text-primary transition-colors">{label}</span>
        {note && <span className="text-[clamp(7px,0.6vw,9px)] text-slate-600 font-mono">{note}</span>}
      </div>
      
      <div className="w-24 shrink-0 px-2 opacity-50 group-hover:opacity-100 transition-opacity hidden md:block">
        {spark && spark.length > 2 && <LiveChart data={spark} param={param} color={lineColor} />}
      </div>

      <div className={`w-24 text-right font-mono text-[clamp(13px,1.2vw,15px)] font-bold shrink-0 ${col}`}>
        {fmt(value, 1)} <span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-normal">{unit}</span>
      </div>
    </div>
  )
}

function MetricCard({ title, icon: Icon, children, color = '#00b4d8' }: { title: string; icon: any; children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-[#0f1a2e] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden flex flex-col shadow-lg">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a121e] border-b border-[rgba(255,255,255,0.05)]">
        <Icon size={14} color={color} />
        <span className="text-[clamp(10px,0.9vw,12px)] font-bold font-mono tracking-widest text-text-primary" style={{ textShadow: `0 0 8px ${color}80` }}>{title}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}

export default function Page02_LiveEngineMonitor() {
  const { telemetry: t0, telemetryHistory: hist, wsConnected } = useStore()
  const t = t0 || {} as any

  return (
    <div className="h-screen flex flex-col bg-[#05080f] text-text-primary overflow-hidden">
      {/* ── HEADER HUD ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-[#0a121e] border-b border-[rgba(0,180,216,0.3)] px-6 py-3 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00b4d8] to-transparent opacity-50" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[clamp(9px,0.8vw,11px)] text-accent font-mono font-bold bg-accent/10 px-1.5 py-0.5 rounded">S02</span>
            <span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono tracking-widest">LIVE TELEMETRY STREAM</span>
          </div>
          <h1 className="text-[clamp(16px,1.5vw,18px)] font-bold font-display tracking-wide text-white">ENGINE MONITORING MATRIX</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mt-3 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-slate-500">CONNECTION</span>
            <span className={`font-bold flex items-center gap-1.5 ${wsConnected ? 'text-healthy' : 'text-critical'}`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-healthy animate-pulse' : 'bg-critical'}`} />
              {wsConnected ? 'LIVE 1Hz' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">TIMESTAMP</span>
            <span className="text-text-primary">{fmtTS(t.timestamp)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">STATE</span>
            <span className="text-accent font-bold">{t.engine_state ?? '—'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">PHASE</span>
            <span className="text-accent font-bold">{t.mission_phase ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          <MetricCard title="ENGINE CORE" icon={Activity} color="#22c55e">
            <StatRow label="Engine RPM" value={t.rpm} unit="RPM" param="rpm" spark={hist} note="[SIMULATED]" highlight />
            <StatRow label="Engine Load" value={t.engine_load_pct} unit="%" param="engine_load_pct" spark={hist} note="[SIMULATED]" />
            <StatRow label="Torque" value={t.torque_nm} unit="N·m" param="torque_nm" spark={hist} />
            <StatRow label="Throttle Pos." value={t.throttle_pct} unit="%" param="throttle_pct" spark={hist} />
            <StatRow label="Manifold Pres." value={t.manifold_pressure_kpa} unit="kPa" param="manifold_pressure_kpa" spark={hist} />
            <StatRow label="Inj. Timing" value={t.injection_timing_deg} unit="°BTDC" param="injection_timing_deg" spark={hist} />
          </MetricCard>

          <MetricCard title="THERMAL SYSTEM" icon={Thermometer} color="#ef4444">
            <StatRow label="Cyl. Head Temp (CHT)" value={t.cht_c} unit="°C" param="cht_c" spark={hist} note="[SIM — Warn>220°C]" highlight />
            <StatRow label="Exhaust Gas (EGT)" value={t.egt_c} unit="°C" param="egt_c" spark={hist} note="[SIM — Warn>750°C]" />
            <StatRow label="Intake Temp" value={t.intake_temperature_c} unit="°C" param="intake_temperature_c" spark={hist} />
            <StatRow label="Ambient Temp" value={t.ambient_temperature_c} unit="°C" param="ambient_temperature_c" spark={hist} />
          </MetricCard>

          <MetricCard title="LUBRICATION" icon={Droplet} color="#f59e0b">
            <StatRow label="Oil Pressure" value={t.oil_pressure_kpa} unit="kPa" param="oil_pressure_kpa" spark={hist} note="[SIM — Min 200kPa]" highlight />
            <StatRow label="Oil Temperature" value={t.oil_temperature_c} unit="°C" param="oil_temperature_c" spark={hist} note="[SIM — Max 110°C]" />
            <StatRow label="Oil Flow" value={t.oil_flow_lpm} unit="L/min" param="oil_flow_lpm" spark={hist} />
          </MetricCard>

          <MetricCard title="FUEL SYSTEM" icon={Droplet} color="#00b4d8">
            <StatRow label="Fuel Flow" value={t.fuel_flow_lph} unit="L/h" param="fuel_flow_lph" spark={hist} note="[SIMULATED]" highlight />
            <StatRow label="Fuel Pressure" value={t.fuel_pressure_kpa} unit="kPa" param="fuel_pressure_kpa" spark={hist} />
            <StatRow label="Fuel Quantity" value={t.fuel_quantity_l} unit="L" param="fuel_quantity_l" spark={hist} />
          </MetricCard>

          <MetricCard title="ELECTRICAL" icon={Battery} color="#8b5cf6">
            <StatRow label="Alternator Volt." value={t.alternator_voltage_v} unit="V" param="alternator_voltage_v" spark={hist} note="[SIM — Norm 13.5–15V]" highlight />
            <StatRow label="Battery Voltage" value={t.battery_voltage_v} unit="V" param="battery_voltage_v" spark={hist} />
            <StatRow label="Current Draw" value={t.current_a} unit="A" param="current_a" spark={hist} />
            <StatRow label="Elec. Load" value={t.electrical_load_pct} unit="%" param="electrical_load_pct" spark={hist} />
          </MetricCard>

          <MetricCard title="VIBRATION & ENV" icon={Zap} color="#ec4899">
            <StatRow label="Vibration RMS" value={t.vibration_rms_g} unit="g" param="vibration_rms_g" spark={hist} note="[SIM — Max 0.5g norm]" highlight />
            <StatRow label="Dom. Frequency" value={t.vibration_dominant_freq_hz} unit="Hz" param="vibration_dominant_freq_hz" spark={hist} />
            <StatRow label="Altitude" value={t.altitude_m} unit="m" param="altitude_m" spark={hist} />
            <StatRow label="Air Density" value={t.air_density_kgm3} unit="kg/m³" param="air_density_kgm3" spark={hist} />
          </MetricCard>

        </div>
        
        <div className="mt-8 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded p-4">
          <p className="text-[clamp(10px,0.9vw,12px)] text-text-muted font-mono tracking-widest">ALL PARAMETERS SIMULATED / CONFIGURABLE</p>
          <p className="text-[clamp(9px,0.8vw,11px)] text-slate-600 font-mono mt-1">DEMONSTRATION SYSTEM — NOT FOR OPERATIONAL USE</p>
        </div>
      </div>
    </div>
  )
}
