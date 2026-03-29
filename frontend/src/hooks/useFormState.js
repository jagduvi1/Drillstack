import { useState, useCallback } from "react";

/**
 * Reusable form state hook with helpers for nested fields and list operations.
 *
 * Usage:
 *   const { form, setForm, set, setNested, addToList, updateInList, removeFromList } = useFormState(INITIAL);
 */
export default function useFormState(initialState) {
  const [form, setForm] = useState(initialState);

  /** Set a top-level field: set("title", "New title") */
  const set = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  /** Set a nested field: setNested("setup", "players", "10") */
  const setNested = useCallback((parent, field, value) => {
    setForm((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  }, []);

  /** Add an item to an array field: addToList("coachingPoints", "") */
  const addToList = useCallback((field, item) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), item],
    }));
  }, []);

  /** Update an item in an array field by index: updateInList("coachingPoints", 0, "Keep head up") */
  const updateInList = useCallback((field, index, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  }, []);

  /** Remove an item from an array field by index: removeFromList("coachingPoints", 0) */
  const removeFromList = useCallback((field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }, []);

  return { form, setForm, set, setNested, addToList, updateInList, removeFromList };
}
