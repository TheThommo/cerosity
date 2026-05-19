import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";
import { TIER_PRICING } from "@shared/entitlements";
import { FloAvatar } from "@/components/flo-avatar";

type CheckoutTier = "flo" | "premium" | "ultimate";

export default function CheckoutHosted() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<CheckoutTier>("premium");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tierParam = urlParams.get("tier") as CheckoutTier | null;
    const validTiers: CheckoutTier[] = ["flo", "premium", "ultimate"];
    if (tierParam && validTiers.includes(tierParam)) {
      setTier(tierParam);
    }
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const pricing = TIER_PRICING[tier];

      const response = await apiRequest("POST", "/api/create-checkout-session", {
        tier,
        amount: pricing.price,
        success_url: `${window.location.origin}/signup-after-payment?tier=${tier}`,
        cancel_url: window.location.href
      });

      const data = await response.json();

      if (data.url) {
        setCheckoutUrl(data.url);
        const redirectUrl = `/payment-redirect?url=${encodeURIComponent(data.url)}`;
        setLocation(redirectUrl);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch {
      setError('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const pricing = TIER_PRICING[tier];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/#pricing-section")} className="mb-4 text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2" size={16} />
            Back to Pricing
          </Button>

          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <FloAvatar size={48} variant="mini" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">Cerosity</h1>
            <h2 className="text-xl font-semibold text-slate-300">
              Complete Your {pricing.name}
            </h2>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-white">
              ${pricing.price}{pricing.interval === "month" ? "/mo" : ""} — {pricing.name}
            </CardTitle>
            <p className="text-center text-slate-400">
              {pricing.interval === "month"
                ? "Monthly subscription · Cancel anytime"
                : "One-time payment · Lifetime access · No recurring fees"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-2">Secure Payment Processing</h3>
              <p className="text-blue-400/80 text-sm">
                Your payment will be processed securely through Stripe.
                You'll be redirected to enter your payment details safely.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-lg">
                <p className="text-red-400">{error}</p>
                {checkoutUrl && (
                  <div className="mt-3">
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <CreditCard className="mr-2" size={16} />
                      Click here to continue payment
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">{pricing.name}</span>
                <span className="font-semibold text-white">${pricing.price}{pricing.interval === "month" ? "/mo" : ""}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Processing Fee</span>
                <span className="font-semibold text-white">$0</span>
              </div>
              <div className="flex items-center justify-between py-2 font-bold text-lg">
                <span className="text-white">Total</span>
                <span className="text-white">${pricing.price}{pricing.interval === "month" ? "/mo" : ""}</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2" size={20} />
                  Proceed to Secure Payment
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              Powered by Stripe · Your payment information is secure and encrypted
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
