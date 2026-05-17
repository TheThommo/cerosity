import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Vapi from "@vapi-ai/web";

type CallStatus = "idle" | "connecting" | "active" | "ending";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "";

const FLO_ASSISTANT_CONFIG = {
  name: "FLO",
  model: {
    provider: "openai" as const,
    model: "gpt-4o",
    messages: [
      {
        role: "system" as const,
        content: `You are FLO, the Red2Blue AI mental performance coach. You are stern yet empathetic, with light humor when appropriate.

PERSONALITY:
- Direct and no-nonsense. You don't sugarcoat. If someone is making excuses, you call it out firmly but with care.
- Empathetic — you understand the struggle, you've "seen it all." You validate feelings but don't let people wallow.
- Light humor — you use brief, dry wit to defuse tension. Never sarcastic or mocking.
- You speak like a respected coach who genuinely cares but demands accountability.
- Short, punchy sentences. No rambling. Every word earns its place.

VOICE STYLE:
- Keep responses concise (2-4 sentences max for voice).
- Use conversational language — no jargon, no corporate speak.
- Ask one focused question at a time.
- When someone is spiraling, ground them immediately with a technique.

RED2BLUE METHODOLOGY:
- Red Head = reactive, stressed, "I can't" thinking
- Blue Head = focused, confident, "do it" thinking
- Techniques: Box Breathing (4-4-4-4), Control Circles (focus on what you control), Pre-Performance Routine (25 seconds), 3-2-1 Focus Reset
- Performance Equation: Performance = Structure + Skillset + Mindset
- CIA Framework: Clarity (know what you want), Intensity (commit fully), Accuracy (execute precisely)
- STUCK model: Stop, Think, Understand, Choose, Know-how

RULES:
- Never diagnose mental health conditions.
- If someone mentions self-harm or crisis, direct them to appropriate helplines immediately.
- You coach ALL sports and high-performance domains, not just golf.
- Always bring it back to actionable next steps.`
      }
    ]
  },
  voice: {
    provider: "11labs" as const,
    voiceId: "21m00Tcm4TlvDq8ikWAM"
  },
  firstMessage: "Hey. I'm FLO, your mental performance coach. What's going on — what are you working through right now?",
  endCallMessage: "Good chat. Remember — you control your next move. Go make it count.",
};

export function FloVoicePTT({ compact = false }: { compact?: boolean }) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setCallStatus("active");
      setTranscript([]);
    });

    vapi.on("call-end", () => {
      setCallStatus("idle");
      setIsSpeaking(false);
      setVolumeLevel(0);
    });

    vapi.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapi.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapi.on("volume-level", (level: number) => {
      setVolumeLevel(level);
    });

    vapi.on("message", (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const prefix = message.role === "assistant" ? "FLO" : "You";
        setTranscript(prev => [...prev.slice(-6), `${prefix}: ${message.transcript}`]);
      }
    });

    vapi.on("error", (error: any) => {
      console.error("[FLO-VOICE] Error:", error);
      setCallStatus("idle");
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current || !VAPI_PUBLIC_KEY) return;
    setCallStatus("connecting");
    try {
      await vapiRef.current.start(FLO_ASSISTANT_CONFIG as any);
    } catch (err) {
      console.error("[FLO-VOICE] Start error:", err);
      setCallStatus("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    if (!vapiRef.current) return;
    setCallStatus("ending");
    vapiRef.current.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const newMuted = !isMuted;
    vapiRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleCall = useCallback(() => {
    if (callStatus === "idle") {
      startCall();
    } else if (callStatus === "active") {
      endCall();
    }
  }, [callStatus, startCall, endCall]);

  if (!VAPI_PUBLIC_KEY) {
    return null;
  }

  if (compact) {
    return (
      <button
        onClick={toggleCall}
        disabled={callStatus === "connecting" || callStatus === "ending"}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
          "shadow-lg hover:shadow-xl transform hover:scale-105",
          callStatus === "idle" && "bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600",
          callStatus === "connecting" && "bg-yellow-500 animate-pulse",
          callStatus === "active" && "bg-red-500 hover:bg-red-600",
          callStatus === "ending" && "bg-gray-400"
        )}
      >
        {callStatus === "active" ? (
          <PhoneOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
        {callStatus === "active" && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main PTT Button */}
      <div className="relative">
        {callStatus === "active" && (
          <>
            <div className="absolute inset-0 w-36 h-36 -m-4 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-0 w-32 h-32 -m-2 rounded-full bg-blue-500/20 animate-pulse" />
          </>
        )}

        {callStatus === "active" && (
          <div
            className="absolute inset-0 rounded-full border-4 border-blue-400/60 transition-transform duration-75"
            style={{
              transform: `scale(${1 + volumeLevel * 0.3})`,
              width: "128px",
              height: "128px",
              margin: "-4px"
            }}
          />
        )}

        <button
          onClick={toggleCall}
          disabled={callStatus === "connecting" || callStatus === "ending"}
          className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-2xl transform active:scale-95",
            callStatus === "idle" && "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-600 hover:scale-105",
            callStatus === "connecting" && "bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse",
            callStatus === "active" && "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500",
            callStatus === "ending" && "bg-gray-400 cursor-not-allowed"
          )}
        >
          {callStatus === "idle" && <Mic className="w-10 h-10 text-white" />}
          {callStatus === "connecting" && <Phone className="w-10 h-10 text-white animate-bounce" />}
          {callStatus === "active" && <PhoneOff className="w-10 h-10 text-white" />}
          {callStatus === "ending" && <MicOff className="w-10 h-10 text-white" />}
        </button>
      </div>

      {/* Status */}
      <div className="text-center">
        {callStatus === "idle" && (
          <p className="text-sm font-medium text-gray-400">Tap to talk with FLO</p>
        )}
        {callStatus === "connecting" && (
          <p className="text-sm font-medium text-yellow-400 animate-pulse">Connecting...</p>
        )}
        {callStatus === "active" && (
          <div className="flex items-center gap-2">
            {isSpeaking && <Volume2 className="w-4 h-4 text-blue-400 animate-pulse" />}
            <p className="text-sm font-medium text-green-400">
              {isSpeaking ? "FLO is speaking..." : "Listening..."}
            </p>
          </div>
        )}
        {callStatus === "ending" && (
          <p className="text-sm font-medium text-gray-500">Ending call...</p>
        )}
      </div>

      {callStatus === "active" && (
        <button
          onClick={toggleMute}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
          )}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
      )}

      {transcript.length > 0 && callStatus === "active" && (
        <div className="w-full max-w-sm bg-gray-900/50 backdrop-blur rounded-lg p-3 border border-gray-700/50 max-h-32 overflow-y-auto">
          {transcript.map((line, i) => (
            <p key={i} className={cn(
              "text-xs leading-relaxed",
              line.startsWith("FLO") ? "text-blue-300" : "text-gray-400"
            )}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
