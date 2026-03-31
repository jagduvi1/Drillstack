import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Warn the user before leaving a page with unsaved changes.
 * Works with <BrowserRouter> (no data router required).
 *
 * - Browser close / refresh: blocked via beforeunload
 * - In-app navigation: blocked via history.pushState/replaceState interception
 */
export default function useUnsavedChanges(isDirty) {
  const { t } = useTranslation();

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

  // Block in-app navigation (React Router uses pushState/replaceState)
  useEffect(() => {
    if (!isDirty) return;

    const msg = t("common.unsavedWarning");

    // Intercept browser back/forward buttons
    const handlePopState = (e) => {
      if (!isDirty) return;
      const leave = window.confirm(msg);
      if (!leave) {
        // Push the current URL back to undo the navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Push a dummy state so we can intercept the first back press
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    // Intercept pushState/replaceState (used by React Router's navigate())
    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = function (...args) {
      if (isDirty && !window.confirm(msg)) return;
      return origPush(...args);
    };
    window.history.replaceState = function (...args) {
      // Allow replaceState silently (used by router internals, not user navigation)
      return origReplace(...args);
    };

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [isDirty, t]);
}
