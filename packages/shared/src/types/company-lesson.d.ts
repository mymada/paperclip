import type { CompanyLessonStatus } from "../constants.js";
export interface CompanyLesson {
    id: string;
    companyId: string;
    issueId: string | null;
    rule: string;
    status: CompanyLessonStatus;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=company-lesson.d.ts.map