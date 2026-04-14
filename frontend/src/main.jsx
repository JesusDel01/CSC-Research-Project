import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { getHealth, getScanLog, getScanLogs, runScan, runScanStream } from "./services/api";
import { NetworkGraph } from "./components/NetworkGraph";
import { NodeDetails } from "./components/NodeDetails";
import { CoreControls } from "./components/CoreControls";
import { ScanControls } from "./components/ScanControls";
import { ScanHistory } from "./components/ScanHistory";
import "./styles.css";

function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [serverOk, setServerOk] = useState(null);
  const [useWebSocket, setUseWebSocket] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [graphSource, setGraphSource] = useState("scan");

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) || null,
    [graph, selectedNodeId]
  );

  const loadHistory = useCallback(async () => {
    try {
      const logs = await getScanLogs();
      setScanHistory(logs);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getHealth();
        if (!cancelled) {
          setServerOk(true);
        }
      } catch {
        if (!cancelled) {
          setServerOk(false);
        }
      }
    })();
    const t = setInterval(async () => {
      try {
        await getHealth();
        if (!cancelled) {
          setServerOk(true);
        }
      } catch {
        if (!cancelled) {
          setServerOk(false);
        }
      }
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function onRunScan(payload) {
    const transport = payload._transport;
    const body = { ...payload };
    delete body._transport;

    setIsRunning(true);
    setError("");
    setLiveLogs([]);

    const applyScan = async (scan) => {
      setGraph(scan.result.graph);
      setSelectedNodeId(scan.result.graph.nodes[0]?.id ?? null);
      setGraphSource(scan.scanner || "scan");
      await loadHistory();
    };

    try {
      if (transport === "ws") {
        await runScanStream(body, {
          onLog: (line) => setLiveLogs((prev) => [...prev.slice(-400), line]),
          onComplete: async (scan) => {
            await applyScan(scan);
          },
          onError: (msg) => setError(msg)
        });
      } else {
        const response = await runScan(body);
        await applyScan(response.scan);
      }
    } catch (runError) {
      setError(runError.message);
    } finally {
      setIsRunning(false);
    }
  }

  async function onReplayScan(scanId) {
    setError("");
    try {
      const entry = await getScanLog(scanId);
      setGraph(entry.result.graph);
      setSelectedNodeId(entry.result.graph.nodes[0]?.id ?? null);
      setGraphSource(`replay:${entry.scanner}`);
    } catch (replayError) {
      setError(replayError.message);
    }
  }

  function onLoadCoreGraph(nextGraph, payload) {
    setError("");
    setGraph(nextGraph);
    setSelectedNodeId(nextGraph.nodes[0]?.id ?? null);
    setGraphSource(`core:${payload.scenario_id}`);
  }

  return (
    <main className="app-shell">
      <header className="header">
        <div className="header-row">
          <div>
            <h1>NetVision Security Dashboard</h1>
            <p>FastAPI server + pluggable scanners + React / D3 visualization</p>
          </div>
          <div className={`server-pill ${serverOk === true ? "ok" : serverOk === false ? "bad" : ""}`}>
            API:{" "}
            {serverOk === null
              ? "…"
              : serverOk
                ? "connected"
                : "unreachable — start backend (uvicorn)"}
          </div>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="layout">
        <div className="panel">
          <ScanControls
            isRunning={isRunning}
            onRunScan={onRunScan}
            useWebSocket={useWebSocket}
            onUseWebSocketChange={setUseWebSocket}
          />
          <div className="section-divider" />
          <CoreControls isRunning={isRunning} onLoadGraph={onLoadCoreGraph} />
          {useWebSocket && (
            <section className="live-log-panel">
              <h3>Live output</h3>
              <pre className="live-log">
                {liveLogs.length === 0 ? "Waiting for scan…" : liveLogs.join("\n")}
              </pre>
            </section>
          )}
          <ScanHistory scans={scanHistory} onReplayScan={onReplayScan} />
        </div>

        <div className="panel graph-panel">
          <div className="graph-source">Active graph source: {graphSource}</div>
          <NetworkGraph graph={graph} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        </div>

        <div className="panel">
          <NodeDetails node={selectedNode} />
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
