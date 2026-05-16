import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  subscriptionTier: string;
  floChatsUsed?: number;
  createdAt?: string;
  assessmentCount?: number;
  goalCount?: number;
}

function tierColor(tier: string): string {
  if (tier === 'ultimate') return '#E63946';
  if (tier === 'premium') return '#1D7FBF';
  return '#6B7588';
}

function TierBadge({ tier, theme }: { tier: string; theme: any }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: tier === 'ultimate' ? 'rgba(230,57,70,0.15)' : tier === 'premium' ? 'rgba(29,127,191,0.15)' : theme.surfaces.sunken,
      color: tierColor(tier),
      border: `1px solid ${tierColor(tier)}40`,
    }}>
      {tier}
    </span>
  );
}

function UserDrawer({ user, onClose, theme }: { user: AdminUser; onClose: () => void; theme: any }) {
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 360, height: '100vh',
      background: theme.surfaces.raised, borderLeft: `1px solid ${theme.border.default}`,
      zIndex: 300, overflowY: 'auto', padding: 24, boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text.primary }}>User Detail</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>USERNAME</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary }}>{user.username}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>EMAIL</div>
        <div style={{ fontSize: 14, color: theme.text.primary }}>{user.email}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>TIER</div>
          <TierBadge tier={user.subscriptionTier || 'free'} theme={theme} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>ROLE</div>
          <div style={{ fontSize: 13, color: theme.text.primary }}>{user.role}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>FLO CHATS USED</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary }}>{user.floChatsUsed ?? 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>USER ID</div>
          <div style={{ fontSize: 14, color: theme.text.primary }}>#{user.id}</div>
        </div>
      </div>
      {user.createdAt && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>JOINED</div>
          <div style={{ fontSize: 13, color: theme.text.primary }}>{new Date(user.createdAt).toLocaleDateString()}</div>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.border.default}`, paddingTop: 20, marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: theme.text.muted, marginBottom: 12 }}>Quick Actions</div>
        <a href={`/console/users?highlight=${user.id}`} style={{ display: 'block', padding: '8px 12px', background: theme.brand.blueMuted, color: theme.brand.blue, borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          View Full Profile
        </a>
        <a href={`/console/support?search=${encodeURIComponent(user.email)}`} style={{ display: 'block', padding: '8px 12px', background: theme.surfaces.sunken, color: theme.text.secondary, borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          Open Support View
        </a>
      </div>
    </div>
  );
}

export default function Users() {
  const { theme } = useConsoleTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left' as const, borderBottom: `1px solid ${theme.border.default}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}` };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>Users</h1>
          <p style={{ fontSize: 13, color: theme.text.muted, margin: '4px 0 0' }}>{users.length} total users</p>
        </div>
        <input
          placeholder="Search email or username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13, width: 260 }}
        />
      </div>

      {error && <div style={{ color: theme.semantic.error, marginBottom: 16, fontSize: 13 }}>Failed to load users</div>}

      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: theme.text.muted }}>Loading users...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>FLO Chats</th>
                <th style={thStyle}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} onClick={() => setSelected(u)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.surfaces.sunken)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>#{u.id}</td>
                  <td style={tdStyle}>{u.username}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.role}</td>
                  <td style={tdStyle}><TierBadge tier={u.subscriptionTier || 'free'} theme={theme} /></td>
                  <td style={tdStyle}>{u.floChatsUsed ?? 0}</td>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: theme.text.muted }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} theme={theme} />}
    </div>
  );
}
