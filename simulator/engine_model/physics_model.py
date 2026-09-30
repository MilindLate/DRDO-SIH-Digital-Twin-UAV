"""
Aero Piston Engine Physics Model

This module implements a simplified but technically meaningful physics model
for a generic naturally-aspirated aero piston engine used in MALE UAVs.

IMPORTANT ENGINEERING DISCLAIMER:
-----------------------------------
All model parameters are SIMULATED / CONFIGURABLE values based on
publicly available engineering principles from:
  - Heywood, J.B. "Internal Combustion Engine Fundamentals" (1988)
  - Taylor, C.F. "The Internal Combustion Engine in Theory and Practice" (1985)
  - FAA AC 65-12A — Airframe and Powerplant Mechanics Powerplant Handbook
  - EASA Part-66 training material (publicly available)
  - NASA TM-X-3334 — Engine parameter monitoring methodology
  - General IC engine thermodynamic principles (ASHRAE, SAE)

None of the following represent:
  - Certified engine limits (FAA/EASA type certificate data sheets)
  - Proprietary manufacturer specifications
  - Flight safety thresholds
  - Operational limitations of any specific production engine

All values should be treated as DEMONSTRATION/RESEARCH MODEL values.

Physical Relationships Modelled:
  - Air density vs altitude (ISA standard atmosphere)
  - Volumetric efficiency vs RPM
  - Air mass flow vs RPM, VE, displacement
  - Fuel flow vs air mass flow, AFR
  - Brake mean effective pressure vs torque, RPM, displacement
  - Indicated thermal efficiency (Otto cycle approximation)
  - CHT thermal model (heat in - heat out)
  - EGT approximation from combustion temperature
  - Oil pressure vs RPM, viscosity, temperature
  - Oil temperature thermal model
  - Vibration model (mechanical balance, combustion forcing)
  - Electrical load balance

References document: docs/engineering/parameter_reference.md
"""

import math
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
import yaml
import os


# ─────────────────────────────────────────────────────────────────────────────
# Engine Configuration (SIMULATED / CONFIGURABLE)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EngineConfig:
    """
    Generic aero piston engine parameters.
    ALL VALUES ARE SIMULATED/CONFIGURABLE — NOT CERTIFIED ENGINE SPECIFICATIONS.
    """
    # Identity
    model_name: str = "Generic Aero Piston Engine (Simulated)"
    cylinders: int = 4
    displacement_cc: float = 2000.0     # cm³ total displacement [SIMULATED]

    # Operating limits — SIMULATION/CONFIGURABLE
    rpm_idle: float = 900.0             # [SIMULATED/CONFIGURABLE]
    rpm_max_continuous: float = 5500.0  # [SIMULATED/CONFIGURABLE]
    rpm_max_rated: float = 5800.0       # [SIMULATED/CONFIGURABLE]
    rpm_redline: float = 6000.0         # [SIMULATED/CONFIGURABLE]

    # Thermal limits — SIMULATION/CONFIGURABLE
    cht_normal_max_c: float = 200.0     # CHT normal operation max [SIMULATED/CONFIGURABLE]
    cht_warning_c: float = 220.0        # [SIMULATED/CONFIGURABLE]
    cht_critical_c: float = 240.0       # [SIMULATED/CONFIGURABLE]
    egt_normal_max_c: float = 700.0     # [SIMULATED/CONFIGURABLE]
    egt_warning_c: float = 750.0        # [SIMULATED/CONFIGURABLE]
    egt_critical_c: float = 800.0       # [SIMULATED/CONFIGURABLE]

    # Lubrication limits — SIMULATION/CONFIGURABLE
    oil_pressure_min_kpa: float = 200.0 # [SIMULATED/CONFIGURABLE]
    oil_pressure_normal_kpa: float = 350.0
    oil_pressure_max_kpa: float = 550.0
    oil_temp_normal_max_c: float = 110.0
    oil_temp_warning_c: float = 120.0
    oil_temp_critical_c: float = 130.0

    # Fuel system — SIMULATION/CONFIGURABLE
    afr_stoichiometric: float = 14.7    # Air-fuel ratio (gasoline) — textbook value
    afr_best_power: float = 12.5        # Rich of stoich for max power [SIMULATED]
    afr_best_economy: float = 15.5      # Lean of stoich for best economy [SIMULATED]
    fuel_density_kg_l: float = 0.720    # Avgas density approx [PUBLIC DATA]

    # Electrical — SIMULATION/CONFIGURABLE
    alternator_voltage_nominal_v: float = 14.2
    battery_voltage_nominal_v: float = 12.6
    battery_voltage_min_v: float = 11.5
    alternator_voltage_warning_v: float = 13.5

    # Vibration — SIMULATION/CONFIGURABLE
    vibration_normal_max_g: float = 0.5
    vibration_warning_g: float = 1.0
    vibration_critical_g: float = 2.0

    # TBO — SIMULATION/CONFIGURABLE
    tbo_hours: float = 1500.0           # Time Between Overhaul [SIMULATED/CONFIGURABLE]

    # Physics parameters
    compression_ratio: float = 8.5
    mechanical_efficiency: float = 0.88         # SIMULATED
    volumetric_efficiency_peak: float = 0.82    # At optimal RPM [SIMULATED]
    indicated_thermal_efficiency: float = 0.32  # Otto cycle approximation [SIMULATED]
    cooling_coefficient: float = 0.15           # Heat rejection fraction [SIMULATED]
    oil_specific_heat: float = 1800.0           # J/kg·K (approximation)
    oil_mass_kg: float = 3.5                    # Engine oil mass [SIMULATED]

    @classmethod
    def from_yaml(cls, path: str) -> "EngineConfig":
        if os.path.exists(path):
            with open(path) as f:
                data = yaml.safe_load(f)
            return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
        return cls()

    def to_yaml(self, path: str):
        import dataclasses
        with open(path, "w") as f:
            yaml.dump(dataclasses.asdict(self), f, default_flow_style=False)


