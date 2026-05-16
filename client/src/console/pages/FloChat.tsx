import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface ChatUser {
  id: number;
  email: string;
  username: string;
  subscriptionTier: string;
  floChatsUsed?: number;
  createdAt?: string;
}

interface AdminStats {
  totalChatSessions?: number;
  floChatsToday?: number;
  avgMessagesPerSession?: number;
}

export default function FloChat() {
  const { theme } = useConsoleTheme();
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);

  const { data: users = [], isLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const tierChats: Record<string, number> = {};
  users.forEach(u => {
    const tier = u.subscriptionTier || 'free';
    tierChats[tier] = (tierChats[tier] || 0) + (u.floChatsUsed || 0);
  });

  const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left' as const, borderBottom: `1px solid ${theme.border.default}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}` };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>FLO Chat</h1>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Sessions', value: stats?.totalChatSessions ?? 0, color: theme.brand.blue },
          { label: 'Sessions Today', value: stats?.floChatsToday ?? 0, color: theme.semantic.success },
          { label: 'Avg Msgs/Session', value: stats?.avgMessagesPerSession ?? 0, color: theme.semantic.warning },
        ].map(card => (
          <div key={card.label} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: '20px 24px', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.text.muted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: theme.text.primary }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tier usage */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 12 }}>FLO Usage by Tier</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {Object.entries(tierChats).map(([tier, count]) => (
            <div key={tier}>
              <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>{tier.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: tier === 'ultimate' ? '#E63946' : tier === 'premium' ? '#1D7FBF' : theme.text.muted }}>{count} chats</div>
            </div>
          ))}
        </div>
      </div>

      {/* User chat table */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border.default}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Users by FLO Usage</div>
        </div>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: theme.text.muted }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>FLO Chats Used</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...users].sort((a, b) => (b.floChatsUsed ?? 0) - (a.floChatsUsed ?? 0)).map(u => (
                <tr key={u.id}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.surfaces.sunken)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>{u.email}</div>
                  </td>
                  <td style={tdStyle}>{u.subscriptionTier || 'free'}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: (u.floChatsUsed ?? 0) > 10 ? theme.semantic.warning : theme.text.primary }}>
                      {u.floChatsUsed ?? 0}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setSelectedUser(u === selectedUser ? null : u)}
                      style={{ padding: '4px 10px', background: theme.brand.blueMuted, color: theme.brand.blue, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedUser(null)}>
          <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 12, padding: 32, width: 480, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text.primary }}>FLO History: {selectedUser.username}</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: theme.text.muted, marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, color: theme.text.primary }}>{selectedUser.email}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: theme.text.muted, marginBottom: 4 }}>Total FLO Chats</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.text.primary }}>{selectedUser.floChatsUsed ?? 0}</div>
            </div>
            <div style={{ borderTop: `1px solid ${theme.border.default}`, paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: theme.text.muted, textAlign: 'center' }}>
                Chat message detail requires selecting a specific session from the DB Explorer.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {['Good', 'Needs Review', 'Training Data'].map(label => (
                <button key={label} style={{ flex: 1, padding: '6px 0', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.secondary, cursor: 'pointer', fontSize: 12 }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
