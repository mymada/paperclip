/**
 * [DATA_BUS] : Source: companies.sh, Agent Companies v1 protocol, Paperclip Portability Service.
 * [LOGIC_REPORT] : Universal Importer to install agent companies from Git repositories
 * or local directories, following the KERNEL v16.1 standards.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Db } from "@paperclipai/db";
import { companyPortabilityService } from "./company-portability.js";
import { runChildProcess } from "../adapters/utils.js";
import { logger } from "../middleware/logger.js";
import type { StorageService } from "../storage/types.js";

export interface InstallCompanyOptions {
  repoUrl: string;
  ref?: string;
  path?: string;
  targetMode?: "new_company" | "existing_company";
  targetCompanyId?: string;
  newCompanyName?: string;
  actorUserId?: string;
}

class CompanyInstallerImpl {
  /**
   * Installs a company from a Git repository.
   * [SOURCE: KERNEL Couche D - RELAY_PROTOCOL]
   */
  async installFromRepo(db: Db, storage: StorageService | undefined, options: InstallCompanyOptions) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pcp-install-"));
    const runId = `install-${Math.random().toString(36).slice(2, 11)}`;

    logger.info(`[company-installer] Installing company from ${options.repoUrl} (ref: ${options.ref ?? "HEAD"})`);

    try {
      // 1. Clone the repository
      await runChildProcess(runId, "git", ["clone", "--depth", "1", options.repoUrl, tempDir], {
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
        timeoutSec: 60,
        graceSec: 5,
        onLog: async () => {},
      });

      if (options.ref) {
        await runChildProcess(runId, "git", ["checkout", options.ref], {
          cwd: tempDir,
          env: process.env as Record<string, string>,
          timeoutSec: 30,
          graceSec: 5,
          onLog: async () => {},
        });
      }

      // 2. Scan the directory for company files
      const rootPath = options.path ? path.join(tempDir, options.path) : tempDir;
      const files = await this.scanDirectory(rootPath);

      // 3. Use portability service to import
      const portability = companyPortabilityService(db, storage);
      
      const importResult = await portability.importBundle({
        source: {
          type: "inline",
          files,
          rootPath: "",
        },
        target: options.targetMode === "existing_company" && options.targetCompanyId
          ? { mode: "existing_company" as const, companyId: options.targetCompanyId }
          : { mode: "new_company" as const, newCompanyName: options.newCompanyName },
        selectedFiles: Object.keys(files),
        collisionStrategy: "rename",
        nameOverrides: {},
      }, options.actorUserId);

      logger.info(`[company-installer] Successfully installed company: ${importResult.company.name} (${importResult.company.id})`);
      
      return importResult;
    } catch (error) {
      logger.error({ error }, "[company-installer] Failed to install company:");
      throw error;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async scanDirectory(dir: string, baseDir: string = dir): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        Object.assign(results, await this.scanDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        // We only care about text/markdown files for the manifest
        if (entry.name.endsWith(".md") || entry.name.endsWith(".yaml") || entry.name.endsWith(".yml") || entry.name.endsWith(".json")) {
          results[relativePath] = await fs.readFile(fullPath, "utf8");
        }
      }
    }

    return results;
  }
}

export const companyInstaller = new CompanyInstallerImpl();
