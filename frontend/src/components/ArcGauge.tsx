/**
 * ArcGauge — 3D-style circular arc gauge
 * Renders SVG arc with gradient color zones, needle, animated value
 */
import React, { useEffect, useRef } from 'react'

interface Props {
  value: number
  min?: number
  max?: number
  label: string
  unit?: string
  warnThreshold?: number
  critThreshold?: number
  size?: number
  inverse?: boolean   // low is good (pressure), high is bad (temp)
  showZones?: boolean
  glowColor?: string
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToXY(cx, cy, r, startAngle)
  const end   = polarToXY(cx, cy, r, endAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

export default function ArcGauge({
  value, min = 0, max = 100, label, unit = '',
  warnThreshold = 80, critThreshold = 90,
  size = 120, inverse = false, showZones = true, glowColor
}: Props) {
  const valueRef = useRef<SVGTextElement>(null)

  const cx = size / 2, cy = size / 2 + 8
  const r = size * 0.38
  const rOuter = r + 4
  const startAngle = -130, endAngle = 130
  const range = endAngle - startAngle

  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const needleAngle = startAngle + norm * range

  const warnNorm = (warnThreshold - min) / (max - min)
  const critNorm = (critThreshold - min) / (max - min)

  // Determine color
  let color = '#22c55e'
  let shadowColor = '#22c55e'
  if (inverse) {
    if (value < critThreshold) { color = '#ef4444'; shadowColor = '#ef4444' }
    else if (value < warnThreshold) { color = '#f59e0b'; shadowColor = '#f59e0b' }
  } else {
    if (value >= critThreshold) { color = '#ef4444'; shadowColor = '#ef4444' }
    else if (value >= warnThreshold) { color = '#f59e0b'; shadowColor = '#f59e0b' }
  }
  if (glowColor) shadowColor = glowColor

  const needlePt = polarToXY(cx, cy, r * 0.8, needleAngle)

  return (
    <svg width={size} height={size + 10} viewBox={`0 0 ${size} ${size + 10}`}
      style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`arc-bg-${label}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a2744" />
          <stop offset="100%" stopColor="#0a0f1e" />
        </radialGradient>
        <filter id={`arc-glow-${label}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r + 8}
        fill={`url(#arc-bg-${label})`}
        stroke="rgba(30,58,95,0.8)" strokeWidth="1" />

      {/* Zone arcs */}
      {showZones && (
        <>
          <path d={describeArc(cx, cy, rOuter, startAngle, startAngle + warnNorm * range)}
            fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth="4" strokeLinecap="round" />
          <path d={describeArc(cx, cy, rOuter, startAngle + warnNorm * range, startAngle + critNorm * range)}
            fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="4" strokeLinecap="round" />
          <path d={describeArc(cx, cy, rOuter, startAngle + critNorm * range, endAngle)}
            fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {/* Value arc (filled to current position) */}
      <path d={describeArc(cx, cy, r, startAngle, needleAngle)}
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        filter={`url(#arc-glow-${label})`}
        style={{ transition: 'all 0.5s ease-out' }}
      />

      {/* Track arc (background) */}
      <path d={describeArc(cx, cy, r, startAngle, endAngle)}
        fill="none" stroke="rgba(30,58,95,0.6)" strokeWidth="2" strokeLinecap="round" />

      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const a = startAngle + t * range
        const inner = polarToXY(cx, cy, r - 6, a)
        const outer = polarToXY(cx, cy, r - 2, a)
        return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
          stroke="rgba(100,116,139,0.6)" strokeWidth="1" />
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y}
        stroke={color} strokeWidth="1.5" strokeLinecap="round"
        style={{ transition: 'all 0.4s ease-out', filter: `drop-shadow(0 0 3px ${shadowColor})` }} />
      <circle cx={cx} cy={cy} r="3" fill={color} />

      {/* Value display */}
      <text ref={valueRef} x={cx} y={cy + r * 0.35}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={r * 0.42} fontFamily="JetBrains Mono" fontWeight="700"
        style={{ transition: 'fill 0.3s', filter: `drop-shadow(0 0 4px ${shadowColor}80)` }}>
        {typeof value === 'number' && !isNaN(value) ? Math.round(value) : '—'}
      </text>

      {/* Unit */}
      <text x={cx} y={cy + r * 0.58}
        textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize={r * 0.22} fontFamily="JetBrains Mono">
        {unit}
      </text>

      {/* Label */}
      <text x={cx} y={size + 6}
        textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize={r * 0.2} fontFamily="JetBrains Mono">
        {label}
      </text>
    </svg>
  )
}
