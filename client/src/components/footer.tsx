import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";

export function Footer() {
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
                <Phone className="h-4 w-4" />
                <span>+971505283505</span>
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