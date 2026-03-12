import { google } from '@ai-sdk/google';
import { generateText, type ToolSet, stepCountIs } from 'ai';

export const aiModels = {
	primary: google('gemini-2.5-flash'),
};

export const systemPrompts = {
	general: "You are a highly capable AI assistant. Be concise and helpful.",
	jsonAgent: "You are a highly capable AI agent. Always respond in strictly VALID JSON format.",
};

/**
 * Simple text generation — no tool calling.
 */
export async function runBackgroundAgent(prompt: string, systemPrompt?: string) {
	try {
		const { text } = await generateText({
			model: aiModels.primary,
			system: systemPrompt ?? systemPrompts.general,
			prompt: prompt,
		});
		return text;
	} catch (error) {
		console.error("AI Generation Failed:", error);
		throw new Error("AI generation failed.");
	}
}

/**
 * Advanced generation with tool-calling (MCP-style).
 * The AI can invoke tools (search DB, calculate metrics, etc.)
 * and the SDK automatically handles the tool call → result → continue loop.
 * stopWhen: stepCountIs(n) controls how many tool→response roundtrips are allowed.
 */
export async function runAgentWithTools(
	prompt: string,
	systemPrompt: string,
	tools: ToolSet,
	options?: { maxSteps?: number }
) {
	try {
		const result = await generateText({
			model: aiModels.primary,
			system: systemPrompt,
			prompt,
			tools,
			stopWhen: stepCountIs(options?.maxSteps ?? 5),
		});
		return {
			text: result.text,
			toolCalls: result.steps.flatMap((s) => s.toolCalls ?? []),
			toolResults: result.steps.flatMap((s) => s.toolResults ?? []),
			steps: result.steps.length,
		};
	} catch (error) {
		console.error("AI Agent with Tools Failed:", error);
		throw new Error("AI agent generation failed.");
	}
}