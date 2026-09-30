import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// S16 — System Configuration
import { useState } from 'react';
const TABS = ['Engine', 'Limits', 'Simulation', 'Models', 'System'];
const ENGINE_PARAMS = [
    { key: 'max_rpm_rated', label: 'Max RPM (rated)', value: 5800, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'max_power_kw', label: 'Max Power', value: 75, unit: 'kW', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'tbo_hours', label: 'TBO (Time Between Overhaul)', value: 1500, unit: 'hours', note: 'SIMULATED/CONFIGURABLE — See engine_config.yaml' },
    { key: 'cylinders', label: 'Cylinders', value: 4, unit: '', note: 'CONFIGURABLE' },
    { key: 'displacement_cc', label: 'Engine Displacement', value: 2000, unit: 'cc', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'idle_rpm', label: 'Idle RPM', value: 900, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'cruise_rpm', label: 'Cruise RPM', value: 4200, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'target_afr', label: 'Target AFR', value: 12.5, unit: ':1', note: 'RESEARCH MODEL (Heywood, 1988)' },
];
const LIMITS_PARAMS = [
    { key: 'cht_warn', label: 'CHT Warning Limit', value: 220, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'cht_crit', label: 'CHT Critical Limit', value: 240, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'egt_warn', label: 'EGT Warning Limit', value: 750, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'egt_crit', label: 'EGT Critical Limit', value: 800, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'oil_press_min', label: 'Oil Pressure Min', value: 200, unit: 'kPa', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'oil_temp_max', label: 'Oil Temp Max', value: 110, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'vib_warn', label: 'Vibration Warning', value: 0.5, unit: 'g RMS', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'vib_crit', label: 'Vibration Critical', value: 1.0, unit: 'g RMS', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'batt_v_min', label: 'Battery Voltage Min', value: 11.5, unit: 'V', note: 'SIMULATED/CONFIGURABLE' },
    { key: 'rpm_max', label: 'RPM Maximum', value: 5800, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
];
const SIM_PARAMS = [
    { key: 'update_rate_hz', label: 'Simulator Update Rate', value: 1.0, unit: 'Hz', note: 'CONFIGURABLE' },
    { key: 'demo_speed', label: 'Demo Playback Speed', value: 1.0, unit: '×', note: 'CONFIGURABLE' },
    { key: 'noise_level', label: 'Parameter Noise Level', value: 0.02, unit: 'σ', note: 'SIMULATED' },
    { key: 'seed', label: 'Random Seed', value: 42, unit: '', note: 'CONFIGURABLE' },
];
export default function Page16_Configuration() {
    const [activeTab, setActiveTab] = useState('Engine');
    const [values, setValues] = useState({});
    const [saved, setSaved] = useState(false);
    function update(key, v) {
        setValues(prev => ({ ...prev, [key]: parseFloat(v) || 0 }));
        setSaved(false);
    }
    function save() { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    function reset() { setValues({}); setSaved(false); }
    const paramList = activeTab === 'Engine' ? ENGINE_PARAMS : activeTab === 'Limits' ? LIMITS_PARAMS : activeTab === 'Simulation' ? SIM_PARAMS : [];
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S16" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "SYSTEM CONFIGURATION" })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted", children: "engine_config.yaml [CONFIGURABLE]" }) })] }), _jsx("div", { className: "flex border-b border-border bg-surface px-2 shrink-0", children: TABS.map(tab => (_jsx("button", { onClick: () => setActiveTab(tab), className: `px-3 py-1.5 text-[clamp(9px,0.8vw,11px)] font-mono border-b-2 transition-colors
              ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'}`, children: tab }, tab))) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-3", children: [_jsx("div", { className: "mb-3 p-2 bg-advisory/5 border border-advisory/30 rounded-sm", children: _jsxs("p", { className: "text-[clamp(8px,0.7vw,10px)] text-advisory font-mono", children: ["\u26A0 All configuration values are SIMULATED/CONFIGURABLE. Changes here affect the demonstration only. In a real system, values must be validated against certified engine documentation and approved by qualified engineering personnel. Source file: ", _jsx("span", { className: "text-accent", children: "backend/engine_config.yaml" })] }) }), paramList.length > 0 ? (_jsx("div", { className: "bg-surface border border-border rounded-sm overflow-hidden", children: _jsxs("table", { className: "w-full text-[clamp(9px,0.8vw,11px)] font-mono", children: [_jsx("thead", { className: "border-b border-border bg-surface-alt", children: _jsxs("tr", { className: "text-text-muted", children: [_jsx("th", { className: "text-left px-3 py-2", children: "PARAMETER" }), _jsx("th", { className: "text-right px-3 py-2", children: "CURRENT VALUE" }), _jsx("th", { className: "text-left px-3 py-2", children: "UNIT" }), _jsx("th", { className: "text-left px-3 py-2", children: "OVERRIDE" }), _jsx("th", { className: "text-left px-3 py-2", children: "LABEL" })] }) }), _jsx("tbody", { children: paramList.map(p => (_jsxs("tr", { className: "border-b border-border/30 hover:bg-surface-alt", children: [_jsx("td", { className: "px-3 py-1.5 text-text-secondary", children: p.label }), _jsx("td", { className: "px-3 py-1.5 text-right font-bold text-text-primary", children: values[p.key] ?? p.value }), _jsx("td", { className: "px-3 py-1.5 text-text-muted", children: p.unit }), _jsx("td", { className: "px-3 py-1.5", children: _jsx("input", { type: "number", step: "any", placeholder: String(p.value), value: values[p.key] ?? '', onChange: e => update(p.key, e.target.value), className: "w-28 bg-surface-alt border border-border text-text-primary px-1.5 py-0.5 rounded-sm text-[clamp(9px,0.8vw,11px)] font-mono focus:border-accent outline-none" }) }), _jsx("td", { className: "px-3 py-1.5 text-[clamp(8px,0.7vw,10px)] text-text-muted", children: p.note })] }, p.key))) })] }) })) : activeTab === 'Models' ? (_jsx(ModelRegistry, {})) : activeTab === 'System' ? (_jsx(SystemInfo, {})) : null, paramList.length > 0 && (_jsxs("div", { className: "flex items-center gap-2 mt-3", children: [_jsx("button", { onClick: save, className: `px-3 py-1.5 text-[clamp(10px,0.9vw,12px)] font-mono border rounded-sm transition-colors
              ${saved ? 'border-healthy text-healthy bg-healthy/10' : 'border-accent text-accent hover:bg-accent/10'}`, children: saved ? '✓ SAVED (DEMO ONLY)' : 'SAVE CHANGES' }), _jsx("button", { onClick: reset, className: "px-3 py-1.5 text-[clamp(10px,0.9vw,12px)] font-mono border border-border text-text-muted rounded-sm hover:border-warning hover:text-warning transition-colors", children: "RESET TO DEFAULTS" }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono ml-2", children: "Changes apply to demo display only \u2014 modify engine_config.yaml for persistent changes" })] }))] })] }));
}
function ModelRegistry() {
    return (_jsxs("div", { className: "bg-surface border border-border rounded-sm p-3", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-3", children: "ML MODEL REGISTRY [DEMONSTRATION MODELS]" }), _jsxs("table", { className: "w-full text-[clamp(9px,0.8vw,11px)] font-mono", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border text-text-muted", children: [_jsx("th", { className: "text-left py-1", children: "MODEL NAME" }), _jsx("th", { className: "text-left py-1", children: "TYPE" }), _jsx("th", { className: "text-left py-1", children: "ALGORITHM" }), _jsx("th", { className: "text-left py-1", children: "TRAINING DATA" }), _jsx("th", { className: "text-center py-1", children: "STATUS" }), _jsx("th", { className: "text-left py-1", children: "DISCLAIMER" })] }) }), _jsx("tbody", { children: [
                            { name: 'AnomalyDetector', type: 'ANOMALY_DETECTION', algo: 'IsolationForest', data: 'Synthetic [10K samples]', active: true },
                            { name: 'FaultClassifier', type: 'FAULT_CLASSIFICATION', algo: 'RandomForestClassifier', data: 'Synthetic [5 classes]', active: true },
                            { name: 'RULEstimator', type: 'RUL_ESTIMATION', algo: 'Physics Degradation Model', data: 'N/A (physics)', active: true },
                        ].map(m => (_jsxs("tr", { className: "border-b border-border/30", children: [_jsx("td", { className: "py-1.5 text-accent", children: m.name }), _jsx("td", { className: "py-1.5 text-text-secondary", children: m.type }), _jsx("td", { className: "py-1.5", children: m.algo }), _jsx("td", { className: "py-1.5 text-text-muted", children: m.data }), _jsx("td", { className: "py-1.5 text-center", children: _jsx("span", { className: "text-healthy", children: "ACTIVE" }) }), _jsx("td", { className: "py-1.5 text-[clamp(8px,0.7vw,10px)] text-text-muted", children: "DEMONSTRATION MODEL" })] }, m.name))) })] })] }));
}
function SystemInfo() {
    return (_jsx("div", { className: "grid grid-cols-2 gap-3", children: [
            { title: 'System', items: [
                    ['Product', 'AI-Enabled Digital Twin — MALE UAV Engine'],
                    ['Version', '1.0.0 DEMONSTRATION'],
                    ['Classification', 'RESEARCH PROTOTYPE'],
                    ['Status', 'NOT FOR OPERATIONAL USE'],
                ] },
            { title: 'Stack', items: [
                    ['Backend', 'Python FastAPI + SQLite'],
                    ['Frontend', 'React 18 + TypeScript + Vite'],
                    ['ML', 'scikit-learn (IsolationForest, RandomForest)'],
                    ['Simulator', 'Physics-informed model (ISA + ICE)'],
                ] },
            { title: 'Data', items: [
                    ['Source', 'SIMULATOR — SYNTHETIC'],
                    ['Update Rate', '1 Hz [CONFIGURABLE]'],
                    ['Protocol', 'WebSocket / JSON'],
                    ['DB', 'SQLite (TimescaleDB-ready)'],
                ] },
            { title: 'Disclaimers', items: [
                    ['Limits', 'SIMULATED/CONFIGURABLE — Not certified'],
                    ['Health', 'DEMONSTRATION MODEL — Not aerospace-validated'],
                    ['RUL', 'SIMULATION-BASED — Not validated vs real data'],
                    ['ML', 'Trained on synthetic data only'],
                ] },
        ].map(({ title, items }) => (_jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2 border-b border-border pb-1", children: title.toUpperCase() }), items.map(([k, v]) => (_jsxs("div", { className: "flex justify-between py-0.5", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: k }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary text-right max-w-[60%]", children: v })] }, k)))] }, title))) }));
}
