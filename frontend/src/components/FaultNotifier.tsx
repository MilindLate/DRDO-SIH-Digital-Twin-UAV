import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { AlertTriangle, Wrench, X } from 'lucide-react';
import { api } from '../services/api';

export default function FaultNotifier() {
  const { activeFaults } = useStore();
  const [notifiedFaults, setNotifiedFaults] = useState<Set<string>>(new Set());
  const [currentNotification, setCurrentNotification] = useState<any | null>(null);
  const [solution, setSolution] = useState<string | null>(null);

  useEffect(() => {
    // Check for new critical/warning faults
    for (const fault of activeFaults) {
      if ((fault.severity === 'CRITICAL' || fault.severity === 'WARNING') && !notifiedFaults.has((fault.fault_id || String(Math.random())))) {
        // Show notification
        setCurrentNotification(fault);
        setNotifiedFaults(prev => new Set(prev).add((fault.fault_id || String(Math.random()))));
        
        // Fetch XAI rationale / solution
        api.xai.getMaintenanceRationale(fault.fault_type, (fault.confidence || 0.8)).then((res: any) => {
          if (res && res.rationale) {
            setSolution(res.rationale);
          } else if (fault.recommended_inspection) {
            setSolution(fault.recommended_inspection);
          }
        }).catch(() => {
          setSolution(fault.recommended_inspection || "Check engine subsystem parameters immediately.");
        });
        
        break; // Show one at a time
      }
    }
  }, [activeFaults, notifiedFaults]);

  if (!currentNotification) return null;

  const isCritical = currentNotification.severity === 'CRITICAL';
  
  return (
    <div className="fixed bottom-6 right-6 w-96 bg-surface border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300"
         style={{ borderColor: isCritical ? '#ef4444' : '#f59e0b' }}>
      
      {/* Header */}
      <div className={`px-4 py-2 flex items-center justify-between ${isCritical ? 'bg-critical text-bg' : 'bg-warning text-bg'}`}>
        <div className="flex items-center gap-2 font-bold font-mono tracking-wider text-sm">
          <AlertTriangle size={16} />
          {currentNotification.severity} FAULT PREDICTED
        </div>
        <button onClick={() => setCurrentNotification(null)} className="hover:opacity-75">
          <X size={16} />
        </button>
      </div>
      
      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        <div>
          <div className="text-xs text-text-muted font-mono mb-1">PREDICTED FAULT TYPE:</div>
          <div className="font-display font-bold text-text-primary">{currentNotification.fault_type.replace(/_/g, ' ')}</div>
          <div className="text-xs text-text-muted font-mono mt-1">CONFIDENCE: {(currentNotification.confidence * 100).toFixed(1)}%</div>
        </div>
        
        <div className="bg-bg border border-border rounded p-3 mt-1">
          <div className="flex items-center gap-2 text-accent text-xs font-mono mb-2 font-bold">
            <Wrench size={12} />
            PREVENTIVE SOLUTION / RATIONALE:
          </div>
          <div className="text-sm text-text-secondary leading-relaxed">
            {solution ? solution : <span className="animate-pulse">Analyzing optimal solution...</span>}
          </div>
        </div>
      </div>
      
    </div>
  );
}
