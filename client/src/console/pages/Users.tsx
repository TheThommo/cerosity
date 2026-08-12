import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { TIER_PRICING, type SubscriptionTier } from '@shared/entitlements';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  subscriptionTier: string;
  isSubscribed?: boolean;
  isActive?: boolean;
  floChatsUsed?: number;
  createdAt?: string;
  assessmentCount?: number;
  goalCount?: number;
}

/** Tier names come from the entitlement config, never a literal list (Rule 1). */
const TIERS = Object.keys(TIER_PRICING) as SubscriptionTier[];
const ROLES = ['student', 'coach', 'admin'];

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

/** Shared look for the small selects/inputs this page adds. */
function fieldStyle(theme: any): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', background: theme.surfaces.sunken,
    border: `1px solid ${theme.border.default}`, borderRadius: 6,
    color: theme.text.primary, fontSize: 13,
  };
}

function labelStyle(theme: any): React.CSSProperties {
  return { display: 'block', fontSize: 11, color: theme.text.muted, marginBottom: 4 };
}

function UserDrawer({ user, onClose, onSaved, theme }: { user: AdminUser; onClose: () => void; onSaved: (u: AdminUser) => void; theme: any }) {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState(user.subscriptionTier || 'free');
  const [role, setRole] = useState(user.role || 'student');
  const [subscribed, setSubscribed] = useState(user.isSubscribed ?? false);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/admin/users/${user.id}`, {
        subscriptionTier: tier,
        role,
        isSubscribed: subscribed,
      });
      return res.json();
    },
    onSuccess: (updated: AdminUser) => {
      onSaved(updated);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Turning an athlete off is a bigger deal than editing their tier, so it
  // saves on its own rather than hiding inside "Save entitlement".
  const active = user.isActive !== false;
  const setActive = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${user.id}`, { isActive: next });
      return res.json();
    },
    onSuccess: (updated: AdminUser) => {
      onSaved(updated);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const dirty = tier !== (user.subscriptionTier || 'free')
    || role !== (user.role || 'student')
    || subscribed !== (user.isSubscribed ?? false);

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
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: theme.text.muted, marginBottom: 12 }}>Entitlement</div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle(theme)} htmlFor="drawer-tier">TIER</label>
          <select
            id="drawer-tier"
            value={tier}
            // Granting a paid tier is also what marks the athlete subscribed;
            // dropping to free clears it. Overridable below.
            onChange={e => { setTier(e.target.value); setSubscribed(e.target.value !== 'free'); }}
            style={fieldStyle(theme)}
          >
            {TIERS.map(t => <option key={t} value={t}>{t} — {TIER_PRICING[t].name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle(theme)} htmlFor="drawer-role">ROLE</label>
          <select id="drawer-role" value={role} onChange={e => setRole(e.target.value)} style={fieldStyle(theme)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.text.secondary, marginBottom: 16 }}>
          <input type="checkbox" checked={subscribed} onChange={e => setSubscribed(e.target.checked)} />
          Subscribed
        </label>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 6, border: 'none',
            background: dirty ? theme.brand.blue : theme.surfaces.sunken,
            color: dirty ? '#fff' : theme.text.muted,
            fontSize: 13, fontWeight: 600, cursor: dirty ? 'pointer' : 'default',
          }}
        >
          {save.isPending ? 'Saving...' : 'Save entitlement'}
        </button>
        {save.isError && <div style={{ color: theme.semantic.error, fontSize: 12, marginTop: 8 }}>{(save.error as Error).message}</div>}
        {save.isSuccess && !dirty && <div style={{ color: theme.semantic.success, fontSize: 12, marginTop: 8 }}>Saved</div>}
      </div>

      <div style={{ borderTop: `1px solid ${theme.border.default}`, paddingTop: 20, marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: theme.text.muted, marginBottom: 12 }}>Account</div>
        <p style={{ fontSize: 12, color: theme.text.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
          {active
            ? 'Active — this athlete can sign in.'
            : 'Deactivated — cannot sign in, and any open session is cut off. Their history is kept.'}
        </p>
        <button
          onClick={() => setActive.mutate(!active)}
          disabled={setActive.isPending}
          data-testid="toggle-active"
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 6,
            border: `1px solid ${active ? theme.semantic.error : theme.semantic.success}`,
            background: 'transparent',
            color: active ? theme.semantic.error : theme.semantic.success,
            fontSize: 13, fontWeight: 600, cursor: setActive.isPending ? 'default' : 'pointer',
          }}
        >
          {setActive.isPending ? 'Saving...' : active ? 'Deactivate account' : 'Reactivate account'}
        </button>
        {setActive.isError && <div style={{ color: theme.semantic.error, fontSize: 12, marginTop: 8 }}>{(setActive.error as Error).message}</div>}
      </div>

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

