import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { companyLessonService } from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { HttpError } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const createCompanyLessonSchema = z.object({
  rule: z.string().min(1).max(5000),
  type: z.enum(["procedure", "fact", "antibody"]).optional(),
  issueId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const updateCompanyLessonSchema = z.object({
  rule: z.string().min(1).max(5000).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export function companyLessonRoutes(db: Db) {
  const router = Router();
  const svc = companyLessonService(db);

  // GET /companies/:companyId/company-lessons?status=draft|active|archived - list lessons
  router.get("/companies/:companyId/company-lessons", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const status = req.query.status as string | undefined;
      assertCompanyAccess(req, companyId);
      const lessons = await svc.list(companyId, status);
      res.json(lessons);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId }, "Failed to list company lessons");
      throw error;
    }
  });

  // POST /companies/:companyId/company-lessons - create lesson
  router.post(
    "/companies/:companyId/company-lessons",
    validate(createCompanyLessonSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const lesson = await svc.create({
          companyId,
          ...req.body,
        });

        logger.info({ companyId, lessonId: lesson.id, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Company lesson created");
        res.status(201).json(lesson);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId }, "Failed to create company lesson");
        throw error;
      }
    }
  );

  // PATCH /companies/:companyId/company-lessons/:lessonId - update lesson
  router.patch(
    "/companies/:companyId/company-lessons/:lessonId",
    validate(updateCompanyLessonSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const lessonId = req.params.lessonId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        // Check if lesson exists and belongs to the company
        const existingLessons = await svc.list(companyId);
        const existingLesson = existingLessons.find((l: { id: string }) => l.id === lessonId);
        if (!existingLesson) {
          throw new HttpError(404, "Company lesson not found");
        }

        const lesson = await svc.update(lessonId, req.body);

        logger.info({ companyId, lessonId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Company lesson updated");
        res.json(lesson);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, lessonId: req.params.lessonId }, "Failed to update company lesson");
        throw error;
      }
    }
  );

  // DELETE /companies/:companyId/company-lessons/:lessonId - delete lesson
  router.delete("/companies/:companyId/company-lessons/:lessonId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const lessonId = req.params.lessonId as string;
      assertCompanyAccess(req, companyId);
      const actorInfo = getActorInfo(req);

      // Check if lesson exists and belongs to the company
      const existingLessons = await svc.list(companyId);
      const existingLesson = existingLessons.find((l: { id: string }) => l.id === lessonId);
      if (!existingLesson) {
        throw new HttpError(404, "Company lesson not found");
      }

      await svc.delete(lessonId);
      logger.info({ companyId, lessonId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Company lesson deleted");
      res.status(204).send();
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, lessonId: req.params.lessonId }, "Failed to delete company lesson");
      throw error;
    }
  });

  return router;
}