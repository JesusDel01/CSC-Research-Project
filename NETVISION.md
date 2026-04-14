# NetVision — project layout

Full-stack network scanning and security dashboard. Backend is **FastAPI** (separate from the Streamlit CVE tool in `app.py`).

## Repository layout

| Path | Role |
|------|------|
| `backend/app/main.py` | FastAPI entrypoint, CORS, routers |
| `backend/app/core/config.py` | Settings (`NETVISION_*` env), resolved paths |
| `backend/app/models/schemas.py` | Pydantic models (scans, graph, CVE, honeypot) |
| `backend/app/api/routes/` | HTTP + WebSocket routes |
| `backend/app/scanners/` | Scanner plugins: `base.py`, `plugins.py` (register all tools here), `nmap_scanner.py`, `stub_scanner.py`, `plugin_template.py` (copy-paste starter) |
| `backend/app/services/` | Registry, logging, CVE bridge, honeypot heuristics, PDF reports |
| `backend/core/scenarios/` | CORE-style topology snapshots imported into the graph UI |
| `backend/logs/` | `scans.jsonl`, `cve_mappings.jsonl` |
| `frontend/` | React + Vite + D3 (calls `api/v1`) |
| `Linkers/` | CVE → CWE → CAPEC → ATT&CK / OWASP / WASC → D3FEND (CSV + NVD) |
| `csv/` | Taxonomy CSVs used by `Linkers` |
| `app.py` | Legacy Streamlit CVE UI (unchanged workflow; run from repo root) |

## Plugin pattern (new scanners)

1. Add a class under `backend/app/scanners/` extending `ScannerPlugin` (start from `plugin_template.py`).
2. Implement `run(request) -> ScannerResult` with a populated `GraphData`.
3. Register it in **`backend/app/scanners/plugins.py`** inside `register_builtin_scanners()` (the registry in `scanner_registry.py` stays generic).

Optional: extend WebSocket streaming for tools that expose line-based progress; Nmap uses stderr lines in `scan_stream.py`.

## Backend API (summary)

- `GET /api/v1/health`
- `GET /api/v1/scans/plugins` — scanner ids, supported `scan_type` values, human labels (SYN / Full / NSE vuln)
- `POST /api/v1/scans/run` — run scan, append JSONL log, return `ScanLogEntry`
- `WebSocket /api/v1/ws/scans` — JSON body same as `ScanRequest`; streams `{"type":"log","message":...}` then `{"type":"complete","scan":...}` (Nmap stderr; other scanners return one `complete`)
- `GET /api/v1/scans/logs`, `GET /api/v1/scans/logs/{id}`, `GET /api/v1/scans/replay/{id}`
- `POST /api/v1/cve/map` — body `{ "cve_ids": ["CVE-..."] }`
- `POST /api/v1/cve/map/csv` — multipart file with `cveID` column
- `POST /api/v1/honeypot/analyze` — body `{ "scan_id" }` or `{ "graph": { ... } }`
- `GET /api/v1/reports/scan/{scan_id}/pdf`
- `GET /api/v1/reports/honeypot/{scan_id}/pdf`
- `POST /api/v1/reports/cve/pdf` — body `{ "cve_ids": [...] }` (re-runs mapping)
- `POST /api/v1/reports/cve/mapping-pdf` — body `{ "mappings": [ ... ] }` from `/cve/map` (no duplicate NVD hits)

## Environment

Copy `backend/.env.example` and set at least:

- `NETVISION_NVD_API_KEY` — NVD API key for new CVE lookups (`Linkers/cve_cwe_linker.py`).
- `NETVISION_NMAP_BINARY` — if `nmap` is not on `PATH`.
- `NETVISION_CORE_BINARY` — CORE CLI binary name/path (defaults to `corectl`).
- `NETVISION_CORE_SCENARIOS_DIR` — directory of JSON topology snapshots for import mode.

## CORE integration

The first CORE integration slice is now in place:

- `GET /api/v1/core/status` — reports whether the configured CORE binary is available.
- `GET /api/v1/core/scenarios` — lists importable topology snapshots.
- `POST /api/v1/core/scenarios/load` — loads a scenario into the existing graph model.

This currently uses a scenario-import adapter rather than full live CORE session orchestration. That means the UI and API hook are ready now, and the next step is teaching `core_service.py` how to create, start, and inspect real CORE sessions.

## Run backend

From repository root:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

With `frontend/.env.development` (`VITE_API_BASE=/api/v1`), Vite proxies `/api` to the FastAPI server on port 8000 so the browser uses one origin in dev. Override `VITE_API_BASE` to call the API directly if needed (see `frontend/.env.example`).

## Example scan body

```json
{
  "scanner": "nmap",
  "target": "192.168.1.0/24",
  "scan_type": "vuln",
  "source": "netvision-ui",
  "extra_args": []
}
```

Use `"scanner": "stub"` when Nmap is unavailable (synthetic graph for UI work).

## Scan types

| `scan_type` | Meaning |
|-------------|---------|
| `syn` | SYN scan (`-sS -T4`) |
| `full` | SYN + version + OS (`-sS -sV -O -T4`) |
| `vuln` | NSE vulnerability scripts (`-sV --script vuln -T4`) |
