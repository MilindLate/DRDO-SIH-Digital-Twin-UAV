/**
 * Animated 2D MALE UAV Digital Twin
 * Top-down view, SVG-based, health-driven colors, live propeller animation
 * DEMONSTRATION — SIMULATED
 */
import React, { useMemo } from 'react'
import { useStore } from '../store'
import { healthBgColor } from '../utils/formatters'

interface Props {
  width?: number | string
  height?: number | string
  showLabels?: boolean
  showFlow?: boolean
  compact?: boolean
  className?: string
  variant?: string
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function healthToColor(h: number) {

  if (h >= 85) return '#22c55e'
  if (h >= 70) return '#86efac'
  if (h >= 50) return '#f59e0b'
  if (h >= 30) return '#f97316'
  return '#ef4444'
}

function chtToColor(cht: number) {
  // 80°C=blue → 150°C=green → 200°C=orange → 240°C=red
  const t = Math.max(0, Math.min(1, (cht - 80) / 160))
  if (t < 0.33) return `rgba(0,180,216,${0.4 + t})`
  if (t < 0.66) return `rgba(34,197,94,${0.5 + t * 0.4})`
  if (t < 0.85) return `rgba(245,158,11,${0.6 + t * 0.3})`
  return `rgba(239,68,68,${0.7 + t * 0.2})`
}

export default function UAVDiagram({ width = '100%', height = '100%', showLabels = true, showFlow = true, compact = false, className = '', variant }: Props) {
  const { telemetry: t, health: h } = useStore()

  const rpm = t?.rpm ?? 0
  const cht = t?.cht_c ?? 80
  const oilP = t?.oil_pressure_kpa ?? 350
  const vib = t?.vibration_rms_g ?? 0
  const throttle = t?.throttle_pct ?? 0
  const engineState = t?.engine_state ?? 'OFF'

  const overallH = h?.overall_health ?? 85
  const thermalH = h?.thermal_health ?? 85
  const lubH = h?.lubrication_health ?? 85
  const mechH = h?.mechanical_health ?? 85
  const fuelH = h?.fuel_system_health ?? 85
  const elecH = h?.electrical_health ?? 85
  const sensorH = h?.sensor_health ?? 85

  const running = engineState !== 'OFF' && engineState !== 'SHUTDOWN' && rpm > 500

  // Propeller animation speed: faster = more RPM (max RPM ~5800 → duration 0.08s)
  const propDuration = running ? Math.max(0.06, 0.5 - (rpm / 5800) * 0.44) : 99
  const propStyle = { animationDuration: `${propDuration}s` }

  // Engine glow intensity
  const engineGlow = running ? `0 0 ${8 + (cht - 80) / 10}px ${chtToColor(cht)}` : 'none'

  // Heat shimmer speed
  const heatShimmer = { animationDuration: `${Math.max(0.3, 1.2 - (cht / 240))  }s` }

  const vW = 900; const vH = 420

  const isRustom = variant === 'UAV-003'
  const isTB2 = variant === 'UAV-002'

  const renderEngine = (cx: number, cy: number, scale: number = 1, dir: number = 1) => {
    const px = cx + 75 * scale * dir
    return (
    <g key={`${cx}-${cy}`}>
      {/* ── ENGINE BAY ── */}
      <ellipse
        cx={cx} cy={cy} rx={32 * scale} ry={26 * scale}
        fill={chtToColor(cht)} opacity="0.18"
        className={running ? 'anim-heat' : ''}
        style={running ? heatShimmer : {}}
      />
      {/* Engine heat glow */}
      {running && (
        <ellipse
          cx={cx} cy={cy} rx={50 * scale} ry={40 * scale}
          fill="url(#uav-engine-heat)"
          opacity="0.6"
          style={heatShimmer}
        />
      )}
      {/* Engine housing detail */}
      <ellipse cx={cx} cy={cy} rx={22 * scale} ry={18 * scale} fill="#0a1520" stroke={chtToColor(cht)} strokeWidth="1.5" strokeOpacity="0.7" />
      <ellipse cx={cx} cy={cy} rx={12 * scale} ry={10 * scale} fill={chtToColor(cht)} opacity="0.3" />

      {/* Propeller hub */}
      <circle cx={px} cy={cy} r={6 * scale}
        fill="#1a2744" stroke="rgba(0,180,216,0.5)" strokeWidth="1.2" />
      <circle cx={px} cy={cy} r={2.5 * scale} fill="rgba(0,180,216,0.7)" />

      {/* Propeller blades — spinning */}
      <g
        className={running ? 'anim-spin-cw' : ''}
        style={{ ...propStyle, transformOrigin: `${px}px ${cy}px` }}
      >
        <path d={`M ${px - 2 * scale * dir},${cy} C ${px - 3 * scale * dir},${cy - 15 * scale} ${px},${cy - 32 * scale} ${px + 2 * scale * dir},${cy - 40 * scale} C ${px + 4 * scale * dir},${cy - 32 * scale} ${px + 3 * scale * dir},${cy - 15 * scale} ${px + 2 * scale * dir},${cy} Z`} fill="rgba(148,163,184,0.85)" />
        <path d={`M ${px - 2 * scale * dir},${cy} C ${px - 3 * scale * dir},${cy + 15 * scale} ${px},${cy + 32 * scale} ${px + 2 * scale * dir},${cy + 40 * scale} C ${px + 4 * scale * dir},${cy + 32 * scale} ${px + 3 * scale * dir},${cy + 15 * scale} ${px + 2 * scale * dir},${cy} Z`} fill="rgba(148,163,184,0.85)" />
        <path d={`M ${px},${cy - 2 * scale} C ${px - 15 * scale * dir},${cy - 3 * scale} ${px - 32 * scale * dir},${cy} ${px - 40 * scale * dir},${cy + 2 * scale} C ${px - 32 * scale * dir},${cy + 4 * scale} ${px - 15 * scale * dir},${cy + 3 * scale} ${px},${cy + 2 * scale} Z`} fill="rgba(148,163,184,0.8)" />
        <path d={`M ${px},${cy - 2 * scale} C ${px + 15 * scale * dir},${cy - 3 * scale} ${px + 32 * scale * dir},${cy} ${px + 40 * scale * dir},${cy + 2 * scale} C ${px + 32 * scale * dir},${cy + 4 * scale} ${px + 15 * scale * dir},${cy + 3 * scale} ${px},${cy + 2 * scale} Z`} fill="rgba(148,163,184,0.8)" />
      </g>

      {/* Propeller blur disc when spinning fast */}
      {running && rpm > 2000 && (
        <ellipse
          cx={px} cy={cy}
          rx={Math.min(48 * scale, (20 + (rpm / 5800) * 28) * scale)}
          ry={Math.min(48 * scale, (20 + (rpm / 5800) * 28) * scale)}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth="6"
          filter="url(#prop-blur)"
        />
      )}

      {/* Exhaust particles */}
      {running && (
        <>
          {[0, 1, 2, 3, 4].map(i => (
            <circle key={i} cx={cx + 25 * scale * dir + i * 6 * scale * dir} cy={cy + (i % 2 === 0 ? -2 : 2) * scale} r={(2 - i * 0.3) * scale}
              fill={chtToColor(cht)}
              className="anim-exhaust"
              style={{ '--dx': `${(i % 2 === 0 ? -3 : 3)}px`, animationDelay: `${i * 0.3}s`, animationDuration: '1.5s' } as any}
            />
          ))}
        </>
      )}
    </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${vW} ${vH}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Engine heat gradient */}
        <radialGradient id="uav-engine-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={chtToColor(cht)} stopOpacity="0.9" />
          <stop offset="60%"  stopColor={chtToColor(cht)} stopOpacity="0.3" />
          <stop offset="100%" stopColor={chtToColor(cht)} stopOpacity="0" />
        </radialGradient>

        {/* Fuselage gradient */}
        <linearGradient id="uav-fuse-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1e3a5f" />
          <stop offset="50%"  stopColor="#1a2744" />
          <stop offset="100%" stopColor="#0f1a2e" />
        </linearGradient>

        {/* Wing gradient */}
        <linearGradient id="uav-wing-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#162040" />
          <stop offset="100%" stopColor="#0d1628" />
        </linearGradient>

        {/* Health radial for subsystem zones */}
        <radialGradient id="zone-thermal" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={healthToColor(thermalH)} stopOpacity="0.4" />
          <stop offset="100%" stopColor={healthToColor(thermalH)} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="zone-lube" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={healthToColor(lubH)} stopOpacity="0.35" />
          <stop offset="100%" stopColor={healthToColor(lubH)} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="zone-mech" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={healthToColor(mechH)} stopOpacity="0.25" />
          <stop offset="100%" stopColor={healthToColor(mechH)} stopOpacity="0" />
        </radialGradient>

        {/* Propeller blur filter */}
        <filter id="prop-blur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id="glow-filter">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="engine-glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Clip path for wing tips */}
        <clipPath id="canvas-clip">
          <rect x="0" y="0" width={vW} height={vH} />
        </clipPath>

        {/* Grid pattern */}
        <pattern id="uav-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,180,216,0.04)" strokeWidth="0.5"/>
        </pattern>
      </defs>

      {/* Background grid */}
      <rect width={vW} height={vH} fill="url(#uav-grid)" />

      {/* ── Subtle scan line ── */}
      {running && (
        <rect x="0" y="0" width={vW} height="2" fill="rgba(0,180,216,0.08)" opacity="0.6">
          <animateTransform attributeName="transform" type="translate" values={`0,0;0,${vH}`}
            dur="3s" repeatCount="indefinite" />
        </rect>
      )}

      <g clipPath="url(#canvas-clip)">

        {/* ═══════════════════════════════════════════════════════════
            WINGS  (very long, slightly swept, tapered)
        ═══════════════════════════════════════════════════════════ */}

        {/* LEFT WING */}
        <polygon
          points="380,230 395,205 90,185 45,200 45,210 90,215 380,245"
          fill="url(#uav-wing-grad)"
          stroke={healthToColor(mechH)}
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
        {/* Right WING */}
        <polygon
          points="380,190 395,215 810,235 855,220 855,210 810,205 380,175"
          fill="url(#uav-wing-grad)"
          stroke={healthToColor(mechH)}
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />

        {/* Wing leading edge accent lines */}
        <line x1="395" y1="205" x2="90" y2="185" stroke="rgba(0,180,216,0.2)" strokeWidth="1" />
        <line x1="395" y1="215" x2="810" y2="235" stroke="rgba(0,180,216,0.2)" strokeWidth="1" />

        {/* Wing spar lines */}
        <line x1="380" y1="218" x2="90" y2="200" stroke="rgba(0,180,216,0.08)" strokeWidth="0.5" />
        <line x1="380" y1="218" x2="810" y2="218" stroke="rgba(0,180,216,0.08)" strokeWidth="0.5" />

        {/* ── Fuel tank zones in wings ── */}
        <ellipse cx="220" cy="200" rx="80" ry="10" fill={healthToColor(fuelH)} opacity="0.12" />
        <ellipse cx="660" cy="218" rx="80" ry="10" fill={healthToColor(fuelH)} opacity="0.12" />

        {/* Wing health zone overlay */}
        <ellipse cx="240" cy="200" rx="120" ry="16" fill="url(#zone-mech)" />
        <ellipse cx="650" cy="218" rx="120" ry="16" fill="url(#zone-mech)" />

        {/* ── Winglet nav lights ── */}
        <circle cx="50" cy="205" r="5" fill="#ef4444" className="anim-nav-red" />
        <circle cx="850" cy="215" r="5" fill="#22c55e" className="anim-nav-green" />

        {/* Wing ordnance/sensor pods */}
        <ellipse cx="160" cy="198" rx="22" ry="6" fill="#0f1a2e" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" />
        <ellipse cx="720" cy="224" rx="22" ry="6" fill="#0f1a2e" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" />
        {showLabels && !compact && (
          <>
            <text x="160" y="190" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="9" fontFamily="JetBrains Mono">SENSOR</text>
            <text x="720" y="218" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="9" fontFamily="JetBrains Mono">SENSOR</text>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAIL / STABILIZERS
        ═══════════════════════════════════════════════════════════ */}
        {isRustom ? (
          <g>
            {/* T-Tail for Rustom-2 */}
            <polygon
              points="575,170 590,170 590,250 575,250"
              fill="#0d1628"
              stroke={healthToColor(mechH)}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            {/* Vertical tail fin (small) */}
            <polygon
              points="560,210 580,210 595,208 585,208"
              fill="#101e36"
              stroke="rgba(0,180,216,0.25)"
              strokeWidth="0.6"
            />
          </g>
        ) : isTB2 ? (
          <g>
            {/* Twin Boom for TB2 */}
            <rect x="360" y="175" width="240" height="4" fill="#0d1628" stroke="rgba(0,180,216,0.4)" strokeWidth="0.5" />
            <rect x="360" y="241" width="240" height="4" fill="#0d1628" stroke="rgba(0,180,216,0.4)" strokeWidth="0.5" />
            {/* Inverted V tail joining booms */}
            <polygon
              points="600,175 620,210 600,245 590,245 610,210 590,175"
              fill="#0d1628"
              stroke={healthToColor(mechH)}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
          </g>
        ) : (
          <g>
            {/* V-Tail for MQ-9 */}
            <polygon
              points="575,210 600,210 640,180 630,177 590,207"
              fill="#0d1628"
              stroke={healthToColor(mechH)}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <polygon
              points="575,210 600,210 640,240 630,243 590,213"
              fill="#0d1628"
              stroke={healthToColor(mechH)}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            {/* Vertical tail fin (small) */}
            <polygon
              points="560,210 580,210 595,175 585,175"
              fill="#101e36"
              stroke="rgba(0,180,216,0.25)"
              strokeWidth="0.6"
            />
          </g>
        )}

        {/* ═══════════════════════════════════════════════════════════
            FUSELAGE
        ═══════════════════════════════════════════════════════════ */}

        {/* Main fuselage body */}
        <path
          d={`
            M 290,210
            C 290,210 295,185 320,182
            L 530,185
            C 555,185 570,195 572,210
            C 572,210 572,210 572,210
            C 572,225 555,235 530,235
            L 320,238
            C 295,235 290,225 290,225 Z
          `}
          fill="url(#uav-fuse-grad)"
          stroke="rgba(0,180,216,0.35)"
          strokeWidth="1.2"
        />

        {/* Fuselage center spine */}
        <line x1="290" y1="210" x2="572" y2="210" stroke="rgba(0,180,216,0.1)" strokeWidth="0.5" strokeDasharray="8,4" />

        {/* Fuselage detail panels */}
        <path d="M 330,188 L 520,188 L 520,192 L 330,192 Z" fill="rgba(0,180,216,0.05)" stroke="rgba(0,180,216,0.1)" strokeWidth="0.5" />
        <path d="M 330,228 L 520,228 L 520,232 L 330,232 Z" fill="rgba(0,180,216,0.05)" stroke="rgba(0,180,216,0.1)" strokeWidth="0.5" />

        {/* Fuselage cross-frame ribs */}
        {[350, 390, 430, 470, 510].map(x => (
          <line key={x} x1={x} y1="185" x2={x} y2="235" stroke="rgba(0,180,216,0.06)" strokeWidth="0.5" />
        ))}

        {/* Fuselage mechanical health overlay */}
        <ellipse cx="430" cy="210" rx="140" ry="28" fill="url(#zone-mech)" />

        {/* Thermal zone overlay */}
        <ellipse cx="500" cy="210" rx="80" ry="30" fill="url(#zone-thermal)" />

        {/* ── OIL SYSTEM ── */}
        <rect x="340" y="202" width="40" height="16" rx="3"
          fill={healthToColor(lubH)} opacity="0.15"
          stroke={healthToColor(lubH)} strokeWidth="0.5" strokeOpacity="0.4" />
        {showLabels && !compact && (
          <text x="360" y="212" textAnchor="middle" fill={healthToColor(lubH)} fontSize="8" fontFamily="JetBrains Mono" opacity="0.8">OIL</text>
        )}

        {/* Oil lube zone */}
        <ellipse cx="360" cy="210" rx="60" ry="22" fill="url(#zone-lube)" />

        {/* ── FUEL LINE (center fuselage) ── */}
        {showFlow && running && (
          <line x1="420" y1="210" x2="535" y2="210"
            stroke={healthToColor(fuelH)} strokeWidth="2" strokeOpacity="0.5"
            strokeDasharray="6,4" className="anim-flow" />
        )}

        {/* ── ELECTRICAL ── */}
        <rect x="390" y="198" width="30" height="8" rx="2"
          fill={healthToColor(elecH)} opacity="0.2"
          stroke={healthToColor(elecH)} strokeWidth="0.4" strokeOpacity="0.5" />

        {/* ── Avionics bay ── */}
        <rect x="320" y="198" width="24" height="24" rx="2"
          fill="#0d1628" stroke="rgba(0,180,216,0.4)" strokeWidth="0.8" />
        <text x="332" y="213" textAnchor="middle" fill="rgba(0,180,216,0.7)" fontSize="7" fontFamily="JetBrains Mono">AV</text>

        {/* ═══════════════════════════════════════════════════════════
            NOSE SECTION (sensor ball + intake)
        ═══════════════════════════════════════════════════════════ */}

        {/* Nose cone */}
        <path
          d="M 290,210 C 285,210 255,215 235,210 C 255,205 285,210 290,210"
          fill="#0f1a2e"
          stroke="rgba(0,180,216,0.4)"
          strokeWidth="1"
        />

        {/* Nose sensor ball (EO/IR) */}
        <circle cx="237" cy="210" r="18"
          fill="#0a1520"
          stroke={healthToColor(sensorH)}
          strokeWidth="1.5"
          filter="url(#glow-filter)"
        />
        <circle cx="237" cy="210" r="10"
          fill={healthToColor(sensorH)} opacity="0.2" />
        <circle cx="233" cy="207" r="5"
          fill="rgba(0,180,216,0.3)"
          stroke="rgba(0,180,216,0.6)"
          strokeWidth="0.8" />
        <circle cx="233" cy="207" r="2" fill="rgba(0,180,216,0.9)" className="anim-glow" />
        {/* Sensor health ring */}
        {showLabels && (
          <text x="237" y="238" textAnchor="middle" fill={healthToColor(sensorH)} fontSize="8" fontFamily="JetBrains Mono" opacity="0.8">
            EO/IR
          </text>
        )}

        {/* Nose pitot tube */}
        <line x1="219" y1="210" x2="212" y2="210" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
        <circle cx="212" cy="210" r="1.5" fill="rgba(148,163,184,0.8)" />

        {/* ═══════════════════════════════════════════════════════════
            ENGINES / PROPELLERS
        ═══════════════════════════════════════════════════════════ */}

        {!isRustom ? (
          <>
            {/* Tail boom for pusher config */}
            <rect x="572" y="207" width="45" height="6" rx="3"
              fill="#0a1520" stroke="rgba(0,180,216,0.2)" strokeWidth="0.5" />
            
            {/* Single pusher engine at rear */}
            {renderEngine(545, 210, 1, 1)}
          </>
        ) : (
          <>
            {/* Engine mounts for twin tractor config */}
            <rect x="340" y="190" width="30" height="8" rx="2" fill="#0a1520" stroke="rgba(0,180,216,0.3)" />
            <rect x="340" y="222" width="30" height="8" rx="2" fill="#0a1520" stroke="rgba(0,180,216,0.3)" />
            
            {/* Twin tractor engines on wings */}
            {renderEngine(340, 194, 0.7, -1)}
            {renderEngine(340, 226, 0.7, -1)}
          </>
        )}

        {/* ── Landing Gear ── */}
        {/* Nose gear */}
        <line x1="260" y1="218" x2="258" y2="230" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />
        <ellipse cx="258" cy="231" rx="6" ry="3" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
        {/* Main gear left */}
        <line x1="410" y1="232" x2="408" y2="250" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />
        <ellipse cx="408" cy="252" rx="7" ry="3.5" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
        {/* Main gear right */}
        <line x1="460" y1="232" x2="462" y2="250" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />
        <ellipse cx="462" cy="252" rx="7" ry="3.5" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="1" />

        {/* ═══════════════════════════════════════════════════════════
            SUBSYSTEM LABELS & HEALTH BADGES
        ═══════════════════════════════════════════════════════════ */}
        {showLabels && !compact && (
          <>
            {/* Engine label */}
            <g>
              <line x1="545" y1="238" x2="545" y2="280" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="500" y="280" width="90" height="22" rx="3" fill="rgba(10,15,30,0.85)" stroke={chtToColor(cht)} strokeWidth="0.8" />
              <text x="545" y="289" textAnchor="middle" fill={chtToColor(cht)} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">ENGINE</text>
              <text x="545" y="298" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`CHT ${Math.round(cht)}°C`}</text>
            </g>

            {/* Oil label */}
            <g>
              <line x1="360" y1="202" x2="340" y2="160" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="295" y="148" width="90" height="22" rx="3" fill="rgba(10,15,30,0.85)" stroke={healthToColor(lubH)} strokeWidth="0.8" />
              <text x="340" y="157" textAnchor="middle" fill={healthToColor(lubH)} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">LUBE SYS</text>
              <text x="340" y="166" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`${Math.round(oilP)} kPa`}</text>
            </g>

            {/* Sensor label */}
            <g>
              <line x1="237" y1="192" x2="237" y2="155" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="192" y="143" width="90" height="22" rx="3" fill="rgba(10,15,30,0.85)" stroke={healthToColor(sensorH)} strokeWidth="0.8" />
              <text x="237" y="152" textAnchor="middle" fill={healthToColor(sensorH)} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">SENSORS</text>
              <text x="237" y="161" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`${Math.round(sensorH)}%`}</text>
            </g>

            {/* Propeller label */}
            <g>
              <line x1="620" y1="175" x2="650" y2="135" stroke="rgba(0,180,216,0.3)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="605" y="122" width="90" height="22" rx="3" fill="rgba(10,15,30,0.85)" stroke="rgba(0,180,216,0.5)" strokeWidth="0.8" />
              <text x="650" y="131" textAnchor="middle" fill="rgba(0,180,216,0.9)" fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">PROPELLER</text>
              <text x="650" y="140" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`${Math.round(rpm)} RPM`}</text>
            </g>

