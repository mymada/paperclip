import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { notificationRules, notificationDeliveries, agentWakeupRequests } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

function renderTemplate(template: string, payload: Record<string, unknown>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(payload)) {
    const placeholder = `{{${key}}}`;
    const replacement = String(value ?? "");
    rendered = rendered.replaceAll(placeholder, replacement);
  }
  return rendered;
}

export function notificationDispatcherService(db: Db) {
  return {
    listRules: async (companyId: string) => {
      const rules = await db
        .select()
        .from(notificationRules)
        .where(eq(notificationRules.companyId, companyId))
        .orderBy(desc(notificationRules.createdAt));
      return rules;
    },

    createRule: async (companyId: string, input: {
      name: string;
      triggerType: string;
      conditions?: {
        agentId?: string;
        projectId?: string;
        minCostUsd?: number;
      };
      channelConnectionId?: string;
      deliveryTarget: "channel" | "email" | "log";
      targetConfig?: {
        email?: string;
        chatId?: string;
        agentId?: string;
      };
      messageTemplate: string;
      enabled?: boolean;
    }) => {
      const [rule] = await db
        .insert(notificationRules)
        .values({
          companyId,
          name: input.name,
          triggerType: input.triggerType,
          conditions: input.conditions ?? null,
          channelConnectionId: input.channelConnectionId ?? null,
          deliveryTarget: input.deliveryTarget,
          targetConfig: input.targetConfig ?? null,
          messageTemplate: input.messageTemplate,
          enabled: input.enabled ?? true,
        })
        .returning();
      return rule;
    },

    updateRule: async (id: string, patch: {
      name?: string;
      triggerType?: string;
      conditions?: {
        agentId?: string;
        projectId?: string;
        minCostUsd?: number;
      };
      channelConnectionId?: string;
      deliveryTarget?: "channel" | "email" | "log";
      targetConfig?: {
        email?: string;
        chatId?: string;
        agentId?: string;
      };
      messageTemplate?: string;
      enabled?: boolean;
    }) => {
      const [updated] = await db
        .update(notificationRules)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(notificationRules.id, id))
        .returning();
      return updated;
    },

    deleteRule: async (id: string) => {
      await db.delete(notificationRules).where(eq(notificationRules.id, id));
    },

    dispatch: async (companyId: string, triggerType: string, eventPayload: Record<string, unknown>): Promise<void> => {
      try {
        // Find all enabled rules matching the trigger type
        const rules = await db
          .select()
          .from(notificationRules)
          .where(
            and(
              eq(notificationRules.companyId, companyId),
              eq(notificationRules.triggerType, triggerType),
              eq(notificationRules.enabled, true)
            )
          );

        for (const rule of rules) {
          try {
            // Check conditions if any
            if (rule.conditions) {
              const conditions = rule.conditions as any;
              let shouldSkip = false;

              if (conditions.agentId && conditions.agentId !== eventPayload.agentId) {
                shouldSkip = true;
              }
              if (conditions.projectId && conditions.projectId !== eventPayload.projectId) {
                shouldSkip = true;
              }
              if (conditions.minCostUsd && typeof eventPayload.costUsd === "number") {
                if (eventPayload.costUsd < conditions.minCostUsd) {
                  shouldSkip = true;
                }
              }

              if (shouldSkip) {
                continue;
              }
            }

            // Render the message template
            const renderedMessage = renderTemplate(rule.messageTemplate, eventPayload);

            // Deliver based on target type
            let deliveryStatus = "sent";
            let deliveryError: string | null = null;

            if (rule.deliveryTarget === "log") {
              logger.info({
                companyId,
                triggerType,
                ruleId: rule.id,
                message: renderedMessage
              }, "Notification dispatched to log");

            } else if (rule.deliveryTarget === "channel") {
              // Create an agent wakeup request with the message as payload
              const targetConfig = rule.targetConfig as any;
              if (targetConfig?.agentId) {
                await db.insert(agentWakeupRequests).values({
                  companyId,
                  agentId: targetConfig.agentId,
                  source: "notification",
                  reason: `Notification: ${rule.name}`,
                  priority: "normal",
                  payload: {
                    type: "notification",
                    message: renderedMessage,
                    triggerType,
                    originalPayload: eventPayload,
                  },
                  status: "queued",
                });
              }

            } else if (rule.deliveryTarget === "email") {
              // Email integration TBD - just log for now
              logger.info({
                companyId,
                triggerType,
                ruleId: rule.id,
                message: renderedMessage,
                targetConfig: rule.targetConfig,
              }, "Notification dispatched to email (integration TBD)");
            }

            // Record the delivery
            await db.insert(notificationDeliveries).values({
              companyId,
              ruleId: rule.id,
              triggerType,
              payload: eventPayload,
              renderedMessage,
              deliveryTarget: rule.deliveryTarget,
              targetConfig: rule.targetConfig,
              status: deliveryStatus,
              error: deliveryError,
              sentAt: new Date(),
            });

          } catch (ruleErr) {
            logger.warn({ companyId, triggerType, ruleId: rule.id, err: ruleErr }, "Failed to dispatch notification for rule");

            // Record the failed delivery
            try {
              const renderedMessage = renderTemplate(rule.messageTemplate, eventPayload);
              await db.insert(notificationDeliveries).values({
                companyId,
                ruleId: rule.id,
                triggerType,
                payload: eventPayload,
                renderedMessage,
                deliveryTarget: rule.deliveryTarget,
                targetConfig: rule.targetConfig,
                status: "failed",
                error: String(ruleErr),
              });
            } catch (recordErr) {
              logger.error({ companyId, triggerType, ruleId: rule.id, err: recordErr }, "Failed to record failed notification delivery");
            }
          }
        }

      } catch (err) {
        logger.error({ companyId, triggerType, err }, "Notification dispatcher failed");
        // Never throw - this is fire-and-forget
      }
    },

    listDeliveries: async (companyId: string, limit = 50) => {
      const deliveries = await db
        .select()
        .from(notificationDeliveries)
        .where(eq(notificationDeliveries.companyId, companyId))
        .orderBy(desc(notificationDeliveries.createdAt))
        .limit(limit);
      return deliveries;
    },
  };
}