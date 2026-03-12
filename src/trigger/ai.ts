import { logger, task } from "@trigger.dev/sdk/v3";
import { runBackgroundAgent } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const generateAiResponse = task({
  id: "generate-ai-response",
  maxDuration: 120,
  run: async (payload: {
    prompt: string;
    userId: string;
    generationId: string;
  }) => {
    const { prompt, userId, generationId } = payload;
    logger.log("Starting AI generation", { generationId, userId });

    try {
      // Mark as processing
      await supabaseAdmin
        .from("generations")
        .update({ status: "processing" })
        .eq("id", generationId);

      const result = await runBackgroundAgent(prompt);

      // Save result
      await supabaseAdmin
        .from("generations")
        .update({ result, status: "completed" })
        .eq("id", generationId);

      logger.log("AI generation completed", {
        generationId,
        resultLength: result.length,
      });

      return { success: true, generationId, result };
    } catch (error) {
      logger.error("AI generation failed", { generationId, error });

      await supabaseAdmin
        .from("generations")
        .update({ status: "failed", result: "Generation failed. Please try again." })
        .eq("id", generationId);

      return { success: false, generationId, error: String(error) };
    }
  },
});
