import { useState, useCallback } from "react";

/**
 * Manages debug panel state — open/closed toggle and entry accumulation.
 * Usage:
 *   const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();
 *   // After an API call:
 *   if (res.data.debug) addDebugEntry("Drill Generation", res.data.debug);
 */
export default function useDebugPanel() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState([]);

  const toggleDebug = useCallback(() => setDebugOpen((prev) => !prev), []);

  const addDebugEntry = useCallback((label, debug) => {
    setDebugEntries((prev) => [...prev, { label, debug }]);
  }, []);

  return { debugOpen, debugEntries, toggleDebug, addDebugEntry };
}
