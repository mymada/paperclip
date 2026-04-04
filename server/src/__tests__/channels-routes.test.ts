import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { channelRoutes } from "../routes/channels.js";

const mockChannelGatewayService = vi.hoisted(() => ({
  listConnections: vi.fn(),
  createConnection: vi.fn(),
  getConnection: vi.fn(),
  updateConnection: vi.fn(),
  deleteConnection: vi.fn(),
  listSessions: vi.fn(),
  handleInboundMessage: vi.fn(),
  generatePairing: vi.fn(),
  approvePairing: vi.fn(),
  listPendingPairings: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  channelGatewayService: () => mockChannelGatewayService,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = { type: "none", source: "none" };
    next();
  });
  app.use("/api", channelRoutes({} as any));
  app.use(errorHandler);
  return app;
}

const inboundPayload = {
  platform: "slack",
  chatId: "chat-1",
  chatType: "dm",
  senderId: "user-1",
  text: "hello",
};

describe("channel inbound webhook auth", () => {
  beforeEach(() => {
    mockChannelGatewayService.getConnection.mockResolvedValue({
      id: "connection-1",
      companyId: "company-1",
      config: {
        channelSecret: "secret-123",
      },
    });
    mockChannelGatewayService.handleInboundMessage.mockResolvedValue({
      session: { id: "session-1" },
      wakeupRequest: { id: "wake-1" },
      message: { id: "message-1" },
    });
    mockChannelGatewayService.generatePairing.mockResolvedValue({
      code: "PAIR1234",
      expiresAt: new Date("2026-04-03T12:00:00.000Z").toISOString(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects inbound requests when no channel secret is configured", async () => {
    mockChannelGatewayService.getConnection.mockResolvedValueOnce({
      id: "connection-1",
      companyId: "company-1",
      config: {},
    });

    const res = await request(createApp())
      .post("/api/companies/company-1/channel-connections/connection-1/inbound")
      .send(inboundPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/channel secret is not configured/i);
    expect(mockChannelGatewayService.handleInboundMessage).not.toHaveBeenCalled();
  });

  it("rejects inbound requests with an invalid channel secret", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/channel-connections/connection-1/inbound")
      .set("x-paperclip-channel-secret", "wrong-secret")
      .send(inboundPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invalid channel secret/i);
    expect(mockChannelGatewayService.handleInboundMessage).not.toHaveBeenCalled();
  });

  it("accepts inbound requests with the configured channel secret", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/channel-connections/connection-1/inbound")
      .set("x-paperclip-channel-secret", "secret-123")
      .send(inboundPayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sessionId: "session-1",
      wakeupRequestId: "wake-1",
      messageId: "message-1",
    });
    expect(mockChannelGatewayService.handleInboundMessage).toHaveBeenCalledWith(
      "connection-1",
      expect.objectContaining({
        platform: "slack",
        chatId: "chat-1",
        senderId: "user-1",
        text: "hello",
      }),
    );
  });
});
