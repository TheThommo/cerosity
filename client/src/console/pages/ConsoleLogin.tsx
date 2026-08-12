import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ConsoleThemeProvider, useConsoleTheme } from '../ConsoleThemeProvider';
import { apiRequest, queryClient } from '@/lib/queryClient';

function LoginForm() {
  const { theme } = useConsoleTheme();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      const user = await res.json();
      if (user.role !== 'admin' && user.role !== 'coach') {
        setError('Access denied. HQ console requires admin or coach role.');
        return;
      }
      // useAuth already cached the 401 from before sign-in, and nothing here
      // refetches it, so navigating alone left the console redirecting straight
      // back to this form until a hard reload. Seed the cache with the user we
      // were just handed.
      queryClient.setQueryData(['/api/auth/me'], user);
      navigate('/console');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.surfaces.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 12, padding: 40, width: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme.brand.red }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme.brand.blue }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: theme.text.primary }}>Cerosity HQ</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: theme.text.muted, marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: theme.text.muted, marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ color: theme.semantic.error, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: theme.brand.blue, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {loading ? 'Signing in...' : 'Sign in to HQ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ConsoleLogin() {
  return <ConsoleThemeProvider><LoginForm /></ConsoleThemeProvider>;
}
