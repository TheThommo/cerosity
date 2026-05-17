import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { CerosityLogo } from "@/components/cerosity-logo";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Shield, AlertTriangle, DollarSign, Gavel } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 space-y-8 pt-8">
        <Link href="/"><button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" />Back to Home</button></Link>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden"><CerosityLogo size={32} /></div>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        </div>
        <p className="text-slate-400">
          Last updated: June 5, 2025
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Acceptance of Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            By accessing and using the Red2Blue mental performance coaching platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          <p className="text-slate-300">
            Red2Blue is operated by Cero International and provides AI-powered mental performance coaching specifically designed for elite golfers and serious golf competitors.
          </p>
          <p className="text-slate-300">
            If you do not agree to abide by the above, please do not use this service. Your continued use of the platform constitutes acceptance of these terms.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Service Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Platform Features</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>AI-powered mental performance coaching through "Flo" coach</li>
              <li>Mental skills assessments and progress tracking</li>
              <li>Comprehensive library of proven mental techniques</li>
              <li>Daily mood tracking and performance correlation analysis</li>
              <li>Personalized recommendation engine for mental training</li>
              <li>Community features for technique sharing and support</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Educational Purpose</h4>
            <p className="text-slate-300">
              Red2Blue provides educational tools and techniques for mental performance enhancement. The platform is designed for training and development purposes and should be used as part of a comprehensive golf improvement program.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Professional Disclaimer</h4>
            <p className="text-slate-300">
              This service is not a substitute for professional psychological counseling, medical advice, or mental health treatment. If you are experiencing mental health concerns, please consult with qualified healthcare professionals.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Subscription & Payment Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Subscription Tiers</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Free Tier:</strong> Limited access to basic features and one AI coaching conversation</li>
              <li><strong>Premium ($490):</strong> Full platform access with unlimited AI coaching</li>
              <li><strong>Ultimate ($2190):</strong> Advanced analytics and priority support</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Payment Processing</h4>
            <p className="text-slate-300">
              Payments are processed securely through Stripe. All subscription fees are charged in USD. You authorize us to charge your payment method for the selected subscription tier.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Billing & Renewal</h4>
            <p className="text-slate-300">
              Subscriptions are billed as one-time payments for the selected tier. You may upgrade your subscription at any time. Downgrades take effect at the end of the current billing period.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Refund Policy</h4>
            <p className="text-slate-300">
              Refunds are available within 14 days of purchase if you have used less than 25% of the included features. Refund requests must be submitted through our support system with a detailed explanation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            User Responsibilities & Acceptable Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Account Security</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized account access</li>
              <li>Use the platform only for personal mental performance training</li>
              <li>Provide accurate information during registration and updates</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Prohibited Activities</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Sharing account access with other individuals</li>
              <li>Attempting to reverse engineer or copy platform algorithms</li>
              <li>Using the service for any illegal or unauthorized purpose</li>
              <li>Interfering with platform security or performance</li>
              <li>Submitting false or misleading assessment information</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Content Standards</h4>
            <p className="text-slate-300">
              When sharing techniques or participating in community features, content must be respectful, relevant to mental performance, and comply with our community guidelines. We reserve the right to moderate and remove inappropriate content.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gavel className="h-5 w-5 mr-2" />
            Intellectual Property & Data Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Platform Ownership</h4>
            <p className="text-slate-300">
              Red2Blue, its AI coaching algorithms, assessment tools, and mental techniques library are proprietary to Cero International. Users receive a limited license to use the platform for personal mental performance training.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">User Data Rights</h4>
            <p className="text-slate-300">
              You retain ownership of your personal assessment data, mood tracking information, and coaching conversations. We use this data to provide personalized services as outlined in our Privacy Policy.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Shared Content</h4>
            <p className="text-slate-300">
              By sharing techniques or insights through the platform, you grant us a non-exclusive license to use this content for improving the coaching system and helping other users, while maintaining your anonymity.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Limitation of Liability & Disclaimers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Service Availability</h4>
            <p className="text-slate-300">
              While we strive for 99.9% uptime, we cannot guarantee uninterrupted service availability. We are not liable for service interruptions, data loss, or technical issues beyond our reasonable control.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Performance Results</h4>
            <p className="text-slate-300">
              Mental performance improvement varies by individual. We do not guarantee specific performance outcomes or improvements in golf scores. Results depend on consistent practice and individual factors.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Liability Limitation</h4>
            <p className="text-slate-300">
              Our total liability for any claims arising from your use of Red2Blue shall not exceed the amount you paid for your current subscription period, up to a maximum of $2,190 USD.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Account Termination & Data Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">User-Initiated Termination</h4>
            <p className="text-slate-300">
              You may cancel your subscription and delete your account at any time through your account settings. Upon cancellation, you retain access to paid features until the end of your billing period.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Service-Initiated Termination</h4>
            <p className="text-slate-300">
              We may suspend or terminate accounts that violate these terms, engage in prohibited activities, or pose security risks to the platform or other users.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Retention After Termination</h4>
            <p className="text-slate-300">
              Following account termination, personal data is deleted within 30 days except where retention is required for legal compliance or legitimate business purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 bg-blue-950/30 border-blue-800/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-blue-100 mb-4">Contact & Support</h3>
          <p className="text-blue-200 mb-4">
            For questions about these Terms of Service or platform support:
          </p>
          <div className="space-y-2 text-blue-300">
            <p><strong>Email:</strong> info@cerosity.com</p>
            <p><strong>Legal:</strong> legal@cerosity.com</p>
            <p><strong>Address:</strong> Cero International, Melbourne, Australia</p>
            <p><strong>Response Time:</strong> Support inquiries answered within 24 hours</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 space-y-2">
        <p>These Terms of Service are effective as of June 5, 2025 and apply to all Red2Blue platform users.</p>
        <p>We may modify these terms with 30 days notice to users via email and platform notifications.</p>
        <p>Continued use after modifications constitutes acceptance of updated terms.</p>
        <p>These terms are governed by Australian law and subject to Australian jurisdiction.</p>
      </div>
    </div>
      <Footer />
    </div>
  );
}