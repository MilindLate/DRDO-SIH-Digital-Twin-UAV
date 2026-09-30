// S16 — System Configuration
import React, { useState } from 'react'

const TABS = ['Engine', 'Limits', 'Simulation', 'Models', 'System']

const ENGINE_PARAMS = [
  { key: 'max_rpm_rated', label: 'Max RPM (rated)', value: 5800, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'max_power_kw', label: 'Max Power', value: 75, unit: 'kW', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'tbo_hours', label: 'TBO (Time Between Overhaul)', value: 1500, unit: 'hours', note: 'SIMULATED/CONFIGURABLE — See engine_config.yaml' },
  { key: 'cylinders', label: 'Cylinders', value: 4, unit: '', note: 'CONFIGURABLE' },
  { key: 'displacement_cc', label: 'Engine Displacement', value: 2000, unit: 'cc', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'idle_rpm', label: 'Idle RPM', value: 900, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'cruise_rpm', label: 'Cruise RPM', value: 4200, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'target_afr', label: 'Target AFR', value: 12.5, unit: ':1', note: 'RESEARCH MODEL (Heywood, 1988)' },
]

const LIMITS_PARAMS = [
  { key: 'cht_warn', label: 'CHT Warning Limit', value: 220, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'cht_crit', label: 'CHT Critical Limit', value: 240, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'egt_warn', label: 'EGT Warning Limit', value: 750, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'egt_crit', label: 'EGT Critical Limit', value: 800, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'oil_press_min', label: 'Oil Pressure Min', value: 200, unit: 'kPa', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'oil_temp_max', label: 'Oil Temp Max', value: 110, unit: '°C', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'vib_warn', label: 'Vibration Warning', value: 0.5, unit: 'g RMS', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'vib_crit', label: 'Vibration Critical', value: 1.0, unit: 'g RMS', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'batt_v_min', label: 'Battery Voltage Min', value: 11.5, unit: 'V', note: 'SIMULATED/CONFIGURABLE' },
  { key: 'rpm_max', label: 'RPM Maximum', value: 5800, unit: 'RPM', note: 'SIMULATED/CONFIGURABLE' },
]

const SIM_PARAMS = [
  { key: 'update_rate_hz', label: 'Simulator Update Rate', value: 1.0, unit: 'Hz', note: 'CONFIGURABLE' },
  { key: 'demo_speed', label: 'Demo Playback Speed', value: 1.0, unit: '×', note: 'CONFIGURABLE' },
  { key: 'noise_level', label: 'Parameter Noise Level', value: 0.02, unit: 'σ', note: 'SIMULATED' },
  { key: 'seed', label: 'Random Seed', value: 42, unit: '', note: 'CONFIGURABLE' },
]

