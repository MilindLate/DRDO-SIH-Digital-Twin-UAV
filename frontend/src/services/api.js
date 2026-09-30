// API client for all backend endpoints
const BASE = '/api';
async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok)
        throw new Error(`API ${path}: ${res.status}`);
    return res.json();
}
async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error(`API POST ${path}: ${res.status}`);
    return res.json();
}
async function put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error(`API PUT ${path}: ${res.status}`);
    return res.json();
}
export const api = {
    engines: { list: () => get('/engines/') },
    telemetry: {
        latest: (engine_id = 'ENG-001') => get(`/telemetry/latest?engine_id=${engine_id}`),
        history: (engine_id = 'ENG-001', limit = 300, minutes = 60) => get(`/telemetry/history?engine_id=${engine_id}&limit=${limit}&minutes=${minutes}`),
        mission: (mission_id) => get(`/telemetry/mission/${mission_id}`),
    },
    health: {
        latest: (engine_id = 'ENG-001') => get(`/health/latest?engine_id=${engine_id}`),
        history: (engine_id = 'ENG-001', limit = 200) => get(`/health/history?engine_id=${engine_id}&limit=${limit}`),
    },
    faults: {
        list: (engine_id = 'ENG-001') => get(`/faults/?engine_id=${engine_id}`),
        acknowledge: (fault_id) => put(`/faults/${fault_id}/acknowledge`),
    },
    rul: {
        latest: (engine_id = 'ENG-001') => get(`/rul/latest?engine_id=${engine_id}`),
        history: (engine_id = 'ENG-001') => get(`/rul/history?engine_id=${engine_id}`),
    },
    missions: {
        list: () => get('/missions/'),
        get: (id) => get(`/missions/${id}`),
        replay: (id) => get(`/missions/${id}/replay`),
    },
    maintenance: {
        list: (engine_id = 'ENG-001') => get(`/maintenance/?engine_id=${engine_id}`),
        complete: (id) => put(`/maintenance/${id}/complete`),
    },
    sensors: { status: (engine_id = 'ENG-001') => get(`/sensors/status?engine_id=${engine_id}`) },
    fleet: { get: () => get('/fleet/') },
    xai: { getMaintenanceRationale: (fault_type, confidence) => get(`/xai/maintenance-rationale/${fault_type}?confidence=${confidence}`) },
    alerts: {
        list: (engine_id = 'ENG-001') => get(`/alerts/?engine_id=${engine_id}`),
        acknowledge: (id) => put(`/alerts/${id}/acknowledge`),
    },
    models: { list: () => get('/models/') },
    demo: {
        start: () => post('/demo/start'),
        stop: () => post('/demo/stop'),
        status: () => get('/demo/status'),
    },
    simulation: {
        run: (config) => post('/simulation/run', config),
        status: () => get('/simulation/status'),
    },
};
