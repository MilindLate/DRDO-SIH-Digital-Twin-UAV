import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStore } from '../store';
import { fmt, healthBgColor, healthLabel } from '../utils/formatters';
import SubsystemRadar from '../components/SubsystemRadar';
import ThermalHeatmap from '../components/ThermalHeatmap';
import ArcGauge from '../components/ArcGauge';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
const SUBSYSTEMS = [
    { key: 'thermal_health', label: 'THERMAL', weight: '20%' },
    { key: 'mechanical_health', label: 'MECHANICAL', weight: '20%' },
    { key: 'lubrication_health', label: 'LUBRICATION', weight: '15%' },
    { key: 'combustion_health', label: 'COMBUSTION', weight: '15%' },
    { key: 'fuel_system_health', label: 'FUEL SYSTEM', weight: '10%' },
    { key: 'electrical_health', label: 'ELECTRICAL', weight: '10%' },
    { key: 'sensor_health', label: 'SENSORS', weight: '5%' },
    { key: 'vibration_health', label: 'VIBRATION', weight: '5%' },
];
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "bg-surface border border-border rounded px-2 py-1", children: [_jsx("div", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: label }), payload.map((p) => (_jsxs("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono", style: { color: p.color }, children: [p.dataKey, ": ", typeof p.value === 'number' ? p.value.toFixed(1) : p.value] }, p.dataKey)))] }));
};
export default function Page04_EngineHealth() {
    const { health: h, healthHistory, operatingHours } = useStore();
    const overall = h?.overall_health ?? 85;
    const overallColor = healthBgColor(overall);
    // Health trajectory chart data
    const chartData = healthHistory.length > 1
        ? healthHistory.slice(-120).map((rec, i) => ({
            t: i,
            overall: rec.overall_health ?? 85,
            thermal: rec.thermal_health ?? 85,
            mech: rec.mechanical_health ?? 85,
            lube: rec.lubrication_health ?? 85,
        }))
        : Array.from({ length: 20 }, (_, i) => ({
            t: i, overall: 90 - i * 0.2, thermal: 88 - i * 0.15,
            mech: 95 - i * 0.1, lube: 87 - i * 0.25
        }));
    // Degradation rate
    const degradRate = h?.degradation_rate ?? 0.002;
    const projData = (() => {
        const last = chartData[chartData.length - 1]?.overall ?? overall;
        return Array.from({ length: 30 }, (_, i) => ({
            t: chartData.length + i,
            projected: Math.max(0, last - degradRate * i * 50),
        }));
    })();
    const confidence = h?.health_confidence ?? 0.92;
    return (_jsxs("div", { className: "flex flex-col h-full gap-2 p-2 bg-bg overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 bg-surface border border-border rounded px-3 py-1.5 shrink-0", children: [_jsx("span", { className: "font-display text-[clamp(10px,0.9vw,12px)] text-accent tracking-widest", children: "S04 ENGINE HEALTH" }), _jsx("div", { className: "w-px h-4 bg-border" }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted", children: "WEIGHTED HEALTH INDEX \u2014 DEMONSTRATION MODEL" }), _jsx("div", { className: "flex-1" }), _jsxs("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted", children: ["OP HRS: ", _jsx("span", { className: "text-accent font-bold", children: fmt(operatingHours, 1) })] }), _jsx("div", { className: "w-px h-4 bg-border" }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono", style: { color: overallColor }, children: healthLabel(overall) })] }), _jsxs("div", { className: "flex flex-1 gap-2 min-h-0", children: [_jsxs("div", { className: "flex flex-col gap-2 w-[210px] shrink-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded p-3 flex flex-col items-center hud-corner", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1 tracking-wider", children: "ENGINE HEALTH INDEX" }), _jsx(ArcGauge, { value: overall, min: 0, max: 100, label: "", unit: "%", warnThreshold: 70, critThreshold: 50, size: 150, inverse: true, showZones: true }), _jsxs("div", { className: "mt-1 text-center", children: [_jsx("div", { className: "text-[clamp(16px,1.5vw,18px)] font-bold font-display", style: { color: overallColor, textShadow: `0 0 12px ${overallColor}` }, children: healthLabel(overall) }), _jsxs("div", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: ["Confidence: ", _jsxs("span", { className: "text-accent font-bold", children: [(confidence * 100).toFixed(0), "%"] })] }), _jsxs("div", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: ["Degradation: ", _jsxs("span", { className: "text-warning font-bold", children: [(degradRate * 100).toFixed(4), "%/h"] })] })] })] }), _jsxs("div", { className: "bg-surface border border-border rounded p-2 flex-1", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider", children: "SUBSYSTEM BREAKDOWN" }), _jsx("div", { className: "space-y-2", children: SUBSYSTEMS.map(({ key, label, weight }) => {
                                            const val = h?.[key] ?? 85;
                                            const color = healthBgColor(val);
                                            return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-0.5", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary", children: label }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted", children: weight }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-bold font-mono", style: { color, textShadow: `0 0 4px ${color}60` }, children: Math.round(val) })] })] }), _jsxs("div", { className: "h-2 bg-surface-alt rounded-full overflow-hidden relative", children: [_jsx("div", { className: "absolute top-0 bottom-0 w-px bg-warning/40 z-10", style: { left: '70%' } }), _jsx("div", { className: "absolute top-0 bottom-0 w-px bg-critical/40 z-10", style: { left: '50%' } }), _jsx("div", { className: "h-full rounded-full transition-all duration-700", style: {
                                                                    width: `${Math.max(2, val)}%`,
                                                                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                                                                    boxShadow: `0 0 5px ${color}80`,
                                                                } })] })] }, key));
                                        }) }), _jsx("div", { className: "mt-2 pt-2 border-t border-border text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center", children: "SIMULATED WEIGHTS \u2014 CONFIGURABLE" })] })] }), _jsxs("div", { className: "flex flex-col gap-2 flex-1 min-w-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded p-2", style: { height: '45%' }, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted tracking-wider", children: "HEALTH TRAJECTORY \u2014 LIVE HISTORY + PROJECTION" }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: "SIMULATED" })] }), _jsx(ResponsiveContainer, { width: "100%", height: "90%", children: _jsxs(AreaChart, { data: [...chartData, ...projData], margin: { top: 5, right: 5, left: 0, bottom: 5 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "grad-overall", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#00b4d8", stopOpacity: "0.3" }), _jsx("stop", { offset: "95%", stopColor: "#00b4d8", stopOpacity: "0.02" })] }), _jsxs("linearGradient", { id: "grad-proj", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#f59e0b", stopOpacity: "0.2" }), _jsx("stop", { offset: "95%", stopColor: "#f59e0b", stopOpacity: "0.01" })] })] }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(30,58,95,0.4)" }), _jsx(XAxis, { dataKey: "t", hide: true }), _jsx(YAxis, { domain: [0, 100], tick: { fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }, width: 24 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(ReferenceLine, { y: 70, stroke: "#f59e0b", strokeDasharray: "4 3", strokeOpacity: 0.5, label: { value: 'WARN', fill: '#f59e0b', fontSize: 8, fontFamily: 'JetBrains Mono' } }), _jsx(ReferenceLine, { y: 50, stroke: "#ef4444", strokeDasharray: "4 3", strokeOpacity: 0.5, label: { value: 'CRIT', fill: '#ef4444', fontSize: 8, fontFamily: 'JetBrains Mono' } }), _jsx(Area, { type: "monotone", dataKey: "overall", stroke: "#00b4d8", fill: "url(#grad-overall)", strokeWidth: 2, dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "thermal", stroke: "#f97316", fill: "none", strokeWidth: 1, strokeOpacity: 0.6, dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "mech", stroke: "#22c55e", fill: "none", strokeWidth: 1, strokeOpacity: 0.6, dot: false, isAnimationActive: false }), _jsx(Area, { type: "monotone", dataKey: "projected", stroke: "#f59e0b", fill: "url(#grad-proj)", strokeWidth: 1.5, strokeDasharray: "5 3", dot: false, isAnimationActive: false })] }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 flex-1", children: [_jsx("div", { className: "bg-surface border border-border rounded p-2", children: _jsx(ThermalHeatmap, {}) }), _jsxs("div", { className: "bg-surface border border-border rounded p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider", children: "MAJOR HEALTH CONTRIBUTORS" }), _jsx("div", { className: "space-y-2", children: SUBSYSTEMS
                                                    .map(s => ({ label: s.label, val: h?.[s.key] ?? 85 }))
                                                    .sort((a, b) => a.val - b.val)
                                                    .slice(0, 5)
                                                    .map(({ label, val }) => {
                                                    const impact = (100 - val).toFixed(1);
                                                    const color = healthBgColor(val);
                                                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between mb-0.5", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary", children: label }), _jsxs("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: ["\u2212", impact, " pts"] })] }), _jsx("div", { className: "h-1.5 bg-surface-alt rounded-full overflow-hidden", children: _jsx("div", { className: "h-full rounded-full", style: { width: `${Math.min(100, parseFloat(impact) * 2)}%`, background: color } }) })] }, label));
                                                }) }), _jsxs("div", { className: "mt-3 border-t border-border pt-2 text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Degradation Rate" }), _jsxs("span", { className: "text-warning font-bold", children: [(degradRate * 100).toFixed(4), "%/h"] })] }), _jsxs("div", { className: "flex justify-between mt-1", children: [_jsx("span", { children: "TBO Remaining" }), _jsxs("span", { className: "text-accent font-bold", children: [Math.max(0, 1500 - (operatingHours ?? 0)).toFixed(0), " h [SIM]"] })] })] })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2 w-[200px] shrink-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded p-2 flex flex-col items-center", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-1 tracking-wider text-center", children: "HEALTH RADAR" }), _jsx(SubsystemRadar, { size: 185 }), _jsx("div", { className: "text-[clamp(7px,0.6vw,9px)] font-mono text-text-muted text-center mt-1", children: "DEMONSTRATION MODEL" })] }), _jsxs("div", { className: "bg-surface border border-border rounded p-2 flex-1", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted mb-2 tracking-wider", children: "THRESHOLDS [CONFIGURABLE]" }), _jsx("div", { className: "space-y-1.5", children: [
                                            { label: 'EXCELLENT', range: '85–100', color: '#22c55e' },
                                            { label: 'HEALTHY', range: '70–85', color: '#86efac' },
                                            { label: 'DEGRADED', range: '50–70', color: '#f59e0b' },
                                            { label: 'POOR', range: '30–50', color: '#f97316' },
                                            { label: 'CRITICAL', range: '0–30', color: '#ef4444' },
                                        ].map(row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 rounded-sm shrink-0", style: { background: row.color } }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono", style: { color: row.color }, children: row.label }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted ml-auto", children: row.range })] }, row.label))) }), _jsx("div", { className: "mt-2 pt-2 border-t border-border", children: _jsxs("div", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Warning" }), _jsx("span", { className: "text-warning font-bold", children: '< 70' })] }), _jsxs("div", { className: "flex justify-between mt-0.5", children: [_jsx("span", { children: "Critical" }), _jsx("span", { className: "text-critical font-bold", children: '< 50' })] }), _jsxs("div", { className: "flex justify-between mt-0.5", children: [_jsx("span", { children: "Maintenance" }), _jsx("span", { className: "text-critical font-bold", children: '< 30' })] })] }) })] })] })] })] }));
}
