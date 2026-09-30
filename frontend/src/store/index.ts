// Zustand global store
import { create } from 'zustand'
import { TelemetryRecord, HealthRecord, FaultEvent, RULEstimate, Mission } from '../types'

interface Store {
  // Connection
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;

  // Demo mode
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;

  // Live data
  telemetry: TelemetryRecord | null;
  health: HealthRecord | null;
  activeFaults: FaultEvent[];
  rul: RULEstimate | null;
  operatingHours: number;

  // History buffers (capped at 300)
  telemetryHistory: TelemetryRecord[];
  healthHistory: HealthRecord[];
  // Alias used by UI components
  historyBuffer: TelemetryRecord[];

  // Missions
  missions: Mission[];
  setMissions: (m: Mission[]) => void;

  // Actions
  updateFromWS: (data: any) => void;
  addAlert: (alert: string) => void;
  alerts: string[];
}

export const useStore = create<Store>((set, get) => ({
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
    const updates: Partial<Store> = {};
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