# ─────────────────────────────────────────────────────────────────────────────
# ISA Standard Atmosphere
# Source: ICAO Annex 2 — publicly available standard
# ─────────────────────────────────────────────────────────────────────────────

def isa_atmosphere(altitude_m: float) -> tuple[float, float, float]:
    """
    ISA standard atmosphere model.
    Returns: (temperature_K, pressure_Pa, density_kg_m3)
    Source: ICAO Doc 7488 — International Standard Atmosphere (public standard)
    Valid for troposphere: 0–11,000 m
    """
    T0 = 288.15     # Sea level ISA temperature (K)
    P0 = 101325.0   # Sea level ISA pressure (Pa)
    rho0 = 1.225    # Sea level ISA density (kg/m³)
    L = 0.0065      # Temperature lapse rate (K/m) — troposphere
    g = 9.80665     # Gravity (m/s²)
    R = 287.05      # Specific gas constant for air (J/kg·K)

    if altitude_m <= 11000:
        T = T0 - L * altitude_m
        P = P0 * (T / T0) ** (g / (L * R))
    else:
        # Stratosphere approximation
        T = 216.65
        P_tropo = P0 * (216.65 / T0) ** (g / (L * R))
        P = P_tropo * math.exp(-g * (altitude_m - 11000) / (R * T))

    rho = P / (R * T)
    return T, P, rho


# ─────────────────────────────────────────────────────────────────────────────
# Engine State
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EngineState:
    """Current engine operating state (computed by physics model)."""
    # Inputs
    rpm: float = 0.0
    throttle_pct: float = 0.0
    altitude_m: float = 0.0
    ambient_temperature_c: float = 15.0
    humidity_pct: float = 60.0
    engine_state: str = "OFF"
    mission_phase: str = "PRE_FLIGHT"

    # Computed outputs
    torque_nm: float = 0.0
    engine_load_pct: float = 0.0
    fuel_flow_lph: float = 0.0
    fuel_pressure_kpa: float = 300.0
    injection_timing_deg: float = 25.0
    manifold_pressure_kpa: float = 101.325
    air_mass_flow_kgs: float = 0.0
    volumetric_efficiency_pct: float = 80.0

    cht_c: float = 20.0
    egt_c: float = 20.0
    oil_temperature_c: float = 20.0
    intake_temperature_c: float = 20.0
    coolant_temperature_c: float = 20.0

    oil_pressure_kpa: float = 0.0
    oil_flow_lpm: float = 0.0
    oil_level_pct: float = 100.0

    battery_voltage_v: float = 12.6
    alternator_voltage_v: float = 0.0
    current_a: float = 2.0
    electrical_load_pct: float = 15.0

    vibration_rms_g: float = 0.01
    vibration_x_g: float = 0.005
    vibration_y_g: float = 0.005
    vibration_z_g: float = 0.005
    vibration_dominant_freq_hz: float = 0.0

    air_density_kgm3: float = 1.225
    barometric_pressure_hpa: float = 1013.25
    fuel_quantity_l: float = 60.0

    # Degradation state (0.0 = nominal, 1.0 = fully degraded)
    injector_degradation: float = 0.0
    lubrication_degradation: float = 0.0
    cooling_degradation: float = 0.0
    mechanical_wear: float = 0.0
    combustion_instability: float = 0.0

    # Sensor fault injection
    sensor_faults: Dict[str, str] = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Physics Model
