import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../services/api';
import { LayoutDashboard, Activity, Cpu, HeartPulse, AlertTriangle, Brain, TrendingDown, FlaskConical, Play, BarChart3, Wrench, History, Signal, Radio, LayoutGrid, Settings, Wifi, WifiOff, Zap } from 'lucide-react';
const NAV = [
    { path: '/overview', icon: LayoutDashboard, label: 'Command', code: 'S01' },
    { path: '/live-monitor', icon: Activity, label: 'Live Engine', code: 'S02' },
    { path: '/digital-twin', icon: Cpu, label: 'Digital Twin', code: 'S03' },
    { path: '/engine-health', icon: HeartPulse, label: 'Health', code: 'S04' },
    { path: '/faults', icon: AlertTriangle, label: 'Faults', code: 'S05' },
    { path: '/ai-analytics', icon: Brain, label: 'AI Analytics', code: 'S06' },
    { path: '/rul', icon: TrendingDown, label: 'RUL', code: 'S07' },
    { path: '/mission-simulator', icon: FlaskConical, label: 'Sim', code: 'S08' },
    { path: '/mission-replay', icon: Play, label: 'Replay', code: 'S09' },
    { path: '/post-flight', icon: BarChart3, label: 'Post-Flight', code: 'S10' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance', code: 'S11' },
    { path: '/engine-history', icon: History, label: 'History', code: 'S12' },
    { path: '/sensor-quality', icon: Signal, label: 'Sensors', code: 'S13' },
    { path: '/telemetry-ecu', icon: Radio, label: 'Telemetry', code: 'S14' },
    { path: '/fleet', icon: LayoutGrid, label: 'Fleet', code: 'S15' },
    { path: '/configuration', icon: Settings, label: 'Config', code: 'S16' },
];
export default function Sidebar() {
    const { wsConnected, demoMode, setDemoMode, activeFaults } = useStore();
    const critCount = activeFaults.filter(f => f.severity === 'CRITICAL').length;
    const warnCount = activeFaults.filter(f => f.severity === 'WARNING').length;
    const handleDemo = async () => {
        try {
            if (demoMode) {
                await api.demo.stop();
                setDemoMode(false);
            }
            else {
                await api.demo.start();
                setDemoMode(true);
            }
        }
        catch { }
    };
    return (_jsxs("aside", { className: "w-16 flex flex-col bg-surface border-r border-border shrink-0 overflow-hidden", children: [_jsxs("div", { className: "flex flex-col items-center py-2 border-b border-border", children: [_jsx("div", { className: "w-8 h-8 bg-accent rounded-sm flex items-center justify-center mb-1", children: _jsx("span", { className: "text-bg font-bold text-[clamp(10px,0.9vw,12px)]", children: "DT" }) }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono text-center leading-tight", children: "DEMO" })] }), _jsx("nav", { className: "flex-1 py-1 overflow-y-auto", children: NAV.map(({ path, icon: Icon, label, code }) => (_jsxs(NavLink, { to: path, title: `${code} — ${label}`, className: ({ isActive }) => `flex flex-col items-center py-2 px-1 mx-1 my-0.5 rounded-sm transition-colors group relative
               ${isActive
                        ? 'bg-accent/20 text-accent'
                        : 'text-text-muted hover:bg-surface-alt hover:text-text-secondary'}`, children: [_jsx(Icon, { size: 14 }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] mt-0.5 font-mono leading-tight text-center", children: code }), _jsx("span", { className: "absolute left-full ml-2 px-2 py-1 bg-surface-alt border border-border text-text-primary text-[clamp(10px,0.9vw,12px)] rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 font-mono", children: label })] }, path))) }), _jsxs("div", { className: "border-t border-border p-1 flex flex-col items-center gap-1", children: [critCount > 0 && (_jsx("div", { className: "w-full bg-critical/20 border border-critical rounded-sm px-1 py-0.5 text-center", children: _jsxs("span", { className: "text-critical font-mono text-[clamp(9px,0.8vw,11px)]", children: ["CRIT:", critCount] }) })), warnCount > 0 && (_jsx("div", { className: "w-full bg-warning/20 border border-warning rounded-sm px-1 py-0.5 text-center", children: _jsxs("span", { className: "text-warning font-mono text-[clamp(9px,0.8vw,11px)]", children: ["WARN:", warnCount] }) })), _jsxs("div", { className: `flex items-center gap-1 ${wsConnected ? 'text-healthy' : 'text-critical'}`, title: wsConnected ? 'WebSocket Connected' : 'Disconnected', children: [wsConnected ? _jsx(Wifi, { size: 10 }) : _jsx(WifiOff, { size: 10 }), _jsx("span", { className: "text-[clamp(8px,0.7vw,10px)] font-mono", children: wsConnected ? 'LIVE' : 'OFF' })] }), _jsxs("button", { onClick: handleDemo, title: demoMode ? 'Stop Demo' : 'Start ISR Demo Mission', className: `w-full py-1 rounded-sm text-[clamp(8px,0.7vw,10px)] font-mono font-bold border transition-colors
            ${demoMode
                            ? 'bg-accent/30 border-accent text-accent'
                            : 'bg-surface-alt border-border text-text-muted hover:border-accent hover:text-accent'}`, children: [_jsx(Zap, { size: 8, className: "mx-auto mb-0.5" }), demoMode ? 'DEMO' : 'DEMO'] })] })] }));
}
