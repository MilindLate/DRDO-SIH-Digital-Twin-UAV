import re

ADAPTER_IMPORTS = """
import useStore from '../store';
import { TelemetryRecord, HealthRecord, FaultEvent } from '../types';

export interface EngineTelemetry {
  timestamp: number;
  engine_id: string;
  mission_profile: string;
  rpm: number;
  cht: number; 
  egt: number; 
  oil_pressure: number; 
  oil_temp: number; 
  fuel_flow: number; 
  vibration: number; 
  throttle: number; 
  altitude: number; 
  ambient_temp: number; 
  battery_voltage: number; 
}

export interface EngineHealthState {
  timestamp: number;
  overall_health: number;
  subsystem_health: {
    combustion: number;
    thermal: number;
    lubrication: number;
    mechanical: number;
  };
  expected_values: {
    egt: number;
    fuel_flow: number;
    cht: number;
    oil_pressure: number;
    vibration: number;
  };
}
export interface FaultAlert {
  id: string;
  type: string;
  severity: string;
  component: string;
  timestamp: number;
}

function mapStoreToAdapter(telemetry: TelemetryRecord | null, health: HealthRecord | null, faults: FaultEvent[]): { telemetryAdapter: EngineTelemetry | null, dtStateAdapter: any } {
  if (!telemetry) {
    return { telemetryAdapter: null, dtStateAdapter: null };
  }
  
  const telemetryAdapter: EngineTelemetry = {
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
    active_alerts: faults.map(f => ({
      id: f.id,
      type: f.fault_type,
      severity: f.severity,
      component: 'Engine',
      timestamp: Date.now()
    }))
  };

  return { telemetryAdapter, dtStateAdapter };
}
"""

def patch_file(filepath, component_name):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove the old types import
    content = re.sub(r"import { EngineTelemetry, EngineHealthState, FaultAlert } from '\.\./types';\n", "", content)

    # Insert adapter logic after imports
    # Find the last import
    last_import_idx = [m.end() for m in re.finditer(r"import .*?\n", content)][-1]
    content = content[:last_import_idx] + "\n" + ADAPTER_IMPORTS + "\n" + content[last_import_idx:]
    
    # Change function signature
    old_sig = f"""export default function {component_name}({{
  telemetry,
  dtState,
}}: {{
  telemetry: EngineTelemetry;
  dtState: EngineHealthState & {{ active_alerts?: FaultAlert[] }};
}}) {{"""
    
    # We might have different spacing, let's use regex
    if component_name == "Page03_DigitalTwin":
      pattern = r"export default function Page03_DigitalTwin\([^)]*\)\s*\{"
    else:
      pattern = r"export default function Page17_2DCrossSection\([^)]*\)\s*\{"
      
    replacement = f"""export default function {component_name}() {{
  const rawTelemetry = useStore(state => state.telemetry);
  const rawHealth = useStore(state => state.health);
  const rawFaults = useStore(state => state.activeFaults);
  
  const {{ telemetryAdapter: telemetry, dtStateAdapter: dtState }} = mapStoreToAdapter(rawTelemetry, rawHealth, rawFaults);
  
  if (!telemetry || !dtState) {{
    return <div className="flex h-full items-center justify-center text-slate-400">Waiting for telemetry data...</div>;
  }}
"""
    content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file('Page03_DigitalTwin.tsx', 'Page03_DigitalTwin')
patch_file('Page17_2DCrossSection.tsx', 'Page17_2DCrossSection')
