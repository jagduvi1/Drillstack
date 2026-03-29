import { bytes, StatusDot, BarFill, useApi } from "./helpers";
import { getServices, getProcess } from "../../api/superadmin";

export default function TabServices() {
  const { data, loading, error, reload } = useApi(getServices);
  const { data: procData, reload: reloadProc } = useApi(getProcess);

  const handleReload = () => { reload(); reloadProc(); };

  if (loading) return <div className="sa-loading">Pinging services...</div>;
  if (error) return <div className="sa-error">Error: {error}</div>;
  if (!data) return null;

  const services = [
    {
      key: "mongodb",
      name: "MongoDB",
      status: data.mongodb?.status,
      detail: data.mongodb?.latency != null ? `${data.mongodb.latency}ms` : undefined,
    },
    {
      key: "qdrant",
      name: "Qdrant",
      status: data.qdrant?.status,
      detail: data.qdrant?.status === "not_configured"
        ? "QDRANT_URL not set"
        : data.qdrant?.latency != null ? `${data.qdrant.latency}ms` : undefined,
    },
  ];

  // Meilisearch (optional)
  if (data.meilisearch) {
    services.push({
      key: "meilisearch",
      name: "Meilisearch",
      status: data.meilisearch?.status,
      detail: data.meilisearch?.latency != null ? `${data.meilisearch.latency}ms` : undefined,
    });
  }

  return (
    <>
      <div className="sa-services-grid">
        {services.map(s => (
          <div key={s.key} className="sa-service">
            <StatusDot status={s.status} />
            <div>
              <div className="sa-service-name">{s.name}</div>
              <div className="sa-service-status">{s.status || "—"}</div>
              {s.detail && <div className="sa-service-latency">{s.detail}</div>}
            </div>
          </div>
        ))}

        {/* Voyage AI */}
        <div className="sa-service">
          <StatusDot status={data.voyage?.status === "configured" ? "ok" : "not_configured"} />
          <div>
            <div className="sa-service-name">Voyage AI</div>
            <div className="sa-service-status">{data.voyage?.status === "configured" ? "Configured" : "Not configured"}</div>
          </div>
        </div>

        {/* AI Provider */}
        <div className="sa-service">
          <StatusDot status={data.ai?.status === "configured" ? "ok" : "not_configured"} />
          <div>
            <div className="sa-service-name">AI Provider</div>
            <div className="sa-service-status">{data.ai?.status === "configured" ? "Configured" : "Not configured"}</div>
          </div>
        </div>
      </div>

      {/* Node.js process */}
      {procData && (
        <div className="sa-grid-2">
          <div className="sa-panel">
            <div className="sa-panel-header">
              <span className="sa-panel-title">Node.js Process</span>
              <button className="sa-btn" onClick={handleReload}>Refresh</button>
            </div>
            <div className="sa-panel-body">
              <div className="sa-kv">
                <div className="sa-kv-row">
                  <span className="sa-kv-key">Node version</span>
                  <span className="sa-kv-val accent">{procData.nodeVersion}</span>
                </div>
                <div className="sa-kv-row">
                  <span className="sa-kv-key">Uptime</span>
                  <span className="sa-kv-val">{procData.uptimeFormatted}</span>
                </div>
                <div className="sa-kv-row">
                  <span className="sa-kv-key">PID</span>
                  <span className="sa-kv-val">{procData.pid}</span>
                </div>
                <div className="sa-kv-row">
                  <span className="sa-kv-key">Platform</span>
                  <span className="sa-kv-val">{procData.platform} / {procData.arch}</span>
                </div>
                <div className="sa-kv-row">
                  <span className="sa-kv-key">Environment</span>
                  <span className="sa-kv-val">{procData.env?.nodeEnv}</span>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="sa-bar-label">
                  <span>Heap used</span>
                  <span>{bytes(procData.memory?.heapUsedBytes)} / {bytes(procData.memory?.heapTotalBytes)} ({procData.memory?.heapUsedPct}%)</span>
                </div>
                <BarFill pct={procData.memory?.heapUsedPct} />
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="sa-bar-label">
                  <span>RSS</span>
                  <span>{bytes(procData.memory?.rssBytes)}</span>
                </div>
                <div className="sa-bar-track" style={{ height: 4 }}>
                  <div style={{
                    height: "100%",
                    background: "var(--sa-accent2)",
                    borderRadius: 3,
                    width: `${Math.min((procData.memory?.rssBytes / (512 * 1024 * 1024)) * 100, 100)}%`
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
