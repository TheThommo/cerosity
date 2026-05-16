import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface AdminStats {
  totalUsers?: number;
  freeUsers?: number;
  premiumUsers?: number;
  ultimateUsers?: number;
  weeklySignups?: Array<{ week: string; count: number }>;
  dailyCheckIns?: number;
  toolUsage?: Record<string, number>;
  checkInsOverTime?: Array<{ date: string; count: number }>;
}

function ChartCard({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { theme } = useConsoleTheme();

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const weeklySignups = stats?.weeklySignups ?? [
    { week: 'W1', count: 4 }, { week: 'W2', count: 7 }, { week: 'W3', count: 5 },
    { week: 'W4', count: 12 }, { week: 'W5', count: 9 }, { week: 'W6', count: 15 },
  ];

  const tierData = [
    { name: 'Free', value: stats?.freeUsers ?? 0 },
    { name: 'Premium', value: stats?.premiumUsers ?? 0 },
    { name: 'Ultimate', value: stats?.ultimateUsers ?? 0 },
  ].filter(d => d.value > 0);

  const tierColors = [theme.text.muted, theme.chart.primary, theme.chart.secondary];

  const toolData = Object.entries(stats?.toolUsage ?? {
    'Mental Skills': 0,
    'Control Circles': 0,
    'What-If Planning': 0,
    'Pre-Shot Routine': 0,
    'Scenarios': 0,
  }).map(([name, value]) => ({ name, value }));

  const checkInsData = stats?.checkInsOverTime ?? [
    { date: 'Mon', count: 3 }, { date: 'Tue', count: 5 }, { date: 'Wed', count: 4 },
    { date: 'Thu', count: 8 }, { date: 'Fri', count: 6 }, { date: 'Sat', count: 2 }, { date: 'Sun', count: 1 },
  ];

  const tooltipStyle = { contentStyle: { background: theme.surfaces.overlay, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 } };

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Analytics</h1>
        <div style={{ color: theme.text.muted }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Analytics</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        <ChartCard title="User Growth (Weekly Signups)" theme={theme}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklySignups}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.chart.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.chart.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis dataKey="week" stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke={theme.chart.primary} fill="url(#colorCount)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tier Distribution" theme={theme}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={tierData.length ? tierData : [{ name: 'No data', value: 1 }]} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {(tierData.length ? tierData : [{ name: 'No data', value: 1 }]).map((_, index) => (
                  <Cell key={index} fill={tierColors[index % tierColors.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tool Popularity" theme={theme}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={toolData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis type="number" stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke={theme.text.muted} tick={{ fontSize: 11 }} width={110} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill={theme.chart.secondary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Check-ins (This Week)" theme={theme}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={checkInsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis dataKey="date" stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke={theme.chart.tertiary} strokeWidth={2} dot={{ fill: theme.chart.tertiary }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
