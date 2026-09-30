import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// S09 — Mission Replay
import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { fmt, fmtTS, paramStatus, statusColor } from '../utils/formatters';
export default function Page09_MissionReplay() {
    const [missions, setMissions] = useState([]);
    const [selected, setSelected] = useState('');
    const [replayData, setReplayData] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [speed, setSpeed] = useState(5);
    const intervalRef = useRef(null);
    useEffect(() => {
        api.missions.list().then((d) => setMissions(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);
    useEffect(() => {
        if (!selected)
            return;
        api.missions.replay(selected).then((d) => {
            setReplayData(d);
            setCurrentIdx(0);
            setPlaying(false);
        }).catch(() => { });
    }, [selected]);
    useEffect(() => {
        if (playing && replayData?.telemetry?.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIdx(i => {
                    if (i >= replayData.telemetry.length - 1) {
                        setPlaying(false);
                        return i;
                    }
                    return i + 1;
                });
            }, 1000 / speed);
        }
        else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [playing, speed, replayData]);
    const telem = replayData?.telemetry ?? [];
    const faults = replayData?.fault_events ?? [];
    const current = telem[currentIdx] || {};
    const progress = telem.length > 0 ? currentIdx / (telem.length - 1) : 0;
    return (_jsxs("div", { className: "h-screen flex flex-col bg-bg text-text-primary", children: [_jsxs("div", { className: "flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono", children: "S09" }), _jsx("h1", { className: "text-[clamp(12px,1.1vw,14px)] font-bold font-mono", children: "MISSION REPLAY" })] }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted", children: "SIMULATED TELEMETRY PLAYBACK" })] }), _jsxs("div", { className: "bg-surface border-b border-border px-3 py-2 shrink-0 flex items-center gap-4", children: [_jsxs("select", { value: selected, onChange: e => setSelected(e.target.value), className: "bg-surface-alt border border-border text-text-primary text-[clamp(10px,0.9vw,12px)] font-mono px-2 py-1 rounded-sm", children: [_jsx("option", { value: "", children: "\u2014 Select Mission \u2014" }), missions.map(m => _jsxs("option", { value: m.mission_id, children: [m.mission_id, " \u2014 ", m.description] }, m.mission_id))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setCurrentIdx(0), className: "w-7 h-7 border border-border text-text-secondary rounded-sm text-[clamp(12px,1.1vw,14px)] hover:border-accent flex items-center justify-center", children: "\u23EE" }), _jsx("button", { onClick: () => setPlaying(p => !p), disabled: !replayData, className: "w-8 h-7 border border-accent text-accent rounded-sm hover:bg-accent/10 flex items-center justify-center text-[clamp(12px,1.1vw,14px)]", children: playing ? '⏸' : '▶' }), _jsx("button", { onClick: () => setCurrentIdx(Math.min(telem.length - 1, currentIdx + 10)), className: "w-7 h-7 border border-border text-text-secondary rounded-sm hover:border-accent flex items-center justify-center text-[clamp(12px,1.1vw,14px)]", children: "\u23E9" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted", children: "Speed:" }), [1, 2, 5, 10].map(s => (_jsxs("button", { onClick: () => setSpeed(s), className: `px-1.5 py-0.5 text-[clamp(9px,0.8vw,11px)] font-mono border rounded-sm ${speed === s ? 'border-accent text-accent' : 'border-border text-text-muted'}`, children: [s, "\u00D7"] }, s)))] }), telem.length > 0 && (_jsxs(_Fragment, { children: [_jsx("input", { type: "range", min: 0, max: telem.length - 1, value: currentIdx, onChange: e => { setCurrentIdx(Number(e.target.value)); setPlaying(false); }, className: "flex-1 accent-accent" }), _jsxs("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-text-muted", children: [currentIdx + 1, "/", telem.length] })] })), _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] font-mono text-accent", children: fmtTS(current.timestamp) })] }), !replayData ? (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx("p", { className: "text-text-muted font-mono text-[clamp(12px,1.1vw,14px)]", children: "Select a mission to begin replay" }) })) : (_jsxs("div", { className: "flex flex-1 gap-2 p-2 min-h-0", children: [_jsx("div", { className: "flex-1 grid grid-cols-4 gap-1.5 content-start", children: [
                            { label: 'RPM', param: 'rpm', value: current.rpm, unit: 'RPM' },
                            { label: 'CHT', param: 'cht_c', value: current.cht_c, unit: '°C' },
                            { label: 'EGT', param: 'egt_c', value: current.egt_c, unit: '°C' },
                            { label: 'Oil Pres.', param: 'oil_pressure_kpa', value: current.oil_pressure_kpa, unit: 'kPa' },
                            { label: 'Oil Temp', param: 'oil_temperature_c', value: current.oil_temperature_c, unit: '°C' },
                            { label: 'Fuel Flow', param: 'fuel_flow_lph', value: current.fuel_flow_lph, unit: 'L/h' },
                            { label: 'Vibration', param: 'vibration_rms_g', value: current.vibration_rms_g, unit: 'g' },
                            { label: 'Battery', param: 'battery_voltage_v', value: current.battery_voltage_v, unit: 'V' },
                            { label: 'Throttle', param: 'throttle_pct', value: current.throttle_pct, unit: '%' },
                            { label: 'Load', param: 'engine_load_pct', value: current.engine_load_pct, unit: '%' },
                            { label: 'Altitude', param: 'altitude_m', value: current.altitude_m, unit: 'm' },
                            { label: 'Fuel Qty', param: 'fuel_quantity_l', value: current.fuel_quantity_l, unit: 'L' },
                        ].map(({ label, param, value, unit }) => {
                            const st = paramStatus(param, value);
                            return (_jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsxs("div", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: [label, " ", _jsx("span", { className: "text-[clamp(7px,0.6vw,9px)]", children: "[SIM]" })] }), _jsxs("div", { className: `font-mono text-[clamp(12px,1.1vw,14px)] font-bold ${statusColor(st)}`, children: [fmt(value, 2), " ", _jsx("span", { className: "text-[clamp(9px,0.8vw,11px)] text-text-secondary", children: unit })] })] }, param));
                        }) }), _jsxs("div", { className: "w-52 flex flex-col gap-2 shrink-0", children: [_jsxs("div", { className: "bg-surface border border-border rounded-sm p-2", children: [_jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1", children: "MISSION INFO" }), replayData.mission && Object.entries({
                                        'Mission ID': replayData.mission.mission_id,
                                        'Type': replayData.mission.mission_type,
                                        'Status': replayData.mission.status,
                                        'Duration': `${replayData.mission.actual_duration_hours?.toFixed(1)}h`,
                                        'Phase': current.mission_phase ?? '—',
                                        'State': current.engine_state ?? '—',
                                    }).map(([k, v]) => (_jsxs("div", { className: "flex justify-between py-0.5 border-b border-border/30", children: [_jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono", children: k }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary", children: v })] }, k)))] }), _jsxs("div", { className: "bg-surface border border-border rounded-sm p-2 flex-1 overflow-y-auto", children: [_jsxs("div", { className: "text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-1", children: ["FAULT EVENTS (", faults.length, ")"] }), faults.map((f, i) => (_jsxs("div", { className: "p-1.5 border border-border/40 rounded-sm mb-1", children: [_jsx("div", { className: `text-[clamp(8px,0.7vw,10px)] font-bold font-mono ${f.severity === 'CRITICAL' ? 'text-critical' : f.severity === 'WARNING' ? 'text-warning' : 'text-advisory'}`, children: f.severity }), _jsx("div", { className: "text-[clamp(8px,0.7vw,10px)] text-text-secondary font-mono", children: f.label ?? f.fault_type }), _jsx("div", { className: "text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono", children: fmtTS(f.detection_timestamp) }), _jsxs("div", { className: "text-[clamp(7px,0.6vw,9px)] text-text-muted font-mono", children: ["Conf: ", f.confidence ? (f.confidence * 100).toFixed(0) + '%' : '—', " [SIM]"] })] }, i))), faults.length === 0 && _jsx("div", { className: "text-[clamp(9px,0.8vw,11px)] text-healthy font-mono", children: "No faults in this mission" })] })] })] }))] }));
}
