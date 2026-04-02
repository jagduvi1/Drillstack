import { useTranslation } from "react-i18next";
import {
  FiMousePointer, FiArrowRight, FiMoreHorizontal,
  FiTrash2, FiPlus, FiMinus,
  FiCircle, FiTriangle, FiZoomIn, FiZoomOut,
} from "react-icons/fi";
import { SPORT_CONFIGS, SPORT_GROUPS, getSportGroup } from "./TacticCanvas";

// ── Custom SVG icon components ──────────────────────────────────────────────
export function IconDribble() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 14 C4 10, 5 12, 7 8 C9 4, 10 6, 14 2" />
      <path d="M11 2 L14 2 L14 5" />
    </svg>
  );
}
export function IconPass() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="14" x2="14" y2="2" strokeDasharray="2 3" />
      <path d="M11 2 L14 2 L14 5" />
    </svg>
  );
}
export function IconBallPass() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="3" cy="13" r="2" fill="currentColor" />
      <line x1="5" y1="11" x2="14" y2="2" strokeDasharray="3 2" />
      <path d="M11 2 L14 2 L14 5" />
    </svg>
  );
}

export default function TacticToolbar({
  tool, onToolChange,
  coachMode, isFullscreen,
  homePlayers, awayPlayers, homeColor, awayColor, hasBall,
  zoom,
  sport, fieldType,
  homeFormation, awayFormation,
  sportFormations, sportFieldViews,
  onAddPiece, onRemovePiece, onAddBall, onAddCone,
  onZoomChange, onSportChange, onFieldTypeChange, onFormationChange, onColorChange,
}) {
  const { t } = useTranslation();
  const isRacket = sport === "padel" || sport?.startsWith("tennis");
  if (isFullscreen) return null;

  return (
    <>
      {/* Row 1: drawing tools (+ pieces in edit mode) */}
      <div className="tactic-toolbar tactic-toolbar-row1">
        <div className="tactic-tool-group">
          <button className={`tactic-tool-btn ${tool === "select" ? "active" : ""}`} onClick={() => onToolChange("select")} title={`${t("tactics.tools.select")} (1)`}>
            <FiMousePointer />
          </button>
          <button className={`tactic-tool-btn ${tool === "arrow" ? "active" : ""}`} onClick={() => onToolChange("arrow")} title={`${t("tactics.tools.arrow")} (2)`}>
            <FiArrowRight />
          </button>
          <button className={`tactic-tool-btn ${tool === "pass" ? "active" : ""}`} onClick={() => onToolChange("pass")} title={`${t(isRacket ? "tactics.tools.passRacket" : "tactics.tools.pass")} (3)`}>
            <IconPass />
          </button>
          <button className={`tactic-tool-btn ${tool === "dribble" ? "active" : ""}`} onClick={() => onToolChange("dribble")} title={`${t(isRacket ? "tactics.tools.dribbleRacket" : "tactics.tools.dribble")} (4)`}>
            <IconDribble />
          </button>
          <button className={`tactic-tool-btn ${tool === "dashedArrow" ? "active" : ""}`} onClick={() => onToolChange("dashedArrow")} title={`${t("tactics.tools.dashedArrow")} (5)`}>
            <FiMoreHorizontal />
          </button>
          <button className={`tactic-tool-btn ${tool === "ballPass" ? "active" : ""}`} onClick={() => onToolChange("ballPass")} title={`${t("tactics.tools.ballPass")} (6)`}>
            <IconBallPass />
          </button>
          <button className={`tactic-tool-btn ${tool === "eraser" ? "active" : ""}`} onClick={() => onToolChange("eraser")} title={`${t("tactics.tools.eraser")} (0)`}>
            <FiTrash2 />
          </button>
        </div>

        {!coachMode && (
          <>
            <div className="tactic-tool-divider" />
            <div className="tactic-player-count">
              <span className="tactic-color-dot" style={{ background: homeColor }} />
              <button className="tactic-count-btn" onClick={() => onRemovePiece("home")} disabled={homePlayers.length <= 1}><FiMinus /></button>
              <span className="tactic-count-num">{homePlayers.length}</span>
              <button className="tactic-count-btn" onClick={() => onAddPiece("home")}><FiPlus /></button>
            </div>
            <div className="tactic-player-count">
              <span className="tactic-color-dot" style={{ background: awayColor }} />
              <button className="tactic-count-btn" onClick={() => onRemovePiece("away")} disabled={awayPlayers.length <= 1}><FiMinus /></button>
              <span className="tactic-count-num">{awayPlayers.length}</span>
              <button className="tactic-count-btn" onClick={() => onAddPiece("away")}><FiPlus /></button>
            </div>
            <button className="tactic-tool-btn" onClick={onAddBall} title={t("tactics.addBall")}>
              <FiCircle /> <span className="tactic-hide-xs">{t("tactics.ball")}</span>
            </button>
            <button className="tactic-tool-btn" onClick={onAddCone} title={t("tactics.addCone")}>
              <FiTriangle /> <span className="tactic-hide-xs">{t("tactics.cone")}</span>
            </button>
          </>
        )}

        <div className="tactic-tool-divider" />

        <div className="tactic-zoom-group">
          <button className="tactic-count-btn" onClick={() => onZoomChange(Math.max(0.5, +(zoom - 0.25).toFixed(2)))} disabled={zoom <= 0.5}><FiZoomOut /></button>
          <span className="tactic-count-num">{Math.round(zoom * 100)}%</span>
          <button className="tactic-count-btn" onClick={() => onZoomChange(Math.min(3, +(zoom + 0.25).toFixed(2)))} disabled={zoom >= 3}><FiZoomIn /></button>
        </div>

      </div>

      {/* Row 2: sport, field type, formations, colors (edit mode only) */}
      {!coachMode && <div className="tactic-toolbar tactic-toolbar-row2">
        {/* Sport selector: pick sport, then variant if applicable */}
        <select className="form-control form-control-sm" value={getSportGroup(sport)?.key || sport}
          onChange={(e) => {
            const group = SPORT_GROUPS.find((g) => g.key === e.target.value);
            onSportChange(group?.variants?.length > 0 ? group.variants[0].key : group.key);
          }}
          style={{ width: "auto", minWidth: 0 }}>
          {SPORT_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>{t(`tactics.sports.${g.key}`, g.label)}</option>
          ))}
        </select>
        {(() => {
          const group = getSportGroup(sport);
          return group?.variants?.length > 0 ? (
            <select className="form-control form-control-sm" value={sport}
              onChange={(e) => onSportChange(e.target.value)}
              style={{ width: "auto", minWidth: 0 }}>
              {group.variants.map((v) => (
                <option key={v.key} value={v.key}>{v.label}</option>
              ))}
            </select>
          ) : null;
        })()}

        <select className="form-control form-control-sm" value={fieldType} onChange={(e) => onFieldTypeChange(e.target.value)} style={{ width: "auto", minWidth: 0 }}>
          {Object.keys(sportFieldViews).map((key) => (
            <option key={key} value={key}>{t(`tactics.fieldTypes.${key}`, key)}</option>
          ))}
        </select>

        <div className="tactic-formation-group">
          <span className="tactic-color-dot" style={{ background: homeColor }} />
          <select className="form-control form-control-sm" value={homeFormation} onChange={(e) => onFormationChange("home", e.target.value)} style={{ width: "auto", minWidth: 0 }}>
            {Object.keys(sportFormations).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="color" value={homeColor} onChange={(e) => onColorChange("home", e.target.value)} className="tactic-color-picker" title={t("tactics.homeColor")} />
        </div>
        <div className="tactic-formation-group">
          <span className="tactic-color-dot" style={{ background: awayColor }} />
          <select className="form-control form-control-sm" value={awayFormation} onChange={(e) => onFormationChange("away", e.target.value)} style={{ width: "auto", minWidth: 0 }}>
            {Object.keys(sportFormations).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="color" value={awayColor} onChange={(e) => onColorChange("away", e.target.value)} className="tactic-color-picker" title={t("tactics.awayColor")} />
        </div>
      </div>}
    </>
  );
}
