import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import { Activity, Thermometer, Droplets, Zap, GitCommit, Layers } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'

type ViewMode = 'flat4' | 'cylinder' | 'pid' | 'mission'

export default function Page03_DigitalTwin() {
  const telemetry = useStore((s) => s.telemetry)
  const health = useStore((s) => s.health)
  const [viewMode, setViewMode] = useState<ViewMode>('flat4')
  const [crankAngle, setCrankAngle] = useState(0)

  // Derive kinematics
  const rpm = telemetry?.rpm || 2400
  const rps = rpm / 60
  
  // Animation loop for crank angle
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      const degreesPerSecond = rps * 360;
      setCrankAngle(prev => (prev + degreesPerSecond * dt) % 720);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [rps]);

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden text-text-primary p-4 bg-bg">
      <header className="flex justify-between items-center bg-surface border border-border p-3 rounded shrink-0">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-accent" />
          <h1 className="text-[clamp(14px,1.2vw,16px)] font-bold text-text-primary">2D Animated Cross-Section</h1>
          <span className="text-[clamp(10px,0.9vw,12px)] px-2 py-0.5 bg-accent/20 text-accent rounded font-mono ml-4">
            TAPAS-BH-201 GCS
          </span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[clamp(10px,0.8vw,12px)]">
           <div className="flex items-center space-x-1">
             <span className="text-text-muted">HEALTH:</span>
             <span className="text-healthy">{(health?.overall_health ?? 100).toFixed(1)}%</span>
           </div>
           <div className="flex items-center space-x-1">
             <span className="text-text-muted">RUL:</span>
             <span className="text-accent">1978h</span>
           </div>
        </div>
      </header>

      <div className="flex space-x-2 bg-surface p-2 border border-border rounded shrink-0 overflow-x-auto hide-scrollbar">
        {[
          { id: 'flat4', label: 'Flat-4 Cross-Section' },
          { id: 'cylinder', label: 'Cylinder Cutaway & P-V Loop' },
          { id: 'pid', label: 'Subsystem P&ID Flow' },
          { id: 'mission', label: 'Mission Control Scenario' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id as ViewMode)}
            className={`px-4 py-2 text-[clamp(10px,0.9vw,12px)] font-mono whitespace-nowrap border ${
              viewMode === m.id 
                ? 'bg-surface-alt border-accent text-accent' 
                : 'bg-transparent border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {m.label}
          </button>
        ))}
        
        <div className="flex-1" />
        
        <div className="flex items-center space-x-2 font-mono text-[clamp(9px,0.8vw,11px)]">
          <span className="text-text-muted">KINEMATICS:</span>
          <button className="px-2 py-1 bg-surface-alt text-text-primary border border-border">1x Live</button>
          <button className="px-2 py-1 bg-accent/20 text-accent border border-accent">0.25x</button>
          <button className="px-2 py-1 bg-surface-alt text-text-muted border border-border">0.05x Inspect</button>
          <button className="px-2 py-1 bg-surface-alt text-text-muted border border-border">Pause</button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 space-x-4">
        {/* Main View Area */}
        <div className="flex-1 bg-surface border border-border rounded flex flex-col relative overflow-hidden">
          {/* Header Info */}
          <div className="absolute top-4 left-4 z-10 font-mono text-[clamp(10px,0.9vw,12px)] text-text-muted flex space-x-4 bg-bg/80 p-2 border border-border rounded">
            <div>CRANK ANGLE: <span className="text-accent">{Math.floor(crankAngle)}°</span> / 720°</div>
            <div>| FIRING ORDER: <span className="text-text-primary">1 - 3 - 2 - 4</span></div>
            <div>| IGNITION ADVANCE: <span className="text-warning">18.0° BTDC</span></div>
          </div>

          <div className="flex-1 relative overflow-hidden w-full h-full custom-grid-bg">
            {viewMode === 'flat4' && <Flat4View crankAngle={crankAngle} rpm={rpm} cht={telemetry?.cht_c ?? 160} egt={telemetry?.egt_c ?? 700} />}
            {viewMode === 'cylinder' && <CylinderView crankAngle={crankAngle} rpm={rpm} />}
            {viewMode === 'pid' && <PIDView telemetry={telemetry} />}
            {viewMode === 'mission' && <MissionScenarioView telemetry={telemetry} />}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[30%] shrink-0 flex flex-col space-y-4">
          <div className="bg-surface border border-border rounded p-4 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[clamp(10px,0.9vw,12px)] font-mono text-text-muted mb-4 uppercase flex justify-between">
              <span>Cylinder Cycle Matrix</span>
              <span>1-3-2-4</span>
            </h3>
            
            <div className="space-y-4">
              <CylStatus id="01" stroke={getStroke(crankAngle, 0)} ca={(crankAngle + 0) % 720} egt={telemetry?.egt_c ?? 732} cht={telemetry?.cht_c ?? 163} />
              <CylStatus id="02" stroke={getStroke(crankAngle, 180)} ca={(crankAngle + 180) % 720} egt={(telemetry?.egt_c ?? 730) + 7} cht={(telemetry?.cht_c ?? 160) + 7} />
              <CylStatus id="03" stroke={getStroke(crankAngle, 540)} ca={(crankAngle + 540) % 720} egt={telemetry?.egt_c ?? 732} cht={telemetry?.cht_c ?? 163} />
              <CylStatus id="04" stroke={getStroke(crankAngle, 360)} ca={(crankAngle + 360) % 720} egt={(telemetry?.egt_c ?? 730) + 9} cht={(telemetry?.cht_c ?? 160) + 7} />
            </div>
          </div>

          <div className="bg-surface border border-border rounded p-4 shrink-0">
            <h3 className="text-[clamp(10px,0.9vw,12px)] font-mono text-text-muted mb-4 uppercase">Kinematic & Fluid State</h3>
            <div className="space-y-3 font-mono text-[clamp(10px,0.9vw,12px)]">
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-text-muted">MEAN PISTON SPEED</span>
                <span>{((rpm * 2 * 0.08) / 60).toFixed(2)} m/s</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-text-muted">FIRING FREQUENCY</span>
                <span>{(rpm / 60 * 2).toFixed(1)} Hz</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-text-muted">INJECTOR PULSE WIDTH</span>
                <span>4.81 ms</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-text-muted">PEAK CYL PRESSURE</span>
                <span>54.1 bar</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-text-muted">OIL GALLERY FLOW</span>
                <span>{telemetry?.fuel_flow_lph?.toFixed(1) ?? '11.9'} L/min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-grid-bg {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(30, 58, 95, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 58, 95, 0.2) 1px, transparent 1px);
        }
        .stroke-intake { stroke: #00b4d8; }
        .stroke-compression { stroke: #f59e0b; }
        .stroke-power { stroke: #ef4444; }
        .stroke-exhaust { stroke: #94a3b8; }
        .bg-intake { background-color: #00b4d8; }
        .bg-compression { background-color: #f59e0b; }
        .bg-power { background-color: #ef4444; }
        .bg-exhaust { background-color: #94a3b8; }
        .text-intake { color: #00b4d8; }
        .text-compression { color: #f59e0b; }
        .text-power { color: #ef4444; }
        .text-exhaust { color: #94a3b8; }
      `}</style>
    </div>
  )
}

