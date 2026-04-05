import type { CompanyLesson } from "@paperclipai/shared";
import { api } from "./client";

export const companyLessonsApi = {
  list: (companyId: string, status?: string) => {
    const params = status ? `?status=${status}` : "";
    return api.get<CompanyLesson[]>(`/companies/${companyId}/company-lessons${params}`);
  },
  create: (companyId: string, data: { rule: string; type?: string; issueId?: string | null; status?: string }) =>
    api.post<CompanyLesson>(`/companies/${companyId}/company-lessons`, data),
  update: (companyId: string, lessonId: string, data: { rule?: string; status?: string }) =>
    api.patch<CompanyLesson>(`/companies/${companyId}/company-lessons/${lessonId}`, data),
  delete: (companyId: string, lessonId: string) =>
    api.delete<void>(`/companies/${companyId}/company-lessons/${lessonId}`),
};