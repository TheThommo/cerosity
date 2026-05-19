import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface CheckoutFormProps {
  tier: string;
  amount: number;
  onSuccess: () => void;
}

const CheckoutForm = ({ tier, amount, onSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/signup-success?tier=${tier}`,
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Redirecting to complete your account setup...",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
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

interface CheckoutProps {
  tier: string;
  onBack: () => void;
}

export default function Checkout({ tier, onBack }: CheckoutProps) {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);

  const tierInfo = {
    flo: { amount: 30, name: "FLO Subscription", description: "Unlimited AI mental performance coaching" },
    premium: { amount: 590, name: "Elite Digital Coaching", description: "Complete AI coaching with all features" },
    ultimate: { amount: 2290, name: "Master Human Coaching", description: "AI + Human coaching with personal sessions" }
  };

  const currentTier = tierInfo[tier as keyof typeof tierInfo];

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: currentTier.amount,
      tier: tier,
      description: `Red2Blue ${currentTier.name} - Lifetime Access`
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Payment setup error:", error);
        setLoading(false);
      });
  }, [tier, currentTier]);

  const handlePaymentSuccess = () => {
    // Store the tier info in sessionStorage for post-payment signup
    sessionStorage.setItem('paidTier', tier);
    setLocation(`/signup-after-payment?tier=${tier}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse border border-blue-500/30">
            <Brain className="text-blue-400" size={32} />
          </div>
          <p className="text-slate-400">Setting up your payment...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-red-400">Payment Setup Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-4">Unable to initialize payment. Please try again.</p>
            <Button onClick={onBack} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="mr-2" size={16} />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
              <Brain className="text-blue-400" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Purchase</h1>
          <p className="text-slate-400">Secure your {currentTier.name}</p>
        </div>

        <Card className="mb-6 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>{currentTier.name}</span>
              <span className="text-2xl font-bold text-blue-400">${currentTier.amount}</span>
            </CardTitle>
            <p className="text-slate-400">{currentTier.description}</p>
            <p className="text-sm text-green-400 font-medium">{tier === 'flo' ? 'Monthly subscription • Cancel anytime' : 'One-time payment • Lifetime access • No recurring fees'}</p>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                tier={tier}
                amount={currentTier.amount}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2" size={16} />
            Back to Pricing
          </Button>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Payments are securely processed by Stripe</p>
          <p>Your payment information is never stored on our servers</p>
        </div>
      </div>
    </div>
  );
}