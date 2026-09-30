// WebSocket service with auto-reconnect
import { useStore } from '../store';
class WSService {
    constructor() {
        this.ws = null;
        this.retryDelay = 2000;
        this.maxDelay = 30000;
        this.stopped = false;
    }
    connect() {
        this.stopped = false;
        this._connect();
    }
    _connect() {
        if (this.stopped)
            return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}/ws`;
        try {
            this.ws = new WebSocket(url);
        }
        catch {
            this._scheduleReconnect();
            return;
        }
        this.ws.onopen = () => {
            useStore.getState().setWsConnected(true);
            this.retryDelay = 2000;
        };
        this.ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === 'telemetry') {
                    useStore.getState().updateFromWS(msg.data);
                }
            }
            catch { }
        };
        this.ws.onclose = () => {
            useStore.getState().setWsConnected(false);
            this._scheduleReconnect();
        };
        this.ws.onerror = () => {
            this.ws?.close();
        };
    }
    _scheduleReconnect() {
        if (this.stopped)
            return;
        setTimeout(() => this._connect(), this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxDelay);
    }
    disconnect() {
        this.stopped = true;
        this.ws?.close();
    }
}
export const wsService = new WSService();
