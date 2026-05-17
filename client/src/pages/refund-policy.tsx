import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { CerosityLogo } from "@/components/cerosity-logo";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle2, AlertCircle, Mail } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 space-y-8 pt-8">
        <Link href="/"><button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" />Back to Home</button></Link>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden"><CerosityLogo size={32} /></div>
          <h1 className="text-3xl font-bold text-white">Refund Policy</h1>
        </div>
        <p className="text-slate-400">
          Last updated: June 5, 2025
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            14-Day Refund Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            We offer a 14-day refund window from the date of purchase for both Premium ($490) and Ultimate ($2190) subscriptions. 
            This allows you to thoroughly evaluate the Red2Blue platform and ensure it meets your mental performance training needs.
          </p>
          <div className="bg-blue-950/30 p-4 rounded-lg">
            <p className="text-blue-200 font-medium">
              Refund Period: 14 calendar days from the date of your subscription purchase
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Eligibility Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Usage Threshold</h4>
            <p className="text-slate-300">
              To be eligible for a full refund, you must have used less than 25% of your subscription's included features:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
              <li>Fewer than 10 AI coaching conversations with Flo</li>
              <li>Completed fewer than 3 comprehensive mental skills assessments</li>
              <li>Practiced fewer than 5 mental techniques through the platform</li>
              <li>Engaged with community features for less than 2 hours total</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Account Standing</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Account must be in good standing with no violations of Terms of Service</li>
              <li>No evidence of platform misuse or policy violations</li>
              <li>Must provide detailed feedback about experience for refund approval</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Refund Request Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Step 1: Submit Request</h4>
            <p className="text-slate-300">
              Send a refund request to <strong>info@cerosity.com</strong> with the subject line "Refund Request - [Your Username]"
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Step 2: Required Information</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Account email address and username</li>
              <li>Purchase date and subscription tier</li>
              <li>Detailed explanation of why the platform didn't meet your needs</li>
              <li>Specific feedback about features tried and challenges encountered</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Step 3: Review Process</h4>
            <p className="text-slate-300">
              Our team will review your request within 48 hours, verify eligibility requirements, and respond with approval or additional information needed.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Step 4: Processing</h4>
            <p className="text-slate-300">
              Approved refunds are processed within 5-7 business days back to the original payment method through Stripe. 
              You will receive confirmation when the refund has been initiated.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Partial Refunds & Special Cases
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Partial Refund Eligibility</h4>
            <p className="text-slate-300">
              If you've exceeded the 25% usage threshold but still within the 14-day window, you may be eligible for a partial refund based on:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
              <li>Technical issues that prevented full platform access</li>
              <li>Significant platform downtime during your trial period</li>
              <li>Features not working as described in marketing materials</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Medical/Emergency Circumstances</h4>
            <p className="text-slate-300">
              We may consider refund requests beyond the standard policy for documented medical emergencies or extraordinary circumstances. 
              Such requests require additional documentation and are reviewed case-by-case.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Subscription Upgrades</h4>
            <p className="text-slate-300">
              If you upgrade from Premium to Ultimate, the 14-day refund period applies to the upgrade amount. 
              The original Premium subscription refund window remains based on the initial purchase date.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Non-Refundable Situations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Exceeded Usage Limits</h4>
            <p className="text-slate-300">
              Subscriptions that have exceeded 25% feature usage are generally not eligible for full refunds, 
              as this indicates substantial value has been received from the platform.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Policy Violations</h4>
            <p className="text-slate-300">
              Accounts terminated for violating Terms of Service, sharing access credentials, or misusing the platform are not eligible for refunds.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Changed Mind After 14 Days</h4>
            <p className="text-slate-300">
              Refund requests submitted after the 14-day window without exceptional circumstances are not eligible for processing.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Alternative Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Technical Support</h4>
            <p className="text-slate-300">
              Before requesting a refund, consider reaching out to our technical support team. 
              Many platform issues can be resolved through guided assistance and troubleshooting.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Subscription Pause</h4>
            <p className="text-slate-300">
              For temporary life circumstances, we may offer subscription pausing options rather than refunds, 
              allowing you to resume your mental performance training when ready.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Downgrade Options</h4>
            <p className="text-slate-300">
              If the Ultimate tier features aren't meeting your needs, consider downgrading to Premium with a partial refund of the difference.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 bg-blue-950/30 border-blue-800/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-blue-100 mb-4">Contact Refund Support</h3>
          <p className="text-blue-200 mb-4">
            For refund requests or questions about this policy:
          </p>
          <div className="space-y-2 text-blue-300">
            <p><strong>Email:</strong> info@cerosity.com</p>
            <p><strong>Subject Line:</strong> "Refund Request - [Your Username]"</p>
            <p><strong>Response Time:</strong> 48 hours for refund request review</p>
            <p><strong>Processing Time:</strong> 5-7 business days for approved refunds</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 space-y-2">
        <p>This Refund Policy is effective as of June 5, 2025 and applies to all Red2Blue subscriptions.</p>
        <p>We reserve the right to modify this policy with 30 days notice to existing subscribers.</p>
        <p>All refund decisions are final and subject to the terms outlined above.</p>
      </div>
    </div>
      <Footer />
    </div>
  );
}