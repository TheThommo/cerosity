import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "flo";
  content: string;
  timestamp: Date;
  type?: "text" | "breathing" | "mood-check" | "progress";
}

interface FloChatWidgetProps {
  className?: string;
  guestMode?: boolean;
  onGateReached?: () => void;
}

const GUEST_MESSAGE_LIMIT = 6;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "flo",
  content: "I'm FLO, your mental performance coach. Whether you're dealing with pre-round nerves, recovering from a bad hole, or building focus routines — I'm here. What's on your mind?",
  timestamp: new Date(),
  type: "text",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
      <span className="text-xs text-blue-400/70 ml-2 italic">FLO is thinking...</span>
    </div>
  );
}

function BreathingExercise({ pattern = "4-7-8" }: { pattern?: string }) {
  const [phase, setPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const durations = pattern === "4-7-8" ? { inhale: 4, hold: 7, exhale: 8 } : { inhale: 4, hold: 4, exhale: 4 };
    const phases: ("inhale" | "hold" | "exhale")[] = ["inhale", "hold", "exhale"];
    let phaseIndex = 0;
    let timer: number;

    function tick() {
      const currentPhase = phases[phaseIndex];
      setPhase(currentPhase);
      const duration = durations[currentPhase];
      setCount(duration);

      let remaining = duration;
      timer = window.setInterval(() => {
        remaining--;
        setCount(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          phaseIndex = (phaseIndex + 1) % phases.length;
          tick();
        }
      }, 1000);
    }

    tick();
    return () => clearInterval(timer);
  }, [isRunning, pattern]);

  return (
    <div className="bg-gradient-to-br from-blue-950/50 to-slate-900/50 border border-blue-500/20 rounded-xl p-5 my-2 mx-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-blue-300 uppercase tracking-wider">Breathing Exercise</span>
        <span className="text-xs text-slate-400">{pattern} technique</span>
      </div>

      <div className="flex items-center justify-center py-6">
        <div className={cn(
          "w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-1000",
          phase === "inhale" && "scale-125 border-blue-400 bg-blue-500/10",
          phase === "hold" && "scale-125 border-amber-400 bg-amber-500/10",
          phase === "exhale" && "scale-75 border-emerald-400 bg-emerald-500/10",
          phase === "idle" && "scale-100 border-slate-600 bg-slate-800/50"
        )}>
          <div className="text-center">
            <div className="text-2xl font-light text-white">{isRunning ? count : "—"}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
              {phase === "idle" ? "ready" : phase}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsRunning(!isRunning)}
        className={cn(
          "w-full py-2.5 rounded-lg text-sm font-medium transition-all",
          isRunning
            ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
            : "bg-blue-600 text-white hover:bg-blue-500"
        )}
      >
        {isRunning ? "Stop" : "Start Breathing"}
      </button>
    </div>
  );
}

function MoodCheckIn({ onSelect }: { onSelect: (mood: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const moods = [
    { value: 1, label: "Stressed", emoji: "\u{1F630}" },
    { value: 2, label: "Tense", emoji: "\u{1F624}" },
    { value: 3, label: "Neutral", emoji: "\u{1F610}" },
    { value: 4, label: "Focused", emoji: "\u{1F3AF}" },
    { value: 5, label: "In Flow", emoji: "\u{1F9CA}" },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-600/30 rounded-xl p-5 my-2 mx-5">
      <div className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-4">
        How's your mental state right now?
      </div>
      <div className="flex gap-2">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => { setSelected(mood.value); onSelect(mood.value); }}
            className={cn(
              "flex-1 py-3 rounded-lg text-center transition-all",
              selected === mood.value
                ? "bg-blue-600 text-white shadow-lg scale-105"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
          >
            <div className="text-lg mb-0.5">{mood.emoji}</div>
            <div className="text-[10px] font-medium">{mood.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.type === "breathing") {
    return <BreathingExercise />;
  }

  if (message.type === "mood-check") {
    return <MoodCheckIn onSelect={() => {}} />;
  }

  return (
    <div className={cn("flex gap-3 px-5 py-1.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-blue-600 text-white rounded-br-md"
          : "bg-slate-800/80 text-slate-200 rounded-bl-md border border-slate-700/50"
      )}>
        {message.content}
      </div>
    </div>
  );
}

function GuestGate({ onEmailSubmit }: { onEmailSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 z-10 rounded-2xl">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">You're getting somewhere</h3>
        <p className="text-sm text-slate-400 mb-6">
          FLO remembers your context across sessions. Enter your email to continue this conversation and unlock unlimited coaching.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); if (email) onEmailSubmit(email); }} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Continue with FLO
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3">Free to start. No credit card required.</p>
      </div>
    </div>
  );
}

export function FloChatWidget({ className, guestMode = true, onGateReached }: FloChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [gateVisible, setGateVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (guestMode && messageCount >= GUEST_MESSAGE_LIMIT) {
      setGateVisible(true);
      onGateReached?.();
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    try {
      const response = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();

      const hasBreathing = /breathing|breathe|4-7-8|box breath/i.test(data.message);

      const floMsg: Message = {
        id: `flo-${Date.now()}`,
        role: "flo",
        content: data.message,
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, floMsg]);

      if (hasBreathing) {
        const breathMsg: Message = {
          id: `breath-${Date.now()}`,
          role: "flo",
          content: "",
          timestamp: new Date(),
          type: "breathing",
        };
        setTimeout(() => setMessages((prev) => [...prev, breathMsg]), 300);
      }
    } catch {
      const fallback: Message = {
        id: `flo-${Date.now()}`,
        role: "flo",
        content: "Let's work on your mental game. Tell me about a pressure moment you're facing — I'll help you find techniques to shift from Red Head reactivity to Blue Head focus.",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messageCount, guestMode, onGateReached]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className={cn(
      "relative flex flex-col h-[580px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-blue-950/20",
      className
    )}>
      {gateVisible && <GuestGate onEmailSubmit={() => setGateVisible(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">FLO</h3>
            <p className="text-[11px] text-slate-400">Mental Performance Coach</p>
          </div>
        </div>
        {guestMode && (
          <div className="text-[11px] text-slate-500">
            {Math.max(0, GUEST_MESSAGE_LIMIT - messageCount)} messages remaining
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-blue-500/50 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask FLO anything about your mental game..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            disabled={isLoading}
            data-chat-input
          />
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            title="Voice (coming soon)"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              inputValue.trim()
                ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                : "text-slate-600"
            )}
            data-chat-button
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
