import { useTranslation } from "react-i18next";
import { FiCpu, FiX, FiSend } from "react-icons/fi";

export default function TacticAiModal({
  showAiModal, aiPrompt, aiLoading, aiError, aiHasGenerated,
  aiChat, aiChatMsg,
  onClose, onPromptChange, onGenerate,
  onChatMsgChange, onRefine, onNewGeneration,
  chatEndRef,
}) {
  const { t } = useTranslation();
  if (!showAiModal) return null;

  return (
    <div className="tactic-ai-overlay" onClick={() => !aiLoading && onClose()}>
      <div className="tactic-ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tactic-ai-modal-header">
          <h3><FiCpu /> {aiHasGenerated ? t("tactics.ai.chatTitle") : t("tactics.ai.title")}</h3>
          <button className="tactic-ai-close" onClick={() => !aiLoading && onClose()}><FiX /></button>
        </div>

        {!aiHasGenerated ? (
          <>
            <p className="text-sm text-muted">{t("tactics.ai.description")}</p>
            <textarea
              className="tactic-ai-textarea"
              rows={5}
              value={aiPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={t("tactics.ai.placeholder")}
              disabled={aiLoading}
            />
            {aiError && <p className="tactic-ai-error">{aiError}</p>}
            <div className="tactic-ai-modal-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={aiLoading}>{t("common.cancel")}</button>
              <button className="btn btn-primary" onClick={onGenerate} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? t("tactics.ai.generating") : t("tactics.ai.generate")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="tactic-ai-chat">
              {aiChat.map((msg, i) => (
                <div key={i} className={`tactic-ai-chat-msg ${msg.role}`}>
                  <span className="tactic-ai-chat-role">{msg.role === "user" ? t("tactics.ai.you") : "AI"}</span>
                  <span>{msg.content}</span>
                </div>
              ))}
              {aiLoading && (
                <div className="tactic-ai-chat-msg assistant">
                  <span className="tactic-ai-chat-role">AI</span>
                  <span className="text-muted">{t("tactics.ai.thinking")}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="tactic-ai-chat-input">
              <input
                type="text"
                value={aiChatMsg}
                onChange={(e) => onChatMsgChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onRefine()}
                placeholder={t("tactics.ai.chatPlaceholder")}
                disabled={aiLoading}
              />
              <button className="btn btn-primary btn-sm" onClick={onRefine} disabled={aiLoading || !aiChatMsg.trim()}>
                <FiSend />
              </button>
            </div>
            <div className="tactic-ai-modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={onNewGeneration}>
                {t("tactics.ai.newGeneration")}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
