import api from "./client";
import type {  User, Company  } from "../types";

export const authApi = {
  signup: (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    country: string;
  }) => api.post<{ data: { token: string; user: User; company: Company } }>("/auth/signup", data),

  login: (data: { email: string; password: string }) =>
    api.post<{ data: { token: string; user: User; company: Company } }>("/auth/login", data),

  getMe: () => api.get<{ data: User }>("/auth/me"),
};

export const userApi = {
  getAll: () => api.get<{ data: User[] }>("/users"),

  create: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    managerId?: string;
    isManagerApprover?: boolean;
  }) => api.post<{ data: User }>("/users", data),

  update: (id: string, data: Partial<{
    name: string;
    role: string;
    managerId: string | null;
    isManagerApprover: boolean;
  }>) => api.patch<{ data: User }>(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};

export const expenseApi = {
  submit: (formData: FormData) =>
    api.post<{ data: any }>("/expenses", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getMine: () => api.get<{ data: any[] }>("/expenses/mine"),

  getAll: (status?: string) =>
    api.get<{ data: any[] }>("/expenses", { params: status ? { status } : {} }),

  getById: (id: string) => api.get<{ data: any }>(`/expenses/${id}`),

  getPendingApprovals: () => api.get<{ data: any[] }>("/expenses/pending-approvals"),

  takeAction: (id: string, data: { action: string; comment?: string; isManagerGate?: boolean }) =>
    api.post<{ data: any }>(`/expenses/${id}/action`, data),

  override: (id: string, data: { action: string; comment?: string }) =>
    api.post<{ data: any }>(`/expenses/${id}/override`, data),

  resubmit: (id: string) => api.post<{ data: any }>(`/expenses/${id}/resubmit`),
};

export const flowApi = {
  getAll: () => api.get<{ data: any[] }>("/approval-flows"),

  getById: (id: string) => api.get<{ data: any }>(`/approval-flows/${id}`),

  create: (data: any) => api.post<{ data: any }>("/approval-flows", data),

  update: (id: string, data: any) => api.put<{ data: any }>(`/approval-flows/${id}`, data),

  delete: (id: string) => api.delete(`/approval-flows/${id}`),

  setDefault: (id: string) => api.post(`/approval-flows/${id}/set-default`),
};

export const currencyApi = {
  getAll: () => api.get<{ data: any[] }>("/currencies"),
};
