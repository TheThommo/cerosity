import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StableChat } from "@/components/stable-chat";

// FLO, reachable from anywhere in the athlete app.
//
// The panel hosts StableChat — the same component /flo renders — so the bubble
// is a way in, not a second coach. It talks to /api/chat, resumes the athlete's
// existing session and carries the same memory. Anything that reimplemented the
// composer here would be a third brain with its own idea of who the athlete is.

const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 12;
/** Below this, a pointer that moved slightly is still a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;
const POSITION_KEY = "flo.bubble.position";

type Point = { x: number; y: number };

/** Real notch/home-indicator insets, read from the browser rather than guessed. */
function safeAreaInsets() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Keep the bubble reachable. This runs on every load and every resize, so a
 * position saved on a desktop monitor cannot strand the bubble off-screen on a
 * phone — the "reset if off-screen" case is just a clamp that always applies.
 */
function clampToViewport(point: Point): Point {
  const insets = safeAreaInsets();
  const minX = EDGE_MARGIN + insets.left;
  const minY = EDGE_MARGIN + insets.top;
  const maxX = Math.max(minX, window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN - insets.right);
  const maxY = Math.max(minY, window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN - insets.bottom);
  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY),
  };
}

function defaultPosition(): Point {
  const insets = safeAreaInsets();
  return {
    x: window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN - insets.right,
    y: window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN - insets.bottom,
  };
}

function loadPosition(): Point {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return defaultPosition();
    const saved = JSON.parse(raw);
    if (typeof saved?.x !== "number" || typeof saved?.y !== "number") return defaultPosition();
    return clampToViewport(saved);
  } catch {
    return defaultPosition();
  }
}

function savePosition(point: Point) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(point));
  } catch {
    // Private mode or a full quota. The bubble still works, it just forgets.
  }
}

export function FloatingChat() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [position, setPosition] = useState<Point | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const positionRef = useRef<Point | null>(null);

  // Measured after mount — window dimensions do not exist before it.
  useEffect(() => {
    setPosition(loadPosition());
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const reclamp = () => setPosition((p) => (p ? clampToViewport(p) : p));
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const current = positionRef.current;
    if (!current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - current.x,
      offsetY: e.clientY - current.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (!drag.moved) {
      const travelled = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (travelled < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
    }

    setPosition(clampToViewport({ x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY }));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;

    if (drag.moved) {
      setIsDragging(false);
      if (positionRef.current) savePosition(positionRef.current);
      return;
    }
    // Never moved: this was a tap.
    setIsOpen((open) => !open);
  }, []);

  // Every hook is above this line — the guards below must never gate them.
  // /flo already is the full chat; a second one floating over it would be two
  // views of one conversation fighting each other.
  if (!user || location === "/flo" || !position) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:right-4 sm:bottom-24 sm:w-[380px]">
          <div className="flex h-[70vh] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:h-[560px] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-red-50 px-4 py-3">
              <span className="font-semibold text-gray-900">Chat with FLO</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close FLO chat"
                className="rounded-full p-1 text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <StableChat isInlineWidget />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="Chat with FLO"
        aria-expanded={isOpen}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          left: position.x,
          top: position.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          // Without this a touch-drag scrolls the page instead of moving the bubble.
          touchAction: "none",
        }}
        className={
          "fixed z-40 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl " +
          "transition-transform hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 " +
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
          (isDragging ? "scale-105 cursor-grabbing" : "cursor-grab hover:scale-105")
        }
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
