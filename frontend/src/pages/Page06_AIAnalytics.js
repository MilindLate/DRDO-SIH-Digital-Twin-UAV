import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// S06–S16: Remaining pages
// Each page is a self-contained component
// ─── S06 AI Analytics ────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
export default function Page06_AIAnalytics() {
    const { telemetry: t, health: h } = useStore();
    const [models, setModels] = useState([]);
    useEffect(() => {
        api.models.list().then((d) => setModels(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);
    // Simulate anomaly score based on health
    const anomalyScore = Math.max(0, Math.min(1, (100 - (h?.overall_health ?? 82)) / 100 * 1.5));
    const isAnomaly = anomalyScore > 0.5;
    const features = [
        { name: 'RPM', value: t?.rpm, nominal: 4200, importance: 0.22 },
        { name: 'CHT', value: t?.cht_c, nominal: 165, importance: 0.18 },
        { name: 'EGT', value: t?.egt_c, nominal: 620, importance: 0.15 },
        { name: 'Oil Pres.', value: t?.oil_pressure_kpa, nominal: 340, importance: 0.12 },
        { name: 'Fuel Flow', value: t?.fuel_flow_lph, nominal: 10.5, importance: 0.10 },
        { name: 'Vibration', value: t?.vibration_rms_g, nominal: 0.18, importance: 0.09 },
        { name: 'Oil Temp', value: t?.oil_temperature_c, nominal: 85, importance: 0.08 },
        { name: 'Load', value: t?.engine_load_pct, nominal: 65, importance: 0.06 },
    ];
    const featureData = features.map(f => ({
        name: f.name,
        deviation: f.nominal > 0 ? Math.abs(((f.value ?? f.nominal) - f.nominal) / f.nominal) * 100 : 0,
        importance: f.importance * 100,
    }));
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S06" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "AI ANALYTICS" })] }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted", children: "DEMONSTRATION MODEL \u2014 Synthetic training data" })] }), _jsxs("div", { className: "flex flex-1 gap-2 p-2 min-h-0", children: [_jsxs("div", { className: "w-52 flex flex-col gap-2 shrink-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded-sm p-3 flex flex-col items-center", children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "ANOMALY SCORE" }), _jsx("div", { className: "w-32 h-32", children: _jsxs("svg", { viewBox: "0 0 100 100", className: "w-full h-full", children: [_jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "#1e3a5f", strokeWidth: "10" }), _jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: isAnomaly ? '#ef4444' : '#22c55e', strokeWidth: "10", strokeDasharray: `${anomalyScore * 264} 264`, strokeLinecap: "round", transform: "rotate(-90 50 50)" }), _jsx("text", { x: "50", y: "48", textAnchor: "middle", fontSize: "20", fontWeight: "bold", fill: isAnomaly ? '#ef4444' : '#22c55e', fontFamily: "monospace", children: (anomalyScore * 100).toFixed(0) }), _jsx("text", { x: "50", y: "60", textAnchor: "middle", fontSize: "7", fill: "#94a3b8", fontFamily: "monospace", children: "/ 100" })] }) }), _jsx("div", { className: `text-[clamp(10px,0.9vw,12px)] font-bold font-mono mt-1 ${isAnomaly ? 'text-critical' : 'text-healthy'}`, children: isAnomaly ? 'ANOMALY DETECTED' : 'NORMAL OPERATION' }), _jsx("div", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono text-center mt-1", children: "IsolationForest [SIM]" })] }), _jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "FAULT PREDICTION" }), [
                                        ['NORMAL', Math.max(0, 1 - anomalyScore * 0.7)],
                                        ['INJECTOR DEG.', anomalyScore * 0.3],
                                        ['OVERHEATING', anomalyScore * 0.2],
                                        ['VIBRATION', anomalyScore * 0.1],
                                        ['LUBRICATION', anomalyScore * 0.15],
                                    ].map(([cls, prob]) => (_jsxs("div", { className: "flex items-center gap-1 py-0.5", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted w-20 truncate", children: cls }), _jsx("div", { className: "flex-1 h-1.5 bg-surface-alt rounded-full", children: _jsx("div", { className: "h-full rounded-full bg-accent", style: { width: `${prob * 100}%` } }) }), _jsxs("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary w-6 text-right", children: [(prob * 100).toFixed(0), "%"] })] }, cls))), _jsx("div", { className: "mt-1 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono", children: "RandomForest \u2014 DEMONSTRATION MODEL" })] })] }), _jsxs("div", { className: "flex-1 flex flex-col gap-2 min-h-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded-sm p-2 flex-1 min-h-0", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "FEATURE CONTRIBUTIONS (SHAP-STYLE ATTRIBUTION) [DEMONSTRATION]" }), _jsx(ResponsiveContainer, { width: "100%", height: "80%", children: _jsxs(BarChart, { data: featureData, layout: "vertical", children: [_jsx(CartesianGrid, { stroke: "#1e3a5f", strokeDasharray: "3 3", opacity: 0.3 }), _jsx(XAxis, { type: "number", tick: { fill: '#64748b', fontSize: 8, fontFamily: 'monospace' } }), _jsx(YAxis, { dataKey: "name", type: "category", width: 55, tick: { fill: '#94a3b8', fontSize: 8, fontFamily: 'monospace' } }), _jsx(Tooltip, { contentStyle: { background: '#0f1a2e', border: '1px solid #1e3a5f', fontSize: 9 } }), _jsx(Bar, { dataKey: "importance", name: "Feature Importance %", fill: "#0077b6" }), _jsx(Bar, { dataKey: "deviation", name: "Deviation from Nominal %", fill: "#f59e0b", opacity: 0.7 })] }) })] }), _jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "ML MODEL REGISTRY" }), _jsxs("table", { className: "w-full text-[clamp(9px,0.8vw,11px)] font-mono", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border text-text-muted", children: [_jsx("th", { className: "text-left py-0.5", children: "MODEL" }), _jsx("th", { className: "text-left py-0.5", children: "TYPE" }), _jsx("th", { className: "text-left py-0.5", children: "ALGORITHM" }), _jsx("th", { className: "text-center py-0.5", children: "STATUS" }), _jsx("th", { className: "text-left py-0.5", children: "DISCLAIMER" })] }) }), _jsx("tbody", { children: (models.length > 0 ? models : [
                                                    { model_name: 'AnomalyDetector', model_type: 'ANOMALY_DETECTION', algorithm: 'IsolationForest', is_active: true },
                                                    { model_name: 'FaultClassifier', model_type: 'FAULT_CLASSIFICATION', algorithm: 'RandomForest', is_active: true },
                                                    { model_name: 'RULEstimator', model_type: 'RUL_ESTIMATION', algorithm: 'Physics Model', is_active: true },
                                                ]).map((m, i) => (_jsxs("tr", { className: "border-b border-border/30", children: [_jsx("td", { className: "py-0.5 text-accent", children: m.model_name }), _jsx("td", { className: "py-0.5 text-text-secondary", children: m.model_type }), _jsx("td", { className: "py-0.5", children: m.algorithm }), _jsx("td", { className: "py-0.5 text-center", children: _jsx("span", { className: `${m.is_active ? 'text-healthy' : 'text-text-muted'}`, children: m.is_active ? 'ACTIVE' : 'INACTIVE' }) }), _jsx("td", { className: "py-0.5 text-[clamp(7px,0.6vw,9px)] text-text-muted", children: "DEMONSTRATION MODEL" })] }, i))) })] })] })] })] })] }));
}