function getStroke(globalAngle: number, offset: number) {
  const angle = (globalAngle + offset) % 720;
  if (angle < 180) return 'POWER';
  if (angle < 360) return 'EXHAUST';
  if (angle < 540) return 'INTAKE';
  return 'COMPRESSION';
}

function CylStatus({ id, stroke, ca, egt, cht }: any) {
  const cls = stroke.toLowerCase()
  return (
    <div className="border border-border/50 rounded p-2">
      <div className="flex justify-between font-mono text-[clamp(10px,0.8vw,11px)] mb-2">
        <span className="font-bold">CYL {id}</span>
        <span className={'font-bold text-' + cls}>{stroke}</span>
      </div>
      <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-2">
        <div className={`h-full bg-${cls}`} style={{ width: '100%' }} />
      </div>
      <div className="flex justify-between font-mono text-[clamp(9px,0.7vw,10px)] text-text-muted">
        <span>EGT: {Math.round(egt)}°</span>
        <span>CHT: {Math.round(cht)}°</span>
        <span>CA: {Math.round(ca)}°</span>
      </div>
    </div>
  )
}

function Flat4View({ crankAngle, rpm, cht, egt }: any) {
  // Simple parametric animation mapping
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const crankRadius = 30;
  const conRodLen = 100;
  
  const getPistonX = (angle: number) => {
    const a = angle % 360;
    const cx = Math.cos(rad(a)) * crankRadius;
    const sinA = Math.sin(rad(a)) * crankRadius / conRodLen;
    const px = cx + Math.sqrt(1 - sinA * sinA) * conRodLen;
    return px; // Dist from center
  }

  // Cylinders mapping (1, 3 left) (2, 4 right)
  const px1 = -getPistonX(crankAngle + 0) - 20;
  const px3 = -getPistonX(crankAngle + 540) - 20;
  const px2 = getPistonX(crankAngle + 180) + 20;
  const px4 = getPistonX(crankAngle + 360) + 20;

  const propRot = crankAngle * 2; // Prop spins faster visually

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width="600" height="500" viewBox="-300 -250 600 500" className="drop-shadow-lg">
        {/* Gearbox & Block */}
        <rect x="-60" y="-150" width="120" height="300" rx="8" fill="#141414" stroke="#2a2a2a" strokeWidth="2" />
        <rect x="-40" y="-200" width="80" height="50" rx="4" fill="#141414" stroke="#2a2a2a" strokeWidth="2" />
        <text x="0" y="-175" textAnchor="middle" fill="#00b4d8" fontSize="12" fontFamily="monospace">PRSU GEARBOX</text>
        <text x="0" y="-160" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontFamily="monospace">{Math.round(rpm)} RPM</text>

        {/* Propeller Blur */}
        <ellipse cx="0" cy="-220" rx="150" ry="10" fill="#00b4d8" opacity="0.1" />
        <line x1="-120" y1="-220" x2="120" y2="-220" stroke="#00b4d8" strokeWidth="4" opacity="0.6" transform={`rotate(${propRot} 0 -220)`} />
        
        {/* Drive shaft */}
        <line x1="0" y1="-200" x2="0" y2="150" stroke="#f59e0b" strokeWidth="4" strokeDasharray="8 4" opacity="0.8" />
        
        {/* Cylinders Outer (Left) */}
        <rect x="-250" y="-100" width="150" height="60" fill="none" stroke="#2a2a2a" strokeWidth="2" />
        <rect x="-250" y="20" width="150" height="60" fill="none" stroke="#2a2a2a" strokeWidth="2" />
        
        {/* Cylinders Outer (Right) */}
        <rect x="100" y="-60" width="150" height="60" fill="none" stroke="#2a2a2a" strokeWidth="2" />
        <rect x="100" y="60" width="150" height="60" fill="none" stroke="#2a2a2a" strokeWidth="2" />

        {/* Cylinder Internal Glows based on stroke */}
        <rect x="-250" y="-98" width="148" height="56" fill={getGlow(crankAngle, 0)} opacity="0.4" />
        <rect x="102" y="-58" width="148" height="56" fill={getGlow(crankAngle, 180)} opacity="0.4" />
        <rect x="-250" y="22" width="148" height="56" fill={getGlow(crankAngle, 540)} opacity="0.4" />
        <rect x="102" y="62" width="148" height="56" fill={getGlow(crankAngle, 360)} opacity="0.4" />

        {/* Pistons & Rods */}
        <g>
          {/* Cyl 1 (Top Left) */}
          <line x1="0" y1="-70" x2={px1+20} y2="-70" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="0" cy="-70" r="5" fill="#f59e0b" />
          <rect x={px1-10} y="-95" width="20" height="50" fill="#94a3b8" />
          
          {/* Cyl 2 (Top Right) */}
          <line x1="0" y1="-30" x2={px2-20} y2="-30" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="0" cy="-30" r="5" fill="#f59e0b" />
          <rect x={px2-10} y="-55" width="20" height="50" fill="#94a3b8" />

          {/* Cyl 3 (Bot Left) */}
          <line x1="0" y1="50" x2={px3+20} y2="50" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="0" cy="50" r="5" fill="#f59e0b" />
          <rect x={px3-10} y="25" width="20" height="50" fill="#94a3b8" />

          {/* Cyl 4 (Bot Right) */}
          <line x1="0" y1="90" x2={px4-20} y2="90" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="0" cy="90" r="5" fill="#f59e0b" />
          <rect x={px4-10} y="65" width="20" height="50" fill="#94a3b8" />
        </g>
        
        {/* Labels */}
        <text x="-260" y="-120" fill="#94a3b8" fontSize="10" fontFamily="monospace">CYL 01 - {getStroke(crankAngle, 0)}</text>
        <text x="260" y="-80" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">CYL 02 - {getStroke(crankAngle, 180)}</text>
        <text x="-260" y="0" fill="#94a3b8" fontSize="10" fontFamily="monospace">CYL 03 - {getStroke(crankAngle, 540)}</text>
        <text x="260" y="40" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">CYL 04 - {getStroke(crankAngle, 360)}</text>

        {/* Oil Pump */}
        <rect x="-50" y="150" width="100" height="40" rx="4" fill="#141414" stroke="#f59e0b" strokeWidth="2" />
        <text x="0" y="165" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace">DRY SUMP OIL PUMP</text>
        <text x="0" y="180" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">4.18 bar - 95.0°C</text>
      </svg>
    </div>
  )
}

