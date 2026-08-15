import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CerosityLogo } from "@/components/cerosity-logo";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Choosing a new password from an emailed link.
 *
 * The token comes from the query string and is sent back untouched; the server
 * matches it against a stored digest, checks it hasn't expired, and spends it.
 * Nothing here decides whether the link is valid — that answer only arrives
 * with the response.
 */
export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Those two passwords don't match.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || "Couldn't reset your password. Request a new link.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch {
      setError("Couldn't reach Cerosity just then. Try again in a moment.");
    } finally {
      setIsSaving(false);
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
          {!token ? (
            <>
              <h1 className="text-xl font-bold text-white mb-3">This link is incomplete</h1>
              <p className="text-slate-300 text-sm">
                Open the link straight from your email, or request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex items-center min-h-[44px] text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Request a new link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="text-xl font-bold text-white mb-3">Password updated</h1>
              <p className="text-slate-300 text-sm">
                You can sign in with your new password now. Taking you there...
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center min-h-[44px] text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Choose a new password</h1>
              <p className="text-slate-400 text-sm mb-6">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    placeholder="Enter a new password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    placeholder="Enter it again"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isSaving ? "Saving..." : "Set new password"}
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
