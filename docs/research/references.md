# Research References

## AI-Enabled Digital Twin System for MALE UAV Aero Piston Engines

**Document Status:** RESEARCH / DEMONSTRATION  
**Classification:** UNCLASSIFIED / PUBLIC  

This document records the publicly available sources that informed the 
engineering assumptions in this demonstrator system.

All references are to publicly accessible material.
No proprietary or classified sources were used.

---

## IMPORTANT NOTE ON REFERENCES

The engineering relationships implemented in this system are based on 
fundamental engineering principles from the sources below.

We do NOT claim:
- That our model matches any specific certified engine
- That our model is validated against real engine test data
- That our health/RUL metrics meet any certification standard
- That these references endorse our implementation

All simulated values are clearly labeled in the software.

---

## Category 1: Internal Combustion Engine Fundamentals

### [R-01] Heywood, J.B. (1988)
**Internal Combustion Engine Fundamentals**  
McGraw-Hill, New York. ISBN: 0-07-028637-X  
*Widely regarded as the standard reference for IC engine engineering.*

**Influences in this system:**
- Air mass flow model (Ch.6 — Mixture Preparation and Volumetric Efficiency)
- Thermal efficiency models (Ch.2 — Engine Performance Metrics)
- Combustion temperature relationships (Ch.3 — Combustion in SI Engines)
- Friction and lubrication fundamentals (Ch.5)
- BMEP and torque relationships (Ch.2)
- EGT and exhaust composition relationships (Ch.3, 4)

### [R-02] Taylor, C.F. (1985)
**The Internal Combustion Engine in Theory and Practice**  
Vols. 1 & 2. MIT Press.

**Influences:**
- Volumetric efficiency characteristics vs RPM
- Thermal stress analysis concepts
- General combustion chamber design principles

### [R-03] Pulkrabek, W.W. (2003)
**Engineering Fundamentals of the Internal Combustion Engine** (2nd ed.)  
Prentice Hall. ISBN: 0-13-140570-5

**Influences:**
- AFR and mixture control (Ch.3)
- Combustion efficiency and EGT relationships (Ch.3, 9)
- Oil consumption and lubrication principles (Ch.10)

---

## Category 2: Aviation Engine Monitoring and Operations

### [R-04] FAA Advisory Circular AC 65-12A
**Airframe and Powerplant Mechanics Powerplant Handbook**  
U.S. Federal Aviation Administration. *PUBLIC DOCUMENT*  
Available: https://www.faa.gov/documentlibrary/media/advisory_circular/

**Influences:**
- CHT monitoring importance and acceptable ranges (discussion basis)
- EGT mixture monitoring techniques (discussion basis)
- Oil pressure importance for bearing lubrication
- Electrical system monitoring requirements
- General piston engine health monitoring philosophy

*Note: All limit values in our system are SIMULATED/CONFIGURABLE and do not 
represent AC 65-12A guidance as certified thresholds.*

### [R-05] FAA Advisory Circular AC 43.13-1B
**Acceptable Methods, Techniques and Practices — Aircraft Inspection and Repair**  
U.S. Federal Aviation Administration. *PUBLIC DOCUMENT*

**Influences:**
- Maintenance inspection practices (conceptual basis for maintenance module)
- Vibration inspection criteria discussion

### [R-06] Lycoming Service Instructions (Publicly Available Excerpts)
**SI-1109, SI-1094D — Engine Monitoring**  
Lycoming Engines (public service bulletins)

**Influences:**
- CHT monitoring discussion (general principles, not specific limits)
- Oil pressure discussion (general principles, not specific limits)
- Conceptual basis for why CHT/EGT are jointly monitored

---

## Category 3: Digital Twins and Health Monitoring

### [R-07] Grieves, M. & Vickers, J. (2017)
**Digital Twin: Mitigating Unpredictable, Undesirable Emergent Behavior in Complex Systems**
In: *Transdisciplinary Perspectives on Complex Systems*, Springer.
doi: 10.1007/978-3-319-38756-7_4

**Influences:**
- Digital Twin conceptual framework
- Mirrored space model (physical + virtual)
- Data flow architecture

