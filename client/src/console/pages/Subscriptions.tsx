import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface PaymentRecord {
  id: number;
  userId?: number;
  email?: string;
  subscriptionTier?: string;
  stripeCustomerId?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isSubscribed?: boolean;
}

interface AdminStats {
  premiumUsers?: number;
  ultimateUsers?: number;
  activeSubscriptions?: number;
  totalUsers?: number;
}

function tierColor(tier: string): string {
  if (tier === 'ultimate') return '#E63946';
  if (tier === 'premium') return '#1D7FBF';
  return '#6B7588';
}

export default function Subscriptions() {
  const { theme } = useConsoleTheme();

  const { data: payments = [], isLoading } = useQuery<PaymentRecord[]>({
    queryKey: ['/api/admin/payments'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const premium = stats?.premiumUsers ?? 0;
  const ultimate = stats?.ultimateUsers ?? 0;
  const active = stats?.activeSubscriptions ?? (premium + ultimate);

  const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left' as const, borderBottom: `1px solid ${theme.border.default}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}` };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Subscriptions</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Subscriptions', value: active, color: theme.semantic.success },
          { label: 'Premium', value: premium, color: '#1D7FBF' },
          { label: 'Ultimate', value: ultimate, color: '#E63946' },
        ].map(card => (
          <div key={card.label} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: '20px 24px', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.text.muted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: theme.text.primary }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Subscription table */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border.default}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Subscription Records</div>
        </div>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: theme.text.muted }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Stripe Customer</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.filter(p => p.subscriptionTier && p.subscriptionTier !== 'free').map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.email || `User #${p.userId}`}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: p.subscriptionTier === 'ultimate' ? 'rgba(230,57,70,0.15)' : 'rgba(29,127,191,0.15)', color: tierColor(p.subscriptionTier || 'free') }}>
                      {p.subscriptionTier}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: theme.text.muted }}>{p.stripeCustomerId || '—'}</td>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>{p.subscriptionStartDate ? new Date(p.subscriptionStartDate).toLocaleDateString() : '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: p.isSubscribed ? 'rgba(46,204,113,0.15)' : theme.surfaces.sunken, color: p.isSubscribed ? theme.semantic.success : theme.text.muted }}>
                      {p.isSubscribed ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.filter(p => p.subscriptionTier && p.subscriptionTier !== 'free').length === 0 && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: theme.text.muted }}>No subscription records found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