function getGlow(angle: number, offset: number) {
  const stroke = getStroke(angle, offset)
  if (stroke === 'INTAKE') return '#00b4d8'
  if (stroke === 'COMPRESSION') return '#f59e0b'
  if (stroke === 'POWER') return '#ef4444'
  return '#94a3b8'
}

function CylinderView({ crankAngle, rpm }: any) {
  // Detailed cylinder view mapping
  const px = getGlow(crankAngle, 0);
  const strokeName = getStroke(crankAngle, 0);
  const isIntake = strokeName === 'INTAKE';
  const isExhaust = strokeName === 'EXHAUST';
  const isPower = strokeName === 'POWER';
  
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const crankRadius = 40;
  const conRodLen = 120;
  const a = crankAngle % 360;
  const cx = Math.cos(rad(a+90)) * crankRadius;
  const cy = Math.sin(rad(a+90)) * crankRadius;
  const sinA = cx / conRodLen;
  const py = cy - Math.sqrt(1 - sinA * sinA) * conRodLen;

  return (
    <div className="absolute inset-0 flex p-6">
      {/* Visual Cylinder */}
      <div className="flex-1 relative flex items-center justify-center">
         <svg width="400" height="500" viewBox="-200 -250 400 500">
            <text x="0" y="-220" textAnchor="middle" fill="#94a3b8" fontSize="14" fontFamily="monospace" fontWeight="bold">
              CYL 01 (FRONT-LEFT) - {strokeName} STROKE
            </text>

            {/* Cylinder walls */}
            <rect x="-70" y="-100" width="140" height="200" fill="#141414" stroke="#2a2a2a" strokeWidth="4" />
            <path d="M -90 -80 L -70 -80 M -90 -60 L -70 -60 M -90 -40 L -70 -40 M -90 -20 L -70 -20" stroke="#00b4d8" strokeWidth="4" />
            <path d="M 90 -80 L 70 -80 M 90 -60 L 70 -60 M 90 -40 L 70 -40 M 90 -20 L 70 -20" stroke="#ef4444" strokeWidth="4" />

            {/* Valves */}
            {/* Intake */}
            <path d="M -60 -150 L -20 -100 L -40 -100 Z" fill={isIntake ? '#00b4d8' : '#2a2a2a'} opacity={isIntake ? 0.8 : 0.3} />
            <line x1="-40" y1="-150" x2="-30" y2={isIntake ? "-90" : "-100"} stroke="#e2e8f0" strokeWidth="4" />
            <ellipse cx="-45" cy="-155" rx="20" ry="5" fill="#94a3b8" transform="rotate(-30 -45 -155)" />

            {/* Exhaust */}
            <path d="M 60 -150 L 20 -100 L 40 -100 Z" fill={isExhaust ? '#ef4444' : '#2a2a2a'} opacity={isExhaust ? 0.8 : 0.3} />
            <line x1="40" y1="-150" x2="30" y2={isExhaust ? "-90" : "-100"} stroke="#e2e8f0" strokeWidth="4" />
            <ellipse cx="45" cy="-155" rx="20" ry="5" fill="#94a3b8" transform="rotate(30 45 -155)" />

            {/* Spark plug */}
            <rect x="-10" y="-120" width="20" height="30" fill="#e2e8f0" />
            {isPower && (crankAngle%720 < 190) && <circle cx="0" cy="-80" r="15" fill="#f59e0b" opacity="0.8" />}
            
            {/* Combustion glow */}
            <rect x="-68" y="-98" width="136" height={100+py} fill={px} opacity={isPower ? 0.6 : 0.2} />

            {/* Piston */}
            <rect x="-68" y={py} width="136" height="60" fill="#94a3b8" rx="4" />
            <line x1="-68" y1={py+15} x2="68" y2={py+15} stroke="#0f1a2e" strokeWidth="2" />
            <line x1="-68" y1={py+25} x2="68" y2={py+25} stroke="#0f1a2e" strokeWidth="2" />
            <circle cx="0" cy={py+35} r="8" fill="#0a0a0a" />

            {/* Con rod */}
            <line x1="0" y1={py+35} x2={cx} y2={cy + 100} stroke="#e2e8f0" strokeWidth="8" />
            
            {/* Crank */}
            <circle cx="0" cy="100" r="50" fill="none" stroke="#2a2a2a" strokeWidth="4" strokeDasharray="10 5" />
            <circle cx="0" cy="100" r="10" fill="#00b4d8" />
            <line x1="0" y1="100" x2={cx} y2={cy + 100} stroke="#f59e0b" strokeWidth="12" />
            <circle cx={cx} cy={cy + 100} r="10" fill="#00b4d8" />
            <circle cx={cx} cy={cy + 100} r="6" fill="#0a0a0a" />
         </svg>
      </div>
      
      {/* PV Loop and Timing */}
      <div className="flex-1 flex flex-col justify-center space-y-6 pr-6">
        <div className="bg-surface-alt border border-border rounded p-4">
           <h4 className="font-mono text-[clamp(10px,0.9vw,12px)] text-text-muted mb-4">THERMODYNAMIC P-V INDICATOR LOOP (CYL 01)</h4>
           {/* Static SVG for PV loop demo */}
           <div className="relative w-full h-48 border-l border-b border-border/50">
             <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 10 90 Q 20 80, 20 20 L 25 15 L 30 30 Q 50 60, 90 80 L 10 85 Z" fill="none" stroke="#00b4d8" strokeWidth="1.5" />
                <path d="M 10 90 Q 50 95, 90 80" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx={10 + ((py + 100)/100)*80} cy="82" r="3" fill="#f59e0b" />
             </svg>
             <div className="absolute bottom-0 left-0 text-[10px] text-text-muted transform translate-y-full mt-1">V_min (TDC)</div>
             <div className="absolute bottom-0 right-0 text-[10px] text-text-muted transform translate-y-full mt-1">V_max (BDC)</div>
           </div>
           <div className="mt-6 font-mono text-[12px] text-accent">
             INST. PRESSURE: <span className="text-warning">3.7 bar</span> · VOLUME: <span className="text-text-primary">209 cc</span>
           </div>
        </div>
        
        <div className="bg-surface-alt border border-border rounded p-4">
          <h4 className="font-mono text-[clamp(10px,0.9vw,12px)] text-text-muted mb-4">720° FOUR-STROKE TIMING & VALVE LIFT PHASE</h4>
          <div className="flex w-full h-8 border border-border mb-4">
            <div className="w-1/4 h-full bg-power/20 border-r border-border flex items-center justify-center text-[10px] text-power font-mono">POWER</div>
            <div className="w-1/4 h-full bg-exhaust/20 border-r border-border flex items-center justify-center text-[10px] text-exhaust font-mono">EXHAUST</div>
            <div className="w-1/4 h-full bg-intake/20 border-r border-border flex items-center justify-center text-[10px] text-intake font-mono">INTAKE</div>
            <div className="w-1/4 h-full bg-compression/20 flex items-center justify-center text-[10px] text-compression font-mono">COMPRESS</div>
          </div>
          <div className="font-mono text-[10px] text-text-muted space-y-1">
            <div className="flex space-x-4">
              <span>INTAKE VALVE LIFT: <span className="text-accent">{isIntake ? '8.4 mm' : '0.0 mm'}</span></span>
              <span>EXHAUST VALVE LIFT: <span className="text-warning">{isExhaust ? '7.9 mm' : '0.0 mm'}</span></span>
            </div>
            <div>SPARK PLUG STATE: <span className="text-text-primary">{isPower && (crankAngle%720 < 190) ? 'FIRING' : 'STANDBY'}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PIDView({ telemetry }: any) {
  return (
    <div className="absolute inset-0 p-8 flex items-center justify-center overflow-auto">
      <svg width="800" height="500" viewBox="0 0 800 500">
        {/* Connection Lines */}
        <path d="M 200 150 L 300 150" stroke="#00b4d8" strokeWidth="3" strokeDasharray="6 6" className="animate-[dash_1s_linear_infinite]" />
        <path d="M 500 150 L 550 150 L 550 250 L 500 250" stroke="#00b4d8" strokeWidth="3" strokeDasharray="6 6" opacity="0.4" />
        
        <path d="M 200 400 L 250 400 L 250 350 L 300 350" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 6" className="animate-[dash_1s_linear_infinite]" />
        
        <path d="M 500 300 L 580 300" stroke="#ef4444" strokeWidth="4" strokeDasharray="8 4" className="animate-[dash_1s_linear_infinite]" />

        {/* Blocks */}
        {/* Fuel */}
        <rect x="50" y="110" width="150" height="80" rx="4" fill="#0a0a0a" stroke="#00b4d8" strokeWidth="2" />
        <text x="125" y="135" textAnchor="middle" fill="#00b4d8" fontSize="12" fontFamily="monospace" fontWeight="bold">FUEL RAIL & PUMP</text>
        <text x="125" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontFamily="monospace">{telemetry?.fuel_flow_lph?.toFixed(1) ?? '42.0'} L/h</text>
        <text x="125" y="175" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">EXP: 42.1 L/h</text>

        {/* FADEC */}
        <rect x="300" y="80" width="200" height="70" rx="4" fill="#00b4d8" opacity="0.1" stroke="#22c55e" strokeWidth="2" />
        <text x="400" y="105" textAnchor="middle" fill="#22c55e" fontSize="12" fontFamily="monospace" fontWeight="bold">FADEC / CAN-BUS TELEMETRY SYNC (10 Hz)</text>
        <text x="400" y="125" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">BUS VOLTAGE: {telemetry?.battery_voltage_v?.toFixed(2) ?? '28.17'}V · HEALTH: 100.0% · RUL: 1978h</text>
        
        <line x1="400" y1="150" x2="400" y2="200" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" />

        {/* Engine Core */}
        <rect x="300" y="200" width="200" height="120" rx="4" fill="#141414" stroke="#94a3b8" strokeWidth="2" />
        <text x="400" y="230" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontFamily="monospace" fontWeight="bold">MALE UAV FLAT-4 CORE</text>
        <text x="400" y="250" textAnchor="middle" fill="#00b4d8" fontSize="11" fontFamily="monospace">RPM: {Math.round(telemetry?.rpm ?? 2455)} · CHT: {telemetry?.cht_c?.toFixed(1) ?? '165.3'}°C · VIB: {telemetry?.vibration_rms_g?.toFixed(1) ?? '13.7'}</text>
        
        {/* Mini Cylinders in block */}
        <rect x="320" y="270" width="30" height="30" fill="#141414" stroke="#2a2a2a" />
        <text x="335" y="282" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">CYL 01</text>
        <text x="335" y="292" textAnchor="middle" fill="#00b4d8" fontSize="8" fontFamily="monospace">NOMINAL</text>

        <rect x="360" y="270" width="30" height="30" fill="#141414" stroke="#2a2a2a" />
        <text x="375" y="282" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">CYL 02</text>
        <text x="375" y="292" textAnchor="middle" fill="#00b4d8" fontSize="8" fontFamily="monospace">NOMINAL</text>

        <rect x="400" y="270" width="30" height="30" fill="#141414" stroke="#2a2a2a" />
        <text x="415" y="282" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">CYL 03</text>
        <text x="415" y="292" textAnchor="middle" fill="#00b4d8" fontSize="8" fontFamily="monospace">NOMINAL</text>

        <rect x="440" y="270" width="30" height="30" fill="#141414" stroke="#2a2a2a" />
        <text x="455" y="282" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">CYL 04</text>
        <text x="455" y="292" textAnchor="middle" fill="#00b4d8" fontSize="8" fontFamily="monospace">NOMINAL</text>

        {/* Lube */}
        <rect x="50" y="360" width="150" height="80" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="2" />
        <text x="125" y="385" textAnchor="middle" fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold">LUBRICATION UNIT</text>
        <text x="125" y="405" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontFamily="monospace">{telemetry?.oil_pressure_kpa ? (telemetry.oil_pressure_kpa/100).toFixed(2) : '4.17'} bar</text>
        <text x="125" y="425" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">OIL TEMP: {telemetry?.oil_temperature_c?.toFixed(1) ?? '94.0'} °C</text>

        {/* Exhaust */}
        <rect x="580" y="260" width="160" height="80" rx="4" fill="#0a0a0a" stroke="#ef4444" strokeWidth="2" />
        <text x="660" y="285" textAnchor="middle" fill="#ef4444" fontSize="12" fontFamily="monospace" fontWeight="bold">EXHAUST & THERMAL</text>
        <text x="660" y="305" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontFamily="monospace">EGT: {telemetry?.egt_c?.toFixed(1) ?? '735.8'} °C</text>
        <text x="660" y="325" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">RESIDUAL: +0.1 °C</text>
        <text x="660" y="340" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">ALT: 18000 ft (-15°C)</text>

      </svg>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </div>
  )
}

function MissionScenarioView({ telemetry }: any) {
  // Generate mock historic data matching the image graphs
  const data = Array.from({length: 40}).map((_, i) => ({
    time: i,
    rpm: 2440 + Math.random() * 20,
    ff: 41.5 + Math.random() * 1,
    egt: 732 + Math.random() * 8,
    cht: 164.5 + Math.random() * 1,
    oilP: 4.15 + Math.random() * 0.1,
    oilT: 94.7 + Math.random() * 0.5,
    vib: 13 + Math.random() * 4
  }));

  return (
    <div className="absolute inset-0 p-4 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
      <div className="bg-surface-alt border border-border rounded p-4 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-healthy/10 border border-healthy/50">
          <Activity className="w-6 h-6 text-healthy" />
        </div>
        <div className="flex-1">
          <h3 className="font-mono text-text-muted text-[12px] uppercase">Mission Control & Environmental Scenario</h3>
          <p className="font-sans text-[13px] text-text-primary mt-1">Nominal medium-altitude reconnaissance loiter at 75% steady throttle and balanced thermal equilibrium.</p>
        </div>
        <div className="bg-surface border border-border px-3 py-1.5 rounded font-mono text-[11px] text-text-primary">
          Standard ISR Cruise (18,000 ft - -15°C) ▾
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'ALTITUDE', val: '18,000 ft', color: 'text-accent' },
          { label: 'AMBIENT TEMP', val: '-15.0 °C', color: 'text-text-primary' },
          { label: 'THROTTLE', val: '75.0 %', color: 'text-warning' },
          { label: 'OIL TEMP', val: '95.0 °C', color: 'text-text-primary' },
          { label: 'BUS VOLTAGE', val: '28.19 V', color: 'text-healthy' },
        ].map((v, i) => (
          <div key={i} className="bg-surface-alt border border-border rounded p-2 flex justify-between items-center px-4">
            <span className="font-mono text-[10px] text-text-muted">{v.label}</span>
            <span className={`font-mono text-[13px] font-bold ${v.color}`}>{v.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card val="2456" unit="rpm" title="RPM" icon={Activity} />
        <Card val="736.3" unit="°C" title="EGT" icon={Thermometer} />
        <Card val="165.0" unit="°C" title="CHT" icon={Thermometer} />
        <Card val="4.21" unit="bar" title="OIL PRESS" icon={Droplets} />
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-[400px]">
        <GraphCard title="RPM & FUEL FLOW" data={data} 
                   lines={[{key:'rpm', color:'#00b4d8'}, {key:'ff', color:'#f59e0b', axis:'right'}]} />
        <GraphCard title="EXHAUST & CYLINDER TEMP" data={data} 
                   lines={[{key:'egt', color:'#a855f7'}, {key:'cht', color:'#ef4444', axis:'right'}]} />
        <GraphCard title="OIL PRESSURE & TEMP" data={data} 
                   lines={[{key:'oilP', color:'#00b4d8'}, {key:'oilT', color:'#ec4899', axis:'right'}]} />
        <GraphCard title="VIBRATION SIGNATURE" data={data} 
                   lines={[{key:'vib', color:'#a855f7'}]} />
      </div>
    </div>
  )
}

function Card({val, unit, title, icon: Icon}: any) {
  return (
    <div className="bg-surface-alt border border-border rounded p-4 flex flex-col justify-between">
      <div className="flex items-center space-x-2 text-text-muted font-mono text-[11px]">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <div className="font-mono mt-2">
        <span className="text-[24px] text-text-primary font-bold">{val}</span>
        <span className="text-[12px] text-text-muted ml-1">{unit}</span>
      </div>
    </div>
  )
}

function GraphCard({title, data, lines}: any) {
  return (
    <div className="bg-surface-alt border border-border rounded p-4 flex flex-col">
      <h3 className="font-mono text-[11px] text-text-muted uppercase mb-4">{title}</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{top:5, right:0, left:-20, bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={10} domain={['dataMin', 'dataMax']} tickCount={5} tickFormatter={(val) => val.toFixed(0)} />
            {lines.some((l:any) => l.axis === 'right') && 
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} domain={['dataMin', 'dataMax']} tickCount={5} tickFormatter={(val) => val.toFixed(1)} />
            }
            {lines.map((l:any) => (
              <Line key={l.key} yAxisId={l.axis || 'left'} type="monotone" dataKey={l.key} stroke={l.color} dot={false} strokeWidth={2} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
