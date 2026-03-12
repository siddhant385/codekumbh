"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Wrench } from "lucide-react";
import { sendAgentMessage } from "@/actions/agents/chat";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

interface AgentChatProps {
  agentId: string;
  agentName: string;
  placeholder: string;
}

export function AgentChat({ agentId, agentName, placeholder }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const result = await sendAgentMessage(agentId, text, history);

      if ("error" in result) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response,
        toolsUsed: result.toolsUsed,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      toast.error("Failed to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot size={28} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Start a conversation with <strong>{agentName}</strong>. The agent has access to
                real database tools and will use them to provide data-driven answers.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Wrench size={12} />
                Tool-calling enabled (DB search, market stats, investment metrics)
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-secondary-foreground" />
                  </div>
                )}
              </div>
              {/* Tool usage indicator */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7" /> {/* spacer */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Wrench size={10} className="text-muted-foreground" />
                    {msg.toolsUsed.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded"
                      >
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Analyzing with tools...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={placeholder}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
