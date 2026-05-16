import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConsoleTheme } from '../ConsoleThemeProvider';

const TABLE_GROUPS: Record<string, string[]> = {
  'Users': ['users', 'user_coaching_profiles', 'user_engagement_metrics', 'user_progress', 'user_goals'],
  'Assessments': ['assessments', 'mental_skills_x_checks', 'recognition_assessments'],
  'Tools': ['control_circles', 'what_if_planning', 'screw_up_cascade', 'priority_planning', 'pre_shot_routines'],
  'Coaching': ['certification_progress', 'coaching_insights', 'ai_recommendations', 'technique_progress'],
  'Chat': ['chat_sessions'],
  'Tracking': ['daily_moods', 'daily_check_ins', 'notifications', 'calendar_reminders'],
  'Commerce': ['flo_subscriptions'],
  'Content': ['techniques', 'scenarios'],
  'Admin': ['admin_audit_log', 'feature_flags'],
};

interface DBResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DBExplorer() {
  const { theme } = useConsoleTheme();
  const [selectedTable, setSelectedTable] = useState('users');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const queryKey = `/api/admin/db-explorer/${selectedTable}?page=${page}&limit=50&sortCol=${sortCol}&sortDir=${sortDir}`;

  const { data, isLoading, error } = useQuery<DBResult>({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await fetch(queryKey, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  function handleSort(col: string) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleTableSelect(table: string) {
    setSelectedTable(table);
    setPage(1);
    setSortCol('id');
    setSortDir('desc');
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);
  const cols = rows.length ? Object.keys(rows[0]) : [];

  const thStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left', borderBottom: `1px solid ${theme.border.default}`, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' };
  const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 12, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}`, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, height: 'calc(100vh - 80px)' }}>
      {/* Table list */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: '10px 0 0 10px', overflowY: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.default}`, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.text.muted }}>Tables</div>
        {Object.entries(TABLE_GROUPS).map(([group, tables]) => (
          <div key={group}>
            <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: theme.text.muted, letterSpacing: '0.08em' }}>{group}</div>
            {tables.map(table => (
              <button key={table} onClick={() => handleTableSelect(table)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '6px 16px',
                background: table === selectedTable ? theme.brand.blueMuted : 'transparent',
                color: table === selectedTable ? theme.brand.blue : theme.text.secondary,
                border: 'none', cursor: 'pointer', fontSize: 12,
                borderRight: table === selectedTable ? `2px solid ${theme.brand.blue}` : '2px solid transparent',
                fontWeight: table === selectedTable ? 600 : 400,
              }}>{table}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Data panel */}
      <div style={{ background: theme.surfaces.base, border: `1px solid ${theme.border.default}`, borderLeft: 'none', borderRadius: '0 10px 10px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.surfaces.raised }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, fontFamily: 'monospace' }}>{selectedTable}</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: theme.text.muted }}>{total} rows</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => exportCSV(rows, `${selectedTable}.csv`)} style={{ padding: '5px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.secondary, cursor: 'pointer', fontSize: 12 }}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading && <div style={{ padding: 40, textAlign: 'center', color: theme.text.muted }}>Loading...</div>}
          {error && <div style={{ padding: 20, color: theme.semantic.error, fontSize: 13 }}>Error: {(error as Error).message}</div>}
          {!isLoading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: theme.surfaces.raised }}>
                <tr>
                  {cols.map(col => (
                    <th key={col} style={thStyle} onClick={() => handleSort(col)}>
                      {col} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.surfaces.sunken)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {cols.map(col => (
                      <td key={col} style={tdStyle} title={String(row[col] ?? '')}>
                        {row[col] === null ? <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>null</span> : typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={cols.length || 1} style={{ ...tdStyle, textAlign: 'center', color: theme.text.muted, padding: 40 }}>No rows</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border.default}`, display: 'flex', alignItems: 'center', gap: 8, background: theme.surfaces.raised }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 4, color: page === 1 ? theme.text.muted : theme.text.secondary, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>Prev</button>
            <span style={{ fontSize: 12, color: theme.text.muted }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 4, color: page === totalPages ? theme.text.muted : theme.text.secondary, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
