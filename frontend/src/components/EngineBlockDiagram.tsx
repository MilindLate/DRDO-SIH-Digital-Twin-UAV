import React from 'react'
import { useStore } from '../store'

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function healthToColor(h: number) {
  if (h >= 85) return '#22c55e'
  if (h >= 70) return '#86efac'
  if (h >= 50) return '#f59e0b'
  if (h >= 30) return '#f97316'
  return '#ef4444'
}

export default function EngineBlockDiagram({ className = '' }: { className?: string }) {
  const { telemetry: t, health: h } = useStore()
  
  const rpm = t?.rpm ?? 0
  const engineState = t?.engine_state ?? 'OFF'
  const running = engineState !== 'OFF' && engineState !== 'SHUTDOWN' && rpm > 500
  
  const overallH = h?.overall_health ?? 85
  const thermalH = h?.thermal_health ?? 85
  const lubH = h?.lubrication_health ?? 85
  const mechH = h?.mechanical_health ?? 85
  const fuelH = h?.fuel_system_health ?? 85
  const elecH = h?.electrical_health ?? 85
  const sensorH = h?.sensor_health ?? 85

  const flowSpeed = running ? Math.max(0.2, 1.5 - (rpm / 5800)) : 0
  
  const renderFlow = (path: string, color: string = "#00b4d8", pulse: boolean = false) => (
    <g>
      {/* Base track */}
      <path d={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      {/* Static line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Animated flow */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeDasharray={pulse ? "15, 30" : "6,4"} 
        className={running ? "anim-flow" : ""} 
        style={running ? { animationDuration: `${pulse ? flowSpeed * 1.5 : flowSpeed}s`, filter: `drop-shadow(0 0 4px ${color})` } : {}}
      />
    </g>
  )

  const renderBlock = (x: number, y: number, w: number, h: number, title: string, subtitle: string, health: number, metrics: {label: string, val: string}[]) => {
    const c = healthToColor(health)
    return (
      <g transform={`translate(${x},${y})`}>
        {/* Background panel */}
        <rect x="0" y="0" width={w} height={h} fill="#0a121e" stroke="rgba(0,180,216,0.15)" strokeWidth="1" />
        
        {/* Tech Corner Brackets */}
        <path d="M 0 8 L 0 0 L 8 0" fill="none" stroke={c} strokeWidth="2" />
        <path d={`M ${w-8} 0 L ${w} 0 L ${w} 8`} fill="none" stroke={c} strokeWidth="2" />
        <path d={`M 0 ${h-8} L 0 ${h} L 8 ${h}`} fill="none" stroke={c} strokeWidth="2" />
        <path d={`M ${w-8} ${h} L ${w} ${h} L ${w} ${h-8}`} fill="none" stroke={c} strokeWidth="2" />
        
        {/* Health Glow */}
        <rect x="2" y="2" width={w-4} height={h-4} fill={c} opacity={health < 50 ? (running ? 0.3 : 0.2) : 0.05} className={health < 50 ? 'anim-pulse' : ''} />
        
        {/* Header */}
        <rect x="0" y="0" width={w} height="20" fill={c} opacity="0.15" />
        <text x="8" y="14" className="font-mono text-[clamp(10px,0.9vw,12px)] font-bold" fill={c} letterSpacing="1">{title}</text>
        <text x={w-8} y="14" className="font-mono text-[clamp(8px,0.7vw,10px)]" fill="rgba(255,255,255,0.4)" textAnchor="end">{subtitle}</text>

        {/* Metrics */}
        {metrics.map((m, i) => (
          <g key={i} transform={`translate(8, ${32 + i * 14})`}>
            <text x="0" y="0" className="font-mono text-[clamp(9px,0.8vw,11px)]" fill="#94a3b8">{m.label}</text>
            <text x={w-16} y="0" className="font-mono text-[clamp(9px,0.8vw,11px)] font-bold" fill="#e2e8f0" textAnchor="end">{m.val}</text>
          </g>
        ))}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 1000 600" className={`w-full h-full ${className}`} style={{ background: '#05080f' }}>
      <defs>
        <pattern id="hex-grid" width="30" height="51.96" patternUnits="userSpaceOnUse">
          <path d="M 15 0 L 30 8.66 L 30 25.98 L 15 34.64 L 0 25.98 L 0 8.66 Z" fill="none" stroke="rgba(0,180,216,0.03)" strokeWidth="1"/>
          <path d="M 15 51.96 L 30 43.3 L 30 25.98 L 15 34.64 L 0 25.98 L 0 43.3 Z" fill="none" stroke="rgba(0,180,216,0.03)" strokeWidth="1"/>
        </pattern>
        <filter id="glow-cyan"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <style>{`
          .anim-flow { animation: dash linear infinite; }
          .anim-pulse { animation: pulse 2s infinite; }
          @keyframes dash { to { stroke-dashoffset: -40; } }
          @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
        `}</style>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-grid)" />

      {/* Grid crosshairs */}
      <path d="M 500 0 L 500 600 M 0 300 L 1000 300" stroke="rgba(0,180,216,0.08)" strokeWidth="1" strokeDasharray="10,10" />

      {/* ── FLOW LINES (Drawn before blocks so they go underneath) ── */}
      
      {/* Air Path */}
      {renderFlow("M 150 90 L 250 90", "#94a3b8")} {/* Filter to Turbo */}
      {renderFlow("M 350 90 L 450 90", "#94a3b8")} {/* Turbo to Intercooler */}
      {renderFlow("M 550 90 L 650 90", "#94a3b8")} {/* Intercooler to Throttle */}
      {renderFlow("M 750 90 L 800 90 L 800 240 L 710 240", "#94a3b8")} {/* Throttle to Intake Manifold */}
      
      {/* Fuel Path */}
      {renderFlow("M 150 200 L 250 200", healthToColor(fuelH))} {/* Tank to LP Pump */}
      {renderFlow("M 350 200 L 450 200", healthToColor(fuelH))} {/* LP to HP Pump */}
      {renderFlow("M 550 200 L 610 200 L 610 280", healthToColor(fuelH))} {/* HP to Cylinders */}

      {/* Exhaust Path */}
      {renderFlow("M 710 320 L 760 320 L 760 380", "#ef4444")} {/* Cylinders to Exhaust Manifold */}
      {renderFlow("M 760 450 L 760 510 L 850 510", "#ef4444")} {/* Turbine out */}
      
      {/* Turbo shaft link */}
      <path d="M 300 130 L 300 415 L 710 415" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4,4" />
      <text x="500" y="410" className="font-mono text-[clamp(8px,0.7vw,10px)] fill-slate-500">TURBO SHAFT LINKAGE</text>

      {/* Oil Path */}
      {renderFlow("M 360 510 L 250 510 L 250 450", healthToColor(lubH))} {/* Sump to Pump */}
      {renderFlow("M 150 420 L 90 420 L 90 280 L 450 280", healthToColor(lubH))} {/* Pump to Filter to Engine Block */}
      {renderFlow("M 610 420 L 610 470 L 560 470", healthToColor(lubH))} {/* Engine to Cooler */}
      {renderFlow("M 460 510 L 410 510", healthToColor(lubH))} {/* Cooler to Sump */}

      {/* ECU Data Links (Thin, fast pulses) */}
      <g opacity="0.6">
        {renderFlow("M 250 320 L 450 320", "#00b4d8", true)} {/* ECU to Cylinders */}
        {renderFlow("M 150 300 L 110 300 L 110 90 L 150 90", "#00b4d8", true)} {/* ECU to Air Filter (MAF) */}
        {renderFlow("M 150 340 L 110 340 L 110 420 L 150 420", "#00b4d8", true)} {/* ECU to Oil Pump */}
        {renderFlow("M 200 270 L 200 200 L 250 200", "#00b4d8", true)} {/* ECU to Fuel Pump */}
        {renderFlow("M 250 360 L 710 360 L 710 380", "#00b4d8", true)} {/* ECU to Exhaust (O2) */}
      </g>

      {/* ── BLOCKS ── */}
      
      {/* AIR PATH */}
      {renderBlock(50, 60, 100, 60, "AIR FILTER", "IN", mechH, [
        { label: "AMB TEMP", val: `${Math.round(t?.ambient_temperature_c ?? 15)}°C` },
        { label: "D-PRESS", val: `${(0.5 + Math.random()*0.1).toFixed(2)} kPa` }
      ])}
      {renderBlock(250, 60, 100, 70, "COMPRESSOR", "TRB", mechH, [
        { label: "BOOST", val: `${(t?.engine_load_pct ?? 0 > 30 ? 1.2 : 0).toFixed(1)} bar` },
        { label: "RPM", val: `${running ? Math.round(rpm * 15.5) : 0}` }
      ])}
      {renderBlock(450, 60, 100, 60, "INTERCOOLER", "HX", thermalH, [
        { label: "IN TEMP", val: `${running ? 120 : Math.round(t?.ambient_temperature_c ?? 15)}°C` },
        { label: "OUT TEMP", val: `${running ? 45 : Math.round(t?.ambient_temperature_c ?? 15)}°C` }
      ])}
      {renderBlock(650, 60, 100, 60, "THROTTLE", "ACT", mechH, [
        { label: "POSITION", val: `${Math.round(t?.throttle_pct ?? 0)}%` },
        { label: "FLOW", val: `${running ? 450 : 0} kg/h` }
      ])}

      {/* FUEL PATH */}
      {renderBlock(50, 170, 100, 60, "FUEL TANK", "RES", fuelH, [
        { label: "LEVEL", val: "78%" },
        { label: "TEMP", val: "18°C" }
      ])}
      {renderBlock(250, 170, 100, 60, "LP PUMP", "FPM", fuelH, [
        { label: "PRESSURE", val: `${running ? 4.5 : 0} bar` },
        { label: "CURRENT", val: `${running ? 2.1 : 0} A` }
      ])}
      {renderBlock(450, 170, 100, 60, "HP PUMP", "FPM", fuelH, [
        { label: "RAIL PRS", val: `${running ? 1400 : 0} bar` },
        { label: "FLOW", val: `${Math.round(t?.fuel_flow_lph ?? 0)} L/h` }
      ])}

      {/* CENTRAL CORE: ENGINE BLOCK */}
      <g transform="translate(450, 240)">
        {/* Core background */}
        <rect width="260" height="180" rx="8" fill="#060f1c" stroke={healthToColor(overallH)} strokeWidth="2" />
        {/* Core grid */}
        <path d="M 0 45 L 260 45 M 0 90 L 260 90 M 0 135 L 260 135 M 130 0 L 130 180" stroke="rgba(0,180,216,0.05)" strokeWidth="1" />
        
        {/* Title */}
        <rect width="260" height="30" rx="8" fill={healthToColor(overallH)} opacity="0.1" />
        <text x="130" y="20" className="font-mono text-[clamp(14px,1.3vw,16px)] font-bold" fill={healthToColor(overallH)} textAnchor="middle" letterSpacing="2">FLAT-4 PISTON CORE</text>
        
        {/* Core Metrics Grid */}
        <g transform="translate(20, 50)">
          <text x="0" y="0" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">ENGINE RPM</text>
          <text x="0" y="16" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#22c55e" filter="url(#glow-cyan)">{Math.round(rpm)}</text>
          
          <text x="120" y="0" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">ENGINE LOAD</text>
          <text x="120" y="16" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#00b4d8">{Math.round(t?.engine_load_pct ?? 0)}%</text>
          
          <text x="0" y="50" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">CYL HEAD TEMP</text>
          <text x="0" y="66" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#ef4444">{Math.round(t?.cht_c ?? 80)}°C</text>
          
          <text x="120" y="50" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">EXH GAS TEMP</text>
          <text x="120" y="66" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#f59e0b">{Math.round(t?.egt_c ?? 80)}°C</text>
          
          <text x="0" y="100" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">TORQUE</text>
          <text x="0" y="116" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#e2e8f0">{Math.round(t?.torque_nm ?? 0)} Nm</text>

          <text x="120" y="100" className="font-mono text-[clamp(10px,0.9vw,12px)]" fill="#94a3b8">VIBRATION</text>
          <text x="120" y="116" className="font-mono text-[clamp(16px,1.5vw,18px)] font-bold" fill="#e2e8f0">{t?.vibration_rms_g?.toFixed(2) ?? "0.00"} g</text>
        </g>
      </g>

      {/* EXHAUST & TURBINE */}
      {renderBlock(710, 380, 100, 70, "TURBINE", "TRB", thermalH, [
        { label: "IN TEMP", val: `${Math.round(t?.egt_c ?? 80)}°C` },
        { label: "OUT TEMP", val: `${running ? Math.round((t?.egt_c ?? 80) * 0.7) : 80}°C` }
      ])}
      {renderBlock(850, 480, 100, 60, "TAILPIPE", "EXH", thermalH, [
        { label: "O2 SENS", val: `${running ? 0.98 : 0.0} λ` },
        { label: "BACKPRS", val: `${running ? 110 : 0} kPa` }
      ])}

      {/* OIL PATH */}
      {renderBlock(150, 390, 100, 60, "OIL PUMP", "PMP", lubH, [
        { label: "PRESSURE", val: `${Math.round(t?.oil_pressure_kpa ?? 0)} kPa` },
        { label: "FLOW", val: `${running ? 35 : 0} L/m` }
      ])}
      {renderBlock(460, 470, 100, 60, "OIL COOLER", "HX", lubH, [
        { label: "IN TEMP", val: `${Math.round(t?.oil_temperature_c ?? 70)}°C` },
        { label: "OUT TEMP", val: `${Math.max(70, Math.round((t?.oil_temperature_c ?? 70) - 15))}°C` }
      ])}
      {renderBlock(360, 480, 100, 60, "OIL SUMP", "RES", lubH, [
        { label: "LEVEL", val: "92%" },
        { label: "TEMP", val: `${Math.round(t?.oil_temperature_c ?? 70)}°C` }
      ])}

      {/* ECU */}
      <g transform="translate(150, 270)">
        <rect width="100" height="100" rx="4" fill="#0f1a2e" stroke="#00b4d8" strokeWidth="2" />
        <rect width="100" height="100" fill="url(#hex-grid)" opacity="0.3" />
        <path d="M 0 20 L 100 20 M 0 40 L 100 40 M 0 60 L 100 60 M 0 80 L 100 80" stroke="#00b4d8" strokeWidth="0.5" opacity="0.3" />
        <text x="50" y="15" textAnchor="middle" className="font-mono text-[clamp(12px,1.1vw,14px)] font-bold fill-[#00b4d8] filter drop-shadow-[0_0_2px_#00b4d8]">ENGINE CU</text>
        <text x="50" y="45" textAnchor="middle" className="font-mono text-[clamp(9px,0.8vw,11px)] fill-[#94a3b8]">MODE: {engineState}</text>
        <text x="50" y="65" textAnchor="middle" className="font-mono text-[clamp(9px,0.8vw,11px)] fill-[#94a3b8]">PHASE: {t?.mission_phase ?? 'GROUND'}</text>
        <text x="50" y="85" textAnchor="middle" className="font-mono text-[clamp(9px,0.8vw,11px)] fill-[#22c55e]">SYNC: ACTIVE</text>
        
        {/* Blinking datalink lights */}
        <circle cx="10" cy="90" r="3" fill="#22c55e" className="anim-pulse" style={{ animationDuration: '0.2s' }} />
        <circle cx="20" cy="90" r="3" fill="#00b4d8" className="anim-pulse" style={{ animationDuration: '0.4s' }} />
      </g>

    </svg>
  )
}
