import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard } from "lucide-react";
import { FloAvatar } from "@/components/flo-avatar";

export default function PaymentRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutUrl = urlParams.get("url");

    if (checkoutUrl) {
      const decodedUrl = decodeURIComponent(checkoutUrl);
      window.location.replace(decodedUrl);
    }
  }, []);

  const handleManualRedirect = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutUrl = urlParams.get("url");

    if (checkoutUrl) {
      const decodedUrl = decodeURIComponent(checkoutUrl);
      window.open(decodedUrl, '_blank');
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const checkoutUrl = urlParams.get("url");

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden mr-2">
              <FloAvatar size={40} variant="mini" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cerosity</h1>
          </div>
          <CardTitle className="text-white">Redirecting to Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-400">
              You're being redirected to complete your payment securely through Stripe...
            </p>
          </div>

          {checkoutUrl && (
            <div className="space-y-3">
              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400 mb-2">
                  If the redirect doesn't work automatically:
                </p>
                <Button
                  onClick={handleManualRedirect}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="mr-2" size={16} />
                  Continue to Payment
                </Button>
              </div>

              <div className="text-center">
                <a
                  href={decodeURIComponent(checkoutUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm"
                >
                  <ExternalLink className="mr-1" size={14} />
                  Open payment page in new tab
                </a>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-sm text-slate-400 hover:text-white"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
