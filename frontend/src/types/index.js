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
