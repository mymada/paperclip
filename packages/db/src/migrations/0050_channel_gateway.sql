CREATE TABLE "channel_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_connected_at" timestamp with time zone,
	"last_error" text,
	"policy_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"connection_id" uuid,
	"session_key" text NOT NULL,
	"platform" text NOT NULL,
	"chat_id" text NOT NULL,
	"chat_type" text NOT NULL,
	"chat_name" text,
	"user_id" text,
	"user_name" text,
	"thread_id" text,
	"context_snapshot" jsonb,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"message_count" integer DEFAULT 0,
	"last_message_at" timestamp with time zone,
	"auto_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failed_attempts" integer DEFAULT 0,
	"locked_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"session_id" uuid,
	"platform" text NOT NULL,
	"chat_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text,
	"text" text,
	"chat_type" text,
	"thread_id" text,
	"message_id" text,
	"has_images" boolean DEFAULT false,
	"has_audio" boolean DEFAULT false,
	"has_documents" boolean DEFAULT false,
	"normalized_event" jsonb,
	"agent_wakeup_request_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "channel_connections_company_idx" ON "channel_connections" ("company_id");
--> statement-breakpoint
CREATE INDEX "channel_connections_company_platform_idx" ON "channel_connections" ("company_id","platform");
--> statement-breakpoint
CREATE INDEX "channel_connections_company_status_idx" ON "channel_connections" ("company_id","status");
--> statement-breakpoint
CREATE INDEX "channel_sessions_company_idx" ON "channel_sessions" ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_sessions_session_key_unq" ON "channel_sessions" ("session_key");
--> statement-breakpoint
CREATE INDEX "channel_sessions_company_platform_chat_idx" ON "channel_sessions" ("company_id","platform","chat_id");
--> statement-breakpoint
CREATE INDEX "channel_pairings_platform_user_idx" ON "channel_pairings" ("platform","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_pairings_code_unq" ON "channel_pairings" ("code");
--> statement-breakpoint
CREATE INDEX "channel_pairings_company_idx" ON "channel_pairings" ("company_id");
--> statement-breakpoint
CREATE INDEX "channel_messages_company_platform_chat_idx" ON "channel_messages" ("company_id","platform","chat_id");
--> statement-breakpoint
CREATE INDEX "channel_messages_message_id_idx" ON "channel_messages" ("message_id");
--> statement-breakpoint
CREATE INDEX "channel_messages_company_idx" ON "channel_messages" ("company_id");
--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_sessions" ADD CONSTRAINT "channel_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_sessions" ADD CONSTRAINT "channel_sessions_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_pairings" ADD CONSTRAINT "channel_pairings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_pairings" ADD CONSTRAINT "channel_pairings_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_session_id_channel_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."channel_sessions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_agent_wakeup_request_id_agent_wakeup_requests_id_fk" FOREIGN KEY ("agent_wakeup_request_id") REFERENCES "public"."agent_wakeup_requests"("id") ON DELETE set null ON UPDATE no action;