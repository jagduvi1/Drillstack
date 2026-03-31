import { useEffect, useCallback } from "react";
import { useBlocker } from "react-router";
import { useTranslation } from "react-i18next";

export default function useUnsavedChanges(isDirty) {
  const { t } = useTranslation();

  // Block React Router navigation
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const leave = window.confirm(t("common.unsavedWarning"));
      if (leave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, t]);

  // Block browser close / refresh
  const handleBeforeUnload = useCallback(
    (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    },
    [isDirty]
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);
}
