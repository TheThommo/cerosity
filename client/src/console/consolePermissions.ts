export const CONSOLE_ROLE_HIERARCHY = ['owner', 'admin', 'support', 'read_only'] as const;
export type ConsoleRole = typeof CONSOLE_ROLE_HIERARCHY[number];

export interface ConsoleNavVisibility {
  commandCenter: boolean;
  users: boolean;
  subscriptions: boolean;
  coachingData: boolean;
  floChat: boolean;
  analytics: boolean;
  dbExplorer: boolean;
  settings: boolean;
  support: boolean;
}

function roleLevel(role: string): number {
  const idx = (CONSOLE_ROLE_HIERARCHY as readonly string[]).indexOf(role);
  return idx === -1 ? CONSOLE_ROLE_HIERARCHY.length : idx;
}

export function hasMinLevel(userRole: string, requiredRole: ConsoleRole): boolean {
  return roleLevel(userRole) <= roleLevel(requiredRole);
}

export function consoleNav(role: string): ConsoleNavVisibility {
  return {
    commandCenter: hasMinLevel(role, 'read_only'),
    users: hasMinLevel(role, 'support'),
    subscriptions: hasMinLevel(role, 'admin'),
    coachingData: hasMinLevel(role, 'support'),
    floChat: hasMinLevel(role, 'admin'),
    analytics: hasMinLevel(role, 'read_only'),
    dbExplorer: hasMinLevel(role, 'owner'),
    settings: hasMinLevel(role, 'admin'),
    support: hasMinLevel(role, 'support'),
  };
}

export function appRoleToConsoleRole(appRole: string): ConsoleRole {
  if (appRole === 'admin') return 'owner';
  if (appRole === 'coach') return 'support';
  return 'read_only';
}
