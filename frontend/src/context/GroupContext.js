import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getGroups } from "../api/groups";
import { useAuth } from "./AuthContext";

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => {
    return localStorage.getItem("activeGroup") || null;
  });
  const [loading, setLoading] = useState(false);

  const refreshGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getGroups();
      setGroups(res.data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  const setActiveGroup = useCallback((groupId) => {
    setActiveGroupId(groupId);
    if (groupId) {
      localStorage.setItem("activeGroup", groupId);
    } else {
      localStorage.removeItem("activeGroup");
    }
  }, []);

  const activeGroup = groups.find((g) => g._id === activeGroupId) || null;

  // Get user's role in a specific group
  const getUserRole = useCallback((groupId) => {
    const group = groups.find((g) => g._id === groupId);
    if (!group || !user) return null;
    const member = group.members.find((m) =>
      (m.user?._id || m.user) === user._id || (m.user?._id || m.user)?.toString() === user._id
    );
    return member?.role || null;
  }, [groups, user]);

  return (
    <GroupContext.Provider value={{
      groups,
      activeGroup,
      activeGroupId,
      setActiveGroup,
      refreshGroups,
      getUserRole,
      loading,
    }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroups must be used within GroupProvider");
  return ctx;
}