export default function Page16_Configuration() {
  const [activeTab, setActiveTab] = useState('Engine')
  const [values, setValues] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)

  function update(key: string, v: string) {
    setValues(prev => ({ ...prev, [key]: parseFloat(v) || 0 }))
    setSaved(false)
  }

  function save() { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  function reset() { setValues({}); setSaved(false) }

  const paramList = activeTab === 'Engine' ? ENGINE_PARAMS : activeTab === 'Limits' ? LIMITS_PARAMS : activeTab === 'Simulation' ? SIM_PARAMS : []

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary">
      <div className="flex items-center justify-between bg-surface border-b border-border px-3 py-1.5 shrink-0">
        <div><span className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono">S16</span>
          <h1 className="text-[clamp(12px,1.1vw,14px)] font-bold font-mono">SYSTEM CONFIGURATION</h1></div>
        <div className="flex items-center gap-2">
          <span className="text-[clamp(8px,0.7vw,10px)] font-mono border border-border px-1 text-text-muted">engine_config.yaml [CONFIGURABLE]</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface px-2 shrink-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[clamp(9px,0.8vw,11px)] font-mono border-b-2 transition-colors
              ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-3 p-2 bg-advisory/5 border border-advisory/30 rounded-sm">
          <p className="text-[clamp(8px,0.7vw,10px)] text-advisory font-mono">
            ⚠ All configuration values are SIMULATED/CONFIGURABLE. Changes here affect the demonstration only.
            In a real system, values must be validated against certified engine documentation and approved by qualified engineering personnel.
            Source file: <span className="text-accent">backend/engine_config.yaml</span>
          </p>
        </div>

        {paramList.length > 0 ? (
          <div className="bg-surface border border-border rounded-sm overflow-hidden">
            <table className="w-full text-[clamp(9px,0.8vw,11px)] font-mono">
              <thead className="border-b border-border bg-surface-alt">
                <tr className="text-text-muted">
                  <th className="text-left px-3 py-2">PARAMETER</th>
                  <th className="text-right px-3 py-2">CURRENT VALUE</th>
                  <th className="text-left px-3 py-2">UNIT</th>
                  <th className="text-left px-3 py-2">OVERRIDE</th>
                  <th className="text-left px-3 py-2">LABEL</th>
                </tr>
              </thead>
              <tbody>
                {paramList.map(p => (
                  <tr key={p.key} className="border-b border-border/30 hover:bg-surface-alt">
                    <td className="px-3 py-1.5 text-text-secondary">{p.label}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-text-primary">
                      {values[p.key] ?? p.value}
                    </td>
                    <td className="px-3 py-1.5 text-text-muted">{p.unit}</td>
                    <td className="px-3 py-1.5">
                      <input type="number" step="any" placeholder={String(p.value)}
                        value={values[p.key] ?? ''}
                        onChange={e => update(p.key, e.target.value)}
                        className="w-28 bg-surface-alt border border-border text-text-primary px-1.5 py-0.5 rounded-sm text-[clamp(9px,0.8vw,11px)] font-mono focus:border-accent outline-none" />
                    </td>
                    <td className="px-3 py-1.5 text-[clamp(8px,0.7vw,10px)] text-text-muted">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'Models' ? (
          <ModelRegistry />
        ) : activeTab === 'System' ? (
          <SystemInfo />
        ) : null}

        {paramList.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <button onClick={save} className={`px-3 py-1.5 text-[clamp(10px,0.9vw,12px)] font-mono border rounded-sm transition-colors
              ${saved ? 'border-healthy text-healthy bg-healthy/10' : 'border-accent text-accent hover:bg-accent/10'}`}>
              {saved ? '✓ SAVED (DEMO ONLY)' : 'SAVE CHANGES'}
            </button>
            <button onClick={reset} className="px-3 py-1.5 text-[clamp(10px,0.9vw,12px)] font-mono border border-border text-text-muted rounded-sm hover:border-warning hover:text-warning transition-colors">
              RESET TO DEFAULTS
            </button>
            <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono ml-2">Changes apply to demo display only — modify engine_config.yaml for persistent changes</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelRegistry() {
  return (
    <div className="bg-surface border border-border rounded-sm p-3">
      <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-3">ML MODEL REGISTRY [DEMONSTRATION MODELS]</div>
      <table className="w-full text-[clamp(9px,0.8vw,11px)] font-mono">
        <thead><tr className="border-b border-border text-text-muted">
          <th className="text-left py-1">MODEL NAME</th><th className="text-left py-1">TYPE</th>
          <th className="text-left py-1">ALGORITHM</th><th className="text-left py-1">TRAINING DATA</th>
          <th className="text-center py-1">STATUS</th><th className="text-left py-1">DISCLAIMER</th>
        </tr></thead>
        <tbody>
          {[
            { name: 'AnomalyDetector', type: 'ANOMALY_DETECTION', algo: 'IsolationForest', data: 'Synthetic [10K samples]', active: true },
            { name: 'FaultClassifier', type: 'FAULT_CLASSIFICATION', algo: 'RandomForestClassifier', data: 'Synthetic [5 classes]', active: true },
            { name: 'RULEstimator', type: 'RUL_ESTIMATION', algo: 'Physics Degradation Model', data: 'N/A (physics)', active: true },
          ].map(m => (
            <tr key={m.name} className="border-b border-border/30">
              <td className="py-1.5 text-accent">{m.name}</td>
              <td className="py-1.5 text-text-secondary">{m.type}</td>
              <td className="py-1.5">{m.algo}</td>
              <td className="py-1.5 text-text-muted">{m.data}</td>
              <td className="py-1.5 text-center"><span className="text-healthy">ACTIVE</span></td>
              <td className="py-1.5 text-[clamp(8px,0.7vw,10px)] text-text-muted">DEMONSTRATION MODEL</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SystemInfo() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { title: 'System', items: [
          ['Product', 'AI-Enabled Digital Twin — MALE UAV Engine'],
          ['Version', '1.0.0 DEMONSTRATION'],
          ['Classification', 'RESEARCH PROTOTYPE'],
          ['Status', 'NOT FOR OPERATIONAL USE'],
        ]},
        { title: 'Stack', items: [
          ['Backend', 'Python FastAPI + SQLite'],
          ['Frontend', 'React 18 + TypeScript + Vite'],
          ['ML', 'scikit-learn (IsolationForest, RandomForest)'],
          ['Simulator', 'Physics-informed model (ISA + ICE)'],
        ]},
        { title: 'Data', items: [
          ['Source', 'SIMULATOR — SYNTHETIC'],
          ['Update Rate', '1 Hz [CONFIGURABLE]'],
          ['Protocol', 'WebSocket / JSON'],
          ['DB', 'SQLite (TimescaleDB-ready)'],
        ]},
        { title: 'Disclaimers', items: [
          ['Limits', 'SIMULATED/CONFIGURABLE — Not certified'],
          ['Health', 'DEMONSTRATION MODEL — Not aerospace-validated'],
          ['RUL', 'SIMULATION-BASED — Not validated vs real data'],
          ['ML', 'Trained on synthetic data only'],
        ]},
      ].map(({ title, items }) => (
        <div key={title} className="bg-surface border border-border rounded-sm p-2">
          <div className="text-[clamp(9px,0.8vw,11px)] text-text-muted font-mono mb-2 border-b border-border pb-1">{title.toUpperCase()}</div>
          {items.map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-[clamp(8px,0.7vw,10px)] text-text-muted font-mono">{k}</span>
              <span className="text-[clamp(8px,0.7vw,10px)] font-mono text-text-secondary text-right max-w-[60%]">{v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
