import { useEffect, useMemo, useState } from "react";
import { getCoreScenarios, getCoreStatus, loadCoreScenario } from "../services/api";

export function CoreControls({ isRunning, onLoadGraph }) {
  const [status, setStatus] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCoreData() {
      try {
        const [statusPayload, scenariosPayload] = await Promise.all([getCoreStatus(), getCoreScenarios()]);
        if (cancelled) {
          return;
        }
        setStatus(statusPayload);
        setScenarios(scenariosPayload);
        setSelectedScenario((prev) => prev || scenariosPayload[0]?.id || "");
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load CORE integration state");
        }
      }
    }

    loadCoreData();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusTone = useMemo(() => {
    if (!status) {
      return "";
    }
    return status.available ? "ok" : "warn";
  }, [status]);

  async function handleLoadScenario() {
    if (!selectedScenario) {
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const payload = await loadCoreScenario(selectedScenario);
      onLoadGraph(payload.graph, payload);
    } catch (err) {
      setError(err.message || "Could not load CORE scenario");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section>
      <h2>CORE Integration</h2>
      <p className="plugin-hint">
        This panel is the bridge for network-simulation work. It exposes the new <code>/core</code> API and
        can load CORE-style topologies into the existing graph view.
      </p>

      {status && (
        <div className={`core-status ${statusTone}`}>
          <strong>{status.available ? "CORE detected" : "Scenario import mode"}</strong>
          <span>{status.message}</span>
        </div>
      )}

      {error && <p className="warn-text">{error}</p>}

      <div className="form">
        <label>
          Scenario
          <select
            value={selectedScenario}
            onChange={(event) => setSelectedScenario(event.target.value)}
            disabled={isRunning || isLoading || scenarios.length === 0}
          >
            {scenarios.length === 0 && <option value="">No CORE scenarios found</option>}
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name} ({scenario.node_count} nodes / {scenario.edge_count} links)
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleLoadScenario}
          disabled={isRunning || isLoading || !selectedScenario}
        >
          {isLoading ? "Loading CORE topology…" : "Load CORE topology"}
        </button>
      </div>
    </section>
  );
}
