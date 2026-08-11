import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";
import { ErrorBoundary, ChatErrorFallback } from "@/components/error-boundary";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface LandingChatProps {
  isInlineWidget?: boolean;
}

function ChatComponent({ isInlineWidget = false }: LandingChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Hi! I'm Flo, your AI mental performance coach. Ask me about handling pressure, improving focus, or any mental game challenge you're facing on the course.",
      timestamp: Date.now()
    }
  ]);
  
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(isInlineWidget);
  const [isLoading, setIsLoading] = useState(false);
  const [creditCount, setCreditCount] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Signed-in athletes get their real conversation back from Postgres. Without
  // this the widget opens on the canned greeting every refresh, which is the
  // opposite of the memory the product promises.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/chat/sessions/${user.id}`, { credentials: 'include' });
        if (!res.ok) return;
        const sessions = await res.json();
        const latest = Array.isArray(sessions) ? sessions[0] : null;
        const history = (latest?.messages ?? []) as Array<{ role: string; content: string; timestamp?: string }>;
        if (cancelled || !history.length) return;

        setSessionId(latest.id);
        setMessages(history.map((m, i) => ({
          id: `history-${latest.id}-${i}`,
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
          timestamp: m.timestamp ? Date.parse(m.timestamp) : Date.now(),
        })));
      } catch {
        // Rehydrate is best-effort; the athlete can still chat without it.
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Auto-scroll to bottom of chat container when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      id: `${message.role}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...message
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || isLoading) return;
    
    // The anonymous preview is credit-limited. Signed-in athletes are limited
    // server-side by their tier instead, so this counter does not apply to them.
    if (!user && creditCount >= 5) {
      addMessage({
        role: 'assistant',
        content: "You've used your 5 free credits! Sign up to keep using Flo and unlock personalized coaching, assessments, and unlimited conversations."
      });
      return;
    }

    // Clear input and update state
    setInput("");
    setIsLoading(true);
    if (!user) setCreditCount(prev => prev + 1);

    // Add user message
    addMessage({
      role: 'user',
      content: messageText
    });

    // Make API call
    try {
      // Signed in → /api/chat, which persists both turns and feeds the athlete's
      // profile and history into the prompt. Anonymous → the preview endpoint.
      const response = user
        ? await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              userId: user.id,
              message: messageText,
              sessionId: sessionId ?? undefined,
            }),
          })
        : await fetch('/api/landing-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText }),
          });

      if (response.ok) {
        const data = await response.json();
        if (user && data.session?.id) setSessionId(data.session.id);
        addMessage({
          role: 'assistant',
          content: (user ? data.response?.message : data.message)
            || "I'm here to help with your mental game. What specific challenge are you facing on the course?"
        });
      } else {
        addMessage({
          role: 'assistant',
          content: "I'm here to help with your mental game. What specific challenge are you facing on the course?"
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: "I'm here to help with your mental game. What specific challenge are you facing on the course?"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const setPrompt = (prompt: string) => {
    setInput(prompt);
  };

  // Main chat content
  const chatContent = (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 border'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800 border">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="text-sm">Flo is thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        {creditCount >= 4 && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {5 - creditCount} credit{5 - creditCount !== 1 ? 's' : ''} remaining
          </div>
        )}
        
        {/* Suggestion prompts */}
        {messages.length === 1 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs text-gray-500 text-center">Try asking about:</p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setPrompt("I get nervous on the first tee. My heart races and I overthink every aspect of my swing. How can I stay calm?")}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 transition-colors"
                disabled={creditCount >= 5 || isLoading}
              >
                First tee nerves
              </button>
              <button 
                onClick={() => setPrompt("I keep missing putts under pressure. My hands get shaky and I second-guess my read. What can I do?")}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 transition-colors"
                disabled={creditCount >= 5 || isLoading}
              >
                Missed putts
              </button>
              <button 
                onClick={() => setPrompt("When I'm in contention, I start thinking about the outcome instead of the shot. How do I stay present?")}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 transition-colors"
                disabled={creditCount >= 5 || isLoading}
              >
                Pressure situations
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              creditCount >= 5 
                ? "Sign up to continue..."
                : "Ask about mental game challenges..."
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={creditCount >= 5 || isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || creditCount >= 5 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );

  // Inline widget version
  if (isInlineWidget) {
    return (
      <Card className="w-full h-full flex flex-col shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <CerosityLogo size={16} />
            </div>
            <div>
              <CardTitle className="text-lg">Chat with Flo</CardTitle>
              <p className="text-sm text-blue-100">Your AI Mental Performance Coach</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          {chatContent}
        </CardContent>
      </Card>
    );
  }

  // Floating widget version
  return (
    <>
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 shadow-lg z-50"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}

      {isExpanded && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <CerosityLogo size={16} />
            </div>
                <div>
                  <CardTitle className="text-lg">Chat with Flo</CardTitle>
                  <p className="text-sm text-blue-100">Your AI Mental Performance Coach</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="text-white hover:bg-white/20"
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-100px)]">
            {chatContent}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function LandingChatStableV2({ isInlineWidget = false }: LandingChatProps) {
  return (
    <ErrorBoundary fallback={ChatErrorFallback}>
      <ChatComponent isInlineWidget={isInlineWidget} />
    </ErrorBoundary>
  );
}