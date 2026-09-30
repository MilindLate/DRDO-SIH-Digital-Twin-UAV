import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, Layers, Flame, Wrench, } from 'lucide-react';
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
const SUBSYSTEM_SPECS = [
    {
        id: 'all',
        name: 'Complete Rotax 914 UL/F Assembly',
        code: 'ASSY-914-CORE',
        material: 'AlSi10Mg / 4340 Forged Steel / Inconel 718',
        clearance: 'ISO 2768-mK',
        cameraPos: [4.8, 3.1, 5.2],
        cameraTarget: [0, 0, 0.2],
        description: '4-Stroke, 4-Cylinder Horizontally Opposed (Flat-4) Turbocharged Aero-Piston Engine with 2.43:1 PSRU Reduction Gearbox and Dry-Sump Lubrication.',
    },
    {
        id: 'cranktrain',
        name: 'Forged Crankshaft & Slider-Crank Train',
        code: 'SUB-CRK-180',
        material: '4340 Chrome-Moly Billet Steel (Nitride Hardened)',
        clearance: 'Journal Oil Film: 0.038 mm',
        cameraPos: [0.2, 3.8, 3.2],
        cameraTarget: [0, 0, -0.2],
        description: '4-throw 180° flat-plane forged crankshaft with counterweighted webs, H-beam connecting rods, floating gudgeon pins, and 3-ring forged aluminum pistons.',
    },
    {
        id: 'cylinders',
        name: 'Liquid/Air-Cooled Cylinder Heads & Barrels',
        code: 'SUB-CYL-F4',
        material: 'Cast AlSi9Cu3 with Nikasil Bore Coating',
        clearance: 'Piston-to-Wall: 0.045 mm · Bore 79.5 mm × Stroke 61.0 mm',
        cameraPos: [4.4, 1.8, 0.5],
        cameraTarget: [1.3, 0, -0.2],
        description: 'Horizontally opposed Nikasil-lined finned barrels with liquid-cooled cylinder heads, dual spark plugs per cylinder, and OHV pushrod valvetrain (Firing Order 1-3-2-4).',
    },
    {
        id: 'turbo',
        name: 'Exhaust Turbocharger & Wastegate System',
        code: 'SUB-TRB-GAR',
        material: 'Inconel 718 Turbine Wheel / 321 Stainless Manifold',
        clearance: 'Max Boost: 1.55 bar abs · Peak EGT: 880°C',
        cameraPos: [-3.8, -1.6, -3.5],
        cameraTarget: [0, -0.95, -1.6],
        description: '4-into-1 stainless steel exhaust collector feeding a high-altitude radial turbine and centrifugal compressor with servo-controlled wastegate boost regulation.',
    },
    {
        id: 'gearbox',
        name: 'PSRU Reduction Gearbox & Variable-Pitch Prop',
        code: 'SUB-PSRU-243',
        material: 'Case-Hardened Helical Gears / Carbon-Epoxy Blades',
        clearance: 'Reduction Ratio: 2.43 : 1 · Torsional Damper: ±4.5°',
        cameraPos: [3.2, 1.4, 4.8],
        cameraTarget: [0, 0.15, 2.2],
        description: 'Integrated Propeller Speed Reduction Unit (2.43:1) with overload clutch, torsional vibration shock absorber, and 3-blade composite constant-speed propeller.',
    },
    {
        id: 'fuel_ignition',
        name: 'FADEC Electronic Fuel Rail & Dual Ignition',
        code: 'SUB-FADEC-8X',
        material: 'Anodized 6061-T6 Rail / Dual Capacitor Discharge',
        clearance: 'Rail Press: 3.0 bar · Timing: 15.1° BTDC',
        cameraPos: [2.6, 3.4, -2.2],
        cameraTarget: [0, 0.85, -0.3],
        description: 'Redundant dual-channel ECU/FADEC controlling multipoint port fuel injectors and 8 independent spark plugs for aviation fail-safe ignition reliability.',
    },
    {
        id: 'lubrication',
        name: 'Dry-Sump Oil Pump, Cooler & Scavenge Circuit',
        code: 'SUB-LUB-DRY',
        material: 'Brazed Aluminum Matrix / Trochoid Gear Pump',
        clearance: 'Nominal Pressure: 2.5–5.0 bar · Max Oil Temp: 130°C',
        cameraPos: [-3.5, -2.0, 2.8],
        cameraTarget: [0, -0.85, 0.5],
        description: 'High-altitude dry-sump pressurized lubrication circuit with bottom finned oil cooler, full-flow spin-on micron filter, and crankshaft bearing oil jets.',
    },
];
const CYLINDER_CONFIGS = [
    { num: 1, side: 1, zPos: 0.68, crankPinPhaseRad: 0, firingOffsetDeg: 0 },
    { num: 2, side: -1, zPos: 0.32, crankPinPhaseRad: Math.PI, firingOffsetDeg: 360 },
    { num: 3, side: 1, zPos: -0.32, crankPinPhaseRad: Math.PI, firingOffsetDeg: 180 },
    { num: 4, side: -1, zPos: -0.68, crankPinPhaseRad: 0, firingOffsetDeg: 540 },
];
// Helper to map temperature (0..1) to an engineering thermal color
function getThermalColor(norm) {
    const t = Math.max(0, Math.min(1, norm));
    const c = new THREE.Color();
    if (t < 0.35) {
        c.set('#0284c7').lerp(new THREE.Color('#10b981'), t / 0.35);
    }
    else if (t < 0.7) {
        c.set('#10b981').lerp(new THREE.Color('#f59e0b'), (t - 0.35) / 0.35);
    }
    else {
        c.set('#f59e0b').lerp(new THREE.Color('#ef4444'), (t - 0.7) / 0.3);
    }
    return c;
}
// ============================================================================
// CAMERA FOCUS CONTROLLER
// ============================================================================
function CameraFocusController({ selectedSubsystem, controlsRef, }) {
    const { camera } = useThree();
    const prevSubRef = useRef(selectedSubsystem);
    const animTimerRef = useRef(0);
    useEffect(() => {
        if (prevSubRef.current !== selectedSubsystem) {
            prevSubRef.current = selectedSubsystem;
            animTimerRef.current = 0.85;
        }
    }, [selectedSubsystem]);
    useFrame((_, delta) => {
        if (animTimerRef.current > 0) {
            animTimerRef.current = Math.max(0, animTimerRef.current - delta);
            const spec = SUBSYSTEM_SPECS.find((s) => s.id === selectedSubsystem) ||
                SUBSYSTEM_SPECS[0];
            camera.position.lerp(new THREE.Vector3(...spec.cameraPos), delta * 5);
            if (controlsRef.current) {
                controlsRef.current.target.lerp(new THREE.Vector3(...spec.cameraTarget), delta * 6);
                controlsRef.current.update();
            }
        }
    });
    return null;
}
// ============================================================================
// HIGH-PRECISION 3D ROTAX 914 UL/F FLAT-4 ENGINE ASSEMBLY
// ============================================================================
function Rotax914PrecisionAssembly({ telemetry, explodeFactor, shellMode, timeScale, paused, manualCrankDeg, showCallouts, showCombustion, showOilFlow, selectedSubsystem, onSelectSubsystem, onCrankAngleUpdate, }) {
    const rootGroupRef = useRef(null);
    const crankshaftRef = useRef(null);
    const propHubRef = useRef(null);
    const turbineWheelRef = useRef(null);
    // Refs for the 4 pistons, 4 connecting rods, 4 combustion chambers, and 8 valves
    const pistonRefs = useRef([null, null, null, null]);
    const conRodRefs = useRef([null, null, null, null]);
    const flameRefs = useRef([null, null, null, null]);
    const sparkRefs = useRef([null, null, null, null]);
    const intakeValveRefs = useRef([null, null, null, null]);
    const exhaustValveRefs = useRef([null, null, null, null]);
    const injectorSprayRefs = useRef([null, null, null, null]);
    const crankDegRef = useRef(0);
    const lastReportRef = useRef(0);
    // Slider-Crank geometric constants (in 3D scene units)
    const crankRadius = 0.28; // r
    const rodLength = 0.88; // l
    // Normalized thermal ratios from live telemetry
    const chtNorm = Math.max(0, Math.min(1, (telemetry.cht - 110) / 140));
    const egtNorm = Math.max(0, Math.min(1, (telemetry.egt - 620) / 280));
    const oilNorm = Math.max(0, Math.min(1, (telemetry.oil_temp - 70) / 65));
    const isWireframe = shellMode === 'wireframe';
    const isThermal = shellMode === 'thermal';
    const isCutaway = shellMode === 'cutaway';
    // Exploded displacement vectors
    const exp = explodeFactor;
    useFrame((state, delta) => {
        // 1. Advance 720° 4-stroke crankshaft angle
        if (paused) {
            crankDegRef.current = manualCrankDeg % 720;
        }
        else {
            // At 2450 RPM, 1x visual speed is scaled so kinematics are crisp & discernible at 60fps
            const degPerSec = (telemetry.rpm / 60) * 360 * 0.065 * timeScale;
            crankDegRef.current = (crankDegRef.current + degPerSec * delta) % 720;
            if (state.clock.elapsedTime - lastReportRef.current > 0.1) {
                onCrankAngleUpdate(crankDegRef.current);
                lastReportRef.current = state.clock.elapsedTime;
            }
        }
        const totalCrankRad = (crankDegRef.current * Math.PI) / 180;
        // Rotate crankshaft & PSRU propeller (2.43:1 reduction ratio, counter-rotating)
        if (crankshaftRef.current) {
            crankshaftRef.current.rotation.z = totalCrankRad;
        }
        if (propHubRef.current) {
            propHubRef.current.rotation.z = -totalCrankRad / 2.43;
        }
        if (turbineWheelRef.current && !paused) {
            turbineWheelRef.current.rotation.x += delta * 38 * Math.max(0.15, timeScale);
        }
        // Subtle high-frequency engine vibration harmonic on root assembly
        if (rootGroupRef.current && !paused) {
            const vibAmp = Math.min(0.018, (telemetry.vibration / 100) * 0.012) * timeScale;
            rootGroupRef.current.position.x =
                Math.sin(state.clock.elapsedTime * 55) * vibAmp;
            rootGroupRef.current.position.y =
                Math.cos(state.clock.elapsedTime * 63) * vibAmp;
        }
        // 2. Update each of the 4 Horizontally Opposed Cylinders (Slider-Crank + Valvetrain + Combustion)
        CYLINDER_CONFIGS.forEach((cyl, idx) => {
            // Angle of this crank throw relative to horizontal axis (+X for right bank, -X for left bank)
            // Crank pin world X/Y when crankshaft rotates by totalCrankRad:
            const pinAngle = totalCrankRad + cyl.crankPinPhaseRad;
            const pinX = Math.cos(pinAngle) * crankRadius;
            const pinY = Math.sin(pinAngle) * crankRadius;
            // Distance along cylinder bore axis (horizontal X axis in side direction)
            // For right bank (side = +1), piston is at x > 0. For left bank (side = -1), piston is at x < 0.
            const dy = pinY;
            const dxAlongBore = Math.sqrt(Math.max(0.01, rodLength * rodLength - dy * dy));
            const pistonX = cyl.side * (cyl.side * pinX + dxAlongBore);
            // Update Piston Group position (plus exploded view offset)
            const pistonGrp = pistonRefs.current[idx];
            if (pistonGrp) {
                pistonGrp.position.set(pistonX + cyl.side * exp * 0.55, 0, cyl.zPos);
            }
            // Update Connecting Rod Group (placed at crank pin, rotated toward piston wrist pin)
            const rodGrp = conRodRefs.current[idx];
            if (rodGrp) {
                const targetPistonX = pistonX + cyl.side * exp * 0.22;
                const vecX = targetPistonX - pinX;
                const vecY = 0 - pinY;
                const rodAngle = Math.atan2(vecY, vecX);
                rodGrp.position.set(pinX, pinY, cyl.zPos);
                rodGrp.rotation.z = rodAngle;
            }
            // Compute 720° 4-Stroke thermodynamic cycle phase for this cylinder
            // 0°–180°: POWER (Combustion), 180°–360°: EXHAUST, 360°–540°: INTAKE, 540°–720°: COMPRESSION
            const cycleDeg = (crankDegRef.current + cyl.firingOffsetDeg) % 720;
            // Valve Lift Kinematics
            const intakeLift = cycleDeg >= 350 && cycleDeg <= 555
                ? Math.sin(((cycleDeg - 350) / 205) * Math.PI) * 0.11
                : 0;
            const exhaustLift = cycleDeg >= 165 && cycleDeg <= 370
                ? Math.sin(((cycleDeg - 165) / 205) * Math.PI) * 0.11
                : 0;
            const inValve = intakeValveRefs.current[idx];
            if (inValve) {
                inValve.position.x = -cyl.side * intakeLift;
            }
            const exValve = exhaustValveRefs.current[idx];
            if (exValve) {
                exValve.position.x = -cyl.side * exhaustLift;
            }
            // Injector Fuel Spray Cone during Intake Stroke
            const sprayMesh = injectorSprayRefs.current[idx];
            if (sprayMesh) {
                const isIntake = cycleDeg >= 360 && cycleDeg <= 520;
                sprayMesh.visible = showCombustion && isIntake;
                if (isIntake) {
                    const mat = sprayMesh.material;
                    mat.opacity = Math.sin(((cycleDeg - 360) / 160) * Math.PI) * 0.48;
                }
            }
            // Volumetric Combustion Chamber Plasma & Spark Flash
            const flameMesh = flameRefs.current[idx];
            const sparkLight = sparkRefs.current[idx];
            if (flameMesh) {
                const mat = flameMesh.material;
                flameMesh.visible = showCombustion;
                // Check if misfire fault is active on Cylinder 3
                const isMisfiringCyl3 = cyl.num === 3 && telemetry.vibration > 25;
                if (cycleDeg < 165) {
                    // Power / Expansion Stroke
                    const norm = cycleDeg / 165;
                    if (isMisfiringCyl3) {
                        mat.color.set('#f43f5e');
                        mat.opacity = norm < 0.25 ? 0.35 : 0.05;
                    }
                    else {
                        // Bright white-orange ignition flash -> fiery orange-red expansion
                        mat.color.set(norm < 0.18 ? '#fef08a' : norm < 0.55 ? '#f97316' : '#ef4444');
                        mat.opacity = (1 - norm * 0.85) * 0.78;
                    }
                    if (sparkLight) {
                        sparkLight.intensity = norm < 0.15 && !isMisfiringCyl3 ? 3.5 : 0;
                    }
                }
                else if (cycleDeg < 360) {
                    // Exhaust Stroke (hot amber-grey purge)
                    const norm = (cycleDeg - 165) / 195;
                    mat.color.set('#fb923c').lerp(new THREE.Color('#64748b'), norm);
                    mat.opacity = (1 - norm) * 0.28;
                    if (sparkLight)
                        sparkLight.intensity = 0;
                }
                else if (cycleDeg < 540) {
                    // Intake Stroke (cool atomized air-fuel charge)
                    const norm = (cycleDeg - 360) / 180;
                    mat.color.set('#38bdf8');
                    mat.opacity = Math.sin(norm * Math.PI) * 0.32;
                    if (sparkLight)
                        sparkLight.intensity = 0;
                }
                else {
                    // Compression Stroke (heating charge prior to TDC ignition)
                    const norm = (cycleDeg - 540) / 180;
                    mat.color.set('#38bdf8').lerp(new THREE.Color('#f59e0b'), norm);
                    mat.opacity = 0.18 + norm * 0.35;
                    if (sparkLight)
                        sparkLight.intensity = norm > 0.92 ? 2.0 : 0;
                }
            }
        });
    });
    // Dynamic colors based on render mode
    const crankcaseColor = isThermal
        ? getThermalColor(oilNorm * 0.75)
        : new THREE.Color('#64748b');
    const barrelColor = isThermal
        ? getThermalColor(chtNorm * 0.9)
        : new THREE.Color('#94a3b8');
    const headColor = isThermal
        ? getThermalColor(chtNorm)
        : new THREE.Color('#cbd5e1');
    const exhaustColor = isThermal
        ? getThermalColor(egtNorm)
        : new THREE.Color('#b45309').lerp(new THREE.Color('#ef4444'), egtNorm * 0.65);
    const gearboxColor = isThermal
        ? getThermalColor(oilNorm * 0.55)
        : new THREE.Color('#475569');
    return (_jsxs("group", { ref: rootGroupRef, children: [_jsxs("group", { onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('cranktrain');
                }, children: [_jsxs("mesh", { position: [0.28 + exp * 0.45, 0, 0], castShadow: true, receiveShadow: true, children: [_jsx("boxGeometry", { args: [0.54, 1.18, 2.35] }), _jsx("meshStandardMaterial", { color: crankcaseColor, metalness: 0.75, roughness: 0.28, transparent: isCutaway, opacity: isCutaway ? 0.22 : 1, wireframe: isWireframe })] }), _jsxs("mesh", { position: [-0.28 - exp * 0.45, 0, 0], castShadow: true, receiveShadow: true, children: [_jsx("boxGeometry", { args: [0.54, 1.18, 2.35] }), _jsx("meshStandardMaterial", { color: crankcaseColor, metalness: 0.75, roughness: 0.28, transparent: isCutaway, opacity: isCutaway ? 0.22 : 1, wireframe: isWireframe })] }), [-0.95, -0.5, 0, 0.5, 0.95].map((zBolt, i) => (_jsxs(React.Fragment, { children: [_jsxs("mesh", { position: [0, 0.62 + exp * 0.2, zBolt], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.035, 0.035, 0.7, 8] }), _jsx("meshStandardMaterial", { color: "#e2e8f0", metalness: 0.9, roughness: 0.15 })] }), _jsxs("mesh", { position: [0, -0.62 - exp * 0.2, zBolt], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.035, 0.035, 0.7, 8] }), _jsx("meshStandardMaterial", { color: "#e2e8f0", metalness: 0.9, roughness: 0.15 })] })] }, i)))] }), _jsxs("group", { ref: crankshaftRef, onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('cranktrain');
                }, children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.13, 0.13, 2.55, 24] }), _jsx("meshStandardMaterial", { color: "#e2e8f0", metalness: 0.92, roughness: 0.12, wireframe: isWireframe })] }), CYLINDER_CONFIGS.map((cyl, idx) => {
                        const pinX = Math.cos(cyl.crankPinPhaseRad) * crankRadius;
                        const pinY = Math.sin(cyl.crankPinPhaseRad) * crankRadius;
                        return (_jsxs("group", { position: [0, 0, cyl.zPos], children: [_jsxs("mesh", { position: [pinX, pinY, 0], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.095, 0.095, 0.26, 20] }), _jsx("meshStandardMaterial", { color: "#f8fafc", metalness: 0.95, roughness: 0.08, wireframe: isWireframe })] }), [-0.13, 0.13].map((webZ, wIdx) => (_jsxs("mesh", { position: [pinX * 0.35, pinY * 0.35, webZ], rotation: [0, 0, cyl.crankPinPhaseRad], children: [_jsx("boxGeometry", { args: [0.62, 0.28, 0.045] }), _jsx("meshStandardMaterial", { color: "#94a3b8", metalness: 0.85, roughness: 0.22, wireframe: isWireframe })] }, wIdx)))] }, idx));
                    }), _jsxs("mesh", { position: [0, 0, -1.25], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.42, 0.42, 0.08, 36] }), _jsx("meshStandardMaterial", { color: "#64748b", metalness: 0.85, roughness: 0.25 })] })] }), CYLINDER_CONFIGS.map((cyl, idx) => (_jsxs(React.Fragment, { children: [_jsxs("group", { ref: (el) => {
                            conRodRefs.current[idx] = el;
                        }, position: [0, 0, cyl.zPos], children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.145, 0.145, 0.2, 20] }), _jsx("meshStandardMaterial", { color: "#cbd5e1", metalness: 0.85, roughness: 0.2, wireframe: isWireframe })] }), _jsxs("mesh", { position: [rodLength / 2, 0, 0], children: [_jsx("boxGeometry", { args: [rodLength, 0.11, 0.09] }), _jsx("meshStandardMaterial", { color: "#94a3b8", metalness: 0.88, roughness: 0.18, wireframe: isWireframe })] }), _jsxs("mesh", { position: [rodLength, 0, 0], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.09, 0.09, 0.18, 16] }), _jsx("meshStandardMaterial", { color: "#cbd5e1", metalness: 0.85, roughness: 0.2 })] })] }), _jsxs("group", { ref: (el) => {
                            pistonRefs.current[idx] = el;
                        }, position: [cyl.side * 1.1, 0, cyl.zPos], onClick: (e) => {
                            e.stopPropagation();
                            onSelectSubsystem('cylinders');
                        }, children: [_jsxs("mesh", { rotation: [0, 0, Math.PI / 2], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.34, 0.34, 0.38, 28] }), _jsx("meshStandardMaterial", { color: isThermal ? getThermalColor(chtNorm * 0.95) : '#e2e8f0', metalness: 0.88, roughness: 0.16, wireframe: isWireframe })] }), [0.12, 0.06, 0.0].map((rOff, rIdx) => (_jsxs("mesh", { position: [cyl.side * rOff, 0, 0], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.346, 0.346, 0.016, 28] }), _jsx("meshStandardMaterial", { color: rIdx === 0 ? '#f59e0b' : '#38bdf8', metalness: 0.95, roughness: 0.1 })] }, rIdx))), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.065, 0.065, 0.56, 16] }), _jsx("meshStandardMaterial", { color: "#f8fafc", metalness: 0.95, roughness: 0.05 })] })] })] }, cyl.num))), CYLINDER_CONFIGS.map((cyl, idx) => {
                const barrelCenterX = cyl.side * (1.02 + exp * 0.85);
                const headCenterX = cyl.side * (1.58 + exp * 1.45);
                const combustionX = cyl.side * 1.34;
                return (_jsxs("group", { onClick: (e) => {
                        e.stopPropagation();
                        onSelectSubsystem('cylinders');
                    }, children: [_jsxs("mesh", { position: [barrelCenterX, 0, cyl.zPos], rotation: [0, 0, Math.PI / 2], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.38, 0.38, 0.85, 28, 1, true] }), _jsx("meshStandardMaterial", { color: barrelColor, metalness: 0.7, roughness: 0.25, transparent: isCutaway, opacity: isCutaway ? 0.26 : 1, side: THREE.DoubleSide, wireframe: isWireframe })] }), [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map((finOff, fIdx) => (_jsxs("mesh", { position: [barrelCenterX + finOff, 0, cyl.zPos], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.48, 0.48, 0.018, 28] }), _jsx("meshStandardMaterial", { color: barrelColor, metalness: 0.75, roughness: 0.3, transparent: isCutaway, opacity: isCutaway ? 0.18 : 1, wireframe: isWireframe })] }, fIdx))), _jsxs("mesh", { ref: (el) => {
                                flameRefs.current[idx] = el;
                            }, position: [combustionX, 0, cyl.zPos], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.325, 0.325, 0.28, 24] }), _jsx("meshBasicMaterial", { color: "#f97316", transparent: true, opacity: 0.5, depthWrite: false })] }), _jsx("pointLight", { ref: (el) => {
                                sparkRefs.current[idx] = el;
                            }, position: [combustionX, 0, cyl.zPos], color: "#fb923c", distance: 1.8, intensity: 0 }), _jsxs("group", { position: [headCenterX, 0, cyl.zPos], children: [_jsxs("mesh", { castShadow: true, children: [_jsx("boxGeometry", { args: [0.36, 0.78, 0.78] }), _jsx("meshStandardMaterial", { color: headColor, metalness: 0.78, roughness: 0.22, transparent: isCutaway, opacity: isCutaway ? 0.45 : 1, wireframe: isWireframe })] }), _jsxs("mesh", { position: [cyl.side * 0.24, 0, 0], castShadow: true, children: [_jsx("boxGeometry", { args: [0.14, 0.66, 0.66] }), _jsx("meshStandardMaterial", { color: cyl.num === 3 && telemetry.vibration > 25
                                                ? '#e11d48'
                                                : '#0284c7', metalness: 0.65, roughness: 0.28, wireframe: isWireframe })] }), _jsxs("group", { ref: (el) => {
                                        intakeValveRefs.current[idx] = el;
                                    }, position: [-cyl.side * 0.12, 0.16, 0], children: [_jsxs("mesh", { rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.025, 0.025, 0.34, 12] }), _jsx("meshStandardMaterial", { color: "#38bdf8", metalness: 0.9, roughness: 0.1 })] }), _jsxs("mesh", { position: [-cyl.side * 0.17, 0, 0], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.11, 0.03, 0.03, 16] }), _jsx("meshStandardMaterial", { color: "#38bdf8", metalness: 0.9, roughness: 0.1 })] })] }), _jsxs("group", { ref: (el) => {
                                        exhaustValveRefs.current[idx] = el;
                                    }, position: [-cyl.side * 0.12, -0.16, 0], children: [_jsxs("mesh", { rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.025, 0.025, 0.34, 12] }), _jsx("meshStandardMaterial", { color: "#fb923c", metalness: 0.9, roughness: 0.1 })] }), _jsxs("mesh", { position: [-cyl.side * 0.17, 0, 0], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.1, 0.03, 0.03, 16] }), _jsx("meshStandardMaterial", { color: "#fb923c", metalness: 0.9, roughness: 0.1 })] })] }), [-0.16, 0.16].map((spZ, sIdx) => (_jsxs("group", { position: [cyl.side * 0.12, 0.44, spZ], rotation: [0, 0, -cyl.side * 0.35], children: [_jsxs("mesh", { children: [_jsx("cylinderGeometry", { args: [0.04, 0.04, 0.22, 12] }), _jsx("meshStandardMaterial", { color: "#f8fafc", roughness: 0.2 })] }), _jsxs("mesh", { position: [0, 0.14, 0], children: [_jsx("cylinderGeometry", { args: [0.025, 0.025, 0.08, 12] }), _jsx("meshStandardMaterial", { color: "#ef4444" })] })] }, sIdx))), showCallouts && (_jsx(Html, { position: [cyl.side * 0.42, 0.58, 0], center: true, distanceFactor: 14, children: _jsxs("div", { className: "px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[9px] font-mono text-slate-200 whitespace-nowrap shadow", children: ["CYL #", cyl.num, " \u00B7 ", (telemetry.cht + (cyl.num === 3 ? 8 : -2)).toFixed(0), "\u00B0C"] }) }))] })] }, cyl.num));
            }), _jsxs("group", { position: [0, 0, 1.38 + exp * 1.3], onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('gearbox');
                }, children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.42, 0.48, 0.55, 24] }), _jsx("meshStandardMaterial", { color: gearboxColor, metalness: 0.72, roughness: 0.3, transparent: isCutaway, opacity: isCutaway ? 0.38 : 1, wireframe: isWireframe })] }), _jsxs("mesh", { position: [0, 0.28, 0.1], rotation: [Math.PI / 2, 0, 0], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.34, 0.38, 0.62, 24] }), _jsx("meshStandardMaterial", { color: gearboxColor, metalness: 0.75, roughness: 0.28, transparent: isCutaway, opacity: isCutaway ? 0.38 : 1, wireframe: isWireframe })] }), _jsxs("mesh", { position: [0, 0, 0.05], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.22, 0.22, 0.14, 24] }), _jsx("meshStandardMaterial", { color: "#38bdf8", metalness: 0.9, roughness: 0.15 })] }), _jsxs("mesh", { position: [0, 0.28, 0.12], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.28, 0.28, 0.14, 32] }), _jsx("meshStandardMaterial", { color: "#10b981", metalness: 0.9, roughness: 0.15 })] }), _jsxs("group", { ref: propHubRef, position: [0, 0.28, 0.62 + exp * 0.8], children: [_jsxs("mesh", { position: [0, 0, 0.28], rotation: [Math.PI / 2, 0, 0], castShadow: true, children: [_jsx("coneGeometry", { args: [0.3, 0.68, 24] }), _jsx("meshStandardMaterial", { color: "#f97316", metalness: 0.4, roughness: 0.25, wireframe: isWireframe })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.28, 0.3, 0.22, 20] }), _jsx("meshStandardMaterial", { color: "#1e293b", metalness: 0.85, roughness: 0.2 })] }), [0, 120, 240].map((deg) => (_jsxs("group", { rotation: [0, 0, (deg * Math.PI) / 180], children: [_jsxs("mesh", { position: [0, 1.25, 0], rotation: [0, 0.28, 0], castShadow: true, children: [_jsx("boxGeometry", { args: [0.22, 2.1, 0.035] }), _jsx("meshStandardMaterial", { color: "#1e293b", metalness: 0.55, roughness: 0.35, wireframe: isWireframe })] }), _jsxs("mesh", { position: [0, 2.22, 0], rotation: [0, 0.28, 0], children: [_jsx("boxGeometry", { args: [0.21, 0.22, 0.038] }), _jsx("meshStandardMaterial", { color: "#f97316" })] })] }, deg)))] })] }), _jsxs("group", { position: [0, 0.85 + exp * 0.9, 0], onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('fuel_ignition');
                }, children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.26, 0.26, 1.75, 20] }), _jsx("meshStandardMaterial", { color: isThermal ? getThermalColor(0.22) : '#334155', metalness: 0.7, roughness: 0.3, wireframe: isWireframe })] }), [-0.65, 0.65].map((rx, rIdx) => (_jsxs("mesh", { position: [rx, 0.08, 0], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.045, 0.045, 1.65, 12] }), _jsx("meshStandardMaterial", { color: "#0ea5e9", metalness: 0.85, roughness: 0.2 })] }, rIdx))), CYLINDER_CONFIGS.map((cyl, idx) => (_jsxs("group", { position: [0, 0, cyl.zPos], children: [_jsxs("mesh", { position: [cyl.side * 0.72, -0.25, 0], rotation: [0, 0, -cyl.side * 0.95], children: [_jsx("cylinderGeometry", { args: [0.095, 0.095, 1.15, 16] }), _jsx("meshStandardMaterial", { color: "#cbd5e1", metalness: 0.75, roughness: 0.25, wireframe: isWireframe })] }), _jsxs("mesh", { position: [cyl.side * 1.12, -0.12, 0], rotation: [0, 0, cyl.side * 0.35], children: [_jsx("cylinderGeometry", { args: [0.042, 0.032, 0.28, 12] }), _jsx("meshStandardMaterial", { color: "#38bdf8", metalness: 0.8, roughness: 0.2 })] }), _jsxs("mesh", { ref: (el) => {
                                    injectorSprayRefs.current[idx] = el;
                                }, position: [cyl.side * 1.22, -0.32, 0], rotation: [0, 0, -cyl.side * 0.25], children: [_jsx("coneGeometry", { args: [0.14, 0.35, 14] }), _jsx("meshBasicMaterial", { color: "#38bdf8", transparent: true, opacity: 0.4, depthWrite: false })] })] }, cyl.num)))] }), _jsxs("group", { position: [0, -0.78 - exp * 0.85, -0.2 - exp * 0.55], onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('turbo');
                }, children: [CYLINDER_CONFIGS.map((cyl) => (_jsxs("mesh", { position: [cyl.side * 0.82, 0.22, cyl.zPos + 0.1], rotation: [0.25, 0, cyl.side * 1.05], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.085, 0.085, 1.25, 16] }), _jsx("meshStandardMaterial", { color: exhaustColor, emissive: "#ea580c", emissiveIntensity: egtNorm * 0.45, metalness: 0.78, roughness: 0.28, wireframe: isWireframe })] }, cyl.num))), [-0.38, 0.38].map((px, pIdx) => (_jsxs("mesh", { position: [px, -0.08, -0.45], rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.1, 0.1, 1.75, 16] }), _jsx("meshStandardMaterial", { color: exhaustColor, emissive: "#ea580c", emissiveIntensity: egtNorm * 0.5, metalness: 0.8, roughness: 0.25, wireframe: isWireframe })] }, pIdx))), _jsxs("group", { position: [0, -0.15, -1.35 - exp * 0.45], children: [_jsxs("mesh", { position: [-0.22, 0, 0], rotation: [0, 0, Math.PI / 2], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.38, 0.38, 0.28, 24] }), _jsx("meshStandardMaterial", { color: isThermal ? getThermalColor(0.95) : '#9a3412', emissive: "#ef4444", emissiveIntensity: egtNorm * 0.65, metalness: 0.75, roughness: 0.32, transparent: isCutaway, opacity: isCutaway ? 0.5 : 1, wireframe: isWireframe })] }), _jsxs("mesh", { position: [0.22, 0, 0], rotation: [0, 0, Math.PI / 2], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.4, 0.4, 0.28, 24] }), _jsx("meshStandardMaterial", { color: isThermal ? getThermalColor(0.35) : '#cbd5e1', metalness: 0.88, roughness: 0.18, transparent: isCutaway, opacity: isCutaway ? 0.5 : 1, wireframe: isWireframe })] }), _jsx("group", { ref: turbineWheelRef, children: [0, 45, 90, 135].map((deg) => (_jsxs(React.Fragment, { children: [_jsxs("mesh", { position: [-0.22, 0, 0], rotation: [(deg * Math.PI) / 180, 0, 0], children: [_jsx("boxGeometry", { args: [0.22, 0.56, 0.03] }), _jsx("meshStandardMaterial", { color: "#f97316", metalness: 0.9, roughness: 0.15 })] }), _jsxs("mesh", { position: [0.22, 0, 0], rotation: [(deg * Math.PI) / 180, 0, 0], children: [_jsx("boxGeometry", { args: [0.22, 0.58, 0.03] }), _jsx("meshStandardMaterial", { color: "#38bdf8", metalness: 0.9, roughness: 0.15 })] })] }, deg))) }), _jsxs("mesh", { position: [0, 0.42, 0.15], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.12, 0.12, 0.28, 16] }), _jsx("meshStandardMaterial", { color: "#f59e0b", metalness: 0.8, roughness: 0.2 })] })] })] }), _jsxs("group", { position: [0, -0.78 - exp * 0.65, 0.68], onClick: (e) => {
                    e.stopPropagation();
                    onSelectSubsystem('lubrication');
                }, children: [_jsxs("mesh", { castShadow: true, children: [_jsx("boxGeometry", { args: [0.92, 0.32, 0.42] }), _jsx("meshStandardMaterial", { color: isThermal ? getThermalColor(oilNorm) : '#1e293b', metalness: 0.8, roughness: 0.3, wireframe: isWireframe })] }), _jsxs("mesh", { position: [0.62, 0.05, 0], rotation: [0, 0, -Math.PI / 2], castShadow: true, children: [_jsx("cylinderGeometry", { args: [0.14, 0.14, 0.36, 20] }), _jsx("meshStandardMaterial", { color: "#f59e0b", metalness: 0.6, roughness: 0.3 })] }), showOilFlow && (_jsxs("group", { position: [0, 0.78 + exp * 0.65, -0.68], children: [_jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [_jsx("cylinderGeometry", { args: [0.035, 0.035, 2.2, 12] }), _jsx("meshBasicMaterial", { color: "#facc15", transparent: true, opacity: 0.85 })] }), CYLINDER_CONFIGS.map((cyl) => (_jsxs("mesh", { position: [cyl.side * 0.55, 0, cyl.zPos], rotation: [0, 0, Math.PI / 2], children: [_jsx("cylinderGeometry", { args: [0.024, 0.024, 1.1, 10] }), _jsx("meshBasicMaterial", { color: "#facc15", transparent: true, opacity: 0.75 })] }, cyl.num)))] }))] }), showCallouts && (_jsxs(_Fragment, { children: [_jsx(Html, { position: [0, 1.38 + exp * 0.9, 0], center: true, distanceFactor: 14, children: _jsx("button", { onClick: () => onSelectSubsystem('fuel_ignition'), className: clsx('px-2 py-0.5 rounded text-[10px] font-mono border shadow-lg transition-all whitespace-nowrap', selectedSubsystem === 'fuel_ignition'
                                ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                                : 'bg-slate-950/85 border-slate-700 text-slate-300 hover:border-cyan-400'), children: "FADEC EFI & Dual Ignition" }) }), _jsx(Html, { position: [0, 0.85, 1.65 + exp * 1.3], center: true, distanceFactor: 14, children: _jsx("button", { onClick: () => onSelectSubsystem('gearbox'), className: clsx('px-2 py-0.5 rounded text-[10px] font-mono border shadow-lg transition-all whitespace-nowrap', selectedSubsystem === 'gearbox'
                                ? 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold'
                                : 'bg-slate-950/85 border-slate-700 text-slate-300 hover:border-emerald-400'), children: "PSRU 2.43:1 Gearbox" }) }), _jsx(Html, { position: [0, -1.25 - exp * 0.85, -1.55 - exp * 0.9], center: true, distanceFactor: 14, children: _jsxs("button", { onClick: () => onSelectSubsystem('turbo'), className: clsx('px-2 py-0.5 rounded text-[10px] font-mono border shadow-lg transition-all whitespace-nowrap', selectedSubsystem === 'turbo'
                                ? 'bg-orange-950 border-orange-400 text-orange-200 font-bold'
                                : 'bg-slate-950/85 border-slate-700 text-slate-300 hover:border-orange-400'), children: ["Turbocharger \u00B7 ", telemetry.egt.toFixed(0), "\u00B0C EGT"] }) }), _jsx(Html, { position: [0, -1.25 - exp * 0.65, 0.7], center: true, distanceFactor: 14, children: _jsxs("button", { onClick: () => onSelectSubsystem('lubrication'), className: clsx('px-2 py-0.5 rounded text-[10px] font-mono border shadow-lg transition-all whitespace-nowrap', selectedSubsystem === 'lubrication'
                                ? 'bg-amber-950 border-amber-400 text-amber-200 font-bold'
                                : 'bg-slate-950/85 border-slate-700 text-slate-300 hover:border-amber-400'), children: ["Dry-Sump Cooler \u00B7 ", telemetry.oil_pressure.toFixed(2), " bar"] }) })] }))] }));
}
// ============================================================================
// MAIN EXPORTED 3D AERO-PISTON ENGINE CORE STUDIO PAGE
// ============================================================================
export default function Page03_DigitalTwin() {
    const rawTelemetry = useStore((state) => state.telemetry);
    const rawHealth = useStore((state) => state.health);
    const rawFaults = useStore((state) => state.activeFaults);
    const { telemetryAdapter: telemetry, dtStateAdapter: dtState } = mapStoreToAdapter(rawTelemetry, rawHealth, rawFaults);
    if (!telemetry || !dtState) {
        return _jsx("div", { className: "flex h-full items-center justify-center text-slate-400", children: "Waiting for telemetry data..." });
    }
    const controlsRef = useRef(null);
    const [selectedSubsystem, setSelectedSubsystem] = useState('all');
    const [shellMode, setShellMode] = useState('cutaway');
    const [explodeFactor, setExplodeFactor] = useState(0);
    const [timeScale, setTimeScale] = useState(0.25);
    const [paused, setPaused] = useState(false);
    const [manualCrankDeg, setManualCrankDeg] = useState(0);
    const [liveCrankDeg, setLiveCrankDeg] = useState(0);
    const [showCallouts, setShowCallouts] = useState(true);
    const [showCombustion, setShowCombustion] = useState(true);
    const [showOilFlow, setShowOilFlow] = useState(true);
    const activeSpec = SUBSYSTEM_SPECS.find((s) => s.id === selectedSubsystem) || SUBSYSTEM_SPECS[0];
    const displayedCrankAngle = paused ? manualCrankDeg : liveCrankDeg;
    const propRpm = telemetry.rpm / 2.43;
    const pistonMeanSpeedMs = (2 * 0.061 * (telemetry.rpm / 60)).toFixed(2);
    const bmepBar = (11.4 * (telemetry.throttle / 75)).toFixed(2);
    return (_jsxs("div", { className: "h-full min-h-[700px] w-full flex flex-col gap-3 select-none", children: [_jsxs("div", { className: "bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 mr-2 pr-3 border-r border-slate-800", children: [_jsx(Wrench, { className: "w-4 h-4 text-emerald-400" }), _jsxs("div", { children: [_jsx("div", { className: "text-xs font-bold text-white tracking-wide", children: "ROTAX 914 UL/F \u00B7 3D CAD CORE LAB" }), _jsx("div", { className: "text-[10px] font-mono text-slate-400", children: "1,211 cc Flat-4 Turbo \u00B7 1-3-2-4 Firing Order" })] })] }), [
                                { id: 'all', label: 'Full Assembly' },
                                { id: 'cranktrain', label: 'Crank & Pistons' },
                                { id: 'cylinders', label: 'Cylinders & Valves' },
                                { id: 'turbo', label: 'Turbocharger' },
                                { id: 'gearbox', label: 'PSRU Gearbox' },
                                { id: 'fuel_ignition', label: 'FADEC & EFI' },
                                { id: 'lubrication', label: 'Dry-Sump Oil' },
                            ].map((sub) => (_jsx("button", { onClick: () => setSelectedSubsystem(sub.id), className: clsx('px-2.5 py-1 rounded-md text-xs font-mono transition-colors border', selectedSubsystem === sub.id
                                    ? 'bg-emerald-600 text-white border-emerald-400 font-semibold shadow-sm'
                                    : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-600'), children: sub.label }, sub.id)))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono", children: [
                                    { id: 'cutaway', label: 'X-Ray Cutaway' },
                                    { id: 'solid', label: 'Solid CAD' },
                                    { id: 'thermal', label: 'Thermal IR' },
                                    { id: 'wireframe', label: 'Wireframe' },
                                ].map((mode) => (_jsx("button", { onClick: () => setShellMode(mode.id), className: clsx('px-2.5 py-1 rounded-md transition-colors', shellMode === mode.id
                                        ? 'bg-cyan-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-slate-200'), children: mode.label }, mode.id))) }), _jsxs("div", { className: "flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800", children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-amber-400" }), _jsx("span", { className: "text-[10px] font-mono text-slate-400 uppercase", children: "Explode:" }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.02, value: explodeFactor, onChange: (e) => setExplodeFactor(Number(e.target.value)), className: "w-24 accent-amber-400 cursor-pointer" }), _jsxs("span", { className: "text-[11px] font-mono text-amber-300 w-8 text-right tabular-nums", children: [Math.round(explodeFactor * 100), "%"] })] })] })] }), _jsxs("div", { className: "flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0", children: [_jsxs("div", { className: "lg:col-span-9 relative rounded-xl overflow-hidden border border-slate-800 bg-[#070A10] flex flex-col", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsxs(Canvas, { shadows: true, camera: { position: [4.8, 3.1, 5.2], fov: 40 }, children: [_jsx("color", { attach: "background", args: ['#070A10'] }), _jsx("fog", { attach: "fog", args: ['#070A10', 14, 34] }), _jsx("ambientLight", { intensity: 0.75 }), _jsx("directionalLight", { castShadow: true, position: [6, 9, 6], intensity: 1.6, "shadow-mapSize": [1024, 1024] }), _jsx("directionalLight", { position: [-6, 4, -5], intensity: 0.7, color: "#38bdf8" }), _jsx("directionalLight", { position: [0, -6, 3], intensity: 0.5, color: "#f59e0b" }), _jsx(Rotax914PrecisionAssembly, { telemetry: telemetry, explodeFactor: explodeFactor, shellMode: shellMode, timeScale: timeScale, paused: paused, manualCrankDeg: manualCrankDeg, showCallouts: showCallouts, showCombustion: showCombustion, showOilFlow: showOilFlow, selectedSubsystem: selectedSubsystem, onSelectSubsystem: setSelectedSubsystem, onCrankAngleUpdate: setLiveCrankDeg }), _jsx(Grid, { position: [0, -1.55, 0], args: [18, 18], cellSize: 0.5, cellThickness: 0.5, cellColor: "#1e293b", sectionSize: 2.0, sectionThickness: 1, sectionColor: "#334155", fadeDistance: 16 }), _jsx(ContactShadows, { position: [0, -1.54, 0], opacity: 0.55, scale: 10, blur: 2.2, far: 4 }), _jsx(OrbitControls, { ref: controlsRef, makeDefault: true, enablePan: true, enableZoom: true, enableRotate: true, minDistance: 1.8, maxDistance: 14 }), _jsx(CameraFocusController, { selectedSubsystem: selectedSubsystem, controlsRef: controlsRef })] }), _jsxs("div", { className: "absolute top-3 left-3 z-10 bg-[#090e17]/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 pointer-events-none max-w-xs", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-ping" }), "REAL-TIME 4-STROKE KINEMATIC SOLVER"] }), _jsxs("div", { className: "mt-1.5 grid grid-cols-3 gap-2 text-xs font-mono", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[9px] text-slate-400", children: "CRANK RPM" }), _jsx("div", { className: "font-bold text-white tabular-nums", children: telemetry.rpm.toFixed(0) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] text-slate-400", children: "PROP RPM" }), _jsx("div", { className: "font-bold text-cyan-400 tabular-nums", children: propRpm.toFixed(0) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] text-slate-400", children: "CRANK ANGLE" }), _jsxs("div", { className: "font-bold text-amber-400 tabular-nums", children: [displayedCrankAngle.toFixed(0), "\u00B0 CA"] })] })] })] }), _jsxs("div", { className: "absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#090e17]/90 backdrop-blur-md border border-slate-800 rounded-lg p-1.5 text-[11px] font-mono", children: [_jsxs("button", { onClick: () => setShowCombustion((c) => !c), className: clsx('px-2.5 py-1 rounded transition-colors flex items-center gap-1', showCombustion
                                                    ? 'bg-orange-500/20 border border-orange-500/60 text-orange-300'
                                                    : 'text-slate-400 hover:text-white'), children: [_jsx(Flame, { className: "w-3.5 h-3.5" }), "Combustion & Spray"] }), _jsx("button", { onClick: () => setShowOilFlow((o) => !o), className: clsx('px-2.5 py-1 rounded transition-colors', showOilFlow
                                                    ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300'
                                                    : 'text-slate-400 hover:text-white'), children: "Oil Circuit" }), _jsx("button", { onClick: () => setShowCallouts((l) => !l), className: clsx('px-2.5 py-1 rounded transition-colors', showCallouts
                                                    ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-300'
                                                    : 'text-slate-400 hover:text-white'), children: "3D Callouts" })] })] }), _jsxs("div", { className: "bg-[#0B0F17] border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("button", { onClick: () => {
                                                    if (!paused) {
                                                        setManualCrankDeg(liveCrankDeg);
                                                    }
                                                    setPaused((p) => !p);
                                                }, className: clsx('px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 border transition-colors', paused
                                                    ? 'bg-amber-600 text-white border-amber-400'
                                                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'), children: [paused ? _jsx(Play, { className: "w-3.5 h-3.5" }) : _jsx(Pause, { className: "w-3.5 h-3.5" }), paused ? 'Resume Live' : 'Freeze Crank'] }), [
                                                { scale: 1, label: '1x Speed' },
                                                { scale: 0.25, label: '0.25x Slow-Mo' },
                                                { scale: 0.05, label: '0.05x Inspect' },
                                            ].map((sp) => (_jsx("button", { onClick: () => {
                                                    setPaused(false);
                                                    setTimeScale(sp.scale);
                                                }, className: clsx('px-2.5 py-1 rounded-md text-xs font-mono border transition-colors', !paused && timeScale === sp.scale
                                                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 font-semibold'
                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'), children: sp.label }, sp.scale)))] }), _jsxs("div", { className: "flex items-center gap-2.5 flex-1 max-w-md", children: [_jsx("span", { className: "text-[10px] font-mono text-slate-400 whitespace-nowrap", children: "720\u00B0 CYCLE SCRUB:" }), _jsx("input", { type: "range", min: 0, max: 720, value: displayedCrankAngle, onChange: (e) => {
                                                    setPaused(true);
                                                    setManualCrankDeg(Number(e.target.value));
                                                }, className: "flex-1 accent-cyan-400 cursor-pointer" }), _jsxs("span", { className: "text-xs font-mono text-cyan-300 w-16 text-right tabular-nums", children: [displayedCrankAngle.toFixed(0), "\u00B0 CA"] })] })] })] }), _jsxs("div", { className: "lg:col-span-3 flex flex-col gap-3 overflow-y-auto", children: [_jsxs("div", { className: "bg-[#0B0F17] border border-slate-800 rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-1", children: [_jsx("span", { children: activeSpec.code }), _jsx("span", { children: "CAD REV 5.2" })] }), _jsx("h3", { className: "text-sm font-bold text-white", children: activeSpec.name }), _jsx("p", { className: "text-xs text-slate-400 mt-1.5 leading-relaxed", children: activeSpec.description }), _jsxs("div", { className: "mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Alloy Spec:" }), _jsx("span", { className: "text-slate-200 text-right", children: activeSpec.material })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Tolerance:" }), _jsx("span", { className: "text-cyan-300 text-right", children: activeSpec.clearance })] })] })] }), _jsxs("div", { className: "bg-[#0B0F17] border border-slate-800 rounded-xl p-4", children: [_jsxs("div", { className: "text-xs font-mono font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between", children: [_jsx("span", { children: "4-Cylinder Phase Matrix" }), _jsx("span", { className: "text-[10px] text-emerald-400", children: "ORDER 1-3-2-4" })] }), _jsx("div", { className: "space-y-2", children: CYLINDER_CONFIGS.map((cyl) => {
                                            const cDeg = (displayedCrankAngle + cyl.firingOffsetDeg) % 720;
                                            const phase = cDeg < 180
                                                ? { name: 'POWER / COMBUSTION', color: 'text-orange-400 bg-orange-500/15 border-orange-500/40' }
                                                : cDeg < 360
                                                    ? { name: 'EXHAUST PURGE', color: 'text-rose-300 bg-rose-500/15 border-rose-500/40' }
                                                    : cDeg < 540
                                                        ? { name: 'INTAKE CHARGE', color: 'text-sky-300 bg-sky-500/15 border-sky-500/40' }
                                                        : { name: 'COMPRESSION', color: 'text-amber-300 bg-amber-500/15 border-amber-500/40' };
                                            return (_jsxs("div", { className: "p-2 rounded-lg bg-slate-950 border border-slate-800/90 flex items-center justify-between text-xs font-mono", children: [_jsxs("div", { children: [_jsxs("span", { className: "font-bold text-white", children: ["CYL #", cyl.num] }), _jsxs("span", { className: "text-[10px] text-slate-500 ml-1.5", children: ["(", cyl.side > 0 ? 'Right Bank' : 'Left Bank', ")"] })] }), _jsx("span", { className: clsx('px-2 py-0.5 rounded border text-[10px] font-semibold', phase.color), children: phase.name })] }, cyl.num));
                                        }) })] }), _jsxs("div", { className: "bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex-1", children: [_jsx("div", { className: "text-xs font-mono font-bold text-white uppercase tracking-wider mb-2.5", children: "Core Mechanical Telemetry" }), _jsxs("div", { className: "space-y-2 text-xs font-mono", children: [_jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Mean Piston Speed" }), _jsxs("span", { className: "text-white tabular-nums", children: [pistonMeanSpeedMs, " m/s"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Brake Mean Eff. Press (BMEP)" }), _jsxs("span", { className: "text-emerald-400 tabular-nums", children: [bmepBar, " bar"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Cylinder Head Temp (CHT)" }), _jsxs("span", { className: "text-amber-300 tabular-nums", children: [telemetry.cht.toFixed(1), " \u00B0C"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Turbine Entry Temp (EGT)" }), _jsxs("span", { className: "text-orange-400 tabular-nums", children: [telemetry.egt.toFixed(1), " \u00B0C"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Dry-Sump Oil Pressure" }), _jsxs("span", { className: "text-cyan-300 tabular-nums", children: [telemetry.oil_pressure.toFixed(2), " bar"] })] }), _jsxs("div", { className: "flex justify-between py-1 border-b border-slate-800/70", children: [_jsx("span", { className: "text-slate-400", children: "Torsional Vibration" }), _jsxs("span", { className: "text-slate-200 tabular-nums", children: [telemetry.vibration.toFixed(1), " mm/s"] })] }), _jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-slate-400", children: "Estimated Core RUL" }), _jsxs("span", { className: "text-emerald-400 font-bold tabular-nums", children: [dtState.rul_estimated_hours.toFixed(1), " hrs"] })] })] })] })] })] })] }));
}
