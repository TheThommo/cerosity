import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface KPIDefinition {
  label: string;
  key: string;
  format: 'number' | 'currency' | 'percent';
  group: 'users' | 'revenue' | 'flo' | 'engagement';
  color?: string;
}

// Every key here is backed by a real count in /api/admin/stats. A card with no
// query behind it is worse than no card, so it does not get an entry.
const KPI_REGISTRY: KPIDefinition[] = [
  { label: 'Total Users', key: 'totalUsers', format: 'number', group: 'users' },
  { label: 'Free Tier', key: 'freeUsers', format: 'number', group: 'users' },
  { label: 'Premium', key: 'premiumUsers', format: 'number', group: 'users', color: '#1D7FBF' },
  { label: 'Ultimate', key: 'ultimateUsers', format: 'number', group: 'users', color: '#E63946' },
  { label: 'Active Subscriptions', key: 'activeSubscriptions', format: 'number', group: 'revenue' },
  { label: 'Total Chat Sessions', key: 'totalChatSessions', format: 'number', group: 'flo' },
  { label: 'Sessions Today', key: 'floChatsToday', format: 'number', group: 'flo' },
  { label: 'Avg Msgs / Session', key: 'avgMessagesPerSession', format: 'number', group: 'flo' },
  { label: 'Active Chatters (7d)', key: 'activeChatters7d', format: 'number', group: 'flo' },
  { label: 'Assessments Today', key: 'assessmentsToday', format: 'number', group: 'engagement' },
  { label: 'Check-ins Today', key: 'dailyCheckIns', format: 'number', group: 'engagement' },
];

function formatValue(value: unknown, format: KPIDefinition['format']): string {
  const num = typeof value === 'number' ? value : Number(value) || 0;
  if (format === 'currency') return `$${num.toLocaleString()}`;
  if (format === 'percent') return `${num.toFixed(1)}%`;
  return num.toLocaleString();
}

interface KPICardProps {
  kpi: KPIDefinition;
  value: unknown;
  theme: ReturnType<typeof useConsoleTheme>['theme'];
}

function KPICard({ kpi, value, theme }: KPICardProps) {
  const accent = kpi.color || theme.brand.blue;
  return (
    <div style={{
      background: theme.surfaces.raised,
      border: `1px solid ${theme.border.default}`,
      borderRadius: 10,
      padding: '20px 24px',
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.text.muted, marginBottom: 8 }}>
        {kpi.label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.text.primary }}>
        {formatValue(value, kpi.format)}
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { theme } = useConsoleTheme();

  const { data: stats, isLoading, error } = useQuery<Record<string, unknown>>({
    queryKey: ['/api/admin/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const groups = Array.from(new Set(KPI_REGISTRY.map(k => k.group)));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>Command Center</h1>
        {/* The time-range tabs that used to sit here did nothing: getQueryFn
            only reads queryKey[0], so every range refetched the same all-time
            stats. Removed rather than left as a control that lies. */}
        <p style={{ fontSize: 13, color: theme.text.muted, margin: '4px 0 0' }}>Platform totals, live from the database</p>
      </div>

      {error && (
        <div style={{ background: theme.brand.redMuted, border: `1px solid ${theme.brand.red}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: theme.brand.red, fontSize: 13 }}>
          Failed to load stats: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {KPI_REGISTRY.map(k => (
            <div key={k.key} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: '20px 24px', height: 90, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map(group => {
            const groupKPIs = KPI_REGISTRY.filter(k => k.group === group);
            return (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.text.muted, marginBottom: 12 }}>
                  {group.toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {groupKPIs.map(kpi => (
                    <KPICard key={kpi.key} kpi={kpi} value={stats?.[kpi.key] ?? 0} theme={theme} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
