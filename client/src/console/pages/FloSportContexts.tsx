import React, { useState, useEffect } from 'react';
import { useConsoleTheme } from '../ConsoleThemeProvider';
import { apiRequest } from '@/lib/queryClient';

interface SportContext {
  id: number;
  slug: string;
  displayName: string;
  contextText: string;
  isActive: boolean;
  createdAt: string;
}

export default function FloSportContexts() {
  const { theme } = useConsoleTheme();
  const [contexts, setContexts] = useState<SportContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', displayName: '', contextText: '' });
  const [saving, setSaving] = useState(false);

  async function fetchContexts() {
    try {
      const res = await apiRequest('GET', '/api/hq/flo-sports');
      const data = await res.json();
      setContexts(data);
    } catch (e) {
      console.error('Failed to load sport contexts', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchContexts(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.displayName.trim() || !form.contextText.trim()) return;
    setSaving(true);
    try {
      await apiRequest('POST', '/api/hq/flo-sports', form);
      setForm({ slug: '', displayName: '', contextText: '' });
      setShowForm(false);
      fetchContexts();
    } catch (e) {
      console.error('Failed to create sport context', e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ctx: SportContext) {
    try {
      await apiRequest('PATCH', `/api/hq/flo-sports/${ctx.id}`, { isActive: !ctx.isActive });
      fetchContexts();
    } catch (e) {
      console.error('Failed to toggle sport context', e);
    }
  }

  if (loading) {
    return <div style={{ padding: 32, color: theme.text.muted }}>Loading sport contexts...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, margin: 0 }}>FLO Sport Contexts</h1>
          <p style={{ fontSize: 13, color: theme.text.muted, marginTop: 4 }}>Sport-specific coaching context injected into FLO prompts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Add Sport'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Slug</label>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
              placeholder='e.g. "golf", "tennis"'
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Display Name</label>
            <input
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder='e.g. "Golf"'
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Context Text</label>
            <textarea
              value={form.contextText}
              onChange={e => setForm(f => ({ ...f, contextText: e.target.value }))}
              placeholder="Sport-specific coaching context for FLO..."
              rows={8}
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.slug.trim() || !form.displayName.trim() || !form.contextText.trim()}
            style={{ padding: '8px 20px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Sport Context'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {contexts.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: theme.text.muted, fontSize: 14 }}>
            No sport contexts yet. Add one to give FLO sport-specific coaching knowledge.
          </div>
        )}
        {contexts.map(ctx => (
          <div key={ctx.id} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary, margin: 0 }}>{ctx.displayName}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11 }}>
                  <span style={{ padding: '2px 8px', background: theme.surfaces.base, borderRadius: 4, color: theme.text.muted }}>{ctx.slug}</span>
                  <span style={{ color: theme.text.muted }}>{ctx.contextText.length.toLocaleString()} chars</span>
                </div>
              </div>
              <button
                onClick={() => toggleActive(ctx)}
                style={{
                  padding: '4px 12px',
                  border: `1px solid ${ctx.isActive ? theme.brand.blue : theme.border.default}`,
                  borderRadius: 4,
                  background: ctx.isActive ? `${theme.brand.blue}22` : 'transparent',
                  color: ctx.isActive ? theme.brand.blue : theme.text.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ctx.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: theme.text.muted, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
              {ctx.contextText.slice(0, 200)}{ctx.contextText.length > 200 ? '...' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
