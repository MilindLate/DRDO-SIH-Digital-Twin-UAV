import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { AlertTriangle, Wrench, X } from 'lucide-react';
import { api } from '../services/api';
export default function FaultNotifier() {
    const { activeFaults } = useStore();
    const [notifiedFaults, setNotifiedFaults] = useState(new Set());
    const [currentNotification, setCurrentNotification] = useState(null);
    const [solution, setSolution] = useState(null);
    useEffect(() => {
        // Check for new critical/warning faults
        for (const fault of activeFaults) {
            if ((fault.severity === 'CRITICAL' || fault.severity === 'WARNING') && !notifiedFaults.has((fault.fault_id || String(Math.random())))) {
                // Show notification
                setCurrentNotification(fault);
                setNotifiedFaults(prev => new Set(prev).add((fault.fault_id || String(Math.random()))));
                // Fetch XAI rationale / solution
                api.xai.getMaintenanceRationale(fault.fault_type, (fault.confidence || 0.8)).then((res) => {
                    if (res && res.rationale) {
                        setSolution(res.rationale);
                    }
                    else if (fault.recommended_inspection) {
                        setSolution(fault.recommended_inspection);
                    }
                }).catch(() => {
                    setSolution(fault.recommended_inspection || "Check engine subsystem parameters immediately.");
                });
                break; // Show one at a time
            }
        }
    }, [activeFaults, notifiedFaults]);
    if (!currentNotification)
        return null;
    const isCritical = currentNotification.severity === 'CRITICAL';
    return (_jsxs("div", { className: "fixed bottom-6 right-6 w-96 bg-surface border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300", style: { borderColor: isCritical ? '#ef4444' : '#f59e0b' }, children: [_jsxs("div", { className: `px-4 py-2 flex items-center justify-between ${isCritical ? 'bg-critical text-bg' : 'bg-warning text-bg'}`, children: [_jsxs("div", { className: "flex items-center gap-2 font-bold font-mono tracking-wider text-sm", children: [_jsx(AlertTriangle, { size: 16 }), currentNotification.severity, " FAULT PREDICTED"] }), _jsx("button", { onClick: () => setCurrentNotification(null), className: "hover:opacity-75", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "p-4 flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-text-muted font-mono mb-1", children: "PREDICTED FAULT TYPE:" }), _jsx("div", { className: "font-display font-bold text-text-primary", children: currentNotification.fault_type.replace(/_/g, ' ') }), _jsxs("div", { className: "text-xs text-text-muted font-mono mt-1", children: ["CONFIDENCE: ", (currentNotification.confidence * 100).toFixed(1), "%"] })] }), _jsxs("div", { className: "bg-bg border border-border rounded p-3 mt-1", children: [_jsxs("div", { className: "flex items-center gap-2 text-accent text-xs font-mono mb-2 font-bold", children: [_jsx(Wrench, { size: 12 }), "PREVENTIVE SOLUTION / RATIONALE:"] }), _jsx("div", { className: "text-sm text-text-secondary leading-relaxed", children: solution ? solution : _jsx("span", { className: "animate-pulse", children: "Analyzing optimal solution..." }) })] })] })] }));
}
