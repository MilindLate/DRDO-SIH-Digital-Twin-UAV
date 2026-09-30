# Parameter Engineering Reference

## AI-Enabled Digital Twin System for MALE UAV Aero Piston Engines

**Document Status:** RESEARCH / DEMONSTRATION  
**Classification:** UNCLASSIFIED / PUBLIC  
**All values and thresholds are SIMULATED/CONFIGURABLE unless otherwise noted**

---

## IMPORTANT DISCLAIMER

This document describes the engineering basis for the simulated monitoring 
parameters in the Digital Twin demonstration system. 

The parameter relationships, thresholds, and monitoring techniques described 
here are drawn from publicly available engineering literature, textbooks, 
FAA/EASA educational material, and open-access research.

NOTHING in this document represents:
- Certified type certificate data sheet (TCDS) limits
- Airworthiness directive (AD) requirements  
- Manufacturer proprietary specifications
- Flight safety thresholds for any specific certified engine
- Operational limits for actual UAV operations

All thresholds in the software are labeled SIMULATED/CONFIGURABLE.

---

## 1. RPM (Engine Speed)

**What it measures:**  
Rotational speed of the engine crankshaft, measured in revolutions per minute.

**Measurement method:**  
Typically measured by: magnetic pickup on the flywheel, optical sensor, 
or derived from ignition pulses.

**Why it matters:**
- Primary indicator of engine operating point
- Foundation for all power and performance calculations
- Enables computation of: firing frequency, piston speed, inertial loads
- RPM fluctuations indicate: combustion irregularities, fuel system issues, 
  governor faults, mechanical load changes

**Physical relationships:**
- Power = Torque × (RPM × π/30) [public engineering formula]
- Firing frequency (4-cyl, 4-stroke) = RPM × N_cyl / (2 × 60) Hz
- Mean piston speed = Stroke × RPM / 30 m/s

**Failure modes detectable:**
- Misfire: RPM fluctuations at irregular intervals
- Governor fault: RPM out of commanded range
- Fuel starvation: RPM drop not correlated with throttle
- Mechanical seizure: sudden RPM drop

**Data quality concerns:**
- Interference from ignition system on analog measurements
- Sampling aliasing if rate < 2× firing frequency
- Magnetic pickup sensitive to debris contamination

**Simulated normal range:** 800–5,500 RPM [SIMULATED/CONFIGURABLE]  
**Simulated warning:** >5,500 or <700 RPM [SIMULATED/CONFIGURABLE]

**Reference:** Heywood, J.B. (1988). *Internal Combustion Engine Fundamentals*. McGraw-Hill. Ch.2

---

## 2. Cylinder Head Temperature (CHT)

**What it measures:**  
Temperature at the cylinder head, typically at or near the hottest point 
(often near the exhaust valve).

**Measurement method:**  
Type-K thermocouple embedded in the cylinder head casting.

**Why it matters:**
CHT is one of the most critical health indicators for air-cooled aircraft 
piston engines because:

- **Combustion quality indicator:** High CHT indicates excessive heat 
  production (lean mixture, detonation, pre-ignition)
- **Cooling system health:** Rising CHT trend may indicate cooling duct 
  blockage, cooling fin damage, or reduced airspeed
- **Structural integrity:** Prolonged operation at elevated CHT accelerates 
  metal fatigue and warping
- **Detonation risk:** Very high CHT increases detonation risk (uncontrolled 
  combustion) which can cause catastrophic damage

**Physical relationships:**
- CHT equilibrium: Q_in (combustion heat) = Q_out (cooling airflow)
- Leaning beyond peak EGT raises CHT significantly
- CHT responds slower than EGT (higher thermal mass)
- Time constant: ~3–8 minutes for significant CHT changes

**Failure modes detectable:**
- Cooling failure: steadily rising CHT not correlated with increased load
- Lean mixture: CHT rise + EGT rise (approaching stoichiometric)
- Detonation: sudden CHT spike
- Cylinder health: CHT imbalance between cylinders

**Public guidance note:**  
FAA AC 65-12A discusses CHT monitoring as a key engine health parameter 
for piston aircraft engines. The advisory circular notes that pilots should 
monitor CHT and EGT together to assess mixture and cooling health.

