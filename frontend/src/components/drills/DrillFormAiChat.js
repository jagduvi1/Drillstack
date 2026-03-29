import { useTranslation } from "react-i18next";
import { FiSend } from "react-icons/fi";

export default function DrillFormAiChat({
  chatHistory,
  chatMessage,
  chatLoading,
  onMessageChange,
  onSend,
  onKeyDown,
  chatEndRef,
}) {
  const { t } = useTranslation();

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>{t("drills.refineWithAi")}</h3>
        <p className="text-sm text-muted">{t("drills.tellAiChange")}</p>
      </div>
      <div className="chat-messages">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-label">{msg.role === "user" ? t("common.you") : t("common.ai")}</div>
            <div className="chat-msg-content">{msg.content}</div>
          </div>
        ))}
        {chatLoading && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-label">{t("common.ai")}</div>
            <div className="chat-msg-content">{t("drills.aiThinking")}</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input">
        <textarea
          className="form-control"
          placeholder={t("drills.chatPlaceholder")}
          value={chatMessage}
          onChange={onMessageChange}
          onKeyDown={onKeyDown}
          rows={2}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSend}
          disabled={chatLoading || !chatMessage.trim()}
        >
          <FiSend /> {chatLoading ? "..." : t("drills.send")}
        </button>
      </div>
    </div>
  );
}
