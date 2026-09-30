// All TypeScript types for the Digital Twin system
export interface TelemetryRecord {
  timestamp: string;
  uav_id?: string;
  engine_id?: string;
  mission_id?: string;
  rpm?: number;
  torque_nm?: number;
  engine_load_pct?: number;
  throttle_pct?: number;
  fuel_flow_lph?: number;
  fuel_pressure_kpa?: number;
  injection_timing_deg?: number;
  manifold_pressure_kpa?: number;
  cht_c?: number;
  egt_c?: number;
  oil_temperature_c?: number;
  intake_temperature_c?: number;
  ambient_temperature_c?: number;
  oil_pressure_kpa?: number;
  oil_flow_lpm?: number;
  battery_voltage_v?: number;
  alternator_voltage_v?: number;
  current_a?: number;
  electrical_load_pct?: number;
  vibration_rms_g?: number;
  vibration_x_g?: number;
  vibration_y_g?: number;
  vibration_z_g?: number;
  vibration_dominant_freq_hz?: number;
  altitude_m?: number;
  humidity_pct?: number;
  air_density_kgm3?: number;
  fuel_quantity_l?: number;
  engine_state?: string;
  mission_phase?: string;
  data_source?: string;
  quality_flag?: number;
  fault_type?: string;
}

export interface HealthRecord {
  timestamp?: string;
  overall_health?: number;
  mechanical_health?: number;
  thermal_health?: number;
  lubrication_health?: number;
  combustion_health?: number;
  fuel_system_health?: number;
  electrical_health?: number;
  sensor_health?: number;
  vibration_health?: number;
  health_category?: string;
  degradation_rate?: number;
  health_confidence?: number;
  major_contributors?: Array<{ subsystem: string; health: number; impact: number }>;
}

export interface FaultEvent {
  fault_id?: string;
  fault_type: string;
  label?: string;
  severity: 'INFO' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  status?: string;
  confidence?: number;
  affected_subsystem?: string;
  detection_timestamp?: string;
  evidence?: Array<{ parameter: string; observation: string; value?: number }>;
  recommended_inspection?: string;
}

export interface RULEstimate {
  rul_hours?: number;
  rul_lower_ci_hours?: number;
  rul_upper_ci_hours?: number;
  confidence_level?: number;
  model_confidence?: number;
  degradation_rate?: number;
  estimated_hours_to_threshold?: number;
  maintenance_threshold_pct?: number;
  factors?: Record<string, number>;
}

export interface Mission {
  id: string;
  mission_id: string;
  mission_type?: string;
  description?: string;
  status?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  actual_duration_hours?: number;
  total_fuel_consumed_l?: number;
  fault_count?: number;
  anomaly_count?: number;
  max_cht_c?: number;
  max_egt_c?: number;
  min_oil_pressure_kpa?: number;
  max_vibration_rms_g?: number;
  avg_rpm?: number;
}

export interface MaintenanceRecord {
  id: string;
  recommendation_type?: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  reason?: string;
  affected_subsystem?: string;
  evidence?: any[];
  estimated_remaining_hours?: number;
  created_timestamp?: string;
}

export interface Engine {
  id: string;
  engine_id: string;
  model?: string;
  cylinders?: number;
  total_operating_hours?: number;
  mission_count?: number;
  tbo_hours?: number;
  current_state?: string;
}

export interface SensorStatus {
  sensor_id: string;
  sensor_name: string;
  parameter: string;
  current_value?: number;
  unit: string;
  quality_score: number;
  data_rate_hz: number;
  last_update: string;
  status: 'OK' | 'DEGRADED' | 'FAILED' | 'FROZEN' | 'DRIFTING';
  confidence: number;
  is_outlier: boolean;
  is_frozen: boolean;
  is_drifting: boolean;
}

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: {
    telemetry?: TelemetryRecord;
    health?: HealthRecord;
    faults?: FaultEvent[];
    operating_hours?: number;
    demo_mode?: boolean;
  };
}

export interface FleetCard {
  uav_id: string;
  engine_id: string;
  uav_status?: string;
  engine_state?: string;
  overall_health?: number;
  rul_hours?: number;
  active_fault_count: number;
  last_telemetry?: string;
  total_operating_hours?: number;
  maintenance_pending: boolean;
}

// Parameter limits [SIMULATED/CONFIGURABLE]
export const LIMITS = {
  rpm: { normal: [800, 5500], warning: [5500, 5800], critical: [5800, 6000] },
  cht_c: { normal: [0, 200], warning: [200, 220], critical: [220, 240] },
  egt_c: { normal: [0, 700], warning: [700, 750], critical: [750, 800] },
  oil_pressure_kpa: { normal: [200, 550], warning: [170, 200], critical: [100, 170] },
  oil_temperature_c: { normal: [40, 110], warning: [110, 120], critical: [120, 130] },
  vibration_rms_g: { normal: [0, 0.5], warning: [0.5, 1.0], critical: [1.0, 2.0] },
  battery_voltage_v: { normal: [11.8, 15.0], warning: [11.5, 11.8], critical: [11.0, 11.5] },
  alternator_voltage_v: { normal: [13.5, 15.0], warning: [13.0, 13.5], critical: [12.0, 13.0] },
};