**Simulated normal max:** 200°C [SIMULATED/CONFIGURABLE]  
**Simulated warning:** 220°C [SIMULATED/CONFIGURABLE]  
**Simulated critical:** 240°C [SIMULATED/CONFIGURABLE]

**Reference:** FAA Advisory Circular AC 65-12A, *Airframe and Powerplant Mechanics Powerplant Handbook* (public document)

---

## 3. Exhaust Gas Temperature (EGT)

**What it measures:**  
Temperature of exhaust gases leaving the combustion chamber, measured in 
the exhaust port or early exhaust pipe.

**Measurement method:**  
Type-K thermocouple in exhaust stream.

**Why it matters:**
- **Mixture monitoring:** EGT peaks at stoichiometric AFR (~14.7:1 for gasoline)
  - Rich of peak EGT → lower EGT (excess fuel absorbs heat)
  - Lean of peak EGT → lower EGT (less fuel energy released)
  - At peak EGT → stoichiometric → maximum combustion efficiency
- **Misfire detection:** EGT drops sharply on the affected cylinder
- **Detonation / abnormal combustion:** Abnormal EGT patterns
- **Turbocharger health** (if applicable): EGT before turbine indicates turbine inlet temp
- **Valve health:** Burned exhaust valve → persistent high EGT on that cylinder

**Physical relationships:**
- EGT is approximately proportional to adiabatic flame temperature minus 
  expansion cooling through the power stroke
- For a 4-cylinder engine: each cylinder's EGT can be monitored independently
  (requires 4-probe EGT system)
- Single-probe EGT represents average of all cylinders passing the sensor

**Failure modes detectable:**
- Injector failure: EGT deviation between cylinders
- Ignition failure: cold cylinder (low EGT)
- Combustion instability: oscillating EGT

**Simulated normal range:** 300–700°C depending on operating point [SIMULATED/CONFIGURABLE]  
**Simulated warning:** 750°C [SIMULATED/CONFIGURABLE]

**Reference:** EAA Technical Counselor documentation (public); FAA AC 65-12A; 
Heywood (1988) Ch.3

---

## 4. Oil Pressure

**What it measures:**  
Pressure in the engine lubrication system, typically at the main oil gallery.

**Measurement method:**  
Pressure transducer in the oil gallery line. Sometimes a simple pressure switch 
for warning indication only.

**Why it matters:**
Oil pressure is critical because:
- **Bearing lubrication adequacy:** Oil pressure drives oil film formation in 
  plain bearings (crankshaft, connecting rod bearings). Insufficient pressure 
  → metal-to-metal contact → rapid bearing failure → engine seizure
- **Valve train lubrication:** Hydraulic lifters and camshaft require oil pressure
- **Cooling function:** Oil also cools pistons and bearings

**Physical relationships:**
- Oil pump is typically a gear pump driven by the crankshaft
  → Pump output proportional to RPM (up to pressure relief valve setting)
- Oil viscosity decreases with temperature 
  → Higher temperature → lower viscosity → lower pressure at given RPM
  → This is the Walther viscosity-temperature relationship (ASTM D341)
- Bearing clearance increases with wear → lower hydrodynamic pressure for 
  given oil viscosity → reduced oil pressure at given RPM

**Failure modes detectable:**
- Low oil pressure: oil loss, pump failure, bearing clearance increase
- High oil pressure: pressure relief valve failure, severe cold temperature
- Oil pressure/temperature relationship deviation: indicates viscosity change

**Normal operating characteristics (SIMULATED/CONFIGURABLE):**
- Low at idle: ~200 kPa (30 psi) [SIMULATED]
- Normal operating: ~350 kPa (50 psi) [SIMULATED]
- Warn below: ~200 kPa at cruise RPM [SIMULATED]

**Reference:** Heywood (1988) Ch.5 — Friction and Lubrication; 
Continental Aircraft Engine Service Bulletin (publicly available excerpts);
Lycoming Service Instruction SI-1109 (public)

---

## 5. Oil Temperature

**What it measures:**  
Temperature of engine oil, typically at the sump or oil cooler outlet.

