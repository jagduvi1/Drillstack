import api from "./client";

export const semanticSearch = (params) => api.get("/search/semantic", { params });
export const keywordSearch = (params) => api.get("/search/keyword", { params });
export const hybridSearch = (params) => api.get("/search/hybrid", { params });
