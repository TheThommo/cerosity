import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { StableSignUpForm } from '@/components/stable-signup-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { TIER_PRICING, type SubscriptionTier } from "@shared/entitlements";

export default function SignupAfterPayment() {
  const [location] = useLocation();
  const [tier, setTier] = useState<string>('free');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const tierFromUrl = urlParams.get('tier');
    const tierFromStorage = sessionStorage.getItem('paidTier');

    const selectedTier = tierFromUrl || tierFromStorage || 'free';
    setTier(selectedTier);

    sessionStorage.removeItem('paidTier');
  }, [location]);

  const pricing = TIER_PRICING[tier as SubscriptionTier] || TIER_PRICING.free;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Payment Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-slate-400">Complete your account setup to access your {pricing.name}</p>
        </div>

        {/* Payment Summary */}
        {tier !== 'free' && (
          <Card className="mb-8 bg-green-950/30 border-green-900/50">
            <CardHeader>
              <CardTitle className="text-green-300 flex items-center">
                <CheckCircle className="mr-2" size={20} />
                Cerosity {pricing.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-green-400">{pricing.interval === "month" ? "Monthly Subscription" : "Lifetime Access Purchased"}</span>
                <span className="text-2xl font-bold text-green-300">${pricing.price}{pricing.interval === "month" ? "/mo" : ""}</span>
              </div>
              <p className="text-sm text-green-400/70 mt-2">
                {pricing.interval === "month" ? "Cancel anytime · Full access to FLO" : "No recurring charges · Full access to all features"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Signup Form */}
        <StableSignUpForm
          selectedTier={tier}
          isPaidUser={true}
          onBack={() => window.location.href = '/'}
        />
      </div>
    </div>
  );
}
