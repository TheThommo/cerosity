import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FloChatWidget } from "@/components/flo-chat-widget";
import { Footer } from "@/components/footer";
import { StableSignUpForm } from "@/components/stable-signup-form";
import { CerosityLogo } from "@/components/cerosity-logo";
import { TIER_PRICING, type SubscriptionTier } from "@shared/entitlements";
import Checkout from "./checkout";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("free");
  const [showSignIn, setShowSignIn] = useState(false);

  if (showCheckout) {
    return <Checkout tier={selectedTier} onBack={() => setShowCheckout(false)} />;
  }

  if (showSignUp) {
    return <StableSignUpForm onBack={() => setShowSignUp(false)} selectedTier={selectedTier} />;
  }

  if (showSignIn) {
    return <SignInForm onBack={() => setShowSignIn(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <CerosityLogo size={28} className="opacity-90" />
              <span className="text-lg font-semibold tracking-tight">Cerosity</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowSignIn(true)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-slate-200 transition-colors"
              >
                Talk to FLO
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32">

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium">AI mental coaching for athletes</span>
              </div>

              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[0.95] tracking-tight mb-8">
                <span className="text-red-400">Red Head</span>
                <br />
                <span className="text-slate-500">to</span>
                <br />
                <span className="text-blue-400">Blue Head</span>
              </h1>

              <p className="text-lg lg:text-xl text-slate-400 leading-relaxed mb-10 max-w-md">
                Transform pressure into performance. FLO is your AI mental coach — trained in Red2Blue methodology, available 24/7, remembers everything.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    document.getElementById("chat-demo")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-6 py-3.5 bg-white text-black rounded-full font-medium hover:bg-slate-200 transition-all text-sm inline-flex items-center gap-2"
                >
                  Try FLO free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-6 py-3.5 border border-white/15 rounded-full font-medium text-slate-300 hover:text-white hover:border-white/30 transition-all text-sm"
                >
                  How it works
                </button>
              </div>
            </div>

            <div className="lg:translate-y-4" id="chat-demo">
              <FloChatWidget guestMode={true} onGateReached={() => setShowSignUp(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* Credential strip — no invented metrics */}
      <section className="border-y border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-sm text-slate-500">
            <span><strong className="text-slate-300">Red2Blue</strong> certified methodology</span>
            <span>Built by sports psychologists</span>
            <span><strong className="text-slate-300">GDPR</strong> compliant</span>
          </div>
        </div>
      </section>

      {/* Methodology — Red to Blue journey */}
      <section id="methodology" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              The science of mental state shifting
            </h2>
            <p className="text-lg text-slate-400">
              Red2Blue is the proven framework elite athletes use to transform reactive stress into focused performance — in seconds, not sessions.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            <div className="bg-[#0a0a0f] p-8 lg:p-10">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-3">Red Head</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Doubt, tension, overthinking. When pressure triggers your threat response, performance collapses.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>"I can't miss this"</li>
                <li>"Everyone's watching"</li>
                <li>"Not again..."</li>
              </ul>
            </div>

            <div className="bg-[#0a0a0f] p-8 lg:p-10 border-x border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-white/10 flex items-center justify-center mb-6">
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-3">The Shift</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                FLO teaches you specific techniques — breathing patterns, focus cues, reframing — that trigger the shift in real time.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Recognize the state</li>
                <li>Apply the technique</li>
                <li>Execute with clarity</li>
              </ul>
            </div>

            <div className="bg-[#0a0a0f] p-8 lg:p-10">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-blue-400 mb-3">Blue Head</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Trust, clarity, flow. Peak performance state where decisions are sharp and execution is automatic.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>"See it, trust it, do it"</li>
                <li>"One shot at a time"</li>
                <li>"I've trained for this"</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features — asymmetric grid */}
      <section className="py-24 lg:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-16 items-start">
            <div className="lg:col-span-2 lg:sticky lg:top-32">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Not another chatbot.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                FLO is a mental performance system — trained on Red2Blue methodology, personalized to your patterns, integrated with your coaching journey.
              </p>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <FeatureCard
                title="Breathing exercises, rendered"
                description="When FLO recommends a 4-7-8 breathing technique, you get an interactive timer right in the conversation — not a paragraph of instructions."
                accent="blue"
              />
              <FeatureCard
                title="Remembers your context"
                description="FLO knows your handicap, your triggers, your goals. Every conversation builds on the last. No starting from scratch."
                accent="amber"
              />
              <FeatureCard
                title="Mood & energy tracking"
                description="Quick check-ins that surface patterns between your mental state and performance. See the correlation over time."
                accent="red"
              />
              <FeatureCard
                title="Voice coaching (coming)"
                description="VAPI-powered voice sessions for on-course coaching. Like having your mental coach in your ear during a round."
                accent="emerald"
              />
              <FeatureCard
                title="Progress you can see"
                description="Track your Red-to-Blue ratio over time. Watch your mental resilience score climb as you practice the techniques."
                accent="violet"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Start free. Scale when ready.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Try FLO with 6 messages per session. Upgrade for unlimited coaching, advanced analytics, or human coach pairing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {(["free", "flo", "premium", "ultimate"] as SubscriptionTier[]).map((tier) => {
              const config = TIER_PRICING[tier];
              const isPopular = tier === "flo";
              return (
                <div
                  key={tier}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    isPopular
                      ? "bg-white/[0.04] border-2 border-white/20"
                      : "bg-white/[0.02] border border-white/10"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-white text-black text-xs font-medium rounded-full">
                      Most popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-1">{config.name}</h3>
                    <p className="text-sm text-slate-500">{config.tagline}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">
                      {config.price === 0 ? "Free" : `$${config.price.toLocaleString()}`}
                    </span>
                    {config.price > 0 && (
                      <span className="text-sm text-slate-500 ml-1">
                        /{config.interval === "month" ? "mo" : "once"}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {config.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (tier === "free") {
                        setSelectedTier("free");
                        setShowSignUp(true);
                      } else {
                        setLocation(`/checkout?tier=${tier}`);
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                      isPopular
                        ? "bg-white text-black hover:bg-slate-200"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {tier === "free" ? "Create account" : `Get ${config.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust / Privacy */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Shield className="w-10 h-10 text-slate-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Your mental game is private</h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Encrypted storage. GDPR compliant. Your performance data never leaves the platform and is never shared with third parties. What you tell FLO stays with FLO.
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-500">
            <span>AES-256 encryption</span>
            <span>SOC 2 in progress</span>
            <span>GDPR compliant</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Your next round starts in your head
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            The difference between choking and performing isn't talent — it's mental state management. Start training yours today.
          </p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => {
                const input = document.querySelector("[data-chat-input]") as HTMLElement;
                input?.focus();
              }, 600);
            }}
            className="px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-slate-200 transition-all text-base inline-flex items-center gap-2"
          >
            Talk to FLO now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ title, description, accent = "blue" }: { title: string; description: string; accent?: string }) {
  const accentColors: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    red: "bg-red-500/10 border-red-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    violet: "bg-violet-500/10 border-violet-500/20",
  };
  const dotColors: Record<string, string> = {
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    emerald: "bg-emerald-400",
    violet: "bg-violet-400",
  };

  return (
    <div className="group p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-lg ${accentColors[accent]} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <div className={`w-2 h-2 rounded-full ${dotColors[accent]}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold mb-1.5 group-hover:text-white transition-colors">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Welcome back!", description: "Signed in successfully." });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({ title: "Sign In Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <CerosityLogo size={28} />
            <span className="text-lg font-semibold text-white">Cerosity</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-400">Sign in to continue your coaching</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="Enter password"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{" "}
          <button onClick={onBack} className="text-slate-300 underline hover:text-white">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
