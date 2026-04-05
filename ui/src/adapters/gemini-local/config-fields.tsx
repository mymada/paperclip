import type { AdapterConfigFieldsProps } from "../types";
import {
  DraftInput,
  Field,
  ToggleField,
  help,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Prepended to the Gemini prompt at runtime.";

export function GeminiLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  hideInstructionsFile,
}: AdapterConfigFieldsProps) {
  const bypassEnabled = config.dangerouslyBypassSandbox === true || !config.sandbox;

  return (
    <>
      {!hideInstructionsFile && (
        <Field label="Agent instructions file" hint={instructionsFileHint}>
          <div className="flex items-center gap-2">
            <DraftInput
              value={
                isCreate
                  ? values!.instructionsFilePath ?? ""
                  : eff(
                      "adapterConfig",
                      "instructionsFilePath",
                      String(config.instructionsFilePath ?? ""),
                    )
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ instructionsFilePath: v })
                  : mark("adapterConfig", "instructionsFilePath", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}

      <div className="mt-4 space-y-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Gemini Sandbox Fix v1</div>
        <ToggleField
          label="Bypass sandbox"
          hint={help.dangerouslyBypassSandbox}
          checked={
            isCreate
              ? values!.dangerouslyBypassSandbox ?? false
              : !eff(
                  "adapterConfig",
                  "sandbox",
                  !bypassEnabled,
                )
          }
          onChange={(v) =>
            isCreate
              ? set!({ dangerouslyBypassSandbox: v })
              : mark("adapterConfig", "sandbox", !v)
          }
        />
      </div>
    </>
  );
}