# ─────────────────────────────────────────────────────────────────────────────

class EnginePysicsModel:
    """
    Simplified but technically meaningful aero piston engine physics model.

    Models the fundamental relationships between:
      - RPM, throttle, altitude, ambient conditions
      - Air mass flow (volumetric efficiency model)
      - Fuel flow (AFR control model)
      - Torque and power (BMEP model)
      - CHT (thermal equilibrium model)
      - EGT (combustion temperature approximation)
      - Oil pressure (viscous pump model)
      - Oil temperature (thermal mass model)
      - Vibration (mechanical balance model)
      - Electrical (alternator load balance)

    Assumptions are documented inline and in docs/engineering/parameter_reference.md

    IMPORTANT: This is a DEMONSTRATION MODEL. It captures physical
    relationships qualitatively but is NOT validated against a real engine.
    """

    def __init__(self, config: Optional[EngineConfig] = None):
        self.config = config or EngineConfig()
        self._dt = 1.0  # Integration time step (seconds)

    def volumetric_efficiency(self, rpm: float) -> float:
        """
        Volumetric efficiency (VE) vs RPM.
        
        Physical basis: VE peaks at an intermediate RPM due to induction
        resonance effects and falls off at high RPM due to flow losses.
        Approximated as a parabolic function of RPM.
        
        Source: Heywood (1988) Ch.6 — IC Engine Fundamentals
        Assumption: SIMULATED — generic shape, not tuned to specific engine
        """
        rpm_peak_ve = 0.6 * self.config.rpm_max_continuous  # Peak VE RPM [SIMULATED]
        ve = self.config.volumetric_efficiency_peak * (
            1.0 - 0.4 * ((rpm - rpm_peak_ve) / rpm_peak_ve) ** 2
        )
        return max(0.3, min(1.0, ve))

    def air_mass_flow(self, rpm: float, altitude_m: float,
                      ambient_temp_c: float) -> float:
        """
        Air mass flow rate (kg/s).
        
        Equation: ṁ_air = (VE × N × V_d × ρ_air) / (2 × 60)
        where:
          VE = volumetric efficiency
          N  = RPM
          V_d = displacement (m³)
          ρ_air = ambient air density (kg/m³)
          ÷2 because 4-stroke fires once per 2 revolutions
          
        Source: Taylor (1985) Vol.1, Ch.4
        """
        _, _, rho = isa_atmosphere(altitude_m)
        # Adjust density for actual ambient temperature deviation from ISA
        isa_temp_k, _, _ = isa_atmosphere(altitude_m)
        actual_temp_k = ambient_temp_c + 273.15
        rho_actual = rho * (isa_temp_k / actual_temp_k)

        ve = self.volumetric_efficiency(rpm)
        displacement_m3 = self.config.displacement_cc * 1e-6

        # 4-stroke: fires once per 2 revolutions; n_cylinders implicit in V_d
        mass_flow = ve * (rpm / 60.0) * displacement_m3 * rho_actual / 2.0
        return max(0.0, mass_flow)

    def fuel_flow(self, air_mass_flow: float, throttle_pct: float,
                  injector_degradation: float = 0.0) -> float:
        """
        Fuel flow (litres/hour).
        
        Fuel flow controlled to maintain near-stoichiometric AFR,
        slightly rich at high throttle for cooling, leaned at cruise.
        
        Physical basis: fuel_mass_flow = air_mass_flow / AFR
        Injector degradation reduces effective fuel delivery.
        
        Source: Heywood (1988) Ch.3, AFR control principles
        Assumption: SIMULATED AFR control law [SIMULATED/CONFIGURABLE]
        """
        if air_mass_flow < 1e-6:
            return 0.0

        # AFR target varies with throttle (rich at high power, lean at cruise)
        afr_target = self.config.afr_stoichiometric
        if throttle_pct > 80:
            afr_target = self.config.afr_best_power
        elif throttle_pct < 50:
            afr_target = self.config.afr_best_economy

        fuel_mass_flow_kgs = air_mass_flow / afr_target

        # Injector degradation effect: reduces fuel delivery
        degradation_factor = 1.0 - (injector_degradation * 0.3)
        fuel_mass_flow_kgs *= degradation_factor

        # Convert to L/hour: 1 kg/s = 3600/density L/hour
        fuel_flow_lph = (fuel_mass_flow_kgs * 3600.0) / self.config.fuel_density_kg_l
        return max(0.0, fuel_flow_lph)

    def torque_and_load(self, rpm: float, throttle_pct: float,
                        altitude_m: float, ambient_temp_c: float,
                        injector_degradation: float = 0.0) -> tuple[float, float]:
        """
        Engine torque (Nm) and load (%).
        
        Torque derived from BMEP (Brake Mean Effective Pressure):
          Torque = BMEP × V_d / (4π)   (4-stroke)
          
        BMEP related to indicated efficiency, fuelling, VE:
          BMEP ≈ ηi × ηm × Q_LHV × ρ_fuel × (AFR+1)^-1 × VE × ρ_air/ρ_air0
          
        Simplified as: Torque ∝ throttle × air_density_ratio × efficiency
        
        Source: Heywood (1988) Ch.2 — Engine performance metrics
        Assumption: SIMULATED torque curve [SIMULATED/CONFIGURABLE]
        """
        _, _, rho = isa_atmosphere(altitude_m)
        density_ratio = rho / 1.225  # Relative to sea level ISA

        ve = self.volumetric_efficiency(rpm)

        # Simplified BMEP model [SIMULATED]
        # Peak torque at ~60% rated RPM
        rpm_ratio = rpm / self.config.rpm_max_continuous
        torque_rpm_factor = 1.0 - 0.4 * (rpm_ratio - 0.6) ** 2

        # Maximum torque at sea level, full throttle [SIMULATED]
        # From P = T × ω, max power ~75 kW at max RPM → T_max ~ 130 Nm [SIMULATED]
        torque_max = 130.0  # Nm [SIMULATED/CONFIGURABLE]

        # Degradation effect
        injector_factor = 1.0 - injector_degradation * 0.15

        torque = (throttle_pct / 100.0) * torque_max * torque_rpm_factor * \
                 density_ratio * ve * self.config.mechanical_efficiency * injector_factor
        torque = max(0.0, torque)

        # Engine load as % of rated power at this altitude
        if rpm > 100:
            power_w = torque * rpm * math.pi / 30.0
            power_max_altitude = (self.config.max_power_kw * 1000.0 if hasattr(self.config, 'max_power_kw') else 75000.0) * density_ratio
            engine_load = min(100.0, 100.0 * power_w / max(1.0, power_max_altitude))
        else:
            engine_load = 0.0

        return torque, engine_load

    def cht_thermal_model(self, cht_current: float, rpm: float,
                          engine_load: float, ambient_temp_c: float,
                          cooling_degradation: float = 0.0,
                          dt: float = 1.0) -> float:
        """
        Cylinder Head Temperature (CHT) thermal model.
        
        Physical basis:
          dT_CHT/dt = (Q_in - Q_out) / (m_cylinder × C_p)
          
        Q_in = heat from combustion proportional to fuel flow and load
        Q_out = heat rejection to cooling air, proportional to airspeed and ΔT
        
        CHT is one of the most critical engine monitoring parameters:
          - Indicates combustion quality
          - Detects cooling system degradation
          - Predicts pre-ignition/detonation risk at high temperatures
          - Indicates lean mixture problems
          
        Reference: FAA AC 65-12A Chapter 3, Lycoming Service Instruction SI-1094D (public)
        Assumption: SIMULATED thermal constants [SIMULATED/CONFIGURABLE]
        
        Why CHT matters (from docs/engineering/parameter_reference.md):
          - CHT > 400°F (204°C) for extended periods causes detonation risk [FAA AC 65-12A]
          - Rapid CHT rise indicates cooling failure or mixture problem
          - CHT gradient between cylinders indicates cylinder-specific issues
        """
        # Heat generation: proportional to engine load and RPM [SIMULATED]
        # Typical air-cooled engine: ~30% of fuel energy goes to cylinder heat [SIMULATED]
        heat_in_factor = 0.30  # [SIMULATED/CONFIGURABLE]
        q_in = (engine_load / 100.0) * (rpm / self.config.rpm_max_continuous) * \
               heat_in_factor * 50.0  # °C/s normalised [SIMULATED]

        # Heat rejection: proportional to ΔT and cooling effectiveness [SIMULATED]
        # Cooling degrades with altitude (lower air density) and degradation factor
        cooling_factor = (1.0 - cooling_degradation * 0.4)
        q_out = (cht_current - ambient_temp_c) * 0.08 * cooling_factor  # [SIMULATED]

        # Equilibrium temperature shift
        cht_target = ambient_temp_c + (engine_load / 100.0) * \
                     (self.config.cht_normal_max_c - ambient_temp_c) * \
                     (1.0 + cooling_degradation * 0.5)

        # First-order lag model: τ_CHT ≈ 3–5 minutes for air-cooled engines [SIMULATED]
        tau_cht = 180.0  # seconds [SIMULATED/CONFIGURABLE]
        dcht = (cht_target - cht_current) / tau_cht * dt

        return cht_current + dcht

    def egt_model(self, rpm: float, engine_load: float, ambient_temp_c: float,
                  throttle_pct: float, injector_degradation: float = 0.0,
                  combustion_instability: float = 0.0) -> float:
        """
        Exhaust Gas Temperature (EGT) model.
        
        Physical basis:
          EGT reflects post-combustion exhaust temperature.
          For an Otto cycle: T_exhaust ≈ T_adiabatic_flame / γ^(r-1)
          Simplified: EGT ∝ combustion temperature - expansion cooling
          
        EGT is critical for:
          - Lean mixture detection (EGT peaks at stoichiometric, then drops lean)
          - Misfire detection (EGT drops sharply on cylinder-out)
          - Turbine/exhaust health (for turbocharged variants)
          - Combustion quality monitoring
          
        Reference: Experimental Aircraft Association (EAA) Technical Counselors,
                   FAA Advisory Circular AC 65-12A
        Assumption: SIMULATED EGT model [SIMULATED/CONFIGURABLE]
        
        Normal EGT range: 500–750°C for typical aircraft piston engines
        [SIMULATED/CONFIGURABLE — do not interpret as certified limits]
        """
        # Base EGT proportional to load and RPM [SIMULATED]
        egt_base = ambient_temp_c + (engine_load / 100.0) * \
                   (self.config.egt_normal_max_c - ambient_temp_c)

        # AFR effect: EGT peaks near stoich, lower on either side
        # At high throttle (rich): lower EGT
        # At cruise throttle (lean of stoich): higher EGT
        if throttle_pct > 75:
            egt_afr_correction = -30.0  # Rich mixture — lower EGT [SIMULATED]
        elif throttle_pct < 40:
            egt_afr_correction = +20.0  # Lean mixture — higher EGT [SIMULATED]
        else:
            egt_afr_correction = 0.0

        # Injector degradation: uneven fuelling → EGT variation [SIMULATED]
        egt_injector_effect = injector_degradation * 40.0

        # Combustion instability: EGT fluctuations [SIMULATED]
        instability_noise = combustion_instability * np.random.normal(0, 15.0)

        egt = egt_base + egt_afr_correction + egt_injector_effect + instability_noise
        return max(ambient_temp_c, egt)

    def oil_pressure_model(self, rpm: float, oil_temperature_c: float,
                           lubrication_degradation: float = 0.0) -> float:
        """
        Oil pressure model.
        
        Physical basis:
          Oil pressure in a pressure-lubricated engine is generated by a
          gear/rotor pump driven by the crankshaft.
          At low RPM: pump output limited → low pressure
          At high RPM: pressure relief valve opens → pressure plateaus
          Higher oil temperature → lower viscosity → lower pressure
          
        Oil pressure is critical for:
          - Bearing lubrication adequacy
          - Camshaft/valve train lubrication
          - Early detection of: oil loss, pump wear, bearing clearance increase
          
        Reference: Lycoming Operators Manual (public), Continental Aircraft Engine
                   service documentation (publicly available excerpts),
                   Heywood (1988) Ch.5 Friction and Lubrication
        Assumption: SIMULATED oil pressure model [SIMULATED/CONFIGURABLE]
        
        Typical aircraft engine oil pressure: 200–500 kPa (30–75 psi) operating
        [SIMULATED/CONFIGURABLE — not certified limits]
        """
        # Pump pressure generation ~ linear with RPM up to relief valve [SIMULATED]
        if rpm < 100:
            return 0.0

        rpm_ratio = min(rpm / self.config.rpm_idle, 3.0)
        pressure_base = self.config.oil_pressure_normal_kpa * min(1.0, rpm_ratio * 0.4 + 0.6)

        # Temperature-viscosity-pressure relationship [SIMULATED]
        # Higher temp → lower viscosity → lower pressure
        # Reference: ASTM standard viscosity-temperature relationship (Walther equation)
        temp_factor = 1.0 - (max(0, oil_temperature_c - 80.0) * 0.008)  # [SIMULATED]
        temp_factor = max(0.5, temp_factor)

        # Lubrication system degradation: bearing wear → increased clearance → lower pressure
        # Reference: maintenance monitoring practices, FAA AC 43.13-1B
        degradation_factor = 1.0 - lubrication_degradation * 0.35

        oil_pressure = pressure_base * temp_factor * degradation_factor
        return max(0.0, oil_pressure)

    def oil_temperature_model(self, oil_temp_current: float, rpm: float,
                               engine_load: float, ambient_temp_c: float,
                               lubrication_degradation: float = 0.0,
                               dt: float = 1.0) -> float:
        """
        Oil temperature thermal model.
        
        Physical basis:
          dT_oil/dt = (Q_friction_in - Q_cooler_out) / (m_oil × C_p_oil)
          
        Oil temperature is critical for:
          - Viscosity maintenance (too cold: oil too thick; too hot: oil too thin)
          - Bearing film thickness
          - Oil oxidation rate (high temp degrades oil rapidly)
          - Cooling system health monitoring
          
        Reference: SAE Paper 2001-01-1032 (publicly available abstract),
                   FAA AC 65-12A, general thermodynamics
        Assumption: SIMULATED thermal constants [SIMULATED/CONFIGURABLE]
        """
        # Heat input from friction and heat exchange with combustion [SIMULATED]
        # Roughly proportional to engine load
        q_in_rate = (engine_load / 100.0) * (rpm / self.config.rpm_max_continuous) * 25.0

        # Heat rejection via oil cooler [SIMULATED]
        # Degraded lubrication system: reduced cooler effectiveness
        cooler_effectiveness = 1.0 - lubrication_degradation * 0.2
        q_out_rate = (oil_temp_current - ambient_temp_c) * 0.12 * cooler_effectiveness

        # Target equilibrium temperature
        oil_temp_target = ambient_temp_c + (engine_load / 100.0) * 75.0 * \
                          (1.0 + lubrication_degradation * 0.3)

        # First-order lag: τ_oil ≈ 8–15 minutes [SIMULATED]
        tau_oil = 600.0  # seconds [SIMULATED/CONFIGURABLE]
        doil = (oil_temp_target - oil_temp_current) / tau_oil * dt

        return oil_temp_current + doil

    def vibration_model(self, rpm: float, engine_load: float,
                        mechanical_wear: float = 0.0,
                        combustion_instability: float = 0.0) -> tuple[float, float, float, float, float]:
        """
        Engine vibration model.
        
        Physical basis:
          Piston engine vibration has multiple harmonic components:
          - Primary imbalance: 1×, 2× firing frequency
          - Firing frequency for 4-stroke inline-4: N×(RPM/60×0.5×4) = N×(RPM/30) Hz
          - Second-order imbalance: 2× engine speed [common in 4-cylinder engines]
          - Propeller-induced: typically 2–6 blades × RPM/60 Hz
          
        Vibration increases with:
          - Mechanical wear (bearing clearance)
          - Combustion instability (misfires)
          - Propeller imbalance
          - Structural resonances
          
        Reference: Charles E. Harris, "Shock and Vibration Handbook" (McGraw-Hill),
                   Aviation Health and Monitoring research (NASA/AFRL public reports),
                   SAE Aerospace standards on vibration monitoring
        Assumption: SIMULATED vibration model [SIMULATED/CONFIGURABLE]
        """
        if rpm < 100:
            return 0.01, 0.005, 0.005, 0.005, 0.0

        # Firing frequency for 4-cyl 4-stroke [public engineering formula]
        firing_freq_hz = (rpm / 60.0) * self.config.cylinders / 2.0

        # Base vibration proportional to RPM² (rotational imbalance) [SIMULATED]
        vib_base = 0.05 + (rpm / self.config.rpm_max_continuous) * 0.15

        # Engine load contribution [SIMULATED]
        vib_load = (engine_load / 100.0) * 0.08

        # Mechanical wear: increases all vibration components [SIMULATED]
        vib_wear = mechanical_wear * 0.8

        # Combustion instability: adds stochastic component [SIMULATED]
        vib_combustion = combustion_instability * 0.4 * abs(np.random.normal(0, 1))

        vib_rms = vib_base + vib_load + vib_wear + vib_combustion

        # Distribute across axes (typical: z-axis highest for vertical engine) [SIMULATED]
        vib_x = vib_rms * 0.3 * (1 + np.random.normal(0, 0.05))
        vib_y = vib_rms * 0.4 * (1 + np.random.normal(0, 0.05))
        vib_z = vib_rms * 0.6 * (1 + np.random.normal(0, 0.05))

        # Recalculate RMS from components
        vib_rms_calc = math.sqrt((vib_x**2 + vib_y**2 + vib_z**2) / 3.0)

        return vib_rms_calc, abs(vib_x), abs(vib_y), abs(vib_z), firing_freq_hz

    def electrical_model(self, rpm: float, electrical_load_pct: float,
                         battery_voltage: float) -> tuple[float, float, float]:
        """
        Electrical system model.
        
        Physical basis:
          Alternator output voltage regulated to ~14.2V for 12V systems.
          Above threshold RPM, alternator provides charging current.
          Below threshold RPM, battery supplies load.
          
        Assumption: SIMULATED [SIMULATED/CONFIGURABLE]
        """
        # Alternator cut-in RPM [SIMULATED]
        alt_cutin_rpm = 1500.0

        if rpm >= alt_cutin_rpm:
            alternator_v = self.config.alternator_voltage_nominal_v
            # Battery charges if alternator > battery voltage
            current = electrical_load_pct / 100.0 * 30.0  # Max 30A [SIMULATED]
        else:
            alternator_v = 0.0
            current = electrical_load_pct / 100.0 * 20.0  # Battery only

        electrical_load = electrical_load_pct
        return alternator_v, current, electrical_load

    def step(self, state: EngineState, inputs: Dict[str, Any], dt: float = 1.0) -> EngineState:
        """
        Advance engine state by one time step.
        
        Args:
            state: Current engine state
            inputs: Control inputs (throttle, rpm_command, etc.)
            dt: Time step in seconds
            
        Returns:
            Updated engine state
        """
        # Unpack inputs with defaults
        rpm = inputs.get("rpm", state.rpm)
        throttle_pct = inputs.get("throttle_pct", state.throttle_pct)
        altitude_m = inputs.get("altitude_m", state.altitude_m)
        ambient_temp_c = inputs.get("ambient_temperature_c", state.ambient_temperature_c)
        humidity_pct = inputs.get("humidity_pct", state.humidity_pct)
        engine_state_str = inputs.get("engine_state", state.engine_state)
        mission_phase = inputs.get("mission_phase", state.mission_phase)
        electrical_load_pct = inputs.get("electrical_load_pct", state.electrical_load_pct)

        # Degradation state from inputs
        injector_deg = state.injector_degradation
        lub_deg = state.lubrication_degradation
        cool_deg = state.cooling_degradation
        mech_wear = state.mechanical_wear
        comb_inst = state.combustion_instability

        # ISA atmosphere
        _, pressure_pa, rho = isa_atmosphere(altitude_m)

        # Zero state when engine off
        if engine_state_str in ("OFF", "SHUTDOWN", "MAINTENANCE"):
            new_state = EngineState(
                rpm=0.0,
                throttle_pct=0.0,
                altitude_m=altitude_m,
                ambient_temperature_c=ambient_temp_c,
                engine_state=engine_state_str,
                mission_phase=mission_phase,
                oil_temperature_c=max(ambient_temp_c, state.oil_temperature_c - 0.5 * dt),
                cht_c=max(ambient_temp_c, state.cht_c - 0.3 * dt),
                egt_c=max(ambient_temp_c, state.egt_c - 0.5 * dt),
                battery_voltage_v=state.battery_voltage_v,
                fuel_quantity_l=state.fuel_quantity_l,
                injector_degradation=injector_deg,
                lubrication_degradation=lub_deg,
                cooling_degradation=cool_deg,
                mechanical_wear=mech_wear,
                combustion_instability=comb_inst,
                air_density_kgm3=rho,
                barometric_pressure_hpa=pressure_pa / 100.0,
            )
            return new_state

        # Air mass flow
        air_mass_flow = self.air_mass_flow(rpm, altitude_m, ambient_temp_c)

        # Fuel flow
        fuel_flow_lph = self.fuel_flow(air_mass_flow, throttle_pct, injector_deg)

        # Torque and load
        torque_nm, engine_load_pct = self.torque_and_load(
            rpm, throttle_pct, altitude_m, ambient_temp_c, injector_deg
        )

        # Thermal
        cht_c = self.cht_thermal_model(
            state.cht_c, rpm, engine_load_pct, ambient_temp_c, cool_deg, dt
        )
        egt_c = self.egt_model(
            rpm, engine_load_pct, ambient_temp_c, throttle_pct, injector_deg, comb_inst
        )

        # Lubrication
        oil_temp_c = self.oil_temperature_model(
            state.oil_temperature_c, rpm, engine_load_pct, ambient_temp_c, lub_deg, dt
        )
        oil_pressure_kpa = self.oil_pressure_model(rpm, oil_temp_c, lub_deg)

        # Vibration
        vib_rms, vib_x, vib_y, vib_z, vib_freq = self.vibration_model(
            rpm, engine_load_pct, mech_wear, comb_inst
        )

        # Electrical
        alt_v, current_a, elec_load = self.electrical_model(
            rpm, electrical_load_pct, state.battery_voltage_v
        )

        # Intake temperature: warmer than ambient due to induction heating [SIMULATED]
        intake_temp_c = ambient_temp_c + (engine_load_pct / 100.0) * 20.0

        # Fuel consumption
        fuel_consumed_l = fuel_flow_lph * dt / 3600.0
        fuel_qty = max(0.0, state.fuel_quantity_l - fuel_consumed_l)

        # Volumetric efficiency
        ve_pct = self.volumetric_efficiency(rpm) * 100.0

        # Manifold pressure: proportional to throttle and air density [SIMULATED]
        map_kpa = (pressure_pa / 1000.0) * (0.3 + 0.7 * throttle_pct / 100.0)

        # Add sensor noise to all outputs [SIMULATED sensor noise]
        def add_noise(val, sigma_pct=0.005):
            return val * (1.0 + np.random.normal(0, sigma_pct))

        return EngineState(
            rpm=add_noise(rpm, 0.002),
            throttle_pct=throttle_pct,
            altitude_m=altitude_m,
            ambient_temperature_c=ambient_temp_c,
            humidity_pct=humidity_pct,
            engine_state=engine_state_str,
            mission_phase=mission_phase,
            torque_nm=add_noise(torque_nm, 0.01),
            engine_load_pct=engine_load_pct,
            fuel_flow_lph=add_noise(fuel_flow_lph, 0.01),
            fuel_pressure_kpa=add_noise(300.0 + (throttle_pct / 100.0) * 50.0, 0.005),
            injection_timing_deg=25.0 - (engine_load_pct - 50.0) * 0.05,
            manifold_pressure_kpa=map_kpa,
            air_mass_flow_kgs=air_mass_flow,
            volumetric_efficiency_pct=ve_pct,
            cht_c=add_noise(cht_c, 0.005),
            egt_c=add_noise(egt_c, 0.008),
            oil_temperature_c=add_noise(oil_temp_c, 0.003),
            intake_temperature_c=add_noise(intake_temp_c, 0.005),
            coolant_temperature_c=add_noise(cht_c * 0.7, 0.005),
            oil_pressure_kpa=add_noise(oil_pressure_kpa, 0.02),
            oil_flow_lpm=add_noise(5.0 * (rpm / self.config.rpm_max_continuous), 0.05),
            oil_level_pct=state.oil_level_pct,
            battery_voltage_v=add_noise(state.battery_voltage_v, 0.002),
            alternator_voltage_v=add_noise(alt_v, 0.002),
            current_a=add_noise(current_a, 0.02),
            electrical_load_pct=elec_load,
            vibration_rms_g=vib_rms,
            vibration_x_g=vib_x,
            vibration_y_g=vib_y,
            vibration_z_g=vib_z,
            vibration_dominant_freq_hz=vib_freq,
            air_density_kgm3=rho,
            barometric_pressure_hpa=pressure_pa / 100.0,
            fuel_quantity_l=fuel_qty,
            # Preserve degradation state
            injector_degradation=injector_deg,
            lubrication_degradation=lub_deg,
            cooling_degradation=cool_deg,
            mechanical_wear=mech_wear,
            combustion_instability=comb_inst,
            sensor_faults=state.sensor_faults,
        )
