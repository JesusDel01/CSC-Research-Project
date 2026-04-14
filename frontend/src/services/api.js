const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

function scanWebSocketUrl() {
  if (API_BASE.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${API_BASE}/ws/scans`;
  }
  const http = new URL(API_BASE);
  const wsProto = http.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${http.host}${http.pathname}/ws/scans`;
}

async function callApi(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload.detail) {
        detail = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      // Keep fallback detail.
    }
    throw new Error(detail);
  }
  return response.json();
}

export function getHealth() {
  return callApi("/health");
}

export function getScanPlugins() {
  return callApi("/scans/plugins");
}

export function runScan(payload) {
  return callApi("/scans/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/**
 * Run scan over WebSocket (live stderr lines for Nmap, then final scan payload).
 * @param {object} payload - ScanRequest shape
 * @param {{ onLog?: (line: string) => void, onComplete?: (scan: object) => void, onError?: (msg: string) => void }} handlers
 * @returns {Promise<void>}
 */
export function runScanStream(payload, { onLog, onComplete, onError } = {}) {
  return new Promise((resolve, reject) => {
    const url = scanWebSocketUrl();
    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        onError?.("Invalid message from server");
        ws.close();
        reject(new Error("Invalid message from server"));
        return;
      }

      if (data.type === "log" && data.message) {
        onLog?.(data.message);
      } else if (data.type === "complete" && data.scan) {
        onComplete?.(data.scan);
        ws.close();
        resolve();
      } else if (data.type === "error") {
        const msg = data.message || "Scan failed";
        onError?.(msg);
        ws.close();
        reject(new Error(msg));
      }
    };

    ws.onerror = () => {
      const msg = "WebSocket connection error (is the API running?)";
      onError?.(msg);
      reject(new Error(msg));
    };
  });
}

export function getScanLogs() {
  return callApi("/scans/logs");
}

export function getScanLog(scanId) {
  return callApi(`/scans/replay/${scanId}`);
}

export function getCoreStatus() {
  return callApi("/core/status");
}

export function getCoreScenarios() {
  return callApi("/core/scenarios");
}

export function loadCoreScenario(scenarioId) {
  return callApi("/core/scenarios/load", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId })
  });
}
