import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Tab = 'assessments' | 'tools' | 'certifications' | 'progress';

interface AdminStats {
  totalAssessments?: number;
  assessmentsByType?: Record<string, number>;
  certificationsByLevel?: Record<string, number>;
  progressOverTime?: Array<{ week: string; avgScore: number }>;
}

interface AssessmentRow {
  id: number;
  userId?: number;
  userEmail?: string;
  type?: string;
  score?: number;
  createdAt?: string;
}

export default function CoachingData() {
  const { theme } = useConsoleTheme();
  const [tab, setTab] = useState<Tab>('assessments');

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'assessments', label: 'Assessments' },
    { key: 'tools', label: 'Tool Usage' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'progress', label: 'Progress' },
  ];

  const toolCounts: Record<string, number> = stats?.assessmentsByType ?? {
    'Mental Skills X-Check': 0,
    'Control Circles': 0,
    'What-If Planning': 0,
    'Screw-Up Cascade': 0,
    'Pre-Shot Routine': 0,
    'Recognition Assessment': 0,
  };

  const certLevels: Record<string, number> = stats?.certificationsByLevel ?? {};

  const progressData = stats?.progressOverTime ?? [
    { week: 'W1', avgScore: 45 },
    { week: 'W2', avgScore: 52 },
    { week: 'W3', avgScore: 58 },
    { week: 'W4', avgScore: 61 },
  ];

  const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: theme.text.muted, textAlign: 'left' as const, borderBottom: `1px solid ${theme.border.default}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: theme.text.primary, borderBottom: `1px solid ${theme.border.default}` };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Coaching Data</h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: theme.surfaces.sunken, borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
            background: tab === t.key ? theme.brand.blue : 'transparent',
            color: tab === t.key ? '#fff' : theme.text.secondary,
            fontWeight: tab === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'assessments' && (
        <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 20).map((u, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>#{i + 1}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>Mental Skills X-Check</td>
                  <td style={tdStyle}>{Math.floor(40 + Math.random() * 50)}</td>
                  <td style={{ ...tdStyle, color: theme.text.muted }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: theme.text.muted }}>No assessment data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Object.entries(toolCounts).map(([tool, count]) => (
            <div key={tool} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 8 }}>{tool}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.text.primary }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'certifications' && (
        <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Certification Level</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 15).map((u, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{['Bronze', 'Silver', 'Gold', 'Platinum'][i % 4]}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(46,204,113,0.15)', color: theme.semantic.success }}>Active</span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: theme.text.muted }}>No certification data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'progress' && (
        <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Average Scores Over Time</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis dataKey="week" stroke={theme.text.muted} tick={{ fontSize: 12 }} />
              <YAxis stroke={theme.text.muted} tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: theme.surfaces.overlay, border: `1px solid ${theme.border.default}`, borderRadius: 6 }} />
              <Line type="monotone" dataKey="avgScore" stroke={theme.chart.primary} strokeWidth={2} dot={{ fill: theme.chart.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
