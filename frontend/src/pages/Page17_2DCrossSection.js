import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Flame, Droplet, Wind, Crosshair, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
function mapStoreToAdapter(telemetry, health, faults) {
    if (!telemetry) {
        return { telemetryAdapter: null, dtStateAdapter: null };
    }
    const telemetryAdapter = {
        timestamp: Date.now(),
        engine_id: telemetry.engine_id || 'ENG-001',
        mission_profile: 'standard_isr',
        rpm: telemetry.rpm || 0,
        cht: telemetry.cht_c || 0,
        egt: telemetry.egt_c || 0,
        oil_pressure: (telemetry.oil_pressure_kpa || 0) / 100, // convert kpa to bar roughly
        oil_temp: telemetry.oil_temperature_c || 0,
        fuel_flow: telemetry.fuel_flow_lph || 0,
        vibration: (telemetry.vibration_rms_g || 0) * 10,
        throttle: telemetry.throttle_pct || 0,
        altitude: telemetry.altitude_m || 0,
        ambient_temp: telemetry.ambient_temperature_c || 0,
        battery_voltage: telemetry.battery_voltage_v || 0
    };
    const dtStateAdapter = {
        timestamp: Date.now(),
        overall_health: health ? health.overall_health : 100,
        subsystem_health: {
            combustion: health ? health.combustion_health : 100,
            thermal: health ? health.thermal_health : 100,
            lubrication: health ? health.lubrication_health : 100,
            mechanical: health ? health.mechanical_health : 100
        },
        expected_values: {
            egt: 700,
            fuel_flow: 15,
            cht: 120,
            oil_pressure: 3.5,
            vibration: 2
        },
        residuals: { egt: 0 },
        rul_estimated_hours: 1500,
        active_alerts: faults.map(f => ({
            id: f.fault_type,
            type: f.fault_type,
            severity: f.severity,
            component: 'Engine',
            timestamp: Date.now()
        }))
    };
    return { telemetryAdapter, dtStateAdapter };
}
// Firing order 1 - 3 - 2 - 4 over 720 deg (4-stroke cycle)
// Phase offsets in degrees of crank angle (0 to 720)
const CYLINDER_CONFIG = [
    { id: 1, label: 'CYL 01 (FRONT-LEFT)', bank: 'left', row: 0, phaseOffset: 0 },
    { id: 2, label: 'CYL 02 (FRONT-RIGHT)', bank: 'right', row: 0, phaseOffset: 360 },
    { id: 3, label: 'CYL 03 (REAR-LEFT)', bank: 'left', row: 1, phaseOffset: 180 },
    { id: 4, label: 'CYL 04 (REAR-RIGHT)', bank: 'right', row: 1, phaseOffset: 540 },
];
function getStrokeInfo(cycleAngle) {
    // cycleAngle in [0, 720)
    // 0-180: Power (Combustion expansion)
    // 180-360: Exhaust
    // 360-540: Intake
    // 540-720: Compression
    const norm = ((cycleAngle % 720) + 720) % 720;
    if (norm < 180) {
        return {
            name: 'POWER',
            progress: norm / 180,
            intakeValve: 0,
            exhaustValve: norm > 145 ? (norm - 145) / 35 : 0, // EVO before BDC
            spark: norm < 28,
            fuelSpray: 0,
        };
    }
    else if (norm < 360) {
        const p = (norm - 180) / 180;
        return {
            name: 'EXHAUST',
            progress: p,
            intakeValve: norm > 340 ? (norm - 340) / 20 : 0, // Valve overlap
            exhaustValve: Math.sin(p * Math.PI),
            spark: false,
            fuelSpray: 0,
        };
    }
    else if (norm < 540) {
        const p = (norm - 360) / 180;
        return {
            name: 'INTAKE',
            progress: p,
            intakeValve: Math.sin(p * Math.PI),
            exhaustValve: norm < 375 ? 1 - (norm - 360) / 15 : 0,
            spark: false,
            fuelSpray: p > 0.15 && p < 0.85 ? Math.sin(((p - 0.15) / 0.7) * Math.PI) : 0,
        };
    }
    else {
        const p = (norm - 540) / 180;
        return {
            name: 'COMPRESSION',
            progress: p,
            intakeValve: 0,
            exhaustValve: 0,
            spark: norm > 702, // Ignition advance 18 deg BTDC
            fuelSpray: 0,
        };
    }
}
export default function Page17_2DCrossSection() {
    const rawTelemetry = useStore((state) => state.telemetry);
    const rawHealth = useStore((state) => state.health);
    const rawFaults = useStore((state) => state.activeFaults);
    const { telemetryAdapter: telemetry, dtStateAdapter: dtState } = mapStoreToAdapter(rawTelemetry, rawHealth, rawFaults);
    if (!telemetry || !dtState) {
        return _jsx("div", { className: "flex h-full items-center justify-center text-slate-400", children: "Waiting for telemetry data..." });
    }
    const [viewMode, setViewMode] = useState('flat4');
    const [selectedCyl, setSelectedCyl] = useState(1);
    const [timeScale, setTimeScale] = useState(0.25);
    const [manualAngle, setManualAngle] = useState(0);
    const [layers, setLayers] = useState({
        thermal: true,
        lubrication: true,
        airflow: true,
        vectors: true,
        annotations: true,
    });
    // Animated crank angle (0 to 720 degrees)
    const [crankAngle, setCrankAngle] = useState(0);
    const angleRef = useRef(0);
    const lastFrameRef = useRef(performance.now());
    const telemetryRef = useRef(telemetry);
    telemetryRef.current = telemetry;
    useEffect(() => {
        let rAF;
        const animate = (now) => {
            const dt = (now - lastFrameRef.current) / 1000;
            lastFrameRef.current = now;
            if (timeScale > 0) {
                // Visually scale RPM so 2450 RPM is readable and smooth in 2D
                // At 1x visual scale: ~2.5 full 720-deg cycles per second at 2450 RPM
                const visualDegPerSec = (telemetryRef.current.rpm / 2450) * 1800 * timeScale;
                angleRef.current = (angleRef.current + visualDegPerSec * dt) % 720;
                setCrankAngle(angleRef.current);
            }
            else {
                angleRef.current = manualAngle % 720;
                setCrankAngle(angleRef.current);
            }
            rAF = requestAnimationFrame(animate);
        };
        rAF = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rAF);
    }, [timeScale, manualAngle]);
    // Detect active fault types for visual fault animations in 2D
    const hasMisfire = dtState.residuals.egt < -25 ||
        dtState.active_alerts.some((a) => a.id === 'FLT-MIS');
    const hasInjectorFault = dtState.residuals.fuel < -1.5 ||
        dtState.active_alerts.some((a) => a.id === 'FLT-INJ');
    const hasOilFault = dtState.residuals.oil_pressure < -0.5 ||
        dtState.active_alerts.some((a) => a.id === 'FLT-LUB');
    const hasOverheat = telemetry.cht > 180 ||
        dtState.active_alerts.some((a) => a.id === 'FLT-OVR');
    // Vibration jitter offset in px
    const vibPx = layers.vectors && timeScale > 0
        ? Math.sin((crankAngle * Math.PI) / 15) *
            Math.min(4.5, Math.max(0, (telemetry.vibration - 12) * 0.09))
        : 0;
    return (_jsxs("div", { className: "flex flex-col gap-4 h-full text-slate-200 select-none", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800", children: [_jsx("button", { onClick: () => setViewMode('flat4'), className: clsx('px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap', viewMode === 'flat4'
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-slate-200'), children: "Flat-4 Cross-Section" }), _jsx("button", { onClick: () => setViewMode('cutaway'), className: clsx('px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap', viewMode === 'cutaway'
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-slate-200'), children: "Cylinder Cutaway & P-V Loop" }), _jsx("button", { onClick: () => setViewMode('pid'), className: clsx('px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap', viewMode === 'pid'
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-slate-200'), children: "Subsystem P&ID Flow" })] }), _jsxs("div", { className: "flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800", children: [_jsx("span", { className: "text-[11px] font-mono text-slate-400 uppercase tracking-wider", children: "Kinematics:" }), _jsx("div", { className: "flex items-center gap-1", children: [
                                    { label: '1x Live', val: 1 },
                                    { label: '0.25x', val: 0.25 },
                                    { label: '0.05x Inspect', val: 0.05 },
                                    { label: 'Pause', val: 0 },
                                ].map((btn) => (_jsx("button", { onClick: () => {
                                        if (btn.val === 0)
                                            setManualAngle(Math.round(crankAngle));
                                        setTimeScale(btn.val);
                                    }, className: clsx('px-2 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap', timeScale === btn.val
                                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                                        : 'text-slate-400 hover:text-slate-200'), children: btn.label }, btn.label))) }), timeScale === 0 && (_jsxs("div", { className: "flex items-center gap-2 pl-2 border-l border-slate-800", children: [_jsxs("span", { className: "text-xs font-mono text-amber-400 tabular-nums", children: [manualAngle.toFixed(0), "\u00B0 CA"] }), _jsx("input", { type: "range", min: 0, max: 719, value: manualAngle, onChange: (e) => setManualAngle(Number(e.target.value)), className: "w-28 accent-cyan-400 cursor-pointer" })] }))] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(LayerToggle, { active: layers.thermal, onClick: () => setLayers((l) => ({ ...l, thermal: !l.thermal })), label: "Thermal Map", icon: _jsx(Flame, { className: "w-3.5 h-3.5 text-rose-400" }) }), _jsx(LayerToggle, { active: layers.lubrication, onClick: () => setLayers((l) => ({ ...l, lubrication: !l.lubrication })), label: "Oil Circuit", icon: _jsx(Droplet, { className: "w-3.5 h-3.5 text-amber-400" }) }), _jsx(LayerToggle, { active: layers.airflow, onClick: () => setLayers((l) => ({ ...l, airflow: !l.airflow })), label: "Gas & Spray", icon: _jsx(Wind, { className: "w-3.5 h-3.5 text-cyan-400" }) }), _jsx(LayerToggle, { active: layers.annotations, onClick: () => setLayers((l) => ({ ...l, annotations: !l.annotations })), label: "Sensors", icon: _jsx(Crosshair, { className: "w-3.5 h-3.5 text-emerald-400" }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-[580px]", children: [_jsxs("div", { className: "xl:col-span-3 bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden flex flex-col", children: [_jsxs("div", { className: "absolute top-3 left-3 z-10 flex flex-wrap items-center gap-4 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded text-xs font-mono", children: [_jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "CRANK ANGLE: " }), _jsxs("span", { className: "text-cyan-400 font-semibold tabular-nums", children: [crankAngle.toFixed(0).padStart(3, '0'), "\u00B0"] }), _jsx("span", { className: "text-slate-600", children: " / 720\u00B0" })] }), _jsx("div", { className: "h-3 w-px bg-slate-800" }), _jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "FIRING ORDER: " }), _jsx("span", { className: "text-slate-200", children: "1 - 3 - 2 - 4" })] }), _jsx("div", { className: "h-3 w-px bg-slate-800" }), _jsxs("div", { children: [_jsx("span", { className: "text-slate-500", children: "IGNITION ADVANCE: " }), _jsx("span", { className: "text-amber-400 tabular-nums", children: "18.0\u00B0 BTDC" })] })] }), (hasMisfire || hasInjectorFault || hasOilFault || hasOverheat) && (_jsxs("div", { className: "absolute top-3 right-3 z-10 flex flex-col gap-1.5", children: [hasMisfire && (_jsxs("div", { className: "bg-rose-950/90 border border-rose-700/80 text-rose-300 px-3 py-1 rounded text-xs font-mono flex items-center gap-2", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-rose-500 animate-ping" }), _jsx("span", { children: "CYL 03 IGNITION MISFIRE DETECTED" })] })), hasInjectorFault && (_jsxs("div", { className: "bg-orange-950/90 border border-orange-700/80 text-orange-300 px-3 py-1 rounded text-xs font-mono flex items-center gap-2", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-orange-500 animate-ping" }), _jsx("span", { children: "CYL 02 INJECTOR LEAN DEGRADATION" })] })), hasOilFault && (_jsxs("div", { className: "bg-amber-950/90 border border-amber-700/80 text-amber-300 px-3 py-1 rounded text-xs font-mono flex items-center gap-2", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-amber-500 animate-ping" }), _jsx("span", { children: "MAIN GALLERY OIL PRESSURE DROP" })] }))] })), _jsxs("div", { className: "flex-1 w-full h-full flex items-center justify-center p-2", children: [viewMode === 'flat4' && (_jsx(Flat4CrossSectionSVG, { crankAngle: crankAngle, telemetry: telemetry, dtState: dtState, layers: layers, selectedCyl: selectedCyl, onSelectCyl: (id) => {
                                            setSelectedCyl(id);
                                        }, onInspectCutaway: (id) => {
                                            setSelectedCyl(id);
                                            setViewMode('cutaway');
                                        }, hasMisfire: hasMisfire, hasInjectorFault: hasInjectorFault, hasOilFault: hasOilFault, vibPx: vibPx })), viewMode === 'cutaway' && (_jsx(SingleCylinderCutawaySVG, { cylId: selectedCyl, onSelectCyl: setSelectedCyl, crankAngle: crankAngle, telemetry: telemetry, dtState: dtState, layers: layers, hasMisfire: hasMisfire, hasInjectorFault: hasInjectorFault, hasOilFault: hasOilFault })), viewMode === 'pid' && (_jsx(SubsystemPIDSVG, { crankAngle: crankAngle, telemetry: telemetry, dtState: dtState, hasMisfire: hasMisfire, hasInjectorFault: hasInjectorFault, hasOilFault: hasOilFault }))] }), _jsxs("div", { className: "bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400", children: [_jsxs("div", { className: "flex items-center gap-5", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" }), "Intake Charge / Fuel Spray"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" }), "Compression / Oil Circuit"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" }), "Combustion / Exhaust Plume"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" }), "Active Sensor Node"] })] }), _jsx("div", { className: "font-mono text-[11px] text-slate-500", children: "Click any cylinder in Flat-4 view to inspect its individual cutaway & P-V loop" })] })] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-xs font-medium text-slate-400 uppercase tracking-widest", children: "Cylinder Cycle Matrix" }), _jsx("span", { className: "text-[11px] font-mono text-slate-500", children: "1-3-2-4" })] }), _jsx("div", { className: "flex flex-col gap-2.5", children: CYLINDER_CONFIG.map((cyl) => {
                                            const cylAngle = (crankAngle + cyl.phaseOffset) % 720;
                                            const stroke = getStrokeInfo(cylAngle);
                                            const isFaultyCyl = (cyl.id === 3 && hasMisfire) || (cyl.id === 2 && hasInjectorFault);
                                            // Per-cylinder localized CHT and EGT
                                            const cylEgt = cyl.id === 3 && hasMisfire
                                                ? telemetry.egt - 65
                                                : cyl.id === 2 && hasInjectorFault
                                                    ? telemetry.egt + 38
                                                    : telemetry.egt + (cyl.id % 2 === 0 ? 4 : -3);
                                            const cylCht = cyl.id === 3 && hasMisfire
                                                ? telemetry.cht - 12
                                                : cyl.id === 2 && hasInjectorFault
                                                    ? telemetry.cht + 14
                                                    : telemetry.cht + (cyl.id % 2 === 0 ? 2 : -1.5);
                                            return (_jsxs("div", { onClick: () => setSelectedCyl(cyl.id), className: clsx('p-2.5 rounded border cursor-pointer transition-colors', selectedCyl === cyl.id
                                                    ? 'bg-slate-800/90 border-cyan-500/50'
                                                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700', isFaultyCyl && 'border-rose-500/60'), children: [_jsxs("div", { className: "flex items-center justify-between text-xs mb-1.5", children: [_jsxs("span", { className: "font-mono font-semibold text-slate-200 flex items-center gap-1.5", children: ["CYL 0", cyl.id, isFaultyCyl && (_jsx("span", { className: "text-[10px] text-rose-400 font-mono", children: "[FAULT]" }))] }), _jsx("span", { className: clsx('font-mono text-[11px]', stroke.name === 'POWER'
                                                                    ? 'text-rose-400 font-semibold'
                                                                    : stroke.name === 'COMPRESSION'
                                                                        ? 'text-amber-400'
                                                                        : stroke.name === 'INTAKE'
                                                                            ? 'text-cyan-400'
                                                                            : 'text-slate-400'), children: stroke.name })] }), _jsx("div", { className: "w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2", children: _jsx("div", { className: clsx('h-full', stroke.name === 'POWER'
                                                                ? 'bg-rose-500'
                                                                : stroke.name === 'COMPRESSION'
                                                                    ? 'bg-amber-400'
                                                                    : stroke.name === 'INTAKE'
                                                                        ? 'bg-cyan-400'
                                                                        : 'bg-slate-400'), style: { width: `${(stroke.progress * 100).toFixed(0)}%` } }) }), _jsxs("div", { className: "grid grid-cols-3 gap-1 text-[11px] font-mono text-slate-400", children: [_jsxs("div", { children: ["EGT:", ' ', _jsxs("span", { className: clsx('tabular-nums', cylEgt > 765 || cylEgt < 680
                                                                            ? 'text-rose-400'
                                                                            : 'text-slate-200'), children: [cylEgt.toFixed(0), "\u00B0"] })] }), _jsxs("div", { children: ["CHT:", ' ', _jsxs("span", { className: clsx('tabular-nums', cylCht > 180 ? 'text-amber-400' : 'text-slate-200'), children: [cylCht.toFixed(0), "\u00B0"] })] }), _jsxs("div", { className: "text-right", children: [_jsx("span", { className: "text-slate-500", children: "CA:" }), ' ', _jsxs("span", { className: "text-slate-300 tabular-nums", children: [cylAngle.toFixed(0), "\u00B0"] })] })] })] }, cyl.id));
                                        }) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-lg p-4 flex-1 flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-medium text-slate-400 uppercase tracking-widest mb-3", children: "Kinematic & Fluid State" }), _jsxs("div", { className: "space-y-2.5 text-xs font-mono", children: [_jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/80", children: [_jsx("span", { className: "text-slate-400", children: "MEAN PISTON SPEED" }), _jsxs("span", { className: "text-slate-200 tabular-nums", children: [((telemetry.rpm * 0.144) / 30).toFixed(2), " m/s"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/80", children: [_jsx("span", { className: "text-slate-400", children: "FIRING FREQUENCY" }), _jsxs("span", { className: "text-slate-200 tabular-nums", children: [((telemetry.rpm / 60) * 2).toFixed(1), " Hz"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/80", children: [_jsx("span", { className: "text-slate-400", children: "INJECTOR PULSE WIDTH" }), _jsxs("span", { className: clsx('tabular-nums', hasInjectorFault ? 'text-orange-400' : 'text-cyan-400'), children: [(4.8 * (telemetry.fuel_flow / 42)).toFixed(2), " ms"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/80", children: [_jsx("span", { className: "text-slate-400", children: "PEAK CYL PRESSURE" }), _jsxs("span", { className: clsx('tabular-nums', hasMisfire ? 'text-rose-400' : 'text-emerald-400'), children: [(hasMisfire ? 38.4 : 54.2 * (telemetry.rpm / 2450)).toFixed(1), " bar"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/80", children: [_jsx("span", { className: "text-slate-400", children: "OIL GALLERY FLOW" }), _jsxs("span", { className: clsx('tabular-nums', hasOilFault ? 'text-amber-400' : 'text-slate-200'), children: [(telemetry.oil_pressure * 2.85).toFixed(1), " L/min"] })] }), _jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-slate-400", children: "COOLING AIR \u0394T" }), _jsxs("span", { className: "text-slate-200 tabular-nums", children: ["+", (telemetry.cht - telemetry.ambient_temp).toFixed(1), " \u00B0C"] })] })] })] }), _jsxs("button", { onClick: () => setViewMode(viewMode === 'cutaway' ? 'flat4' : 'cutaway'), className: "mt-4 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 rounded border border-slate-700 transition-colors flex items-center justify-center gap-2", children: [_jsx(Maximize2, { className: "w-3.5 h-3.5" }), viewMode === 'cutaway'
                                                ? 'Return to Full Flat-4 Engine'
                                                : `Inspect CYL 0${selectedCyl} Cutaway & P-V Loop`] })] })] })] })] }));
}
function LayerToggle({ active, onClick, label, icon, }) {
    return (_jsxs("button", { onClick: onClick, className: clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap', active
            ? 'bg-slate-800 text-slate-100 border-slate-700'
            : 'bg-slate-950 text-slate-500 border-slate-800/80 hover:text-slate-300'), children: [icon, _jsx("span", { children: label })] }));
}
// ============================================================================
// 1. FLAT-4 HORIZONTALLY OPPOSED ANIMATED 2D CROSS-SECTION
// ============================================================================
function Flat4CrossSectionSVG({ crankAngle, telemetry, dtState, layers, selectedCyl, onSelectCyl, onInspectCutaway, hasMisfire, hasInjectorFault, hasOilFault, vibPx, }) {
    // Center of crankcase at x = 450, y = 210 to 410
    const centerX = 450;
    const crankRadius = 28;
    const rodLength = 95;
    // Thermal color helper based on CHT
    const chtNorm = Math.max(0, Math.min(1, (telemetry.cht - 130) / 75));
    const finStrokeColor = layers.thermal
        ? chtNorm > 0.65
            ? '#f43f5e'
            : chtNorm > 0.35
                ? '#f59e0b'
                : '#38bdf8'
        : '#334155';
    // Propeller blade rotation effect at top
    const propPhase = ((crankAngle * Math.PI) / 180) * 1.5;
    const propReach = Math.cos(propPhase) * 155;
    // Dash offset for animated fluid streams
    const flowDashOffset = -((crankAngle * 0.6) % 40);
    return (_jsxs("svg", { viewBox: "0 0 900 560", className: "w-full h-full max-h-[540px]", style: {
            transform: `translate(${vibPx.toFixed(2)}px, ${(vibPx * 0.6).toFixed(2)}px)`,
        }, children: [_jsxs("defs", { children: [_jsx("pattern", { id: "engGrid", width: "30", height: "30", patternUnits: "userSpaceOnUse", children: _jsx("path", { d: "M 30 0 L 0 0 0 30", fill: "none", stroke: "#1e293b", strokeWidth: "0.6" }) }), _jsxs("radialGradient", { id: "powerFlame", cx: "50%", cy: "50%", r: "55%", children: [_jsx("stop", { offset: "0%", stopColor: "#fef08a", stopOpacity: "0.95" }), _jsx("stop", { offset: "45%", stopColor: "#f97316", stopOpacity: "0.85" }), _jsx("stop", { offset: "100%", stopColor: "#dc2626", stopOpacity: "0.1" })] }), _jsxs("radialGradient", { id: "compressionGlow", cx: "50%", cy: "50%", r: "55%", children: [_jsx("stop", { offset: "0%", stopColor: "#fbbf24", stopOpacity: "0.65" }), _jsx("stop", { offset: "100%", stopColor: "#d97706", stopOpacity: "0.08" })] }), _jsxs("radialGradient", { id: "intakeGlow", cx: "50%", cy: "50%", r: "55%", children: [_jsx("stop", { offset: "0%", stopColor: "#38bdf8", stopOpacity: "0.55" }), _jsx("stop", { offset: "100%", stopColor: "#0284c7", stopOpacity: "0.05" })] }), _jsxs("linearGradient", { id: "pistonMetal", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#64748b" }), _jsx("stop", { offset: "50%", stopColor: "#94a3b8" }), _jsx("stop", { offset: "100%", stopColor: "#475569" })] })] }), _jsx("rect", { x: "0", y: "0", width: "900", height: "560", fill: "url(#engGrid)" }), _jsx("line", { x1: centerX, y1: "25", x2: centerX, y2: "535", stroke: "#334155", strokeWidth: "1", strokeDasharray: "6 4" }), _jsx("line", { x1: "70", y1: "230", x2: "830", y2: "230", stroke: "#334155", strokeWidth: "1", strokeDasharray: "6 4" }), _jsx("line", { x1: "70", y1: "390", x2: "830", y2: "390", stroke: "#334155", strokeWidth: "1", strokeDasharray: "6 4" }), _jsxs("g", { children: [_jsx("ellipse", { cx: centerX, cy: "56", rx: "165", ry: "12", fill: "#0ea5e9", fillOpacity: "0.08", stroke: "#38bdf8", strokeOpacity: "0.3", strokeDasharray: "4 4" }), _jsx("line", { x1: centerX - propReach, y1: "56", x2: centerX + propReach, y2: "56", stroke: "#cbd5e1", strokeWidth: "7", strokeLinecap: "round" }), _jsx("line", { x1: centerX - propReach * 0.6, y1: "56", x2: centerX + propReach * 0.6, y2: "56", stroke: "#38bdf8", strokeWidth: "2" }), _jsx("path", { d: `M ${centerX - 24} 70 L ${centerX} 30 L ${centerX + 24} 70 Z`, fill: "#1e293b", stroke: "#64748b", strokeWidth: "2" }), _jsx("rect", { x: centerX - 42, y: "70", width: "84", height: "55", rx: "6", fill: "#0f172a", stroke: "#475569", strokeWidth: "2" }), _jsx("text", { x: centerX, y: "96", textAnchor: "middle", className: "fill-slate-400 text-[10px] font-mono", children: "PRSU GEARBOX" }), _jsxs("text", { x: centerX, y: "112", textAnchor: "middle", className: "fill-cyan-400 text-[11px] font-mono font-semibold", children: [telemetry.rpm.toFixed(0), " RPM"] })] }), _jsx("rect", { x: centerX - 75, y: "125", width: "150", height: "345", rx: "10", fill: "#0f172a", stroke: "#475569", strokeWidth: "2.5" }), _jsx("line", { x1: centerX - 75, y1: "190", x2: centerX + 75, y2: "190", stroke: "#1e293b", strokeWidth: "4" }), _jsx("line", { x1: centerX - 75, y1: "310", x2: centerX + 75, y2: "310", stroke: "#1e293b", strokeWidth: "4" }), _jsx("line", { x1: centerX - 75, y1: "430", x2: centerX + 75, y2: "430", stroke: "#1e293b", strokeWidth: "4" }), _jsx("line", { x1: centerX, y1: "125", x2: centerX, y2: "475", stroke: "#475569", strokeWidth: "12", strokeLinecap: "round" }), layers.lubrication && (_jsxs("g", { children: [_jsx("rect", { x: centerX - 65, y: "475", width: "130", height: "48", rx: "8", fill: "#0f172a", stroke: hasOilFault ? '#ef4444' : '#f59e0b', strokeWidth: "2" }), _jsx("text", { x: centerX, y: "495", textAnchor: "middle", className: "fill-amber-400 text-[10px] font-mono", children: "DRY SUMP OIL PUMP" }), _jsxs("text", { x: centerX, y: "512", textAnchor: "middle", className: "fill-slate-300 text-[11px] font-mono", children: [telemetry.oil_pressure.toFixed(2), " bar \u00B7 ", telemetry.oil_temp.toFixed(1), "\u00B0C"] }), _jsx("line", { x1: centerX, y1: "475", x2: centerX, y2: "145", stroke: hasOilFault ? '#ef4444' : '#f59e0b', strokeWidth: "3", strokeDasharray: "6 6", strokeDashoffset: flowDashOffset }), [210, 250, 370, 410].map((yPos, idx) => {
                        const isLeft = idx % 2 === 0;
                        return (_jsx("line", { x1: centerX, y1: yPos, x2: isLeft ? centerX - 110 : centerX + 110, y2: yPos, stroke: hasOilFault ? '#ef4444' : '#f59e0b', strokeWidth: "2", strokeDasharray: "4 5", strokeDashoffset: flowDashOffset, opacity: "0.85" }, idx));
                    })] })), CYLINDER_CONFIG.map((cyl) => {
                const isLeft = cyl.bank === 'left';
                const dir = isLeft ? -1 : 1; // -1 extends left, +1 extends right
                const yCenter = cyl.row === 0
                    ? isLeft
                        ? 210
                        : 250
                    : isLeft
                        ? 370
                        : 410;
                const cylAngle = (crankAngle + cyl.phaseOffset) % 720;
                const rad = (cylAngle * Math.PI) / 180;
                const stroke = getStrokeInfo(cylAngle);
                // Crankpin journal coordinates
                // At 0 deg (TDC for that cylinder), crankpin points outward toward cylinder head
                const pinX = centerX + dir * Math.cos(rad) * crankRadius;
                const pinY = yCenter + Math.sin(rad) * crankRadius;
                // Exact slider-crank piston wrist-pin X position along y = yCenter
                const dy = pinY - yCenter;
                const dxRod = Math.sqrt(Math.max(100, rodLength * rodLength - dy * dy));
                const wristX = pinX + dir * dxRod;
                // Cylinder geometry bounds
                const cylInnerEdge = centerX + dir * 75;
                const cylHeadEdge = centerX + dir * 235;
                const cylTopY = yCenter - 38;
                const cylBottomY = yCenter + 38;
                const pistonWidth = 28;
                const pistonHeight = 68;
                // Piston crown X coordinate (facing cylinder head)
                const pistonCrownX = wristX + dir * (pistonWidth / 2);
                // Combustion chamber gas polygon between pistonCrownX and cylHeadEdge
                const chamberXMin = Math.min(pistonCrownX, cylHeadEdge);
                const chamberWidth = Math.max(4, Math.abs(cylHeadEdge - pistonCrownX));
                // Fault states on specific cylinders
                const isMisfiringNow = cyl.id === 3 && hasMisfire;
                const isLeanInjector = cyl.id === 2 && hasInjectorFault;
                // Chamber fill according to 4-stroke phase
                let chamberFill = 'none';
                let chamberOpacity = 0.2;
                if (stroke.name === 'POWER') {
                    chamberFill = isMisfiringNow
                        ? 'url(#intakeGlow)'
                        : 'url(#powerFlame)';
                    chamberOpacity = isMisfiringNow
                        ? 0.35
                        : Math.max(0.25, 1 - stroke.progress * 0.75);
                }
                else if (stroke.name === 'COMPRESSION') {
                    chamberFill = 'url(#compressionGlow)';
                    chamberOpacity = 0.2 + stroke.progress * 0.6;
                }
                else if (stroke.name === 'INTAKE') {
                    chamberFill = 'url(#intakeGlow)';
                    chamberOpacity = 0.25 + Math.sin(stroke.progress * Math.PI) * 0.35;
                }
                else if (stroke.name === 'EXHAUST') {
                    chamberFill = '#64748b';
                    chamberOpacity = 0.22;
                }
                const isSelected = selectedCyl === cyl.id;
                return (_jsxs("g", { onClick: () => onSelectCyl(cyl.id), onDoubleClick: () => onInspectCutaway(cyl.id), className: "cursor-pointer group", children: [isSelected && (_jsx("rect", { x: isLeft ? cylHeadEdge - 55 : cylInnerEdge - 6, y: cylTopY - 26, width: 220, height: 128, rx: "8", fill: "none", stroke: "#22d3ee", strokeWidth: "1.5", strokeDasharray: "4 4" })), [0, 1, 2, 3, 4, 5, 6, 7].map((finIdx) => {
                            const finX = cylInnerEdge + dir * (25 + finIdx * 18);
                            return (_jsxs("g", { children: [_jsx("line", { x1: finX, y1: cylTopY - 14, x2: finX, y2: cylTopY, stroke: isLeanInjector && layers.thermal
                                            ? '#f43f5e'
                                            : finStrokeColor, strokeWidth: "2.5" }), _jsx("line", { x1: finX, y1: cylBottomY, x2: finX, y2: cylBottomY + 14, stroke: isLeanInjector && layers.thermal
                                            ? '#f43f5e'
                                            : finStrokeColor, strokeWidth: "2.5" })] }, finIdx));
                        }), _jsx("rect", { x: Math.min(cylInnerEdge, cylHeadEdge), y: cylTopY, width: Math.abs(cylHeadEdge - cylInnerEdge), height: cylBottomY - cylTopY, fill: "#090d16", stroke: isSelected ? '#38bdf8' : '#64748b', strokeWidth: isSelected ? '2.5' : '2' }), _jsx("rect", { x: chamberXMin, y: cylTopY + 2, width: chamberWidth, height: cylBottomY - cylTopY - 4, fill: chamberFill, opacity: chamberOpacity }), (() => {
                            const valveX = cylHeadEdge - dir * 18;
                            const valveLift = stroke.intakeValve * 10;
                            return (_jsxs("g", { children: [_jsx("path", { d: `M ${valveX - dir * 28} ${cylTopY - 38} L ${valveX} ${cylTopY - 12} L ${valveX} ${cylTopY}`, fill: "none", stroke: "#0284c7", strokeWidth: "6", strokeLinecap: "round" }), layers.airflow && stroke.intakeValve > 0.1 && (_jsx("path", { d: `M ${valveX - dir * 28} ${cylTopY - 38} L ${valveX} ${cylTopY + 12}`, fill: "none", stroke: "#38bdf8", strokeWidth: "2.5", strokeDasharray: "3 5", strokeDashoffset: flowDashOffset })), _jsx("line", { x1: valveX, y1: cylTopY - 14 + valveLift, x2: valveX, y2: cylTopY + 6 + valveLift, stroke: "#e2e8f0", strokeWidth: "2.5" }), _jsx("line", { x1: valveX - 7, y1: cylTopY + 6 + valveLift, x2: valveX + 7, y2: cylTopY + 6 + valveLift, stroke: "#38bdf8", strokeWidth: "3" }), layers.airflow && stroke.fuelSpray > 0.05 && (_jsx("polygon", { points: `${cylHeadEdge},${yCenter - 10} ${cylHeadEdge - dir * (isLeanInjector ? 28 : 52)},${yCenter - 24} ${cylHeadEdge - dir * (isLeanInjector ? 28 : 52)},${yCenter + 4}`, fill: isLeanInjector ? '#fb923c' : '#22d3ee', opacity: stroke.fuelSpray * 0.55 }))] }));
                        })(), (() => {
                            const valveX = cylHeadEdge - dir * 18;
                            const valveLift = stroke.exhaustValve * 10;
                            return (_jsxs("g", { children: [_jsx("path", { d: `M ${valveX} ${cylBottomY} L ${valveX} ${cylBottomY + 15} L ${valveX - dir * 32} ${cylBottomY + 40}`, fill: "none", stroke: "#9a3412", strokeWidth: "7", strokeLinecap: "round" }), layers.airflow && stroke.exhaustValve > 0.1 && (_jsx("path", { d: `M ${valveX} ${cylBottomY - 8} L ${valveX} ${cylBottomY + 15} L ${valveX - dir * 32} ${cylBottomY + 40}`, fill: "none", stroke: isMisfiringNow ? '#38bdf8' : '#f97316', strokeWidth: "3", strokeDasharray: "4 5", strokeDashoffset: -flowDashOffset })), _jsx("line", { x1: valveX, y1: cylBottomY + 14 - valveLift, x2: valveX, y2: cylBottomY - 6 - valveLift, stroke: "#e2e8f0", strokeWidth: "2.5" }), _jsx("line", { x1: valveX - 7, y1: cylBottomY - 6 - valveLift, x2: valveX + 7, y2: cylBottomY - 6 - valveLift, stroke: "#f97316", strokeWidth: "3" })] }));
                        })(), _jsx("rect", { x: isLeft ? cylHeadEdge - 14 : cylHeadEdge, y: yCenter - 6, width: "14", height: "12", rx: "2", fill: "#cbd5e1", stroke: "#475569" }), stroke.spark && !isMisfiringNow && (_jsxs("g", { children: [_jsx("circle", { cx: cylHeadEdge - dir * 6, cy: yCenter, r: "12", fill: "#fef08a", opacity: "0.9" }), _jsx("path", { d: `M ${cylHeadEdge} ${yCenter} L ${cylHeadEdge - dir * 14} ${yCenter - 6} L ${cylHeadEdge - dir * 8} ${yCenter + 5} L ${cylHeadEdge - dir * 20} ${yCenter}`, stroke: "#ffffff", strokeWidth: "2.2", fill: "none" })] })), stroke.spark && isMisfiringNow && (_jsx("text", { x: cylHeadEdge - dir * 34, y: yCenter + 4, textAnchor: "middle", className: "fill-rose-400 text-[10px] font-mono font-bold", children: "NO SPARK" })), _jsxs("g", { children: [_jsx("rect", { x: wristX - pistonWidth / 2, y: yCenter - pistonHeight / 2, width: pistonWidth, height: pistonHeight, rx: "3", fill: "url(#pistonMetal)", stroke: "#cbd5e1", strokeWidth: "1.5" }), [4, 8, 12].map((offset) => {
                                    const ringX = pistonCrownX - dir * offset;
                                    return (_jsx("line", { x1: ringX, y1: yCenter - pistonHeight / 2, x2: ringX, y2: yCenter + pistonHeight / 2, stroke: "#0f172a", strokeWidth: "1.8" }, offset));
                                })] }), _jsx("circle", { cx: centerX, cy: yCenter, r: crankRadius, fill: "none", stroke: "#334155", strokeWidth: "1", strokeDasharray: "3 3" }), _jsx("line", { x1: centerX, y1: yCenter, x2: pinX, y2: pinY, stroke: "#64748b", strokeWidth: "9", strokeLinecap: "round" }), _jsx("line", { x1: pinX, y1: pinY, x2: wristX, y2: yCenter, stroke: "#94a3b8", strokeWidth: "7", strokeLinecap: "round" }), _jsx("line", { x1: pinX, y1: pinY, x2: wristX, y2: yCenter, stroke: "#334155", strokeWidth: "2" }), _jsx("circle", { cx: pinX, cy: pinY, r: "6", fill: "#0f172a", stroke: "#f59e0b", strokeWidth: "2" }), _jsx("circle", { cx: wristX, cy: yCenter, r: "5", fill: "#0f172a", stroke: "#e2e8f0", strokeWidth: "2" }), layers.annotations && (_jsxs("g", { children: [_jsx("rect", { x: isLeft ? 28 : 715, y: yCenter - 44, width: "155", height: "88", rx: "6", fill: "#0f172a", stroke: isMisfiringNow || isLeanInjector
                                        ? '#f43f5e'
                                        : isSelected
                                            ? '#22d3ee'
                                            : '#1e293b', strokeWidth: "1.5" }), _jsx("line", { x1: cylHeadEdge + dir * 14, y1: yCenter, x2: isLeft ? 183 : 715, y2: yCenter, stroke: "#334155", strokeWidth: "1", strokeDasharray: "2 2" }), _jsx("circle", { cx: cylHeadEdge + dir * 14, cy: yCenter, r: "3.5", fill: "#10b981" }), _jsxs("text", { x: isLeft ? 38 : 725, y: yCenter - 24, className: "fill-slate-200 text-[11px] font-mono font-semibold", children: ["CYL 0", cyl.id, " \u00B7 ", stroke.name] }), _jsxs("text", { x: isLeft ? 38 : 725, y: yCenter - 6, className: "fill-slate-400 text-[10px] font-mono", children: ["EGT:", ' ', _jsxs("tspan", { fill: isMisfiringNow || isLeanInjector ? '#f87171' : '#38bdf8', children: [(isMisfiringNow
                                                    ? telemetry.egt - 65
                                                    : isLeanInjector
                                                        ? telemetry.egt + 38
                                                        : telemetry.egt).toFixed(0), ' ', "\u00B0C"] })] }), _jsxs("text", { x: isLeft ? 38 : 725, y: yCenter + 11, className: "fill-slate-400 text-[10px] font-mono", children: ["CHT:", ' ', _jsxs("tspan", { fill: telemetry.cht > 180 ? '#fbbf24' : '#e2e8f0', children: [(isLeanInjector
                                                    ? telemetry.cht + 14
                                                    : telemetry.cht).toFixed(1), ' ', "\u00B0C"] })] }), _jsx("text", { x: isLeft ? 38 : 725, y: yCenter + 28, className: "fill-cyan-400 text-[10px] font-mono underline", children: "Inspect Cutaway \u2192" })] }))] }, cyl.id));
            })] }));
}
// ============================================================================
// 2. SINGLE-CYLINDER HIGH-DETAIL CUTAWAY + THERMODYNAMIC P-V LOOP
// ============================================================================
function SingleCylinderCutawaySVG({ cylId, onSelectCyl, crankAngle, telemetry, dtState, layers, hasMisfire, hasInjectorFault, hasOilFault, }) {
    const cylConfig = CYLINDER_CONFIG.find((c) => c.id === cylId) || CYLINDER_CONFIG[0];
    const cylAngle = (crankAngle + cylConfig.phaseOffset) % 720;
    const rad = (cylAngle * Math.PI) / 180;
    const stroke = getStrokeInfo(cylAngle);
    const isMisfiring = cylId === 3 && hasMisfire;
    const isLean = cylId === 2 && hasInjectorFault;
    // Vertical Cutaway Geometry (Left Half of SVG: x = 230)
    const cx = 230;
    const crankCenterY = 425;
    const r = 42;
    const l = 135;
    // Crankpin position (0 deg = TDC = straight up)
    const pinX = cx + Math.sin(rad) * r;
    const pinY = crankCenterY - Math.cos(rad) * r;
    // Wrist pin Y position
    const dx = pinX - cx;
    const dyRod = Math.sqrt(Math.max(100, l * l - dx * dx));
    const wristY = pinY - dyRod;
    const pistonTopY = wristY - 26;
    const headY = 175;
    // Instantaneous normalized cylinder volume V in [0.12 (TDC), 1.0 (BDC)]
    const normDisplacement = (1 - Math.cos(rad)) / 2; // 0 at TDC, 1 at BDC
    const clearanceVol = 0.12;
    const currentVol = clearanceVol + normDisplacement * 0.88;
    // Compute realistic Otto-cycle Pressure (bar) as function of crankAngle (0..720)
    const computePressureAtAngle = (ca) => {
        const a = ((ca % 720) + 720) % 720;
        const theta = (a * Math.PI) / 180;
        const v = clearanceVol + ((1 - Math.cos(theta)) / 2) * 0.88;
        if (a >= 360 && a < 540) {
            // Intake stroke (~0.9 bar)
            return 0.9;
        }
        else if (a >= 540 && a < 705) {
            // Polytropic compression P * V^1.35 = const
            return 0.9 * Math.pow(1.0 / v, 1.35);
        }
        else if (a >= 705 || a < 25) {
            // Rapid combustion heat release around TDC
            const peakFactor = isMisfiring ? 0.35 : isLean ? 0.88 : 1.0;
            const baseComp = 0.9 * Math.pow(1.0 / v, 1.35);
            const burnProgress = a >= 705 ? (a - 705) / 40 : (a + 15) / 40;
            return baseComp + peakFactor * 38 * Math.sin(Math.min(1, burnProgress) * Math.PI * 0.75);
        }
        else if (a >= 25 && a < 180) {
            // Power expansion stroke
            const peakP = isMisfiring ? 18 : isLean ? 46 : 54;
            const vAt25 = clearanceVol + ((1 - Math.cos((25 * Math.PI) / 180)) / 2) * 0.88;
            return Math.max(1.5, peakP * Math.pow(vAt25 / v, 1.32));
        }
        else {
            // Exhaust blowdown & stroke (180..360)
            const p180 = 3.5;
            const expDecay = Math.exp(-(a - 180) / 35);
            return 1.15 + (p180 - 1.15) * expDecay;
        }
    };
    const currentPressure = computePressureAtAngle(cylAngle);
    // Build full 720-deg P-V loop path on the right panel (x: 520..840, y: 110..330)
    const pvLeft = 530;
    const pvRight = 840;
    const pvTop = 95;
    const pvBottom = 315;
    const mapVolToX = (v) => pvLeft + ((v - clearanceVol) / 0.88) * (pvRight - pvLeft);
    const mapPressToY = (p) => pvBottom - (Math.min(60, Math.max(0, p)) / 60) * (pvBottom - pvTop);
    const pvPoints = [];
    for (let a = 0; a < 720; a += 6) {
        const theta = (a * Math.PI) / 180;
        const v = clearanceVol + ((1 - Math.cos(theta)) / 2) * 0.88;
        const p = computePressureAtAngle(a);
        pvPoints.push(`${mapVolToX(v).toFixed(1)},${mapPressToY(p).toFixed(1)}`);
    }
    const livePvX = mapVolToX(currentVol);
    const livePvY = mapPressToY(currentPressure);
    return (_jsxs("svg", { viewBox: "0 0 900 540", className: "w-full h-full max-h-[530px]", children: [[1, 2, 3, 4].map((id, i) => (_jsxs("g", { onClick: () => onSelectCyl(id), className: "cursor-pointer", children: [_jsx("rect", { x: 30 + i * 95, y: "485", width: "86", height: "32", rx: "5", fill: cylId === id ? '#0e7490' : '#0f172a', stroke: cylId === id ? '#22d3ee' : '#334155', strokeWidth: "1.5" }), _jsxs("text", { x: 73 + i * 95, y: "505", textAnchor: "middle", className: "fill-slate-100 text-xs font-mono font-semibold", children: ["CYL 0", id] })] }, id))), _jsxs("g", { children: [_jsxs("text", { x: "230", y: "66", textAnchor: "middle", className: "fill-slate-200 text-xs font-mono font-semibold tracking-wider", children: [cylConfig.label, " \u2014 ", stroke.name, " STROKE"] }), [-6, -5, -4, -3, -2, -1, 0, 1].map((idx) => {
                        const fy = 215 + idx * 16;
                        return (_jsxs("g", { children: [_jsx("line", { x1: cx - 98, y1: fy, x2: cx - 66, y2: fy, stroke: layers.thermal && telemetry.cht > 175 ? '#f43f5e' : '#38bdf8', strokeWidth: "3" }), _jsx("line", { x1: cx + 66, y1: fy, x2: cx + 98, y2: fy, stroke: layers.thermal && telemetry.cht > 175 ? '#f43f5e' : '#38bdf8', strokeWidth: "3" })] }, idx));
                    }), _jsx("path", { d: `M ${cx - 125} 125 Q ${cx - 60} 125 ${cx - 34} ${headY}`, fill: "none", stroke: "#0284c7", strokeWidth: "18" }), _jsx("path", { d: `M ${cx + 125} 125 Q ${cx + 60} 125 ${cx + 34} ${headY}`, fill: "none", stroke: "#9a3412", strokeWidth: "18" }), _jsx("rect", { x: cx - 65, y: headY, width: "130", height: "175", fill: "#090d16", stroke: "#64748b", strokeWidth: "4" }), _jsx("rect", { x: cx - 62, y: headY + 2, width: "124", height: Math.max(4, pistonTopY - headY - 2), fill: stroke.name === 'POWER' && !isMisfiring
                            ? '#f97316'
                            : stroke.name === 'COMPRESSION'
                                ? '#f59e0b'
                                : '#38bdf8', opacity: stroke.name === 'POWER'
                            ? 0.65
                            : stroke.name === 'COMPRESSION'
                                ? 0.45
                                : 0.25 }), (() => {
                        const lift = stroke.intakeValve * 16;
                        return (_jsxs("g", { children: [_jsx("ellipse", { cx: cx - 34, cy: 105, rx: "10", ry: "15", transform: `rotate(${(cylAngle / 2).toFixed(1)} ${cx - 34} 105)`, fill: "#475569", stroke: "#cbd5e1", strokeWidth: "1.5" }), _jsx("line", { x1: cx - 34, y1: 120 + lift, x2: cx - 34, y2: headY + 4 + lift, stroke: "#e2e8f0", strokeWidth: "4" }), _jsx("line", { x1: cx - 50, y1: headY + 4 + lift, x2: cx - 18, y2: headY + 4 + lift, stroke: "#38bdf8", strokeWidth: "4.5", strokeLinecap: "round" })] }));
                    })(), (() => {
                        const lift = stroke.exhaustValve * 16;
                        return (_jsxs("g", { children: [_jsx("ellipse", { cx: cx + 34, cy: 105, rx: "10", ry: "15", transform: `rotate(${(cylAngle / 2 + 110).toFixed(1)} ${cx + 34} 105)`, fill: "#475569", stroke: "#cbd5e1", strokeWidth: "1.5" }), _jsx("line", { x1: cx + 34, y1: 120 + lift, x2: cx + 34, y2: headY + 4 + lift, stroke: "#e2e8f0", strokeWidth: "4" }), _jsx("line", { x1: cx + 18, y1: headY + 4 + lift, x2: cx + 50, y2: headY + 4 + lift, stroke: "#f97316", strokeWidth: "4.5", strokeLinecap: "round" })] }));
                    })(), _jsx("rect", { x: cx - 8, y: headY - 32, width: "16", height: "32", rx: "2", fill: "#cbd5e1", stroke: "#475569", strokeWidth: "1.5" }), stroke.spark && !isMisfiring && (_jsxs("g", { children: [_jsx("circle", { cx: cx, cy: headY + 12, r: "18", fill: "#fef08a", opacity: "0.85" }), _jsx("path", { d: `M ${cx} ${headY} L ${cx - 10} ${headY + 14} L ${cx + 8} ${headY + 18} L ${cx - 4} ${headY + 30}`, fill: "none", stroke: "#ffffff", strokeWidth: "3" })] })), stroke.fuelSpray > 0.05 && (_jsx("polygon", { points: `${cx - 14},${headY + 2} ${cx - 45},${headY + 65} ${cx + 15},${headY + 65}`, fill: isLean ? '#fb923c' : '#22d3ee', opacity: stroke.fuelSpray * 0.5 })), _jsx("rect", { x: cx - 61, y: pistonTopY, width: "122", height: "54", rx: "4", fill: "#64748b", stroke: "#cbd5e1", strokeWidth: "2" }), [7, 14, 21].map((ry) => (_jsx("line", { x1: cx - 62, y1: pistonTopY + ry, x2: cx + 62, y2: pistonTopY + ry, stroke: "#0f172a", strokeWidth: "2.5" }, ry))), _jsx("circle", { cx: cx, cy: crankCenterY, r: r + 16, fill: "#0f172a", stroke: "#334155", strokeWidth: "2", strokeDasharray: "6 4" }), _jsx("line", { x1: cx, y1: crankCenterY, x2: pinX, y2: pinY, stroke: "#475569", strokeWidth: "18", strokeLinecap: "round" }), _jsx("line", { x1: pinX, y1: pinY, x2: cx, y2: wristY, stroke: "#94a3b8", strokeWidth: "11", strokeLinecap: "round" }), _jsx("circle", { cx: cx, cy: crankCenterY, r: "10", fill: "#334155", stroke: "#94a3b8", strokeWidth: "2" }), _jsx("circle", { cx: pinX, cy: pinY, r: "9", fill: "#0f172a", stroke: "#f59e0b", strokeWidth: "3" }), _jsx("circle", { cx: cx, cy: wristY, r: "8", fill: "#0f172a", stroke: "#e2e8f0", strokeWidth: "2.5" })] }), _jsxs("g", { children: [_jsx("rect", { x: "475", y: "55", width: "395", height: "305", rx: "8", fill: "#0f172a", stroke: "#1e293b", strokeWidth: "1.5" }), _jsxs("text", { x: "495", y: "80", className: "fill-slate-200 text-xs font-mono font-semibold", children: ["THERMODYNAMIC P-V INDICATOR LOOP (CYL 0", cylId, ")"] }), _jsx("line", { x1: pvLeft, y1: pvTop, x2: pvLeft, y2: pvBottom, stroke: "#475569", strokeWidth: "1.5" }), _jsx("line", { x1: pvLeft, y1: pvBottom, x2: pvRight, y2: pvBottom, stroke: "#475569", strokeWidth: "1.5" }), [0, 20, 40, 60].map((pVal) => {
                        const y = mapPressToY(pVal);
                        return (_jsxs("g", { children: [_jsx("line", { x1: pvLeft, y1: y, x2: pvRight, y2: y, stroke: "#1e293b", strokeDasharray: "3 3" }), _jsxs("text", { x: pvLeft - 8, y: y + 4, textAnchor: "end", className: "fill-slate-500 text-[10px] font-mono", children: [pVal, "b"] })] }, pVal));
                    }), _jsx("text", { x: pvLeft, y: pvBottom + 18, textAnchor: "middle", className: "fill-slate-400 text-[10px] font-mono", children: "V_min (TDC)" }), _jsx("text", { x: pvRight, y: pvBottom + 18, textAnchor: "middle", className: "fill-slate-400 text-[10px] font-mono", children: "V_max (BDC)" }), _jsx("polyline", { points: pvPoints.join(' '), fill: "#06b6d4", fillOpacity: "0.1", stroke: isMisfiring ? '#f43f5e' : '#22d3ee', strokeWidth: "2.2" }), _jsx("line", { x1: livePvX, y1: pvTop, x2: livePvX, y2: pvBottom, stroke: "#38bdf8", strokeWidth: "1", strokeDasharray: "2 2" }), _jsx("line", { x1: pvLeft, y1: livePvY, x2: pvRight, y2: livePvY, stroke: "#38bdf8", strokeWidth: "1", strokeDasharray: "2 2" }), _jsx("circle", { cx: livePvX, cy: livePvY, r: "6", fill: "#f59e0b", stroke: "#ffffff", strokeWidth: "2" }), _jsxs("text", { x: "495", y: "348", className: "fill-slate-300 text-xs font-mono", children: ["INST. PRESSURE:", ' ', _jsxs("tspan", { className: "fill-amber-400 font-semibold", children: [currentPressure.toFixed(1), " bar"] }), ' ', "\u00B7 VOLUME:", ' ', _jsxs("tspan", { className: "fill-cyan-400 font-semibold", children: [(currentVol * 600).toFixed(0), " cc"] })] })] }), _jsxs("g", { children: [_jsx("rect", { x: "475", y: "375", width: "395", height: "145", rx: "8", fill: "#0f172a", stroke: "#1e293b", strokeWidth: "1.5" }), _jsx("text", { x: "495", y: "400", className: "fill-slate-200 text-xs font-mono font-semibold", children: "720\u00B0 FOUR-STROKE TIMING & VALVE LIFT PHASE" }), _jsxs("g", { transform: "translate(495, 420)", children: [_jsx("rect", { x: "0", y: "0", width: "88", height: "22", fill: "#dc2626", fillOpacity: "0.35", stroke: "#dc2626" }), _jsx("text", { x: "44", y: "15", textAnchor: "middle", className: "fill-rose-300 text-[10px] font-mono", children: "POWER" }), _jsx("rect", { x: "88", y: "0", width: "88", height: "22", fill: "#64748b", fillOpacity: "0.35", stroke: "#64748b" }), _jsx("text", { x: "132", y: "15", textAnchor: "middle", className: "fill-slate-300 text-[10px] font-mono", children: "EXHAUST" }), _jsx("rect", { x: "176", y: "0", width: "88", height: "22", fill: "#0284c7", fillOpacity: "0.35", stroke: "#0284c7" }), _jsx("text", { x: "220", y: "15", textAnchor: "middle", className: "fill-cyan-300 text-[10px] font-mono", children: "INTAKE" }), _jsx("rect", { x: "264", y: "0", width: "88", height: "22", fill: "#d97706", fillOpacity: "0.35", stroke: "#d97706" }), _jsx("text", { x: "308", y: "15", textAnchor: "middle", className: "fill-amber-300 text-[10px] font-mono", children: "COMPRESS" }), _jsx("line", { x1: (cylAngle / 720) * 352, y1: "-6", x2: (cylAngle / 720) * 352, y2: "30", stroke: "#ffffff", strokeWidth: "2.5" })] }), _jsxs("text", { x: "495", y: "480", className: "fill-slate-400 text-xs font-mono", children: ["INTAKE VALVE LIFT:", ' ', _jsxs("tspan", { className: "fill-cyan-400", children: [(stroke.intakeValve * 9.8).toFixed(1), " mm"] })] }), _jsxs("text", { x: "685", y: "480", className: "fill-slate-400 text-xs font-mono", children: ["EXHAUST VALVE LIFT:", ' ', _jsxs("tspan", { className: "fill-orange-400", children: [(stroke.exhaustValve * 9.4).toFixed(1), " mm"] })] }), _jsxs("text", { x: "495", y: "502", className: "fill-slate-400 text-xs font-mono", children: ["SPARK PLUG STATE:", ' ', _jsx("tspan", { className: stroke.spark ? 'fill-yellow-300 font-bold' : 'fill-slate-500', children: stroke.spark ? (isMisfiring ? 'FAULT (NO ARC)' : 'FIRING (28kV)') : 'STANDBY' })] })] })] }));
}
// ============================================================================
// 3. ANIMATED 2D SUBSYSTEM P&ID SCHEMATIC (FUEL, OIL, AIR, ECU)
// ============================================================================
function SubsystemPIDSVG({ crankAngle, telemetry, dtState, hasMisfire, hasInjectorFault, hasOilFault, }) {
    const dashOffset = -((crankAngle * 0.7) % 40);
    return (_jsxs("svg", { viewBox: "0 0 900 520", className: "w-full h-full max-h-[520px]", children: [_jsx("defs", { children: _jsx("pattern", { id: "pidGrid", width: "25", height: "25", patternUnits: "userSpaceOnUse", children: _jsx("path", { d: "M 25 0 L 0 0 0 25", fill: "none", stroke: "#1e293b", strokeWidth: "0.6" }) }) }), _jsx("rect", { x: "0", y: "0", width: "900", height: "520", fill: "url(#pidGrid)" }), _jsxs("g", { children: [_jsx("rect", { x: "45", y: "75", width: "135", height: "70", rx: "6", fill: "#0f172a", stroke: "#0284c7", strokeWidth: "2" }), _jsx("text", { x: "112", y: "102", textAnchor: "middle", className: "fill-cyan-400 text-xs font-mono font-semibold", children: "FUEL RAIL & PUMP" }), _jsxs("text", { x: "112", y: "122", textAnchor: "middle", className: "fill-slate-200 text-xs font-mono", children: [telemetry.fuel_flow.toFixed(1), " L/h"] }), _jsxs("text", { x: "112", y: "137", textAnchor: "middle", className: "fill-slate-500 text-[10px] font-mono", children: ["EXP: ", dtState.expected_values.fuel_flow.toFixed(1), " L/h"] }), _jsx("path", { d: "M 180 110 L 350 110 L 350 185", fill: "none", stroke: "#0c4a6e", strokeWidth: "8" }), _jsx("path", { d: "M 180 110 L 350 110 L 350 185", fill: "none", stroke: hasInjectorFault ? '#f97316' : '#38bdf8', strokeWidth: "3", strokeDasharray: "6 6", strokeDashoffset: dashOffset })] }), _jsxs("g", { children: [_jsx("rect", { x: "45", y: "340", width: "135", height: "80", rx: "6", fill: "#0f172a", stroke: hasOilFault ? '#ef4444' : '#f59e0b', strokeWidth: "2" }), _jsx("text", { x: "112", y: "365", textAnchor: "middle", className: "fill-amber-400 text-xs font-mono font-semibold", children: "LUBRICATION UNIT" }), _jsxs("text", { x: "112", y: "385", textAnchor: "middle", className: "fill-slate-200 text-xs font-mono", children: [telemetry.oil_pressure.toFixed(2), " bar"] }), _jsxs("text", { x: "112", y: "403", textAnchor: "middle", className: "fill-slate-400 text-[11px] font-mono", children: ["OIL TEMP: ", telemetry.oil_temp.toFixed(1), " \u00B0C"] }), _jsx("path", { d: "M 180 365 L 350 365 L 350 315", fill: "none", stroke: "#451a03", strokeWidth: "8" }), _jsx("path", { d: "M 180 365 L 350 365 L 350 315", fill: "none", stroke: hasOilFault ? '#ef4444' : '#fbbf24', strokeWidth: "3", strokeDasharray: "6 6", strokeDashoffset: dashOffset })] }), _jsxs("g", { children: [_jsx("rect", { x: "290", y: "185", width: "280", height: "130", rx: "8", fill: "#0f172a", stroke: "#64748b", strokeWidth: "2.5" }), _jsx("text", { x: "430", y: "212", textAnchor: "middle", className: "fill-slate-100 text-sm font-mono font-semibold", children: "MALE UAV FLAT-4 CORE" }), _jsxs("text", { x: "430", y: "232", textAnchor: "middle", className: "fill-cyan-400 text-xs font-mono", children: ["RPM: ", telemetry.rpm.toFixed(0), " \u00B7 CHT: ", telemetry.cht.toFixed(1), "\u00B0C \u00B7 VIB: ", telemetry.vibration.toFixed(1)] }), [1, 2, 3, 4].map((cId, idx) => {
                        const isBad = (cId === 3 && hasMisfire) || (cId === 2 && hasInjectorFault);
                        return (_jsxs("g", { transform: `translate(${312 + idx * 62}, 250)`, children: [_jsx("rect", { x: "0", y: "0", width: "52", height: "46", rx: "4", fill: "#090d16", stroke: isBad ? '#ef4444' : '#38bdf8', strokeWidth: "1.5" }), _jsxs("text", { x: "26", y: "18", textAnchor: "middle", className: "fill-slate-200 text-[10px] font-mono font-semibold", children: ["CYL 0", cId] }), _jsx("text", { x: "26", y: "34", textAnchor: "middle", className: clsx('text-[9px] font-mono', isBad ? 'fill-rose-400' : 'fill-emerald-400'), children: isBad ? 'ANOMALY' : 'NOMINAL' })] }, cId));
                    })] }), _jsxs("g", { children: [_jsx("path", { d: "M 570 250 L 685 250", fill: "none", stroke: "#7c2d12", strokeWidth: "10" }), _jsx("path", { d: "M 570 250 L 685 250", fill: "none", stroke: "#f97316", strokeWidth: "3.5", strokeDasharray: "6 6", strokeDashoffset: dashOffset }), _jsx("rect", { x: "685", y: "200", width: "165", height: "100", rx: "6", fill: "#0f172a", stroke: "#f97316", strokeWidth: "2" }), _jsx("text", { x: "767", y: "228", textAnchor: "middle", className: "fill-orange-400 text-xs font-mono font-semibold", children: "EXHAUST & THERMAL" }), _jsxs("text", { x: "767", y: "250", textAnchor: "middle", className: "fill-slate-200 text-xs font-mono", children: ["EGT: ", telemetry.egt.toFixed(1), " \u00B0C"] }), _jsxs("text", { x: "767", y: "270", textAnchor: "middle", className: "fill-slate-400 text-[11px] font-mono", children: ["RESIDUAL: ", dtState.residuals.egt >= 0 ? '+' : '', dtState.residuals.egt.toFixed(1), " \u00B0C"] }), _jsxs("text", { x: "767", y: "288", textAnchor: "middle", className: "fill-slate-500 text-[10px] font-mono", children: ["ALT: ", telemetry.altitude, " ft (", telemetry.ambient_temp, "\u00B0C)"] })] }), _jsxs("g", { children: [_jsx("rect", { x: "290", y: "70", width: "280", height: "65", rx: "6", fill: "#0f172a", stroke: "#10b981", strokeWidth: "1.5" }), _jsx("text", { x: "430", y: "95", textAnchor: "middle", className: "fill-emerald-400 text-xs font-mono font-semibold", children: "FADEC / CAN-BUS TELEMETRY SYNC (10 Hz)" }), _jsxs("text", { x: "430", y: "116", textAnchor: "middle", className: "fill-slate-300 text-[11px] font-mono", children: ["BUS VOLTAGE: ", telemetry.battery_voltage.toFixed(2), "V \u00B7 HEALTH: ", dtState.overall_health.toFixed(1), "% \u00B7 RUL: ", dtState.rul_estimated_hours.toFixed(0), "h"] }), _jsx("line", { x1: "430", y1: "135", x2: "430", y2: "185", stroke: "#10b981", strokeWidth: "2", strokeDasharray: "4 4", strokeDashoffset: dashOffset })] })] }));
}
