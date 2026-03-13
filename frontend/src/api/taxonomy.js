import api from "./client";

export const getTaxonomy = (params) => api.get("/taxonomy", { params });
export const getCategories = () => api.get("/taxonomy/categories");
export const createTaxonomy = (data) => api.post("/taxonomy", data);
export const updateTaxonomy = (id, data) => api.put(`/taxonomy/${id}`, data);
export const deleteTaxonomy = (id) => api.delete(`/taxonomy/${id}`);
