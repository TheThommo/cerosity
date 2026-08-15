import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";

import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary, NavigationErrorFallback } from "@/components/error-boundary";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Assessment from "@/pages/assessment";
import Techniques from "@/pages/techniques";
import Tools from "@/pages/tools";
import Community from "@/pages/community";
import CoachDashboard from "@/pages/coach-dashboard";
import Profile from "@/pages/profile-new";
import Learn from "@/pages/learn";
import Flo from "@/pages/flo";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Lesson from "@/pages/lesson";
import RecommendationsPage from "@/pages/recommendations";
import Goals from "@/pages/goals";
import Scenarios from "@/pages/scenarios";
import CoachingTools from "@/pages/coaching-tools";
import HumanCoaching from "@/pages/human-coaching";
import Help from "@/pages/help";
import Features from "@/pages/features";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import RefundPolicy from "@/pages/refund-policy";
import CookiePolicy from "@/pages/cookie-policy";
import DataProcessing from "@/pages/data-processing";
import AcceptableUse from "@/pages/acceptable-use";
import NotFound from "@/pages/not-found";
import FreeDashboard from "@/pages/free-dashboard";
import SignupAfterPayment from "@/pages/signup-after-payment";
import CheckoutSimple from "@/pages/checkout-simple";
import CheckoutFinal from "@/pages/checkout-final";
import CheckoutHosted from "@/pages/checkout-hosted";
import PaymentRedirect from "@/pages/payment-redirect";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminLogin from "@/pages/admin-login";
import { AdminGuard } from "@/components/admin-guard";
import DemoAccess from "@/pages/demo-access";
import { canAccessDashboard } from "@/lib/permissions";
import { isConsoleHost } from "./console/consoleRouting";
import ConsoleApp from "./console/App.console";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="w-8 h-8 bg-slate-950 rounded-full"></div>
          </div>
          <p className="text-slate-400">Loading Cerosity...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Switch>
          <Route path="/signup-after-payment" component={SignupAfterPayment} />
          <Route path="/signup-success" component={SignupAfterPayment} />
          <Route path="/checkout-simple" component={CheckoutSimple} />
          <Route path="/checkout" component={CheckoutFinal} />
          <Route path="/checkout-hosted" component={CheckoutHosted} />
          <Route path="/payment-redirect" component={PaymentRedirect} />
          <Route path="/admin-login" component={AdminLogin} />
          {/* Bookmarkable auth URLs — both render the landing page opened
              straight onto the relevant form (audit A5) */}
          <Route path="/login">{() => <Landing initialView="signin" />}</Route>
          <Route path="/signup">{() => <Landing initialView="signup" />}</Route>
          {/* Recovery has to be reachable signed out — that is the whole point */}
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          {/* Legal pages - accessible to everyone */}
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/cookie-policy" component={CookiePolicy} />
          <Route path="/data-processing" component={DataProcessing} />
          <Route path="/acceptable-use" component={AcceptableUse} />
          <Route path="/help" component={Help} />
          <Route path="/community">{() => <Community userId={0} />}</Route>
          <Route>{() => <Landing />}</Route>
        </Switch>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ErrorBoundary fallback={NavigationErrorFallback}>
          <Navigation />
        </ErrorBoundary>
        <main className="flex-1">
          <ErrorBoundary fallback={NavigationErrorFallback}>
            <Switch>
              {/* Home route - redirect based on tier */}
              <Route path="/">
                {() => canAccessDashboard(user) ? <Home /> : <FreeDashboard />}
              </Route>
              
              {/* Dashboard route - tier-dependent */}
              <Route path="/dashboard">
                {() => canAccessDashboard(user) ? <Dashboard /> : <FreeDashboard />}
              </Route>
              
              {/* Assessment - available to all tiers but limited for free */}
              <Route path="/assessment" component={Assessment} />
              
              {/* Premium/Ultimate only routes */}
              {canAccessDashboard(user) && (
                <>
                  <Route path="/techniques" component={Techniques} />
                  <Route path="/tools" component={Tools} />
                  <Route path="/recommendations" component={RecommendationsPage} />
                  <Route path="/goals" component={Goals} />
                  <Route path="/scenarios" component={Scenarios} />
                  <Route path="/coaching-tools" component={CoachingTools} />
                  <Route path="/community">
                    {() => <Community userId={user?.id || 1} />}
                  </Route>
                </>
              )}
              
              {/* Ultimate only routes */}
              {user?.subscriptionTier === 'ultimate' && (
                <Route path="/human-coaching" component={HumanCoaching} />
              )}
              
              {/* Available to all authenticated users */}
              {/* Learning curriculum — visible to all tiers; free users see locked
                  lessons + free-preview teasers, content gating is enforced server-side */}
              {/* FLO itself — every tier, since the chat limit is enforced
                  server-side and a free athlete should still meet the coach */}
              <Route path="/flo" component={Flo} />
              <Route path="/learn" component={Learn} />
              <Route path="/learn/lesson/:slug">
                {(params) => <Lesson slug={params.slug} />}
              </Route>
              <Route path="/profile" component={Profile} />
              <Route path="/demo" component={DemoAccess} />
              <Route path="/help" component={Help} />
              <Route path="/features" component={Features} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />
              <Route path="/refund-policy" component={RefundPolicy} />
              <Route path="/cookie-policy" component={CookiePolicy} />
              <Route path="/data-processing" component={DataProcessing} />
              <Route path="/acceptable-use" component={AcceptableUse} />
              <Route path="/payment-redirect" component={PaymentRedirect} />
              
              {/* Admin/Coach only routes */}
              {(user?.role === 'admin' || user?.role === 'coach') && (
                <Route path="/coach" component={CoachDashboard} />
              )}
              
              {/* Admin routes with proper security */}
              <Route path="/admin" component={() => (
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              )} />
              
              {/* Admin login */}
              <Route path="/admin-login" component={AdminLogin} />
              
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </main>
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>

      </div>
    </ErrorBoundary>
  );
}

function Router() {
  if (isConsoleHost()) {
    return <ConsoleApp />;
  }
  return <AppContent />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
