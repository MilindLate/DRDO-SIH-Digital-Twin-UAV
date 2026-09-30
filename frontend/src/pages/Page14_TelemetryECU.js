import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// S14 — Telemetry / ECU Data Source
import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { fmtTS, fmt } from '../utils/formatters';
export default function Page14_TelemetryECU() {
    const { telemetry: t, telemetryHistory, wsConnected } = useStore();
    const [pktCount, setPktCount] = useState(0);
    const [rate, setRate] = useState(0);
    const [lastRateTs, setLastRateTs] = useState(Date.now());
    useEffect(() => {
        if (t) {
            setPktCount(c => c + 1);
            const now = Date.now();
            setRate(Math.round(1000 / Math.max(1, now - lastRateTs) * 10) / 10);
            setLastRateTs(now);
        }
    }, [t]);
    const pipeline = [
        { stage: 'DATA SOURCE', detail: 'SIMULATOR (physics model)', status: 'ACTIVE' },
        { stage: 'PROTOCOL ADAPTER', detail: 'WebSocket / JSON', status: 'ACTIVE' },
        { stage: 'VALIDATION', detail: 'Range & type checks', status: 'ACTIVE' },
        { stage: 'TIME SYNC', detail: 'UTC ISO8601', status: 'ACTIVE' },
        { stage: 'DIGITAL TWIN', detail: 'State update 1 Hz', status: 'ACTIVE' },
        { stage: 'AI ENGINE', detail: 'IsolationForest + RandomForest', status: 'ACTIVE' },
        { stage: 'DASHBOARD', detail: 'React WebSocket client', status: wsConnected ? 'ACTIVE' : 'DISCONNECTED' },
    ];
    const recentRecords = telemetryHistory.slice(-8).reverse();
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S14" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "TELEMETRY / ECU DATA SOURCE" })] }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted", children: "SOURCE: SIMULATOR \u2014 Replace with CAN/ECU/FADEC" })] }), _jsxs("div", { className: "flex-1 p-2 flex gap-2 min-h-0", children: [_jsxs("div", { className: "w-80 flex flex-col gap-2 shrink-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded-sm p-3", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "DATA SOURCE STATUS" }), [
                                        ['Source', 'SIMULATOR [DEMONSTRATION]'],
                                        ['Protocol', 'WebSocket / JSON (simulated)'],
                                        ['Connection', wsConnected ? 'CONNECTED' : 'DISCONNECTED'],
                                        ['Data Rate', `${rate.toFixed(1)} rec/s`],
                                        ['Total Packets', pktCount],
                                        ['Last Packet', fmtTS(t?.timestamp)],
                                        ['Packet Loss', '0% [SIMULATED]'],
                                        ['Latency', '<1ms [LOCAL]'],
                                        ['CAN Bus', 'NOT CONNECTED [FUTURE]'],
                                        ['FADEC Link', 'NOT CONNECTED [FUTURE]'],
                                    ].map(([k, v]) => (_jsxs("div", { className: "flex justify-between py-0.5 border-b border-border/30", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: k }), _jsx("span", { className: `text-[clamp(9px,0.8vw,11px)] font-mono ${v === 'CONNECTED' ? 'text-healthy' : v === 'DISCONNECTED' ? 'text-critical' :
                                                    String(v).includes('FUTURE') ? 'text-text-muted' : 'text-text-secondary'}`, children: String(v) })] }, k)))] }), _jsxs("div", { className: "bg-advisory/5 border border-advisory/30 rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-advisory font-mono mb-1", children: "FUTURE CAN/ECU INTEGRATION PATH" }), _jsxs("div", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono space-y-0.5", children: [_jsxs("p", { children: ["\u2022 Replace ", _jsx("span", { className: "text-accent", children: "RealtimeSimulator" }), " with CAN bus reader"] }), _jsx("p", { children: "\u2022 Implement protocol adapter (MAVLink / DroneCAN / custom)" }), _jsx("p", { children: "\u2022 Add ECU parameter mapping in engine_config.yaml" }), _jsx("p", { children: "\u2022 Real sensor \u2192 digital twin synchronisation" }), _jsx("p", { children: "\u2022 Timestamp alignment with GPS/PPS" })] })] }), _jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2", children: "DATA QUALITY STATISTICS" }), [
                                        ['Total Parameters', '28'],
                                        ['Valid Range', '100% [SIM]'],
                                        ['Missing Values', '0%'],
                                        ['Outliers', '0%'],
                                        ['Quality Flag', `${t?.quality_flag ?? 100} / 100`],
                                    ].map(([k, v]) => (_jsxs("div", { className: "flex justify-between py-0.5", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: k }), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-healthy", children: v })] }, k)))] })] }), _jsxs("div", { className: "flex-1 flex flex-col gap-2 min-h-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded-sm p-3", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-3", children: "TELEMETRY PIPELINE [SIMULATED]" }), _jsx("div", { className: "flex items-center gap-1 overflow-x-auto pb-1", children: pipeline.map((s, i) => (_jsxs(React.Fragment, { children: [_jsxs("div", { className: `flex flex-col items-center min-w-[90px] p-2 border rounded-sm
                    ${s.status === 'ACTIVE' ? 'border-healthy/40 bg-healthy/5' :
                                                        s.status === 'DISCONNECTED' ? 'border-critical/40 bg-critical/5' :
                                                            'border-border bg-surface-alt'}`, children: [_jsx("div", { className: "text-[clamp(7px,0.6vw,9px)] font-mono font-bold text-text-secondary text-center", children: s.stage }), _jsx("div", { className: `text-[clamp(6px,0.5vw,8px)] font-mono mt-0.5 text-center ${s.status === 'ACTIVE' ? 'text-healthy' : 'text-critical'}`, children: s.status }), _jsx("div", { className: "text-[clamp(6px,0.5vw,8px)] text-text-muted font-mono mt-0.5 text-center leading-tight", children: s.detail })] }), i < pipeline.length - 1 && _jsx("div", { className: "text-accent font-mono text-[clamp(10px,0.9vw,12px)] shrink-0", children: "\u2192" })] }, s.stage))) })] }), _jsxs("div", { className: "bg-surface border border-border rounded-sm flex-1 min-h-0 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "px-2 py-1 border-b border-border text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono shrink-0", children: ["RAW TELEMETRY STREAM (last ", recentRecords.length, " records) [SIMULATED]"] }), _jsxs("div", { className: "flex-1 overflow-y-auto font-mono text-[clamp(8px,0.7vw,10px)]", children: [recentRecords.map((r, i) => (_jsxs("div", { className: `px-2 py-1 border-b border-border/20 ${i === 0 ? 'bg-accent/5' : ''}`, children: [_jsx("span", { className: "text-text-muted", children: fmtTS(r.timestamp) }), ' | ', _jsx("span", { className: "text-accent", children: "RPM:" }), _jsx("span", { className: "text-text-primary", children: fmt(r.rpm, 0) }), ' | ', _jsx("span", { className: "text-accent", children: "CHT:" }), _jsx("span", { className: "text-text-primary", children: fmt(r.cht_c, 1) }), ' | ', _jsx("span", { className: "text-accent", children: "EGT:" }), _jsx("span", { className: "text-text-primary", children: fmt(r.egt_c, 1) }), ' | ', _jsx("span", { className: "text-accent", children: "OilP:" }), _jsx("span", { className: "text-text-primary", children: fmt(r.oil_pressure_kpa, 0) }), ' | ', _jsx("span", { className: "text-accent", children: "Vib:" }), _jsx("span", { className: "text-text-primary", children: fmt(r.vibration_rms_g, 4) }), ' | ', _jsxs("span", { className: "text-text-muted", children: [r.engine_state, "/", r.mission_phase] }), ' | ', _jsxs("span", { className: "text-text-muted", children: ["SRC:", r.data_source ?? 'SIM'] })] }, i))), recentRecords.length === 0 && (_jsx("div", { className: "px-2 py-4 text-text-muted text-center", children: "Waiting for telemetry data..." }))] })] })] })] })] }));
}
