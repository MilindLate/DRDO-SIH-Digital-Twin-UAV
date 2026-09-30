import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// S11 — Maintenance Center
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { fmt } from '../utils/formatters';
const PRIORITY_COLOR = {
    URGENT: 'text-critical border-critical bg-critical/10',
    HIGH: 'text-warning border-warning bg-warning/10',
    MEDIUM: 'text-advisory border-advisory bg-advisory/10',
    LOW: 'text-text-muted border-border bg-surface-alt',
};
export default function Page11_Maintenance() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.maintenance.list().then((d) => { setRecords(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    async function complete(id) {
        try {
            await api.maintenance.complete(id);
            setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED' } : r));
        }
        catch { }
    }
    const pending = records.filter(r => r.status !== 'COMPLETED');
    const completed = records.filter(r => r.status === 'COMPLETED');
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S11" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "MAINTENANCE CENTER" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-warning font-mono text-[clamp(10px,0.9vw,12px)]", children: [pending.length, " Pending"] }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-warning px-1 text-warning", children: "NOT certified maintenance instructions" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-2 space-y-2", children: [loading && _jsx("div", { className: "text-center py-8 text-text-muted font-mono text-[clamp(12px,1.1vw,14px)]", children: "Loading..." }), pending.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono px-1 mb-1", children: ["PENDING ACTIONS (", pending.length, ")"] }), _jsx("div", { className: "space-y-2", children: pending.map(r => (_jsxs("div", { className: "bg-surface border border-border rounded-sm p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `text-[clamp(8px,0.7vw,10px)] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${PRIORITY_COLOR[r.priority] ?? PRIORITY_COLOR.LOW}`, children: r.priority }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: r.affected_subsystem })] }), _jsx("h3", { className: "text-[clamp(10px,0.9vw,12px)] font-bold font-mono text-text-primary", children: r.title }), _jsx("p", { className: "text-[clamp(9px,0.8vw,11px)] text-text-secondary font-mono mt-1", children: r.reason ?? r.description }), r.estimated_remaining_hours && (_jsxs("p", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono mt-1", children: ["Est. remaining: ", fmt(r.estimated_remaining_hours, 0), " h [SIM]"] })), r.evidence && r.evidence.length > 0 && (_jsxs("div", { className: "mt-1 text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: ["Evidence: ", r.evidence.map((e) => e.source ?? e.parameter).join(', ')] }))] }), _jsx("button", { onClick: () => complete(r.id), className: "px-2 py-1 text-[clamp(9px,0.8vw,11px)] font-mono border border-healthy text-healthy rounded-sm hover:bg-healthy/10 transition-colors shrink-0", children: "\u2713 COMPLETE" })] }), _jsx("div", { className: "mt-2 p-1.5 bg-warning/5 border border-warning/30 rounded-sm", children: _jsx("p", { className: "text-[clamp(8px,0.7vw,10px)] text-warning font-mono", children: r.disclaimer ?? 'DEMONSTRATION MODEL — Not a certified maintenance instruction. Require qualified engineering validation.' }) })] }, r.id))) })] })), completed.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono px-1 mb-1", children: ["COMPLETED (", completed.length, ")"] }), _jsx("div", { className: "space-y-1", children: completed.map(r => (_jsxs("div", { className: "bg-surface border border-border/50 rounded-sm px-3 py-2 flex items-center justify-between opacity-60", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: "[COMPLETED]" }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-secondary ml-2", children: r.title })] }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-muted", children: r.affected_subsystem })] }, r.id))) })] })), !loading && records.length === 0 && (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-healthy font-mono text-[clamp(12px,1.1vw,14px)]", children: "No maintenance actions pending" }), _jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mt-1", children: "System within normal parameters [SIMULATED]" })] }) }))] })] }));
}
