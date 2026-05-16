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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 gradient-red-blue rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">Loading Cerosity...</p>
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
          {/* Legal pages - accessible to everyone */}
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/cookie-policy" component={CookiePolicy} />
          <Route path="/data-processing" component={DataProcessing} />
          <Route path="/acceptable-use" component={AcceptableUse} />
          <Route component={Landing} />
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
