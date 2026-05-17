interface FloAvatarProps {
  size?: number;
  variant?: 'default' | 'mini';
}

export function FloAvatar({ size = 40, variant = 'default' }: FloAvatarProps) {
  if (variant === 'mini') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="url(#flo-mini-bg)" />
        <defs>
          <linearGradient id="flo-mini-bg" x1="0" y1="0" x2="40" y2="40">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        {/* Hair */}
        <ellipse cx="20" cy="14" rx="10" ry="9" fill="#1E293B" />
        <path d="M10 14c0-2 1-6 4-8 2-1.5 4-1.5 6-1.5s4 0 6 1.5c3 2 4 6 4 8" fill="#1E293B" />
        <path d="M10 15c-1 3-1 6 0 8" stroke="#334155" strokeWidth="0.5" fill="none" />
        <path d="M30 15c1 3 1 6 0 8" stroke="#334155" strokeWidth="0.5" fill="none" />
        {/* Face */}
        <ellipse cx="20" cy="18" rx="8" ry="9" fill="#F8D5B8" />
        {/* Eyes */}
        <ellipse cx="16.5" cy="17" rx="1.5" ry="1.8" fill="#1E293B" />
        <ellipse cx="23.5" cy="17" rx="1.5" ry="1.8" fill="#1E293B" />
        <circle cx="17" cy="16.5" r="0.5" fill="white" />
        <circle cx="24" cy="16.5" r="0.5" fill="white" />
        {/* Warm smile */}
        <path d="M16 22c1.5 2 5.5 2 7 0" stroke="#C4785A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Subtle blush */}
        <circle cx="14" cy="20" r="2" fill="#FFB4A2" opacity="0.3" />
        <circle cx="26" cy="20" r="2" fill="#FFB4A2" opacity="0.3" />
        {/* Neck */}
        <rect x="17" y="26" width="6" height="3" rx="1" fill="#F0C9A8" />
        {/* Athletic top */}
        <path d="M12 32c0-3 3-5 8-5s8 2 8 5v8H12v-8z" fill="#3B82F6" />
        <path d="M17 27l3 2 3-2" stroke="white" strokeWidth="0.8" fill="none" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background gradient circle */}
      <circle cx="40" cy="40" r="40" fill="url(#flo-bg)" />
      <defs>
        <linearGradient id="flo-bg" x1="0" y1="0" x2="80" y2="80">
          <stop stopColor="#1E3A5F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="flo-hair" x1="20" y1="8" x2="40" y2="35">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="flo-top" x1="24" y1="52" x2="56" y2="80">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      {/* Hair - flowing, athletic ponytail style */}
      <ellipse cx="40" cy="22" rx="16" ry="14" fill="url(#flo-hair)" />
      {/* Ponytail */}
      <path d="M52 18c4 2 8 6 10 12 2 7 0 14-3 18" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M53 19c3 2 7 5 9 11 1.5 6 0 12-2 16" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Blue highlights in hair */}
      <path d="M28 16c2-3 6-5 12-5" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M30 20c2-2 5-4 10-4" stroke="#6366F1" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />

      {/* Face */}
      <ellipse cx="40" cy="34" rx="14" ry="16" fill="#F8D5B8" />

      {/* Eyes - confident, warm */}
      <ellipse cx="34" cy="32" rx="2.5" ry="3" fill="#1E293B" />
      <ellipse cx="46" cy="32" rx="2.5" ry="3" fill="#1E293B" />
      {/* Eye shine */}
      <circle cx="35" cy="31" r="1" fill="white" />
      <circle cx="47" cy="31" r="1" fill="white" />
      {/* Eyebrows - confident arch */}
      <path d="M30 28c1.5-1.5 3.5-2 5.5-1.5" stroke="#4A3728" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M50 28c-1.5-1.5-3.5-2-5.5-1.5" stroke="#4A3728" strokeWidth="1.2" strokeLinecap="round" />

      {/* Warm confident smile */}
      <path d="M33 40c2.5 3.5 9.5 3.5 12 0" stroke="#C4785A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Teeth hint */}
      <path d="M35 40c1.5 1.5 6.5 1.5 8 0" fill="white" opacity="0.8" />

      {/* Blush */}
      <circle cx="28" cy="37" r="3.5" fill="#FFB4A2" opacity="0.25" />
      <circle cx="52" cy="37" r="3.5" fill="#FFB4A2" opacity="0.25" />

      {/* Neck */}
      <rect x="35" y="49" width="10" height="5" rx="2" fill="#F0C9A8" />

      {/* Athletic coaching top */}
      <path d="M24 62c0-6 6-10 16-10s16 4 16 10v18H24V62z" fill="url(#flo-top)" />
      {/* V-neck line */}
      <path d="M35 52l5 5 5-5" stroke="white" strokeWidth="1.2" fill="none" opacity="0.6" />
      {/* Collar detail */}
      <path d="M30 55c3-2 6-3 10-3s7 1 10 3" stroke="white" strokeWidth="0.5" fill="none" opacity="0.3" />
    </svg>
  );
}