/** Create an athlete without Stripe. Temp password is shown once, on success. */
function NewAthletePanel({ theme, onDone }: { theme: any; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '', subscriptionTier: 'free', role: 'student' });
  const [created, setCreated] = useState<{ email: string; tempPassword: string | null } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/users', {
        email: form.email.trim(),
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        password: form.password || undefined,
        subscriptionTier: form.subscriptionTier,
        role: form.role,
        isSubscribed: form.subscriptionTier !== 'free',
      });
      return res.json();
    },
    onSuccess: (user: any) => {
      setCreated({ email: user.email, tempPassword: user.tempPassword ?? null });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (created) {
    return (
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.semantic.success, marginBottom: 8 }}>Athlete created</div>
        <div style={{ fontSize: 13, color: theme.text.primary, marginBottom: 4 }}>{created.email}</div>
        {created.tempPassword && (
          <div style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12 }}>
            Temporary password: <code data-testid="temp-password" style={{ background: theme.surfaces.sunken, padding: '2px 6px', borderRadius: 4 }}>{created.tempPassword}</code>
            <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>Shown once. Copy it now.</div>
          </div>
        )}
        <button onClick={onDone} style={{ padding: '8px 14px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
      </div>
    );
  }

  return (
    <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text.primary, marginBottom: 16 }}>New athlete</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-email">EMAIL</label>
          <input id="new-email" value={form.email} onChange={e => set('email', e.target.value)} style={fieldStyle(theme)} />
        </div>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-first">FIRST NAME</label>
          <input id="new-first" value={form.firstName} onChange={e => set('firstName', e.target.value)} style={fieldStyle(theme)} />
        </div>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-last">LAST NAME</label>
          <input id="new-last" value={form.lastName} onChange={e => set('lastName', e.target.value)} style={fieldStyle(theme)} />
        </div>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-password">PASSWORD (BLANK = GENERATE)</label>
          <input id="new-password" value={form.password} onChange={e => set('password', e.target.value)} style={fieldStyle(theme)} />
        </div>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-tier">TIER</label>
          <select id="new-tier" value={form.subscriptionTier} onChange={e => set('subscriptionTier', e.target.value)} style={fieldStyle(theme)}>
            {TIERS.map(t => <option key={t} value={t}>{t} — {TIER_PRICING[t].name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle(theme)} htmlFor="new-role">ROLE</label>
          <select id="new-role" value={form.role} onChange={e => set('role', e.target.value)} style={fieldStyle(theme)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => create.mutate()}
          disabled={!form.email.includes('@') || create.isPending}
          style={{ padding: '8px 14px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: form.email.includes('@') ? 1 : 0.5 }}
        >
          {create.isPending ? 'Creating...' : 'Create athlete'}
        </button>
        <button onClick={onDone} style={{ padding: '8px 14px', background: 'transparent', color: theme.text.muted, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        {create.isError && <span style={{ color: theme.semantic.error, fontSize: 12 }}>{(create.error as Error).message}</span>}
      </div>
    </div>
  );
}

export default function Users() {
  const { theme } = useConsoleTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);

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
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search email or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13, width: 260 }}
          />
          <button
            onClick={() => setCreating(c => !c)}
            style={{ padding: '8px 14px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            New athlete
          </button>
        </div>
      </div>

      {creating && <NewAthletePanel theme={theme} onDone={() => setCreating(false)} />}

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
                  <td style={tdStyle}>
                    {u.username}
                    {u.isActive === false && (
                      <span style={{
                        marginLeft: 8, padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        color: theme.semantic.error, border: `1px solid ${theme.semantic.error}40`,
                      }}>
                        deactivated
                      </span>
                    )}
                  </td>
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

      {/* key: the drawer seeds its controls from the user, so it must remount when a different row is picked. */}
      {selected && <UserDrawer key={selected.id} user={selected} onClose={() => setSelected(null)} onSaved={setSelected} theme={theme} />}
    </div>
  );
}