### [R-08] Tao, F. et al. (2019)
**Digital Twin in Industry: State-of-the-Art**  
*IEEE Transactions on Industrial Informatics*, 15(4), 2405–2415.
doi: 10.1109/TII.2018.2873186

**Influences:**
- Digital Twin system architecture (5-dimensional model)
- Real-time synchronization requirements
- Data-driven vs physics-driven twin comparison

### [R-09] Glaessgen, E. & Stargel, D. (2012)
**The Digital Twin Paradigm for Future NASA and U.S. Air Force Vehicles**  
*53rd AIAA/ASME/ASCE/AHS/ASC Structures, Structural Dynamics and Materials Conference*
AIAA 2012-1818. *NASA PUBLIC DOCUMENT*

**Influences:**
- Aerospace Digital Twin definition
- Ultra-high fidelity model concept
- Integration with real-time data streams

### [R-10] Lee, J. et al. (2014)
**Service Innovation and Smart Analytics for Industry 4.0 and Big Data Environment**  
*Procedia CIRP*, 16, 3–8. doi: 10.1016/j.procir.2014.02.001

**Influences:**
- Health Index concept (normalized 0–100 scale)
- 5C architecture for cyber-physical systems

---

## Category 4: Remaining Useful Life and Predictive Maintenance

### [R-11] Saxena, A. et al. (2008)
**Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation**  
*International Conference on Prognostics and Health Management (PHM)*.
Available: NASA Prognostics Center of Excellence (public)

**Influences:**
- RUL estimation methodology
- Degradation model structure
- Synthetic dataset generation approach (inspired CMAPSS methodology)

### [R-12] Pecht, M.G. (2008)
**Prognostics and Health Management of Electronics**  
John Wiley & Sons.

**Influences:**
- General PHM framework
- Health index computation concepts
- Uncertainty quantification in RUL estimates

### [R-13] Jardine, A.K.S., Lin, D., & Banjevic, D. (2006)
**A Review on Machinery Diagnostics and Prognostics Implementing CBM**  
*Mechanical Systems and Signal Processing*, 20(7), 1483–1510.
doi: 10.1016/j.ymssp.2005.09.012

**Influences:**
- Condition-Based Maintenance framework
- Diagnostic and prognostic algorithm categories
- Feature selection for machinery health

### [R-14] NASA Technical Memorandum TM-X-3334
**Engine Parameter Monitoring — Methodology**  
NASA Lewis Research Center. *NASA PUBLIC DOCUMENT*

**Influences:**
- Engine parameter monitoring philosophy
- CHT and EGT as primary health indicators
- Threshold-based monitoring approach

---

## Category 5: Anomaly Detection and ML for Engine Health

### [R-15] Liu, F.T., Ting, K.M., & Zhou, Z.H. (2008)
**Isolation Forest**  
*Proceedings of the IEEE International Conference on Data Mining (ICDM)*, 413–422.
doi: 10.1109/ICDM.2008.17

**Influences:**
- Anomaly detection algorithm selection
- Isolation Forest implementation rationale
- Contamination parameter setting

### [R-16] Breiman, L. (2001)
**Random Forests**  
*Machine Learning*, 45(1), 5–32.

**Influences:**
- Fault classification algorithm selection
- Feature importance computation (basis for SHAP-style attribution)

### [R-17] Zhao, R. et al. (2019)
**Deep Learning and Its Applications to Machine Health Monitoring**  
*Mechanical Systems and Signal Processing*, 115, 213–237.
doi: 10.1016/j.ymssp.2018.05.050

**Influences:**
- Overview of deep learning approaches for PHM
- Justification for starting with simpler models (RF/IF) before LSTM
- Feature engineering approaches for time-series health data

### [R-18] Mancuso, A. et al. (2020)
**Predictive Maintenance for Military Aircraft**  
*Journal of Quality in Maintenance Engineering*, 26(1), 108–129.

**Influences:**
- Military UAV context for predictive maintenance
- Data scarcity challenges in aviation PHM
- Synthetic data generation as practical solution

---

## Category 6: Vibration-Based Diagnostics

### [R-19] Harris, C.E. & Piersol, A.G. (2002)
**Harris' Shock and Vibration Handbook** (5th ed.)  
McGraw-Hill.

