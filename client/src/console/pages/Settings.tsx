import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { appRoleToConsoleRole } from '../consolePermissions';

interface FeatureFlag {
  id: number;
  flag_key: string;
  flag_value: boolean;
  description: string;
  updated_at: string;
}

interface HealthCheck {
  status: string;
  checks?: Record<string, string>;
  database?: string;
  timestamp?: string;
}

export default function Settings() {
  const { theme } = useConsoleTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pendingFlags, setPendingFlags] = useState<Record<string, boolean>>({});
  const [saveMsg, setSaveMsg] = useState('');

  const { data: flags = [], isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['/api/admin/feature-flags'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: health } = useQuery<HealthCheck>({
    queryKey: ['/api/health'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    flags.forEach(f => { initial[f.flag_key] = f.flag_value; });
    setPendingFlags(initial);
  }, [flags]);

  const saveMutation = useMutation({
    mutationFn: async ({ flag_key, flag_value }: { flag_key: string; flag_value: boolean }) => {
      const res = await apiRequest('POST', '/api/admin/feature-flags', { flag_key, flag_value });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/feature-flags'] });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    },
  });

  async function handleSaveAll() {
    const originals: Record<string, boolean> = {};
    flags.forEach(f => { originals[f.flag_key] = f.flag_value; });
    for (const [key, val] of Object.entries(pendingFlags)) {
      if (originals[key] !== val) {
        await saveMutation.mutateAsync({ flag_key: key, flag_value: val });
      }
    }
    setSaveMsg('All changes saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  }

  const consoleRole = user ? appRoleToConsoleRole(user.role ?? '') : 'read_only';

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: '0 0 24px' }}>Settings</h1>

      {/* Feature Flags */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary }}>Feature Flags</div>
            <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>Toggle platform features in real-time</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveMsg && <span style={{ fontSize: 12, color: theme.semantic.success }}>{saveMsg}</span>}
            <button onClick={handleSaveAll} disabled={saveMutation.isPending} style={{ padding: '8px 16px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saveMutation.isPending ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {flagsLoading ? (
          <div style={{ color: theme.text.muted, fontSize: 13 }}>Loading flags...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flags.map(flag => (
              <div key={flag.flag_key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: theme.surfaces.sunken, borderRadius: 8, border: `1px solid ${theme.border.default}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, fontFamily: 'monospace' }}>{flag.flag_key}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>{flag.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: pendingFlags[flag.flag_key] ? theme.semantic.success : theme.text.muted }}>
                    {pendingFlags[flag.flag_key] ? 'ON' : 'OFF'}
                  </span>
                  <div
                    onClick={() => setPendingFlags(prev => ({ ...prev, [flag.flag_key]: !prev[flag.flag_key] }))}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                      background: pendingFlags[flag.flag_key] ? theme.semantic.success : theme.border.strong,
                      position: 'relative',
                    }}>
                    <div style={{
                      position: 'absolute', top: 3, left: pendingFlags[flag.flag_key] ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>System Health</div>
        {health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: theme.text.primary }}>API Status</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: health.status === 'ok' ? theme.semantic.success : theme.semantic.error }}>{health.status === 'ok' ? 'Healthy' : health.status}</span>
            </div>
            {health.database && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: theme.text.primary }}>Database</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: health.database === 'connected' ? theme.semantic.success : theme.semantic.error }}>{health.database}</span>
              </div>
            )}
            {health.checks && Object.entries(health.checks).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: theme.text.primary }}>{key}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: val === 'ok' || val === 'healthy' ? theme.semantic.success : theme.semantic.warning }}>{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: theme.text.muted, fontSize: 13 }}>Loading health status...</div>
        )}
      </div>

      {/* Console Access */}
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Console Access</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: theme.text.muted }}>Logged in as</span>
            <span style={{ fontSize: 13, color: theme.text.primary, fontWeight: 500 }}>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: theme.text.muted }}>App Role</span>
            <span style={{ fontSize: 13, color: theme.text.primary, fontWeight: 500 }}>{user?.role}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: theme.surfaces.sunken, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: theme.text.muted }}>Console Role</span>
            <span style={{ fontSize: 13, color: theme.brand.blue, fontWeight: 600 }}>{consoleRole}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
