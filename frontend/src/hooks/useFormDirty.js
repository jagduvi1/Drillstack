import { useState, useEffect, useRef } from "react";
import useUnsavedChanges from "./useUnsavedChanges";

/**
 * Track form dirty state with unsaved changes protection.
 * Skips the initial load (or async data fetch) so dirty only triggers on user edits.
 *
 * Usage:
 *   const [dirty, setDirty, markLoaded] = useFormDirty(form);
 *   // After async load: markLoaded();
 *   // Before navigate on save: setDirty(false);
 */
export default function useFormDirty(dependency) {
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);
  useUnsavedChanges(dirty);

  const markLoaded = () => { loaded.current = true; };

  useEffect(() => {
    if (loaded.current) setDirty(true);
  }, [dependency]);

  return [dirty, setDirty, markLoaded];
}