**Influences:**
- Vibration measurement and analysis
- Bearing fault frequency calculation methods
- Vibration RMS as health indicator

### [R-20] Randall, R.B. (2011)
**Vibration-based Condition Monitoring**  
John Wiley & Sons. ISBN: 978-0-470-74785-8

**Influences:**
- Vibration signal processing concepts
- Frequency domain analysis for bearing diagnostics
- FFT-based feature extraction

---

## Category 7: Atmosphere and Environmental Models

### [R-21] ICAO Doc 7488 (1993)
**Manual of the ICAO Standard Atmosphere** (3rd ed.)  
International Civil Aviation Organization. *PUBLIC INTERNATIONAL STANDARD*

**Influences:**
- ISA standard atmosphere model (temperature, pressure, density vs altitude)
- Air density correction for altitude effects on engine performance
- Volumetric efficiency altitude correction

---

## Category 8: UAV Propulsion Specific

### [R-22] Gundlach, J. (2012)
**Designing Unmanned Aircraft Systems: A Comprehensive Approach**  
AIAA Education Series. ISBN: 978-1-60086-843-6

**Influences:**
- MALE UAV propulsion requirements
- Endurance mission profiles
- Engine operating environment for UAVs

### [R-23] Hassanalian, M. & Abdelkefi, A. (2017)
**Classifications, Applications, and Design Challenges of Drones: A Review**  
*Progress in Aerospace Sciences*, 91, 99–131.

**Influences:**
- UAV mission profiles used in simulation
- Engine operating conditions for MALE class UAVs

---

## Category 9: Sensor Fusion

### [R-24] Kalman, R.E. (1960)
**A New Approach to Linear Filtering and Prediction Problems**  
*Journal of Basic Engineering*, 82(1), 35–45. *PUBLIC DOMAIN*

**Influences:**
- Kalman filter architecture (referenced for future implementation)
- State estimation from noisy measurements

### [R-25] Brown, R.G. & Hwang, P.Y.C. (2012)
**Introduction to Random Signals and Applied Kalman Filtering** (4th ed.)  
John Wiley & Sons.

**Influences:**
- Sensor fusion architecture
- Noise model parameters (general approach)

---

## Category 10: Reliability Engineering

### [R-26] MIL-HDBK-338B (1998)
**Electronic Reliability Design Handbook**  
U.S. Department of Defense. *PUBLIC DOCUMENT*

**Influences:**
- Reliability metrics terminology (MTBF, MTTR conceptual basis)
- Failure mode categorization framework

### [R-27] Niu, G. et al. (2010)
**Intelligent Condition Monitoring and Prognostics System Based on 
Data-Fusion Strategy**  
*Expert Systems with Applications*, 37(12), 8831–8840.

**Influences:**
- Data fusion strategy for health monitoring
- Multi-sensor health index computation

---

## Summary: Engineering Assumption to Reference Mapping

| Assumption | Source Reference(s) |
|------------|-------------------|
| ISA atmosphere model | R-21 (ICAO) |
| Volumetric efficiency vs RPM | R-01 (Heywood), R-02 (Taylor) |
| Air mass flow equation | R-01 (Heywood) |
| Stoichiometric AFR = 14.7 | R-01, R-03, R-04 (public knowledge) |
| CHT thermal model | R-04 (FAA AC), R-01 (Heywood) |
| EGT vs AFR relationship | R-01, R-03, R-04 |
| Oil pressure vs RPM/temperature | R-01 (Ch.5), R-05, R-06 |
| Oil temperature thermal model | R-01, R-03 |
| Vibration frequency analysis | R-19, R-20 |
| Digital Twin architecture | R-07, R-08, R-09 |
| Health index framework | R-10, R-12, R-13 |
| Isolation Forest for anomaly | R-15 |
| Random Forest for fault | R-16 |
| RUL methodology | R-11, R-12, R-13 |
| Mission profiles | R-22, R-23 |
| Sensor fusion | R-24, R-25 |

---

*Document version: 1.0*  
*Status: DEMONSTRATION SYSTEM — Research References Only*  
*No proprietary, classified, or export-controlled information included*
