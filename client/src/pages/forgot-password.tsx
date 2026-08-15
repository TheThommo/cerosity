import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CerosityLogo } from "@/components/cerosity-logo";

/**
 * Asking for a reset link.
 *
 * The server answers the same way whether or not the address has an account,
 * and so does this page — showing "no such account" here would undo the point
 * of the endpoint being careful about it.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true);
    } catch {
      setError("Couldn't reach Cerosity just then. Try again in a moment.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <CerosityLogo size={32} />
          <span className="text-2xl font-bold text-white">Cerosity</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
          {sent ? (
            <>
              <h1 className="text-xl font-bold text-white mb-3">Check your email</h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                If that email has a Cerosity account, a reset link is on its way. It works
                once and expires in 60 minutes.
              </p>
              <p className="text-slate-500 text-sm mt-4">
                Nothing arrived? Check spam, then try again with the address you signed up with.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center min-h-[44px] text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                ← Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Forgot your password?</h1>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email and we'll send you a link to choose a new one.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isSending ? "Sending..." : "Send reset link"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200">
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
