import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

type TimeRange = 'today' | '7d' | '30d' | 'all';

interface KPIDefinition {
  label: string;
  key: string;
  format: 'number' | 'currency' | 'percent';
  group: 'users' | 'revenue' | 'flo' | 'engagement';
  color?: string;
}

const KPI_REGISTRY: KPIDefinition[] = [
  { label: 'Total Users', key: 'totalUsers', format: 'number', group: 'users' },
  { label: 'Free Tier', key: 'freeUsers', format: 'number', group: 'users' },
  { label: 'Premium', key: 'premiumUsers', format: 'number', group: 'users', color: '#1D7FBF' },
  { label: 'Ultimate', key: 'ultimateUsers', format: 'number', group: 'users', color: '#E63946' },
  { label: 'Active Subscriptions', key: 'activeSubscriptions', format: 'number', group: 'revenue' },
  { label: 'FLO Chats Today', key: 'floChatsToday', format: 'number', group: 'flo' },
  { label: 'Total Chat Sessions', key: 'totalChatSessions', format: 'number', group: 'flo' },
  { label: 'Assessments Today', key: 'assessmentsToday', format: 'number', group: 'engagement' },
  { label: 'Daily Check-ins', key: 'dailyCheckIns', format: 'number', group: 'engagement' },
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

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
];

export default function CommandCenter() {
  const { theme } = useConsoleTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const { data: stats, isLoading, error } = useQuery<Record<string, unknown>>({
    queryKey: ['/api/admin/stats', timeRange],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const groups = Array.from(new Set(KPI_REGISTRY.map(k => k.group)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>Command Center</h1>
          <p style={{ fontSize: 13, color: theme.text.muted, margin: '4px 0 0' }}>Platform overview at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: theme.surfaces.sunken, borderRadius: 8, padding: 4 }}>
          {TIME_RANGES.map(tr => (
            <button key={tr.value} onClick={() => setTimeRange(tr.value)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              background: timeRange === tr.value ? theme.brand.blue : 'transparent',
              color: timeRange === tr.value ? '#fff' : theme.text.secondary,
              fontWeight: timeRange === tr.value ? 600 : 400,
            }}>{tr.label}</button>
          ))}
        </div>
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