**Measurement method:**  
Resistance temperature detector (RTD) or thermocouple in oil system.

**Why it matters:**
- **Viscosity maintenance:** Oil must operate within its designed viscosity 
  range for effective lubrication
  - Too cold: oil too thick → poor circulation, filter bypass → metal wear
  - Too hot: oil too thin → inadequate bearing film → increased wear
  - Also: hot oil degrades (oxidizes) rapidly, reducing lubrication effectiveness
- **Cooling system health:** Oil temperature trend indicates cooling system 
  effectiveness
- **Combustion anomalies:** Sustained overheating can indicate combustion 
  problems

**Physical relationships:**
- Oil temperature thermal model: dT/dt = (Q_friction - Q_cooler) / (m_oil × Cp)
- Oil specific heat: ~1800 J/kg·K (typical mineral oil, approximate value)
- Time constant: much longer than CHT — typically 8–20 minutes

**Failure modes detectable:**
- Rising oil temp: oil cooler blockage, oil loss, excessive friction
- Oil temp + oil pressure divergence: significant viscosity change

**Simulated normal max:** 110°C [SIMULATED/CONFIGURABLE]

**Reference:** SAE J300 — Engine Oil Viscosity Classification (public standard);
Heywood (1988) Ch.5

---

## 6. Vibration

**What it measures:**  
Mechanical vibration of the engine structure, measured at the engine mount 
or crankcase in three axes.

**Measurement method:**  
Piezoelectric accelerometers or MEMS accelerometers.

**Why it matters:**
Vibration monitoring is a primary technique in predictive maintenance 
(Condition Based Maintenance — CBM):
- **Rotating imbalance:** Propeller imbalance, crankshaft imbalance
- **Bearing degradation:** Characteristic frequency signatures as bearings wear
- **Misfire/combustion events:** Cylinder pressure excitation creates mechanical impulse
- **Resonance detection:** Structural resonances that could cause fatigue

**Physical relationships:**
- For a 4-cylinder 4-stroke engine:
  - Primary firing frequency: f = RPM × N_cyl / (2 × 60) Hz
  - 2nd order imbalance at 2× engine speed is common in 4-cylinder engines
  - Each bearing failure mode produces a characteristic frequency signature
- Vibration RMS relates to energy content of all frequency components
- Vibration increases approximately as RPM² for rotational imbalance

**Failure modes detectable:**
- Bearing wear: characteristic sub-harmonic frequencies
- Propeller imbalance: 1× and 2× RPM frequency
- Misfire: irregular impulse events in time domain
- Mechanical looseness: broad-band frequency increase

**Data quality concerns:**
- Accelerometer mounting resonance can create false readings
- Temperature sensitivity of some accelerometer types
- Cable-induced noise

**Simulated normal max:** 0.5g RMS [SIMULATED/CONFIGURABLE]

**Reference:** Harris, C.E. & Crede, C.E. (1976). *Shock and Vibration Handbook*. McGraw-Hill;
NASA TM-X-3334 (public); SAE International publications on engine vibration monitoring

---

## 7. Fuel Flow

**What it measures:**  
Volumetric or mass flow rate of fuel delivered to the engine.

**Measurement method:**  
Turbine flowmeter or Coriolis mass flow meter in the fuel line.

**Why it matters:**
- **Fuel consumption monitoring:** Direct measurement of fuel burn rate
- **Injector health:** Deviation from expected flow at given throttle/RPM 
  indicates injector clogging or failure
- **AFR estimation:** With known air mass flow, fuel flow determines actual AFR
- **Combustion balance:** Flow rate imbalance between cylinders indicates 
  injector health

**Physical relationships:**
- Expected fuel flow = f(RPM, throttle, altitude, AFR target)
- Fuel flow ÷ density → mass flow rate
- Mass flow rate ÷ air mass flow → AFR
- Injector clogging: reduced flow at same fuel pressure

**Failure modes detectable:**
- Injector clogging: lower than expected flow
- Injector stuck open: higher than expected flow (rich condition)
- Fuel pump degradation: reduced fuel pressure → reduced flow
- Filter blockage: reduced flow + pressure differential

**Simulated normal range:** 5–18 L/hour depending on power setting [SIMULATED/CONFIGURABLE]

