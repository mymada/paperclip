import { api } from "./client";

export interface IssuePlan {
  id: string;
  companyId: string;
  issueId: string | null;
  agentId: string | null;
  heartbeatRunId: string | null;
  title: string;
  objective: string;
  steps: Array<{
    id: string;
    order: number;
    description: string;
    estimatedCost?: number;
    assigneeRoleHint?: string;
  }>;
  estimatedCostUsd: string | null;
  risks: Array<{
    severity: "low" | "medium" | "high";
    description: string;
  }> | null;
  successCriteria: string[] | null;
  subDelegations: Array<{
    goal: string;
    assigneeRoleHint: string;
    budgetCap: number;
  }> | null;
  status: "draft" | "approved" | "rejected" | "superseded";
  reviewedByUserId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const plansApi = {
  list: (companyId: string, issueId?: string) => {
    const params = issueId ? `?issueId=${issueId}` : "";
    return api.get<IssuePlan[]>(`/companies/${companyId}/plans${params}`);
  },
  get: (companyId: string, planId: string) =>
    api.get<IssuePlan>(`/companies/${companyId}/plans/${planId}`),
  approve: (companyId: string, planId: string) =>
    api.post<IssuePlan>(`/companies/${companyId}/plans/${planId}/approve`, {}),
  reject: (companyId: string, planId: string, reviewNote: string) =>
    api.post<IssuePlan>(`/companies/${companyId}/plans/${planId}/reject`, { reviewNote }),
};