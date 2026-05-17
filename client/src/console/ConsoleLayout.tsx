import React, { Suspense, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useConsoleTheme } from './ConsoleThemeProvider';
import { consoleNav } from './consolePermissions';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { ImpersonationBanner } from './ImpersonationBanner';

interface NavItem {
  label: string;
  path: string;
  group: string;
  key: keyof ReturnType<typeof consoleNav>;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', path: '/console', group: 'Overview', key: 'commandCenter', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Analytics', path: '/console/analytics', group: 'Overview', key: 'analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Users', path: '/console/users', group: 'People', key: 'users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Support', path: '/console/support', group: 'People', key: 'support', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Subscriptions', path: '/console/subscriptions', group: 'Business', key: 'subscriptions', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'FLO Chat', path: '/console/flo', group: 'Business', key: 'floChat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { label: 'FLO Brain', path: '/console/flo-brain', group: 'Business', key: 'floBrain', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { label: 'Coaching Data', path: '/console/coaching', group: 'Business', key: 'coachingData', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { label: 'DB Explorer', path: '/console/db', group: 'System', key: 'dbExplorer', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { label: 'Settings', path: '/console/settings', group: 'System', key: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const RESPONSIVE_CSS = `
  .console-grid { display: grid; grid-template-columns: 220px 1fr 320px; min-height: 100vh; }
  @media (max-width: 1366px) { .console-grid { grid-template-columns: 64px 1fr 280px; } .console-nav-label { display: none; } }
  @media (max-width: 1024px) { .console-grid { grid-template-columns: 64px 1fr; } .console-rail { display: none; } }
  @media (max-width: 720px) { .console-grid { grid-template-columns: 1fr; } .console-nav { position: fixed; left: -280px; width: 280px; height: 100vh; z-index: 200; transition: left 0.2s; } .console-nav.open { left: 0; } }
`;

export function ConsoleLayout({ children, consoleRole }: { children?: React.ReactNode; consoleRole: string }) {
  const { theme, mode, toggleTheme } = useConsoleTheme();
  const [location] = useLocation();
  const { user } = useAuth();
  const visibility = consoleNav(consoleRole);

  const groups = Array.from(new Set(NAV_ITEMS.map(i => i.group)));

  useEffect(() => {
    const id = 'console-responsive-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = RESPONSIVE_CSS;
      document.head.appendChild(el);
    }
  }, []);

  async function handleSignOut() {
    await apiRequest('POST', '/api/auth/logout');
    window.location.href = '/console/login';
  }

  return (
    <div style={{ background: theme.surfaces.base, color: theme.text.primary, minHeight: '100vh', fontFamily: 'inherit' }}>
      <ImpersonationBanner viewingAs={null} onExit={() => {}} />
      <div className="console-grid">
        {/* Nav */}
        <nav className="console-nav" style={{ background: theme.surfaces.raised, borderRight: `1px solid ${theme.border.default}`, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
          <div style={{ padding: '0 16px 24px', borderBottom: `1px solid ${theme.border.default}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.brand.red }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.brand.blue }} />
              <span className="console-nav-label" style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>Cerosity HQ</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
            {groups.map(group => {
              const items = NAV_ITEMS.filter(i => i.group === group && visibility[i.key]);
              if (!items.length) return null;
              return (
                <div key={group} style={{ marginBottom: 24 }}>
                  <div className="console-nav-label" style={{ padding: '0 16px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.text.muted }}>{group}</div>
                  {items.map(item => {
                    const active = location === item.path || (item.path !== '/console' && location.startsWith(item.path));
                    return (
                      <Link key={item.path} href={item.path}>
                        <a style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                          color: active ? theme.brand.blue : theme.text.secondary,
                          background: active ? theme.brand.blueMuted : 'transparent',
                          borderRight: active ? `2px solid ${theme.brand.blue}` : '2px solid transparent',
                          textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          <span className="console-nav-label">{item.label}</span>
                        </a>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '16px', borderTop: `1px solid ${theme.border.default}` }}>
            <button onClick={toggleTheme} style={{ width: '100%', padding: '6px 12px', marginBottom: 8, background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.secondary, cursor: 'pointer', fontSize: 12 }}>
              {mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div className="console-nav-label" style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            <div className="console-nav-label" style={{ fontSize: 10, color: theme.text.muted, marginBottom: 8 }}>{consoleRole}</div>
            <button onClick={handleSignOut} style={{ width: '100%', padding: '6px 0', background: 'transparent', border: 'none', color: theme.brand.red, cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
              Sign out
            </button>
          </div>
        </nav>

        {/* Main */}
        <main style={{ overflowY: 'auto', padding: 24 }}>
          <Suspense fallback={<div style={{ color: theme.text.muted, padding: 48, textAlign: 'center' }}>Loading...</div>}>
            {children}
          </Suspense>
        </main>

        {/* Activity Rail */}
        <aside className="console-rail" style={{ background: theme.surfaces.raised, borderLeft: `1px solid ${theme.border.default}`, padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.text.muted, marginBottom: 16 }}>Live Activity</div>
          <div style={{ fontSize: 12, color: theme.text.muted }}>Activity feed coming soon</div>
        </aside>
      </div>
    </div>
  );
}
