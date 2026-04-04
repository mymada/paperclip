export {};

declare global {
  namespace Express {
    interface Request {
      /** Set by `requestIdMiddleware` for every HTTP request. */
      requestId: string;
      actor: {
        type: "board" | "agent" | "none";
        userId?: string;
        agentId?: string;
        companyId?: string;
        companyIds?: string[];
        isInstanceAdmin?: boolean;
        keyId?: string;
        runId?: string;
        source?: "local_implicit" | "session" | "board_key" | "agent_key" | "agent_jwt" | "none";
      };
    }
  }
}
