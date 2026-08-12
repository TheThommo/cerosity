import { MessageCircle } from "lucide-react";
import { StableChat } from "@/components/stable-chat";
import { FloVoicePTT } from "@/components/flo-voice-ptt";

/**
 * The always-on coach surface. Every FLO entry point on a phone — the bottom
 * nav and the curriculum FAB — lands here, so FLO is never more than one tap
 * away from wherever an athlete already is.
 *
 * Text and voice sit on the same page on purpose: both talk to the same
 * Cerosity brain and the same conversation, so an athlete can start typing and
 * finish out loud without losing the thread.
 */
export default function Flo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">

          <div className="mb-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <MessageCircle size={20} />
              <span className="text-sm font-semibold uppercase tracking-wide">Your AI Coach</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">FLO</h1>
            <p className="text-gray-600 mt-1">
              Type or hold to talk. FLO remembers what you've worked on.
            </p>
          </div>

          <div className="mb-4">
            <FloVoicePTT compact />
          </div>

          <StableChat />
        </div>
      </div>
    </div>
  );
}
