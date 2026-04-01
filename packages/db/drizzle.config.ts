import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./build/schema/*.js",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
