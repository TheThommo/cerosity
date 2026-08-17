import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "flo";
  content: string;
  timestamp: Date;
}

interface FloResponse {
  message: string;
}

export function StableChat({ isInlineWidget = false }: { isInlineWidget?: boolean }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Signed-in athletes get their conversation back after a refresh. The
  // transcript lives in Postgres, so this is a rehydrate, not a cache.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/chat/sessions/${user.id}`, { credentials: "include" });
        if (!res.ok) return;
        const sessions = await res.json();
        const latest = Array.isArray(sessions) ? sessions[0] : null;
        if (!latest || cancelled) return;

        setSessionId(latest.id);
        const history = (latest.messages ?? []) as Array<{ role: string; content: string; timestamp?: string }>;
        setMessages(history.map((m, i) => ({
          id: `history-${latest.id}-${i}`,
          role: m.role === "user" ? "user" : "flo",
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        })));
      } catch {
        // A failed rehydrate is not worth surfacing — the athlete can still chat.
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Authenticated athletes go to /api/chat, which persists both turns and
      // loads their profile and history into the prompt. /api/landing-chat is
      // the anonymous preview only — it has no memory by design.
      const response = user
        ? await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: user.id,
              message: messageText.trim(),
              sessionId: sessionId ?? undefined,
            }),
          })
        : await fetch("/api/landing-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageText.trim() }),
          });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const floText: string = user ? data.response?.message : (data as FloResponse).message;
      if (user && data.session?.id) setSessionId(data.session.id);

      const floMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "flo",
        content: floText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, floMessage]);

      // Simple scroll to bottom
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }

    } catch (error: any) {
      // Simple error handling
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "flo",
        content: "I'm here to help with your mental game. Ask me about handling pressure, staying focused, or specific techniques like box breathing.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, sessionId]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage, isLoading]);

  // Sending relied on implicit form submission, which is not dependable on
  // mobile — a disabled default button suppresses it outright, and soft keyboards
  // vary in whether they emit it at all. Send explicitly instead. Shift+Enter
  // stays a newline, and isComposing keeps Enter out of IME candidate selection.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage, isLoading]);

  return (
    <Card className="w-full max-w-2xl mx-auto h-[650px] flex flex-col bg-white border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-red-50">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Chat with Flo</h3>
          <p className="text-sm text-gray-600">Your AI mental performance coach</p>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-600 py-8 bg-white rounded-lg border border-gray-200 mx-2">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-500 opacity-80" />
            <p className="text-lg font-medium text-gray-900">Hi! I'm Flo, your mental performance coach.</p>
            <p className="mt-3 mb-6 text-gray-600">Ask me about handling pressure, staying focused, or any mental game challenge.</p>
            <div className="flex flex-col gap-3 mt-6 max-w-lg mx-auto">
              {[
                "I missed a short putt and got frustrated. How do I recover?",
                "I'm feeling nervous before my next round. Help with pre-round anxiety?", 
                "What's the best breathing technique for pressure putts?",
                "Tell me about control circles and managing distractions"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs h-auto py-3 px-4 text-left leading-relaxed hover:bg-blue-50 whitespace-normal min-h-[44px]"
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] p-3 rounded-lg",
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 border"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            placeholder="Ask Flo about mental performance..."
            disabled={isLoading}
            className="flex-1"
            data-chat-input
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            data-chat-button
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}