**Reference:** Heywood (1988) Ch.3; FAA AC 65-12A; Bosch Automotive Handbook (public)

---

## 8. Electrical Health

**What it measures:**  
Battery voltage, alternator output voltage, current draw.

**Measurement method:**  
Voltage sensors at battery terminal and alternator output; current shunt or 
Hall-effect sensor.

**Why it matters for UAV operations:**
- **Mission reliability:** Loss of electrical power can disable critical systems:
  flight control, autopilot, payload, communication, ECU/FADEC
- **Alternator health:** Alternator failure requires mission abort before 
  battery is depleted
- **Battery condition monitoring:** Battery voltage under load indicates 
  state of health
- **Electrical load management:** Excessive load can cause voltage drop

**Physical relationships:**
- Alternator output ≥ load → battery charging (voltage above nominal)
- Alternator failure → battery supplies load → voltage drops with time
- Battery state of charge ≈ voltage (simplified; actual SOC needs cell chemistry model)
- Alternator cut-in typically at ~1,500 RPM for small aircraft alternators [SIMULATED]

**Failure modes detectable:**
- Alternator failure: voltage drops below charging threshold
- Battery failure: low voltage, rapid voltage drop under load
- Electrical fault: excessive current draw
- Ground fault: unexpected current signatures

**Simulated normal:**
- Battery: 12.0–12.8V (off engine) [SIMULATED/CONFIGURABLE]
- Alternator: 13.8–14.8V (charging) [SIMULATED/CONFIGURABLE]

**Reference:** FAA AC 65-12A Ch. 11 — Aircraft Electrical Systems; 
EAA Technical Counselor documentation (public)

---

## 9. Injection Timing

**What it measures:**  
Crankshaft angle (degrees before top dead centre, BTDC) at which fuel 
injection or ignition occurs.

**Measurement method:**  
ECU/FADEC reports injection timing based on crankshaft position sensor.

**Why it matters:**
- **Combustion efficiency:** Optimum timing maximises pressure rise in the 
  right phase of piston travel
- **Detonation avoidance:** Advanced timing at high load → detonation risk
- **Power output:** Timing affects peak pressure and power
- **Emissions:** Timing affects exhaust gas composition

**Physical relationships:**
- Optimum timing depends on: RPM, load, temperature, fuel octane
- Typical timing range: 10–35° BTDC depending on conditions [general public knowledge]
- Advanced timing: more time for combustion → higher efficiency at low RPM
- Retarded timing: reduces detonation risk at high RPM/load

**Failure modes detectable:**
- ECU fault: timing outside expected range for operating point
- Sensor fault: erratic timing signals
- Timing retard under load: knock sensor active (detonation detected)

**Simulated range:** 15–35° BTDC [SIMULATED/CONFIGURABLE]

**Reference:** Heywood (1988) Ch.9 — Spark Ignition Engine Combustion

---

## Summary: Parameter Relationships Matrix

| Parameter | Primary Driver | Influenced By | Failure Mode Detected |
|-----------|---------------|---------------|----------------------|
| RPM | Throttle + Load | Fuel, ignition, mechanical | Misfire, governor, fuel |
| CHT | Engine load + Cooling | RPM, throttle, ambient | Cooling, lean mixture, detonation |
| EGT | AFR + Load | Throttle, RPM, injection | Injector, misfire, combustion |
| Oil Pressure | RPM + Viscosity | Temperature, wear | Bearing, pump, oil loss |
| Oil Temperature | Load + Cooling | Ambient, oil cooler | Cooler blockage, friction |
| Fuel Flow | Throttle + RPM + Altitude | Injectors, pressure | Injector clog, pump |
| Vibration | RPM + Load + Balance | Wear, misfire | Bearing, imbalance, misfire |
| Battery V | Alternator + SOC | Load, RPM | Alternator, battery |
| Alternator V | RPM | Regulator, electrical | Alternator, regulator |
| Injection Timing | ECU command | RPM, load | ECU, sensor, knock |

---

*Document generated: 2024*  
*Version: 1.0 — Demonstration System*  
*All values SIMULATED/CONFIGURABLE — Not certified aerospace specifications*
