import { cn } from "@/lib/utils";

interface FloAvatarProps {
  size?: number;
  variant?: 'default' | 'mini';
  animated?: boolean;
  className?: string;
}

export function FloAvatar({ size = 40, variant = 'default', animated = true, className }: FloAvatarProps) {
  const id = variant === 'mini' ? 'flo-m' : 'flo-d';

  if (variant === 'mini') {
    return (
      <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
        {animated && (
          <div
            className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
            style={{ animationDuration: '3s' }}
          />
        )}
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#6366F1" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
            <radialGradient id={`${id}-skin`} cx="0.5" cy="0.4" r="0.5">
              <stop stopColor="#FDDCBD" />
              <stop offset="1" stopColor="#F4BA8A" />
            </radialGradient>
          </defs>

          <circle cx="24" cy="24" r="24" fill={`url(#${id}-bg)`} />

          {/* Hair volume */}
          <ellipse cx="24" cy="17" rx="13" ry="11" fill="#2C1810" />
          <ellipse cx="24" cy="16" rx="12" ry="10" fill="#3D2317" />
          {/* Side swept fringe */}
          <path d="M13 16c2-6 6-9 11-10 3-0.5 6 0 8 1.5" stroke="#4A2E1C" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M14 18c1-4 4-7 8-8" stroke="#5C3A24" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* Face */}
          <ellipse cx="24" cy="22" rx="9.5" ry="10.5" fill={`url(#${id}-skin)`} />

          {/* Eyes — large, expressive */}
          <ellipse cx="20.5" cy="21.5" rx="2" ry="2.4" fill="#1a1a2e" />
          <ellipse cx="27.5" cy="21.5" rx="2" ry="2.4" fill="#1a1a2e" />
          {/* Iris color */}
          <ellipse cx="20.5" cy="21.8" rx="1.4" ry="1.6" fill="#2563EB" />
          <ellipse cx="27.5" cy="21.8" rx="1.4" ry="1.6" fill="#2563EB" />
          {/* Pupil */}
          <circle cx="20.5" cy="21.8" r="0.8" fill="#0f172a" />
          <circle cx="27.5" cy="21.8" r="0.8" fill="#0f172a" />
          {/* Eye shine */}
          <circle cx="21.2" cy="20.8" r="0.7" fill="white" opacity="0.9" />
          <circle cx="28.2" cy="20.8" r="0.7" fill="white" opacity="0.9" />
          <circle cx="20" cy="22.4" r="0.35" fill="white" opacity="0.5" />
          <circle cx="27" cy="22.4" r="0.35" fill="white" opacity="0.5" />

          {/* Eyelashes — flirty */}
          <path d="M18 19.5c0.5-0.8 1.5-1.2 2.5-1.2s2 0.4 2.5 1.2" stroke="#1a1a2e" strokeWidth="0.6" strokeLinecap="round" fill="none" />
          <path d="M25 19.5c0.5-0.8 1.5-1.2 2.5-1.2s2 0.4 2.5 1.2" stroke="#1a1a2e" strokeWidth="0.6" strokeLinecap="round" fill="none" />

          {/* Playful smile */}
          <path d="M20 26.5c1.5 2 6.5 2 8 0" stroke="#C0533A" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* Slight teeth */}
          <path d="M21.5 26.5c1 0.8 4 0.8 5 0" fill="white" opacity="0.85" />

          {/* Blush */}
          <circle cx="17.5" cy="24.5" r="2" fill="#FF9B8A" opacity="0.25" />
          <circle cx="30.5" cy="24.5" r="2" fill="#FF9B8A" opacity="0.25" />

          {/* Athletic top peek */}
          <path d="M15 35c0-3 4-5 9-5s9 2 9 5v13H15v-13z" fill="#3B82F6" />
          <path d="M21 30l3 2 3-2" stroke="white" strokeWidth="0.7" fill="none" opacity="0.7" />

          {/* Animated blink overlay */}
          {animated && (
            <g className="animate-blink">
              <ellipse cx="20.5" cy="21.5" rx="2.2" ry="0.3" fill={`url(#${id}-skin)`} opacity="0" />
              <ellipse cx="27.5" cy="21.5" rx="2.2" ry="0.3" fill={`url(#${id}-skin)`} opacity="0" />
            </g>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      {animated && (
        <>
          <div
            className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-blue-500/30 blur-sm animate-pulse"
            style={{ animationDuration: '3s' }}
          />
          <div
            className="absolute inset-[-2px] rounded-full border border-blue-400/30 animate-spin"
            style={{ animationDuration: '8s' }}
          />
        </>
      )}
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 rounded-full">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="96" y2="96">
            <stop stopColor="#1E293B" />
            <stop offset="0.5" stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E1B4B" />
          </linearGradient>
          <radialGradient id={`${id}-skin`} cx="0.45" cy="0.35" r="0.55">
            <stop stopColor="#FDDCBD" />
            <stop offset="0.7" stopColor="#F4BA8A" />
            <stop offset="1" stopColor="#E8A676" />
          </radialGradient>
          <linearGradient id={`${id}-hair`} x1="30" y1="8" x2="55" y2="45">
            <stop stopColor="#3D2317" />
            <stop offset="0.6" stopColor="#2C1810" />
            <stop offset="1" stopColor="#1a0f0a" />
          </linearGradient>
          <linearGradient id={`${id}-top`} x1="28" y1="62" x2="68" y2="96">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id={`${id}-highlight`} x1="35" y1="10" x2="60" y2="30">
            <stop stopColor="#6B3A26" stopOpacity="0.6" />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Background */}
        <circle cx="48" cy="48" r="48" fill={`url(#${id}-bg)`} />

        {/* Hair — flowing, voluminous */}
        <ellipse cx="48" cy="26" rx="20" ry="17" fill={`url(#${id}-hair)`} />
        {/* Hair volume top */}
        <ellipse cx="48" cy="24" rx="18" ry="15" fill="#3D2317" />
        {/* Flowing side strands */}
        <path d="M30 28c-2 4-3 10-2 16 0.5 3 1 5 2 7" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M31 29c-1.5 3.5-2.5 9-1.5 14" stroke="#3D2317" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Ponytail flowing right */}
        <path d="M62 24c5 3 9 8 11 15 2 6 1 13-1 18" stroke="#2C1810" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M63 26c4 2.5 7.5 7 9.5 13 1.5 5 0.5 11-0.5 15" stroke="#3D2317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M64 28c3 2 6 5 8 10" stroke="#4A2E1C" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* Side-swept fringe with texture */}
        <path d="M32 24c3-7 8-12 16-13 4-0.5 8 0.5 10 2" stroke="#4A2E1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M34 27c2-5 5-8 10-9" stroke="#5C3A24" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* Hair highlight shimmer */}
        <path d="M38 15c3-1 7-1 10 0" stroke="#8B5E4B" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
        <path d="M40 18c2-0.5 5-0.5 7 0" stroke="#A07060" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />

        {/* Face */}
        <ellipse cx="48" cy="40" rx="16" ry="18" fill={`url(#${id}-skin)`} />

        {/* Jawline definition */}
        <path d="M35 48c3 6 8 9 13 9.5s10-3 13-9" stroke="#D4956B" strokeWidth="0.5" fill="none" opacity="0.3" />

        {/* Eyebrows — expressive, groomed */}
        <path d="M36 32c1.5-1.8 4-2.8 6.5-2.2" stroke="#3D2317" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M60 32c-1.5-1.8-4-2.8-6.5-2.2" stroke="#3D2317" strokeWidth="1.4" strokeLinecap="round" />

        {/* Eyes — large, bright, slightly tilted for playfulness */}
        {/* Left eye */}
        <ellipse cx="41" cy="37" rx="3.5" ry="4" fill="white" />
        <ellipse cx="41" cy="37.5" rx="2.8" ry="3.2" fill="#1E40AF" />
        <ellipse cx="41" cy="37.8" rx="2" ry="2.3" fill="#1a1a2e" />
        <circle cx="42" cy="36.5" r="1.1" fill="white" opacity="0.9" />
        <circle cx="40" cy="38.5" r="0.5" fill="white" opacity="0.5" />
        {/* Right eye */}
        <ellipse cx="55" cy="37" rx="3.5" ry="4" fill="white" />
        <ellipse cx="55" cy="37.5" rx="2.8" ry="3.2" fill="#1E40AF" />
        <ellipse cx="55" cy="37.8" rx="2" ry="2.3" fill="#1a1a2e" />
        <circle cx="56" cy="36.5" r="1.1" fill="white" opacity="0.9" />
        <circle cx="54" cy="38.5" r="0.5" fill="white" opacity="0.5" />

        {/* Eyelashes — longer, feminine */}
        <path d="M37 33.5c1-1.2 2.5-1.8 4-1.8s3 0.6 4 1.8" stroke="#1a0f0a" strokeWidth="0.9" strokeLinecap="round" fill="none" />
        <path d="M51 33.5c1-1.2 2.5-1.8 4-1.8s3 0.6 4 1.8" stroke="#1a0f0a" strokeWidth="0.9" strokeLinecap="round" fill="none" />
        {/* Bottom lash line */}
        <path d="M38.5 40.5c0.8 0.5 2 0.8 3 0.6" stroke="#1a0f0a" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M53 40.5c0.8 0.5 2 0.8 3 0.6" stroke="#1a0f0a" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* Nose — subtle, feminine */}
        <path d="M47 42c0.5 1.5 1 2 2 2" stroke="#D4956B" strokeWidth="0.8" strokeLinecap="round" fill="none" />

        {/* Smile — confident, slightly cheeky */}
        <path d="M40 48c2.5 3.5 12.5 3.5 15 0" stroke="#B8433A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Teeth */}
        <path d="M42 48c2 1.8 9 1.8 11 0" fill="white" opacity="0.9" />
        {/* Lower lip hint */}
        <path d="M42 51c2 1 9 1 11 0" stroke="#C75A50" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* Blush — warm, inviting */}
        <ellipse cx="34" cy="43" rx="3.5" ry="2.5" fill="#FF8A7A" opacity="0.2" />
        <ellipse cx="62" cy="43" rx="3.5" ry="2.5" fill="#FF8A7A" opacity="0.2" />

        {/* Neck */}
        <path d="M42 57c1 1 3 1.5 6 1.5s5-0.5 6-1.5" fill="#F0C9A8" />
        <rect x="43" y="56" width="10" height="6" rx="2" fill="#EEBB96" />

        {/* Athletic top — zip-up coaching jacket */}
        <path d="M28 74c0-8 8-13 20-13s20 5 20 13v22H28v-22z" fill={`url(#${id}-top)`} />
        {/* Zip line */}
        <line x1="48" y1="62" x2="48" y2="96" stroke="white" strokeWidth="0.8" opacity="0.5" />
        {/* Collar */}
        <path d="M40 62c2-2 4-3 8-3s6 1 8 3" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M42 61l6 4 6-4" stroke="white" strokeWidth="1.2" fill="none" opacity="0.6" />
        {/* Shoulder seam */}
        <path d="M33 68c2-3 5-4 8-5" stroke="white" strokeWidth="0.4" fill="none" opacity="0.2" />
        <path d="M63 68c-2-3-5-4-8-5" stroke="white" strokeWidth="0.4" fill="none" opacity="0.2" />

        {/* Animated eye blink */}
        {animated && (
          <g className="animate-blink">
            <ellipse cx="41" cy="37" rx="3.8" ry="0.5" fill="#F4BA8A" opacity="0" />
            <ellipse cx="55" cy="37" rx="3.8" ry="0.5" fill="#F4BA8A" opacity="0" />
          </g>
        )}
      </svg>
    </div>
  );
}
