import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// S15 — Fleet View
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { fmt, healthColor, healthBgColor, healthLabel } from '../utils/formatters';
const ENGINE_STATE_COLOR = {
    RUNNING: 'text-healthy', CRUISE: 'text-healthy', IDLE: 'text-advisory',
    OFF: 'text-text-muted', MAINTENANCE: 'text-warning', STARTUP: 'text-accent',
    SHUTDOWN: 'text-warning',
};
export default function Page15_FleetView() {
    const [fleet, setFleet] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = () => {
            api.fleet.get().then((d) => { setFleet(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
        };
        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, []);
    const filtered = filter === 'ALL' ? fleet :
        filter === 'WARN' ? fleet.filter(c => (c.overall_health ?? 100) < 70) :
            fleet.filter(c => c.active_fault_count > 0);
    const totalActive = fleet.filter(c => !['OFF', 'MAINTENANCE'].includes(c.engine_state ?? '')).length;
    const totalWarn = fleet.filter(c => (c.overall_health ?? 100) < 70).length;
    const totalFault = fleet.filter(c => c.active_fault_count > 0).length;
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S15" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "FLEET VIEW" })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted", children: "SIMULATED FLEET DATA" }) })] }), _jsxs("div", { className: "bg-surface border-b border-border px-3 py-2 shrink-0 flex items-center gap-6", children: [[
                        { label: 'TOTAL UAVs', value: fleet.length, color: 'text-text-primary' },
                        { label: 'ACTIVE', value: totalActive, color: 'text-healthy' },
                        { label: 'WARNINGS', value: totalWarn, color: totalWarn > 0 ? 'text-warning' : 'text-text-muted' },
                        { label: 'FAULTS', value: totalFault, color: totalFault > 0 ? 'text-critical' : 'text-text-muted' },
                    ].map(({ label, value, color }) => (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: label }), _jsx("div", { className: `text-[clamp(18px,1.7vw,22px)] font-bold font-mono ${color}`, children: value })] }, label))), _jsx("div", { className: "ml-auto flex items-center gap-1", children: ['ALL', 'WARN', 'FAULT'].map(f => (_jsx("button", { onClick: () => setFilter(f), className: `px-2 py-1 text-[clamp(9px,0.8vw,11px)] font-mono border rounded-sm transition-colors
                ${filter === f ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-accent/50'}`, children: f }, f))) })] }), _jsxs("div", { className: "flex-1 p-2 overflow-y-auto", children: [loading && _jsx("div", { className: "text-center py-8 text-text-muted font-mono", children: "Loading fleet data..." }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: filtered.map((card, i) => (_jsx(FleetCardComp, { card: card }, i))) }), !loading && fleet.length === 0 && (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx("p", { className: "text-text-muted font-mono text-[clamp(12px,1.1vw,14px)]", children: "No fleet data available \u2014 check backend connection" }) }))] })] }));
}
function FleetCardComp({ card }) {
    const score = card.overall_health ?? 85;
    const hasIssue = card.active_fault_count > 0 || score < 70;
    const ENGINE_STATE_COLOR = {
        RUNNING: 'text-healthy', CRUISE: 'text-healthy', IDLE: 'text-advisory',
        OFF: 'text-text-muted', MAINTENANCE: 'text-warning',
    };
    return (_jsxs("div", { className: `bg-surface border rounded-sm p-3 ${hasIssue ? 'border-warning/60' : 'border-border'}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[clamp(10px,0.9vw,12px)] font-bold font-mono text-accent", children: card.uav_id }), _jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary", children: card.engine_id })] }), _jsxs("div", { className: "flex flex-col items-end gap-1", children: [_jsx("span", { className: `text-[clamp(8px,0.7vw,10px)] font-mono font-bold px-1.5 py-0.5 border rounded-sm
            ${card.uav_status === 'OPERATIONAL' ? 'border-healthy/50 text-healthy bg-healthy/10' :
                                    card.uav_status === 'MAINTENANCE' ? 'border-warning/50 text-warning bg-warning/10' :
                                        'border-border text-text-muted bg-surface-alt'}`, children: card.uav_status ?? 'UNKNOWN' }), _jsx("span", { className: `text-[clamp(8px,0.7vw,10px)] font-mono ${ENGINE_STATE_COLOR[card.engine_state ?? ''] ?? 'text-text-muted'}`, children: card.engine_state ?? 'UNKNOWN' })] })] }), _jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "flex justify-between items-center mb-1", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: "ENGINE HEALTH [SIM]" }), _jsx("span", { className: `text-[clamp(12px,1.1vw,14px)] font-bold font-mono ${healthColor(score)}`, children: Math.round(score) })] }), _jsx("div", { className: "h-2 bg-surface-alt rounded-full overflow-hidden", children: _jsx("div", { className: "h-full rounded-full transition-all", style: { width: `${score}%`, backgroundColor: healthBgColor(score) } }) }), _jsx("div", { className: `text-[clamp(8px,0.7vw,10px)] font-mono mt-0.5 ${healthColor(score)}`, children: healthLabel(score) })] }), _jsx("div", { className: "grid grid-cols-2 gap-1 mb-2", children: [
                    { label: 'RUL', value: `${fmt(card.rul_hours, 0)} h`, color: card.rul_hours && card.rul_hours < 200 ? 'text-warning' : 'text-text-secondary' },
                    { label: 'Ops Hrs', value: `${fmt(card.total_operating_hours, 1)} h`, color: 'text-text-secondary' },
                    { label: 'Active Faults', value: String(card.active_fault_count), color: card.active_fault_count > 0 ? 'text-critical' : 'text-healthy' },
                    { label: 'Maintenance', value: card.maintenance_pending ? 'PENDING' : 'OK', color: card.maintenance_pending ? 'text-warning' : 'text-healthy' },
                ].map(({ label, value, color }) => (_jsxs("div", { className: "bg-surface-alt rounded-sm px-1.5 py-1", children: [_jsx("div", { className: "text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono", children: label }), _jsx("div", { className: `text-[clamp(10px,0.9vw,12px)] font-bold font-mono ${color}`, children: value })] }, label))) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono", children: ["Last: ", card.last_telemetry ? new Date(card.last_telemetry).toLocaleTimeString('en-GB', { hour12: false }) : '—'] }), _jsxs("div", { className: `flex items-center gap-1 ${card.last_telemetry ? 'text-healthy' : 'text-critical'}`, children: [_jsx("div", { className: `w-1.5 h-1.5 rounded-full ${card.last_telemetry ? 'bg-healthy' : 'bg-critical'}` }), _jsx("span", { className: "text-[clamp(7px,0.6vw,9px)] font-mono", children: card.last_telemetry ? 'LIVE' : 'NO DATA' })] })] }), _jsx("div", { className: "mt-1 text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono border-t border-border/30 pt-1", children: "SIMULATED DATA" })] }));
}
