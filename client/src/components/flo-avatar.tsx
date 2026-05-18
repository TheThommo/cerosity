import { cn } from "@/lib/utils";

interface FloAvatarProps {
  size?: number;
  variant?: 'default' | 'mini';
  animated?: boolean;
  className?: string;
}

export function FloAvatar({ size = 40, variant = 'default', animated = true, className }: FloAvatarProps) {
  const isMini = variant === 'mini';

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {animated && !isMini && (
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
      {animated && isMini && (
        <div
          className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
          style={{ animationDuration: '3s' }}
        />
      )}
      <img
        src="/flo/avatar.png"
        alt="FLO"
        width={size}
        height={size}
        className="relative z-10 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
