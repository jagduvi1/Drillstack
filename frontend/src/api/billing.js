import api from "./client";

export const getPlans = () => api.get("/billing/plans");
export const getUsage = () => api.get("/billing/usage");
export const changePlan = (plan) => api.put("/billing/plan", { plan });
export const startTrial = () => api.post("/billing/start-trial");
