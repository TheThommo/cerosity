import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Wind, Target, Eye, Flame, Zap, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloAvatar } from "@/components/flo-avatar";
import { FloVoicePTT } from "@/components/flo-voice-ptt";

interface Message {
  id: string;
  role: "user" | "flo";
  content: string;
  timestamp: Date;
}

const R2B_TOOLS = [
  { icon: Wind, label: "Box Breathing", prompt: "Walk me through box breathing to calm down right now" },
  { icon: Target, label: "Control Circles", prompt: "Help me identify what's in my control circle vs outside it" },
  { icon: Eye, label: "Visualization", prompt: "Guide me through a performance visualization exercise" },
  { icon: Flame, label: "Red→Blue Shift", prompt: "I'm in Red Head right now. Help me shift to Blue Head" },
  { icon: Zap, label: "Pre-Performance", prompt: "Give me a 60-second pre-performance routine I can use now" },
];

export function FloChat({ isInlineWidget = false }: { isInlineWidget?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText.trim() }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const floMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "flo",
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, floMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "flo",
          content: "I'm here to help with your mental game. Try one of the tools above, or ask me anything about pressure, focus, or confidence.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) sendMessage(inputValue);
    },
    [inputValue, sendMessage, isLoading]
  );

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl shadow-blue-950/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30">
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-blue-500/20 flex-shrink-0">
          <FloAvatar size={40} variant="mini" />
        </div>
        <div>
          <h3 className="font-semibold text-white">FLO</h3>
          <p className="text-xs text-slate-400">Red2Blue Mental Performance Coach</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-500">Online</span>
        </div>
      </div>

      {/* R2B Tool Buttons */}
      <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/80">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {R2B_TOOLS.map((tool) => (
            <button
              key={tool.label}
              onClick={() => sendMessage(tool.prompt)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-600 text-xs text-slate-300 hover:text-white transition-all whitespace-nowrap disabled:opacity-50"
            >
              <tool.icon className="w-3.5 h-3.5 text-blue-400" />
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[400px] overflow-y-auto p-5 space-y-4 bg-slate-950/50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border border-blue-500/10">
              <FloAvatar size={64} />
            </div>
            <p className="text-white font-medium mb-2">What's on your mind?</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Ask about pressure, focus, confidence — or tap a tool above to start a guided exercise.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex w-full gap-2", message.role === "user" ? "justify-end" : "justify-start")}
          >
            {message.role === "flo" && (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-1">
                <FloAvatar size={28} variant="mini" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-md"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-4 bg-slate-900">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Talk to FLO..."
            disabled={isLoading}
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
          <FloVoicePTT compact />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
