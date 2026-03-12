"use server";

import Replicate from "replicate";
import type { StudioTool } from "@/components/ai-studio/types";
import { buildStudioPrompt, getReplicateModel } from "@/lib/ai/studio-prompts";

/* ── Server Action — instant AI preview via Replicate ──────────────────── */

export async function processImageWithAI(input: {
  /** Base64-encoded image: "data:image/jpeg;base64,..." */
  imageBase64: string;
  tool: StudioTool;
  preset?: string;
  removeText?: string;
  replaceText?: string;
}): Promise<
  | { success: true; outputBase64: string }
  | { success: false; error: string }
> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      success: false,
      error: "REPLICATE_API_TOKEN not set — add it to .env.local",
    };
  }

  const { prompt, guidanceScale } = buildStudioPrompt(input.tool, {
    preset:      input.preset,
    removeText:  input.removeText,
    replaceText: input.replaceText,
  });

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const output = await replicate.run(getReplicateModel(), {
      input: {
        prompt,
        guidance:       guidanceScale,
        steps:          30,
        width:          1024,
        height:         1024,
        image_prompt:   input.imageBase64,
      },
    });

    // flux-2-pro returns a URL string or array of URL strings
    const outputUrl = Array.isArray(output) ? output[0] : output;

    if (!outputUrl || typeof outputUrl !== "string") {
      return { success: false, error: "No output returned from Replicate" };
    }

    // Fetch the output image and convert to base64 for the client
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      return {
        success: false,
        error: `Failed to download result image: ${imgRes.status}`,
      };
    }

    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    return { success: true, outputBase64: `data:image/png;base64,${b64}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