            {/* Wing fuel label (left) */}
            <g>
              <line x1="220" y1="196" x2="220" y2="275" stroke="rgba(0,180,216,0.25)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="175" y="275" width="90" height="22" rx="3" fill="rgba(10,15,30,0.85)" stroke={healthToColor(fuelH)} strokeWidth="0.8" />
              <text x="220" y="284" textAnchor="middle" fill={healthToColor(fuelH)} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">FUEL TANK</text>
              <text x="220" y="293" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`${Math.round(fuelH)}%`}</text>
            </g>

            {/* Vibration indicator */}
            <g>
              <line x1="430" y1="232" x2="430" y2="310" stroke="rgba(0,180,216,0.25)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="385" y="310" width="90" height="22" rx="3"
                fill="rgba(10,15,30,0.85)"
                stroke={vib > 0.5 ? '#ef4444' : vib > 0.3 ? '#f59e0b' : '#22c55e'}
                strokeWidth="0.8" />
              <text x="430" y="319" textAnchor="middle"
                fill={vib > 0.5 ? '#ef4444' : vib > 0.3 ? '#f59e0b' : '#22c55e'}
                fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">VIBRATION</text>
              <text x="430" y="328" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="7" fontFamily="JetBrains Mono">{`${vib.toFixed(3)} g RMS`}</text>
            </g>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STATUS OVERLAY
        ═══════════════════════════════════════════════════════════ */}

        {/* Overall health badge */}
        <rect x="8" y="8" width="90" height="36" rx="4"
          fill="rgba(10,15,30,0.9)" stroke="rgba(0,180,216,0.4)" strokeWidth="1" />
        <text x="16" y="20" fill="rgba(148,163,184,0.7)" fontSize="8" fontFamily="JetBrains Mono">HEALTH</text>
        <text x="16" y="36" fill={healthToColor(overallH)} fontSize="18" fontFamily="JetBrains Mono" fontWeight="700"
          style={{ filter: `drop-shadow(0 0 4px ${healthToColor(overallH)})` }}>
          {Math.round(overallH)}
        </text>

        {/* Engine state badge */}
        <rect x={vW - 110} y="8" width="102" height="28" rx="4"
          fill="rgba(10,15,30,0.9)"
          stroke={running ? 'rgba(34,197,94,0.5)' : 'rgba(30,58,95,0.5)'}
          strokeWidth="1" />
        <text x={vW - 59} y="18" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="8" fontFamily="JetBrains Mono">ENGINE STATE</text>
        <text x={vW - 59} y="30" textAnchor="middle"
          fill={running ? '#22c55e' : '#64748b'}
          fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">
          {engineState}
        </text>

        {/* SIMULATED watermark */}
        <text x={vW / 2} y={vH - 8} textAnchor="middle"
          fill="rgba(100,116,139,0.25)" fontSize="9" fontFamily="JetBrains Mono">
          SIMULATED — DIGITAL TWIN — DEMONSTRATION ONLY
        </text>
      </g>
    </svg>
  )
}
