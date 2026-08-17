import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Vapi from "@vapi-ai/web";

type CallStatus = "idle" | "connecting" | "active" | "ending";

// Build-time values (baked by Vite). May be empty if Railway didn't have them at build.
let VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "";
let VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || "";

// Runtime fallback — fetch from server if build-time vars are missing
let _configFetched = false;
async function ensureVapiConfig(): Promise<{ publicKey: string; assistantId: string }> {
  if (VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID) {
    return { publicKey: VAPI_PUBLIC_KEY, assistantId: VAPI_ASSISTANT_ID };
  }
  if (_configFetched) {
    return { publicKey: VAPI_PUBLIC_KEY, assistantId: VAPI_ASSISTANT_ID };
  }
  try {
    const res = await fetch("/api/public-config");
    if (res.ok) {
      const data = await res.json();
      if (data.vapiPublicKey) VAPI_PUBLIC_KEY = data.vapiPublicKey;
      if (data.vapiAssistantId) VAPI_ASSISTANT_ID = data.vapiAssistantId;
    }
  } catch { /* best-effort */ }
  _configFetched = true;
  return { publicKey: VAPI_PUBLIC_KEY, assistantId: VAPI_ASSISTANT_ID };
}

// NOTE: No inline assistant config / system prompt here by design.
// FLO has ONE brain — Cerosity. The VAPI assistant (custom-llm provider) calls
// back into the server for every reply. The client only starts the call by
// assistant ID; it never defines coaching behaviour.

export function FloVoicePTT({ compact = false }: { compact?: boolean }) {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  const [configReady, setConfigReady] = useState(!!VAPI_PUBLIC_KEY);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const cfg = await ensureVapiConfig();
      if (cancelled || !cfg.publicKey) return;
      if (vapiRef.current) return; // already initialised

      const vapi = new Vapi(cfg.publicKey);
      vapiRef.current = vapi;
      setConfigReady(true);
      setupListeners(vapi);
    }

    function setupListeners(vapi: Vapi) {
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
      toast({
        title: "Voice Connection Failed",
        description: error?.message || "Could not connect to FLO voice. Try again.",
        variant: "destructive",
      });
    });
    } // end setupListeners

    init();

    return () => {
      cancelled = true;
      vapiRef.current?.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) return;
    // FLO's brain lives server-side. We only start the call by assistant ID;
    // there is no inline fallback (that would be a second brain).
    if (!VAPI_ASSISTANT_ID) {
      setCallStatus("idle");
      toast({
        title: "Voice unavailable",
        description: "FLO voice isn't configured right now. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    setCallStatus("connecting");
    try {
      // Ask the server to vouch for who is calling. It only answers for a
      // signed-in athlete, and the token is what lets the custom-LLM bridge
      // attach their history to this call. Anonymous callers simply get no
      // token and are coached without memory — never a reason to block a call.
      let voiceToken: string | undefined;
      try {
        const res = await fetch("/api/flo/voice-token", { credentials: "include" });
        if (res.ok) voiceToken = (await res.json()).token;
      } catch { /* best-effort: proceed without memory */ }

      await vapiRef.current.start(
        VAPI_ASSISTANT_ID,
        voiceToken ? { metadata: { voiceToken } } : undefined
      );
    } catch (err: any) {
      console.error("[FLO-VOICE] Start error:", err);
      setCallStatus("idle");
      toast({
        title: "Voice Connection Failed",
        description: err?.message || "Could not start FLO voice call. Check microphone permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

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
      let visitor = { name: "", email: "", sport: "" };
      try {
        const saved = sessionStorage.getItem("cerosity_visitor");
        if (saved) visitor = JSON.parse(saved);
      } catch {}

      if (visitor.name && visitor.email) {
        fetch("/api/capture-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: visitor.email, name: visitor.name, sportIndustry: visitor.sport, source: "Voice Call" }),
        }).catch(() => {});
        startCall();
      } else {
        startCall();
      }
    } else if (callStatus === "active") {
      endCall();
    }
  }, [callStatus, endCall, startCall]);

  if (!configReady) {
    return (
      <div className="relative group">
        <button type="button" disabled aria-label="Voice coaching unavailable" className={cn("relative w-16 h-16 rounded-full flex items-center justify-center bg-slate-700 opacity-50 cursor-not-allowed")}>
          <MicOff className="w-6 h-6 text-slate-400" />
        </button>
        <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded whitespace-nowrap">Voice unavailable</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={toggleCall}
          disabled={callStatus === "connecting" || callStatus === "ending"}
          // Icon-only, so without this the control announces as just "button".
          aria-label={callStatus === "active" ? "End voice call with FLO" : "Talk to FLO"}
          className={cn(
            "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-lg hover:shadow-xl transform hover:scale-105",
            callStatus === "idle" && "bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600",
            callStatus === "connecting" && "bg-yellow-500 animate-pulse",
            callStatus === "active" && "bg-red-500 hover:bg-red-600",
            callStatus === "ending" && "bg-slate-400"
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
      </div>
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
          type="button"
          onClick={toggleCall}
          disabled={callStatus === "connecting" || callStatus === "ending"}
          className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-2xl transform active:scale-95",
            callStatus === "idle" && "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-600 hover:scale-105",
            callStatus === "connecting" && "bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse",
            callStatus === "active" && "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500",
            callStatus === "ending" && "bg-slate-400 cursor-not-allowed"
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
          <p className="text-sm font-medium text-slate-400">Tap to talk with FLO</p>
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
          <p className="text-sm font-medium text-slate-500">Ending call...</p>
        )}
      </div>

      {callStatus === "active" && (
        <button
          onClick={toggleMute}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
          )}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
      )}

      {transcript.length > 0 && callStatus === "active" && (
        <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur rounded-lg p-3 border border-slate-700/50 max-h-32 overflow-y-auto">
          {transcript.map((line, i) => (
            <p key={i} className={cn(
              "text-xs leading-relaxed",
              line.startsWith("FLO") ? "text-blue-300" : "text-slate-400"
            )}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
