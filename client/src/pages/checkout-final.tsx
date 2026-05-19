import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { TIER_PRICING, type SubscriptionTier } from "@shared/entitlements";
import { FloAvatar } from "@/components/flo-avatar";

// Fetch Stripe config from backend
let stripePromise: Promise<any> | null = null;

async function getStripeConfig() {
  try {
    const response = await fetch('/api/stripe-config');
    const data = await response.json();
    if (!response.ok || !data.publishableKey) {
      throw new Error(data.error || 'Failed to get Stripe configuration');
    }
    return data.publishableKey;
  } catch (error) {
    console.error('Failed to fetch Stripe config:', error);
    throw error;
  }
}

stripePromise = getStripeConfig().then(publishableKey => loadStripe(publishableKey));

interface CheckoutFormProps {
  amount: number;
  tier: string;
  interval: string;
}

function CheckoutForm({ amount, tier, interval }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isPaymentElementReady) {
      toast({
        title: "Payment Not Ready",
        description: "Please wait for the payment form to load completely.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/signup-after-payment?tier=${tier}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        sessionStorage.setItem('paidTier', tier);
        setLocation(`/signup-after-payment?tier=${tier}`);
      }
    } catch {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const label = interval === "month"
    ? `Pay $${amount}/mo — Start Subscription`
    : `Pay $${amount} — Complete Purchase`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[200px] p-4">
        <PaymentElement
          onReady={() => setIsPaymentElementReady(true)}
          onLoadError={() => {
            toast({
              title: "Payment Form Error",
              description: "Failed to load payment form. Please refresh and try again.",
              variant: "destructive",
            });
          }}
        />
      </div>

      {!isPaymentElementReady && (
        <div className="text-center text-sm text-slate-500 py-2">
          Loading secure payment form...
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || !isPaymentElementReady || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processing..." :
         !isPaymentElementReady ? "Loading Payment Form..." :
         label}
      </Button>
    </form>
  );
}

type CheckoutTier = "flo" | "premium" | "ultimate";

export default function CheckoutFinal() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<CheckoutTier>("premium");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tierParam = urlParams.get("tier") as CheckoutTier | null;
    const validTiers: CheckoutTier[] = ["flo", "premium", "ultimate"];
    const resolvedTier = tierParam && validTiers.includes(tierParam) ? tierParam : "premium";
    setTier(resolvedTier);

    const pricing = TIER_PRICING[resolvedTier];

    apiRequest("POST", "/api/create-payment-intent", {
      amount: pricing.price,
      tier: resolvedTier,
      description: `Cerosity ${pricing.name} — ${pricing.interval === "month" ? "Monthly" : "Lifetime Access"}`
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError('Failed to initialize payment');
        }
      })
      .catch(() => {
        setError('Failed to initialize payment');
      });
  }, []);

  const pricing = TIER_PRICING[tier];

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-red-400">Payment Setup Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button onClick={() => setLocation("/#pricing-section")} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="mr-2" size={16} />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse border border-blue-500/30">
            <FloAvatar size={32} variant="mini" />
          </div>
          <p className="text-slate-400">Setting up secure payment...</p>
        </div>
      </div>
    );
  }

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
          <CardContent>
            <Elements
              key={`elements-${clientSecret}`}
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night' as const,
                  variables: {
                    colorPrimary: '#2563eb',
                    colorBackground: '#0f172a',
                    colorText: '#e2e8f0',
                    colorTextSecondary: '#94a3b8',
                    colorDanger: '#ef4444',
                  }
                }
              }}
            >
              <CheckoutForm
                amount={pricing.price}
                tier={tier}
                interval={pricing.interval}
              />
            </Elements>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Payments are securely processed by Stripe</p>
          <p>Your payment information is never stored on our servers</p>
        </div>
      </div>
    </div>
  );
}
