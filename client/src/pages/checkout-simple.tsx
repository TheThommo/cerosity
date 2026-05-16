import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ amount, tier }: { amount: number; tier: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();

  // Debug logging
  useEffect(() => {
    console.log('CheckoutForm mounted with:', { stripe: !!stripe, elements: !!elements, amount, tier });
  }, [stripe, elements, amount, tier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
        toast({
          title: "Payment Successful",
          description: "Thank you for your purchase!",
        });
        // Store the tier info for post-payment signup
        sessionStorage.setItem('paidTier', tier);
        setLocation(`/signup-after-payment?tier=${tier}`);
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!stripe || !elements) {
    return (
      <div className="space-y-6">
        <div className="min-h-[200px] border border-gray-200 rounded-md p-4 flex items-center justify-center">
          <p className="text-gray-500">Loading payment form...</p>
        </div>
        <Button disabled className="w-full bg-gray-400">
          Loading...
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[200px] border border-gray-200 rounded-md p-4">
        <PaymentElement 
          onReady={() => console.log('PaymentElement is ready')}
          onChange={(event) => console.log('PaymentElement changed:', event)}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isProcessing ? "Processing..." : `Pay $${amount} - Complete Purchase`}
      </Button>
    </form>
  );
};

export default function CheckoutSimple() {
  const [clientSecret, setClientSecret] = useState("");
  const [tier, setTier] = useState<"premium" | "ultimate">("premium");
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Debug logging
  useEffect(() => {
    console.log('CheckoutSimple state:', { clientSecret: !!clientSecret, tier, loading });
  }, [clientSecret, tier, loading]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tierParam = urlParams.get("tier") as "premium" | "ultimate";
    if (tierParam) {
      setTier(tierParam);
    }

    const amount = tierParam === "ultimate" ? 2190 : 490;
    
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { 
      amount, 
      tier: tierParam || "premium",
      description: `Red2Blue ${tierParam === "ultimate" ? "Ultimate" : "Premium"} Access - Lifetime`
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error creating payment intent:", error);
        setLoading(false);
        // Show error in the UI
        setClientSecret("");
      });
  }, []); // Empty dependency array to run only once

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 gradient-red-blue rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <Brain className="text-white" size={32} />
          </div>
          <p className="text-gray-600">Setting up secure payment...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Payment Setup Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Unable to initialize payment. Please try again.</p>
            <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
              <ArrowLeft className="mr-2" size={16} />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = {
    premium: { amount: 490, name: "Premium Access" },
    ultimate: { amount: 2190, name: "Ultimate Access" }
  };

  const currentTier = tierInfo[tier];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4">
            <ArrowLeft className="mr-2" size={16} />
            Back to Pricing
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Brain className="text-blue-600 mr-2" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Red2Blue</h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">
              Complete Your {currentTier.name}
            </h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              ${currentTier.amount} - {currentTier.name}
            </CardTitle>
            <p className="text-center text-gray-600">
              One-time payment • Lifetime access • No recurring fees
            </p>
          </CardHeader>
          <CardContent>
            {clientSecret && (
              <Elements 
                key={clientSecret} // Force remount when clientSecret changes
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe' as const,
                    variables: {
                      colorPrimary: '#2563eb',
                    }
                  }
                }}
              >
                <CheckoutForm 
                  amount={currentTier.amount} 
                  tier={tier}
                />
              </Elements>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}