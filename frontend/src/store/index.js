// Zustand global store
import { create } from 'zustand';
export const useStore = create((set, get) => ({
    wsConnected: false,
    setWsConnected: (v) => set({ wsConnected: v }),
    demoMode: false,
    setDemoMode: (v) => set({ demoMode: v }),
    telemetry: null,
    health: null,
    activeFaults: [],
    rul: null,
    operatingHours: 0,
    telemetryHistory: [],
    healthHistory: [],
    historyBuffer: [],
    missions: [],
    setMissions: (m) => set({ missions: m }),
    alerts: [],
    addAlert: (alert) => set(s => ({ alerts: [alert, ...s.alerts].slice(0, 50) })),
    updateFromWS: (data) => {
        const updates = {};
        if (data.telemetry) {
            updates.telemetry = data.telemetry;
            const newHistory = [...get().telemetryHistory, data.telemetry].slice(-300);
            updates.telemetryHistory = newHistory;
            updates.historyBuffer = newHistory;
        }
        if (data.health) {
            updates.health = data.health;
            updates.healthHistory = [...get().healthHistory, data.health].slice(-300);
        }
        if (data.faults !== undefined) {
            updates.activeFaults = data.faults || [];
        }
        if (data.operating_hours !== undefined) {
            updates.operatingHours = data.operating_hours;
        }
        if (data.demo_mode !== undefined) {
            updates.demoMode = data.demo_mode;
        }
        set(updates);
    },
}));
