"use server";

import { createClient } from "@/lib/supabase/server";
import { runAgentWithTools } from "@/lib/ai/config";
import { agentTools } from "@/lib/ai/tools";
import { supabaseAdmin } from "@/lib/supabase/admin";

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  "property-valuation": `You are an expert Indian real estate valuation analyst AI with access to database tools.
You can search for comparable properties, get area market statistics, and calculate investment metrics.
ALWAYS use your tools to back up your analysis with real data from the database.
Provide detailed, data-driven property valuations. Format your responses with clear sections.
Use ₹ for Indian Rupee amounts. Be specific with numbers.
If tools return no data, mention that and provide your best estimate based on general knowledge.`,

  "investment-advisory": `You are an expert Indian real estate investment advisor AI with access to database tools.
You can search properties, analyze market stats, and calculate investment metrics like EMI, rental yield, and ROI.
ALWAYS use your tools to fetch real market data before giving recommendations.
Provide actionable investment advice with specific numbers. Consider risk tolerance, market conditions, and location dynamics.
Use ₹ for Indian Rupee amounts. Format with clear suggestions and reasoning.`,

  "market-intelligence": `You are an Indian real estate market intelligence AI with access to database tools.
You can search properties across cities, get market statistics, and analyze trends.
ALWAYS use your tools to pull real listing data and market metrics.
Provide data-driven market insights: price trends, supply/demand dynamics, micro-market analysis.
Use ₹ for Indian Rupee amounts. Be specific with statistics and comparisons.`,
};

export async function sendAgentMessage(
  agentId: string,
  message: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<{ response: string; toolsUsed: string[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (!message.trim()) return { error: "Message cannot be empty." };
  if (message.length > 2000) return { error: "Message too long (max 2000 chars)." };

  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) return { error: "Unknown agent." };

  // Build context from conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  const contextBlock = recentHistory.length > 0
    ? `\n\nPrevious conversation:\n${recentHistory.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")}\n\n`
    : "";

  const fullPrompt = `${contextBlock}User: ${message}`;

  const startTime = Date.now();

  try {
    const result = await runAgentWithTools(
      fullPrompt,
      systemPrompt,
      agentTools,
      { maxSteps: 5 }
    );

    const latencyMs = Date.now() - startTime;
    const toolsUsed = result.toolCalls.map((tc) => tc.toolName);

    // Log to ai_agent_logs
    await supabaseAdmin.from("ai_agent_logs").insert({
      user_id: user.id,
      action_type: `agent_chat_${agentId}`,
      model_provider: "google",
      model_name: "gemini-2.5-flash",
      input_payload: { agentId, message, historyLength: recentHistory.length },
      output_payload: { response: result.text.slice(0, 500), toolsUsed },
      latency_ms: latencyMs,
      token_usage: Math.ceil(result.text.length / 4),
    });

    return { response: result.text, toolsUsed };
  } catch {
    return { error: "AI generation failed. Please try again." };
  }
}
