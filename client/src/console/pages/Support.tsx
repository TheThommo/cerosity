import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface SupportUser {
  id: number;
  username: string;
  email: string;
  role: string;
  subscriptionTier: string;
  floChatsUsed?: number;
  createdAt?: string;
  isSubscribed?: boolean;
}

interface Notification {
  id: number;
  userId?: number;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
}

function tierColor(tier: string): string {
  if (tier === 'ultimate') return '#E63946';
  if (tier === 'premium') return '#1D7FBF';
  return '#6B7588';
}

export default function Support() {
  const { theme } = useConsoleTheme();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [result, setResult] = useState<SupportUser | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: allUsers = [] } = useQuery<SupportUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/admin/notifications'],
    queryFn: getQueryFn({ on401: 'throw' }),
    retry: false,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const q = search.toLowerCase().trim();
    const found = allUsers.find(u => u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) ?? null;
    setResult(found);
    setSubmitted(search);
    setSearching(false);
  }

  const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left' as const, borderBottom: `1px solid ${theme.border.default}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}` };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Support</h1>

      {/* User search */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>User Lookup</div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Search by email or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13 }}
          />
          <button type="submit" disabled={searching || !search.trim()} style={{ padding: '8px 20px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {submitted && (
          <div style={{ marginTop: 20 }}>
            {result ? (
              <div style={{ background: theme.surfaces.sunken, borderRadius: 8, padding: 20, border: `1px solid ${theme.border.default}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>USER</div>
                    <div style={{ fontWeight: 600, color: theme.text.primary }}>{result.username}</div>
                    <div style={{ fontSize: 12, color: theme.text.muted }}>{result.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>TIER</div>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: result.subscriptionTier === 'ultimate' ? 'rgba(230,57,70,0.15)' : result.subscriptionTier === 'premium' ? 'rgba(29,127,191,0.15)' : theme.surfaces.raised, color: tierColor(result.subscriptionTier) }}>
                      {result.subscriptionTier || 'free'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>FLO CHATS</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: theme.text.primary }}>{result.floChatsUsed ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>JOINED</div>
                    <div style={{ fontSize: 13, color: theme.text.primary }}>{result.createdAt ? new Date(result.createdAt).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>SUBSCRIPTION</div>
                    <div style={{ fontSize: 13, color: result.isSubscribed ? theme.semantic.success : theme.text.muted }}>{result.isSubscribed ? 'Active' : 'Inactive'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>ROLE</div>
                    <div style={{ fontSize: 13, color: theme.text.primary }}>{result.role}</div>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${theme.border.default}`, paddingTop: 16, display: 'flex', gap: 8 }}>
                  <a href={`/console/users`} style={{ padding: '6px 14px', background: theme.brand.blueMuted, color: theme.brand.blue, borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>
                    View in Users
                  </a>
                  <button style={{ padding: '6px 14px', background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, color: theme.text.secondary, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    Send Notification (coming soon)
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: theme.text.muted, fontSize: 13, padding: '12px 0' }}>No user found matching "{submitted}"</div>
            )}
          </div>
        )}
      </div>

      {/* Recent notifications */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border.default}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Recent Notifications</div>
        </div>
        {notifications.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Message</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Read</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.slice(0, 20).map(n => (
                <tr key={n.id}>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>#{n.id}</td>
                  <td style={tdStyle}>#{n.userId}</td>
                  <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message || '—'}</td>
                  <td style={tdStyle}>{n.type || '—'}</td>
                  <td style={tdStyle}>{n.read ? <span style={{ color: theme.text.muted }}>Yes</span> : <span style={{ color: theme.semantic.info }}>No</span>}</td>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: theme.text.muted, fontSize: 13 }}>No notifications data available</div>
        )}
      </div>
    </div>
  );
}
