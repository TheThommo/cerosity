import { useState } from "react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Loader2, CheckCircle } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";

export function Footer() {
  const [footerForm, setFooterForm] = useState({ name: "", email: "", sport: "", country: "" });
  const [footerStatus, setFooterStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleFooterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerForm.email.includes("@") || !footerForm.name.trim()) return;
    setFooterStatus("sending");
    try {
      const res = await fetch("/api/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: footerForm.email, name: footerForm.name, sportIndustry: footerForm.sport, country: footerForm.country, source: "Footer Form" }),
      });
      if (res.ok) setFooterStatus("sent");
      else setFooterStatus("error");
    } catch { setFooterStatus("error"); }
  };

  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <CerosityLogo size={32} />
              </div>
              <span className="text-xl font-bold">Cerosity</span>
            </div>
            <p className="text-slate-400 text-sm">
              AI-powered mental performance coaching for athletes, coaches, and high performers. Red2Blue methodology meets cutting-edge technology.
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>info@cerosity.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Dubai, UAE</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/help" className="hover:text-white transition-colors">Help & FAQ</Link></li>
              <li><Link href="/community" className="hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link href="/data-processing" className="hover:text-white transition-colors">Data Processing</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
              <li><Link href="/acceptable-use" className="hover:text-white transition-colors">Acceptable Use</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Get Early Access</h4>
            {footerStatus === "sent" ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>You're in! Check your email.</span>
              </div>
            ) : (
              <form onSubmit={handleFooterSubmit} className="space-y-2">
                <Input value={footerForm.name} onChange={(e) => setFooterForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="bg-slate-900 border-slate-700 text-white text-sm h-9 placeholder:text-slate-500" />
                <Input value={footerForm.email} onChange={(e) => setFooterForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" type="email" className="bg-slate-900 border-slate-700 text-white text-sm h-9 placeholder:text-slate-500" />
                <Input value={footerForm.sport} onChange={(e) => setFooterForm(f => ({ ...f, sport: e.target.value }))} placeholder="Sport / area" className="bg-slate-900 border-slate-700 text-white text-sm h-9 placeholder:text-slate-500" />
                <Input value={footerForm.country} onChange={(e) => setFooterForm(f => ({ ...f, country: e.target.value }))} placeholder="Country" className="bg-slate-900 border-slate-700 text-white text-sm h-9 placeholder:text-slate-500" />
                <Button type="submit" disabled={footerStatus === "sending" || !footerForm.email.includes("@")} className="w-full bg-blue-600 hover:bg-blue-500 text-sm h-9">
                  {footerStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join Waitlist"}
                </Button>
                {footerStatus === "error" && <p className="text-red-400 text-xs">Something went wrong. Try again.</p>}
              </form>
            )}
          </div>

        </div>

        <Separator className="my-8 bg-slate-800" />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-slate-500">
            &copy; 2026 Cerosity Mental Performance Coaching. All rights reserved.
          </div>

          <div className="flex items-center space-x-6 text-sm text-slate-500">
            <span>Powered by Cero International</span>
            <span className="text-slate-700">&bull;</span>
            <span>Elite Mental Performance</span>
            <span className="text-slate-700">&bull;</span>
            <span>AI-Enhanced Coaching</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="text-xs text-slate-600 space-y-2">
            <p>
              <strong className="text-slate-500">Disclaimer:</strong> Cerosity provides mental performance coaching tools and techniques for educational and training purposes.
              Individual results may vary. This platform is not a substitute for professional psychological counseling or medical advice.
            </p>
            <p>
              <strong className="text-slate-500">Professional Use:</strong> Designed for athletes, coaches, and high performers seeking mental performance enhancement.
              Techniques are based on established sports psychology principles and should be used as part of a comprehensive training program.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}