import type { CompanyLessonStatus } from "../constants.js";

export interface CompanyLesson {
  id: string;
  companyId: string;
  issueId: string | null;
  type: "procedure" | "fact" | "antibody";
  rule: string;
  status: CompanyLessonStatus;
  createdAt: Date;
  updatedAt: Date;
}
