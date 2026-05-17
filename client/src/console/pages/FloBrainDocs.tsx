import React, { useState, useEffect } from 'react';
import { useConsoleTheme } from '../ConsoleThemeProvider';
import { apiRequest } from '@/lib/queryClient';

interface BrainDoc {
  id: number;
  title: string;
  category: string;
  contentText: string;
  isActive: boolean;
  version: number;
  uploadedBy: string | null;
  createdAt: string;
}

const CATEGORIES = ['general', 'methodology', 'technique', 'assessment', 'sales', 'faq'];

export default function FloBrainDocs() {
  const { theme } = useConsoleTheme();
  const [docs, setDocs] = useState<BrainDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'general', contentText: '' });
  const [saving, setSaving] = useState(false);

  async function fetchDocs() {
    try {
      const res = await apiRequest('GET', '/api/hq/flo-brain');
      const data = await res.json();
      setDocs(data);
    } catch (e) {
      console.error('Failed to load brain docs', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.contentText.trim()) return;
    setSaving(true);
    try {
      await apiRequest('POST', '/api/hq/flo-brain', form);
      setForm({ title: '', category: 'general', contentText: '' });
      setShowForm(false);
      fetchDocs();
    } catch (e) {
      console.error('Failed to create doc', e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(doc: BrainDoc) {
    try {
      await apiRequest('PATCH', `/api/hq/flo-brain/${doc.id}`, { isActive: !doc.isActive });
      fetchDocs();
    } catch (e) {
      console.error('Failed to toggle doc', e);
    }
  }

  if (loading) {
    return <div style={{ padding: 32, color: theme.text.muted }}>Loading brain docs...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, margin: 0 }}>FLO Brain Documents</h1>
          <p style={{ fontSize: 13, color: theme.text.muted, marginTop: 4 }}>Knowledge base that shapes FLO's coaching responses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Red2Blue Core Methodology"
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14 }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>Content</label>
            <textarea
              value={form.contentText}
              onChange={e => setForm(f => ({ ...f, contentText: e.target.value }))}
              placeholder="Paste the full document content here..."
              rows={10}
              style={{ width: '100%', padding: '8px 12px', background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.contentText.trim()}
            style={{ padding: '8px 20px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {docs.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: theme.text.muted, fontSize: 14 }}>
            No brain documents yet. Add one to enrich FLO's knowledge.
          </div>
        )}
        {docs.map(doc => (
          <div key={doc.id} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary, margin: 0 }}>{doc.title}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11 }}>
                  <span style={{ padding: '2px 8px', background: theme.surfaces.base, borderRadius: 4, color: theme.text.muted }}>{doc.category}</span>
                  <span style={{ color: theme.text.muted }}>v{doc.version}</span>
                  <span style={{ color: theme.text.muted }}>{doc.contentText.length.toLocaleString()} chars</span>
                </div>
              </div>
              <button
                onClick={() => toggleActive(doc)}
                style={{
                  padding: '4px 12px',
                  border: `1px solid ${doc.isActive ? theme.brand.blue : theme.border.default}`,
                  borderRadius: 4,
                  background: doc.isActive ? `${theme.brand.blue}22` : 'transparent',
                  color: doc.isActive ? theme.brand.blue : theme.text.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {doc.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: theme.text.muted, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
              {doc.contentText.slice(0, 200)}{doc.contentText.length > 200 ? '...' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
