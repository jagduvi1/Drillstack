import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSession } from "../api/sessions";
import { BLOCK_ICONS, blockDuration } from "../constants/blockTypes";

export default function SessionPrintPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession(id).then((res) => setSession(res.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (session) {
      // Auto-trigger print dialog after render
      setTimeout(() => window.print(), 500);
    }
  }, [session]);

  if (!session) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div className="session-print">
      <style>{`
        @media print {
          nav, .sidebar, .mobile-header, header { display: none !important; }
          body { margin: 0; padding: 0; }
          .session-print { padding: 1rem; }
        }
        .session-print { max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif; }
        .print-header { border-bottom: 2px solid #333; padding-bottom: 0.5rem; margin-bottom: 1rem; }
        .print-header h1 { font-size: 1.5rem; margin: 0; }
        .print-meta { display: flex; gap: 1.5rem; font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
        .print-block { border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem; page-break-inside: avoid; }
        .print-block-header { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; }
        .print-drill { padding: 0.25rem 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .print-drill:last-child { border-bottom: none; }
        .print-station { display: inline-block; border: 1px solid #ddd; border-radius: 4px; padding: 0.35rem 0.5rem; margin: 0.15rem; font-size: 0.8rem; }
        .print-equipment { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #ddd; }
        .print-equipment-tag { display: inline-block; background: #f0f0f0; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin: 0.15rem; }
        .print-notes { background: #f8f8f8; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; margin-top: 0.5rem; }
        @media screen { .print-no-screen { display: none; } }
      `}</style>

      <div className="print-header">
        <h1>{session.title}</h1>
        <div className="print-meta">
          {session.date && <span>{new Date(session.date).toLocaleDateString()}</span>}
          {session.sport && <span>{session.sport}</span>}
          {session.totalDuration > 0 && <span>{session.totalDuration} min</span>}
          {session.expectedPlayers > 0 && <span>{session.expectedPlayers} players</span>}
        </div>
        {session.description && <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>{session.description}</p>}
      </div>

      {(session.blocks || []).sort((a, b) => a.order - b.order).map((block, i) => (
        <div key={i} className="print-block">
          <div className="print-block-header">
            <span>{BLOCK_ICONS[block.type]} {block.label || block.type}</span>
            <span>{blockDuration(block)} min</span>
          </div>

          {block.type === "drills" && block.drills?.map((d, j) => (
            <div key={j} className="print-drill">
              <span>{d.drill?.title || "—"}</span>
              <span>{d.duration} min</span>
            </div>
          ))}

          {block.type === "stations" && (
            <div>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                {block.stationCount} stations × {block.rotationMinutes} min
              </div>
              {block.stations?.map((s, j) => (
                <span key={j} className="print-station">
                  #{s.stationNumber}: {s.drill?.title || s._drillTitle || "—"}
                </span>
              ))}
            </div>
          )}

          {block.type === "matchplay" && (
            <div style={{ fontSize: "0.85rem" }}>
              {block.matchDescription && <p>{block.matchDescription}</p>}
              {block.rules && <p style={{ color: "#666" }}>{block.rules}</p>}
            </div>
          )}

          {block.type === "custom" && block.customContent && (
            <p style={{ fontSize: "0.85rem" }}>{block.customContent}</p>
          )}

          {block.notes && <div className="print-notes">{block.notes}</div>}
        </div>
      ))}

      {session.equipmentSummary?.length > 0 && (
        <div className="print-equipment">
          <strong>{t("sessions.equipment")}</strong>
          <div>
            {session.equipmentSummary.map((eq, i) => (
              <span key={i} className="print-equipment-tag">{eq}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
