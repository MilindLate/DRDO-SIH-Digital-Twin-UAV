import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStore } from '../store';
const AXES = [
    { label: 'THERMAL', key: 'thermal_health', angle: 0 },
    { label: 'COMBUSTION', key: 'combustion_health', angle: 45 },
    { label: 'MECHANICAL', key: 'mechanical_health', angle: 90 },
    { label: 'VIBRATION', key: 'vibration_health', angle: 135 },
    { label: 'LUBE', key: 'lubrication_health', angle: 180 },
    { label: 'FUEL SYS', key: 'fuel_system_health', angle: 225 },
    { label: 'ELECTRICAL', key: 'electrical_health', angle: 270 },
    { label: 'SENSORS', key: 'sensor_health', angle: 315 },
];
function toXY(cx, cy, angle, r) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
export default function SubsystemRadar({ size = 200, className = '' }) {
    const { health: h } = useStore();
    const cx = size / 2, cy = size / 2;
    const maxR = size * 0.36;
    const labelR = size * 0.48;
    const getValue = (key) => {
        const val = h?.[key] ?? 85;
        return Math.max(0, Math.min(100, val));
    };
    // Build polygon points
    const points = AXES.map(a => {
        const v = getValue(a.key);
        const r = (v / 100) * maxR;
        return toXY(cx, cy, a.angle, r);
    });
    const polyPts = points.map(p => `${p.x},${p.y}`).join(' ');
    // Ref rings
    const rings = [25, 50, 75, 100];
    // Min subsystem health for color
    const minHealth = Math.min(...AXES.map(a => getValue(a.key)));
    const fillColor = minHealth >= 85 ? '#22c55e' : minHealth >= 70 ? '#86efac' : minHealth >= 50 ? '#f59e0b' : '#ef4444';
    return (_jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, className: className, style: { display: 'block' }, children: [_jsx("defs", { children: _jsxs("filter", { id: "radar-glow", children: [_jsx("feGaussianBlur", { stdDeviation: "1.5", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }) }), rings.map(pct => {
                const r = (pct / 100) * maxR;
                const ringPts = AXES.map(a => {
                    const p = toXY(cx, cy, a.angle, r);
                    return `${p.x},${p.y}`;
                }).join(' ');
                return (_jsx("polygon", { points: ringPts, fill: "none", stroke: pct === 75 ? 'rgba(0,180,216,0.12)' : 'rgba(30,58,95,0.5)', strokeWidth: pct === 75 ? 0.8 : 0.5, strokeDasharray: pct === 50 ? '3,3' : undefined }, pct));
            }), AXES.map(a => {
                const end = toXY(cx, cy, a.angle, maxR);
                return _jsx("line", { x1: cx, y1: cy, x2: end.x, y2: end.y, stroke: "rgba(30,58,95,0.6)", strokeWidth: "0.5" }, a.label);
            }), _jsx("polygon", { points: polyPts, fill: `${fillColor}18`, stroke: fillColor, strokeWidth: "1.5", strokeOpacity: "0.8", filter: "url(#radar-glow)", style: { transition: 'all 0.5s ease-out' } }), AXES.map((a, i) => {
                const v = getValue(a.key);
                const r = (v / 100) * maxR;
                const p = toXY(cx, cy, a.angle, r);
                const c = v >= 85 ? '#22c55e' : v >= 70 ? '#86efac' : v >= 50 ? '#f59e0b' : '#ef4444';
                return (_jsx("circle", { cx: p.x, cy: p.y, r: "3", fill: c, stroke: "rgba(10,15,30,0.8)", strokeWidth: "1", style: { filter: `drop-shadow(0 0 3px ${c})`, transition: 'all 0.5s ease-out' } }, a.label));
            }), AXES.map(a => {
                const p = toXY(cx, cy, a.angle, labelR);
                const v = getValue(a.key);
                const c = v >= 85 ? '#22c55e' : v >= 70 ? '#94a3b8' : v >= 50 ? '#f59e0b' : '#ef4444';
                return (_jsxs("g", { children: [_jsx("text", { x: p.x, y: p.y - 3, textAnchor: "middle", fill: "rgba(148,163,184,0.75)", fontSize: size * 0.048, fontFamily: "JetBrains Mono", children: a.label }), _jsx("text", { x: p.x, y: p.y + size * 0.052, textAnchor: "middle", fill: c, fontSize: size * 0.05, fontFamily: "JetBrains Mono", fontWeight: "700", children: Math.round(v) })] }, a.label));
            }), _jsx("text", { x: cx, y: cy - 4, textAnchor: "middle", fill: "rgba(148,163,184,0.6)", fontSize: size * 0.05, fontFamily: "JetBrains Mono", children: "HEALTH" }), _jsx("text", { x: cx, y: cy + size * 0.055, textAnchor: "middle", fill: fillColor, fontSize: size * 0.09, fontFamily: "JetBrains Mono", fontWeight: "700", style: { filter: `drop-shadow(0 0 5px ${fillColor})` }, children: Math.round(minHealth) })] }));
}
