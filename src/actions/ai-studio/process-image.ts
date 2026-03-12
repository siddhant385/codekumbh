"use server";

import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { StudioTool } from "@/components/ai-studio/types";
import type { processStudioImage } from "@/trigger/process-studio-image";

/* ── Server Action — AI preview via Trigger.dev → Replicate ─────────────── */

export async function processImageWithAI(input: {
  /** Base64-encoded image: "data:image/jpeg;base64,..." */
  imageBase64: string;
  tool: StudioTool;
  preset?: string;
  removeText?: string;
  replaceText?: string;
  /** If set, Trigger task will also persist to Supabase Storage + update DB */
  propertyImageId?: string;
}): Promise<
  | { success: true; outputBase64: string }
  | { success: false; error: string }
> {
  try {
    // Trigger the background task
    const handle = await tasks.trigger<typeof processStudioImage>(
      "process-studio-image",
      {
        propertyImageId: input.propertyImageId,
        imageBase64:     input.imageBase64,
        tool:            input.tool,
        preset:          input.preset,
        removeText:      input.removeText,
        replaceText:     input.replaceText,
      },
    );

    // Poll until the task completes (max ~3 minutes, matching task maxDuration)
    const completed = await runs.poll(handle, { pollIntervalMs: 3000 });

    if (completed.status !== "COMPLETED" || !completed.output) {
      const errMsg = completed.status === "FAILED"
        ? `Task failed: ${completed.error?.message ?? "unknown error"}`
        : `Task ended with status: ${completed.status}`;
      return { success: false, error: errMsg };
    }

    const output = completed.output;

    if (!output.success) {
      return { success: false, error: output.error };
    }

    return { success: true, outputBase64: output.outputBase64 };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
