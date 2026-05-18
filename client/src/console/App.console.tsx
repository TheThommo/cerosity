import React, { lazy, Suspense } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { ConsoleThemeProvider, useConsoleTheme } from './ConsoleThemeProvider';
import { ConsoleLayout } from './ConsoleLayout';
import { appRoleToConsoleRole } from './consolePermissions';
import { useAuth } from '@/hooks/useAuth';

const ConsoleLogin = lazy(() => import('./pages/ConsoleLogin'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Users = lazy(() => import('./pages/Users'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const CoachingData = lazy(() => import('./pages/CoachingData'));
const FloChat = lazy(() => import('./pages/FloChat'));
const FloBrainDocs = lazy(() => import('./pages/FloBrainDocs'));
const FloSportContexts = lazy(() => import('./pages/FloSportContexts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DBExplorer = lazy(() => import('./pages/DBExplorer'));
const Settings = lazy(() => import('./pages/Settings'));
const Support = lazy(() => import('./pages/Support'));

function ConsoleRouter() {
  const { user, isLoading } = useAuth();
  const { theme } = useConsoleTheme();

  if (isLoading) {
    return (
      <div style={{ background: theme.surfaces.base, color: theme.text.primary, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  const isAuthorized = user && (user.role === 'admin' || user.role === 'coach');
  const consoleRole = user ? appRoleToConsoleRole(user.role ?? '') : 'read_only';

  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/console/login" component={ConsoleLogin} />
        {!isAuthorized ? (
          <Route>
            <Redirect to="/console/login" />
          </Route>
        ) : (
          <Route>
            <ConsoleLayout consoleRole={consoleRole}>
              <Switch>
                <Route path="/console" component={CommandCenter} />
                <Route path="/console/users" component={Users} />
                <Route path="/console/subscriptions" component={Subscriptions} />
                <Route path="/console/coaching" component={CoachingData} />
                <Route path="/console/flo" component={FloChat} />
                <Route path="/console/flo-brain" component={FloBrainDocs} />
                <Route path="/console/flo-sports" component={FloSportContexts} />
                <Route path="/console/analytics" component={Analytics} />
                <Route path="/console/db" component={DBExplorer} />
                <Route path="/console/settings" component={Settings} />
                <Route path="/console/support" component={Support} />
                <Route>
                  <Redirect to="/console" />
                </Route>
              </Switch>
            </ConsoleLayout>
          </Route>
        )}
      </Switch>
    </Suspense>
  );
}

export default function ConsoleApp() {
  return (
    <ConsoleThemeProvider>
      <ConsoleRouter />
    </ConsoleThemeProvider>
  );
}
