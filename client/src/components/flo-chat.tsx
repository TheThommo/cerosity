import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloAvatar } from "@/components/flo-avatar";
import { FloVoicePTT } from "@/components/flo-voice-ptt";

interface Message {
  id: string;
  role: "user" | "flo";
  content: string;
  timestamp: Date;
}

const SPORT_PROMPTS = [
  { label: "I'm nervous before a game", prompt: "I'm really nervous before my next game, how do I calm down?" },
  { label: "Playing the world #1", prompt: "I am playing against the world number 1 this weekend" },
  { label: "What if conditions change?", prompt: "What if it rains during my competition?" },
];

function parseVisitorInfo(text: string, existing: { name: string; sport: string; email: string }) {
  const updated = { ...existing };
  const lower = text.toLowerCase();

  if (!updated.name) {
    const namePatterns = [
      /(?:i'm|im|i am|my name is|name's|this is|call me)\s+([A-Z][a-z]+)/i,
      /^([A-Z][a-z]{2,})\b/,
    ];
    for (const p of namePatterns) {
      const m = text.match(p);
      if (m) { updated.name = m[1]; break; }
    }
  }

  if (!updated.sport) {
    const sports = ["golf","tennis","cricket","football","soccer","rugby","swimming","athletics","boxing","mma","basketball","hockey","netball","rowing","cycling","triathlon","running","baseball","volleyball","badminton","squash","surfing","skiing","gymnastics","wrestling","sailing","equestrian","shooting","archery","fencing"];
    for (const s of sports) {
      if (lower.includes(s)) { updated.sport = s.charAt(0).toUpperCase() + s.slice(1); break; }
    }
  }

  if (!updated.email) {
    const em = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (em) updated.email = em[0];
  }

  return updated;
}

interface FloChatProps {
  isInlineWidget?: boolean;
  onSignupRequest?: () => void;
}

export function FloChat({ isInlineWidget = false, onSignupRequest }: FloChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignupCta, setShowSignupCta] = useState(false);
  const [visitor, setVisitor] = useState(() => {
    try {
      const saved = sessionStorage.getItem("cerosity_visitor");
      return saved ? JSON.parse(saved) : { name: "", sport: "", email: "" };
    } catch { return { name: "", sport: "", email: "" }; }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const userMessageCount = useRef(0);
  const emailCaptured = useRef(false);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    userMessageCount.current += 1;

    // Show signup CTA after 6 user messages
    if (userMessageCount.current >= 6) {
      setShowSignupCta(true);
    }

    const parsed = parseVisitorInfo(messageText, visitor);
    if (parsed.name !== visitor.name || parsed.sport !== visitor.sport || parsed.email !== visitor.email) {
      setVisitor(parsed);
      try { sessionStorage.setItem("cerosity_visitor", JSON.stringify(parsed)); } catch {}
    }

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
      const allMessages = [...messages, userMessage];
      const conversationHistory = allMessages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const response = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          messageCount: userMessageCount.current,
          conversationHistory,
          visitorName: parsed.name,
          visitorSport: parsed.sport,
        }),
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

      if (!emailCaptured.current && parsed.email) {
        emailCaptured.current = true;
        fetch("/api/capture-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.email, name: parsed.name, sportIndustry: parsed.sport, source: "Chat Funnel" }),
        }).catch(() => {});
      }
    } catch {
      // Don't repeat identical fallback — check last flo message
      const FALLBACK = "I'm here to help with your mental game. Try one of the prompts above, or ask me anything about pressure, focus, or confidence.";
      setMessages((prev) => {
        const lastFlo = [...prev].reverse().find(m => m.role === "flo");
        if (lastFlo?.content === FALLBACK) return prev; // skip duplicate
        return [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "flo" as const,
            content: FALLBACK,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, visitor]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) sendMessage(inputValue);
    },
    [inputValue, sendMessage, isLoading]
  );

  const handleSignupClick = () => {
    if (onSignupRequest) {
      onSignupRequest();
    } else {
      // Default: scroll to pricing section
      const pricingEl = document.getElementById("pricing-section");
      if (pricingEl) {
        pricingEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

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

      {/* Sport Prompt Chips */}
      <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/80">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SPORT_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => sendMessage(item.prompt)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-600 text-xs text-slate-300 hover:text-white transition-all whitespace-nowrap disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[400px] overflow-y-auto p-5 space-y-4 bg-slate-950/50">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-slate-500">Ask about pressure, focus, confidence…</p>
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

        {/* Signup CTA after 6 messages */}
        {showSignupCta && (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={handleSignupClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
            >
              Unlock unlimited FLO coaching
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

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
