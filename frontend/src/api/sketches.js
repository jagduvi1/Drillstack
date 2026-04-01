import api from "./client";

export const getSketches = () => api.get("/sketches");
export const getSketch = (id) => api.get(`/sketches/${id}`);
export const createSketch = (data) => api.post("/sketches", data);
export const updateSketch = (id, data) => api.put(`/sketches/${id}`, data);
export const deleteSketch = (id) => api.delete(`/sketches/${id}`);
