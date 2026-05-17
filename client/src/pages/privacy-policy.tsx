import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { CerosityLogo } from "@/components/cerosity-logo";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, Database, UserCheck, Globe } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 space-y-8 pt-8">
        <Link href="/"><button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" />Back to Home</button></Link>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden"><CerosityLogo size={32} /></div>
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        </div>
        <p className="text-slate-400">
          Last updated: June 5, 2025
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Personal Information</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Email address and username for account creation</li>
              <li>Profile information you choose to provide</li>
              <li>Payment information for subscription services</li>
              <li>Communication preferences and settings</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Mental Performance Data</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Assessment scores and mental skills evaluations</li>
              <li>Daily mood tracking data and patterns</li>
              <li>Technique practice sessions and progress</li>
              <li>AI coaching conversations and recommendations</li>
              <li>Performance analytics and insights</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Technical Information</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Device information and browser type</li>
              <li>IP address and general location data</li>
              <li>Usage patterns and feature engagement</li>
              <li>Error logs and performance metrics</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Service Delivery</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Provide personalized AI coaching recommendations</li>
              <li>Track your mental performance progress over time</li>
              <li>Generate insights and analytics about your development</li>
              <li>Deliver technique suggestions based on your needs</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Platform Improvement</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Enhance AI coaching algorithms and effectiveness</li>
              <li>Improve assessment tools and mental techniques</li>
              <li>Develop new features based on usage patterns</li>
              <li>Optimize platform performance and reliability</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Communication</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Send service updates and important notifications</li>
              <li>Provide customer support and technical assistance</li>
              <li>Share relevant mental performance insights</li>
              <li>Process subscription and billing communications</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Data Protection & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Encryption & Storage</h4>
            <p className="text-slate-300">
              All personal data and mental performance information is encrypted both in transit and at rest using industry-standard AES-256 encryption. 
              Our servers are hosted in secure data centers with 24/7 monitoring and access controls.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Access Controls</h4>
            <p className="text-slate-300">
              Access to your data is strictly limited to authorized personnel who require it for service delivery. 
              All access is logged and monitored. We employ multi-factor authentication and regular security audits.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Retention</h4>
            <p className="text-slate-300">
              We retain your data only as long as necessary to provide services and comply with legal obligations. 
              Assessment data and progress tracking are kept for the duration of your subscription plus 12 months for continuity of service.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Your Rights & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Data Access & Portability</h4>
            <p className="text-slate-300">
              You have the right to access, download, or request a copy of all personal data we hold about you. 
              This includes your assessment history, mood tracking data, and AI coaching conversations.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Correction & Deletion</h4>
            <p className="text-slate-300">
              You can update your personal information at any time through your profile settings. 
              You may also request deletion of your account and all associated data, subject to legal retention requirements.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Marketing Communications</h4>
            <p className="text-slate-300">
              You can opt out of marketing communications at any time while maintaining access to essential service notifications. 
              Communication preferences can be managed in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Data Sharing & Third Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Service Providers</h4>
            <p className="text-slate-300">
              We work with trusted third-party providers for payment processing, cloud hosting, and analytics. 
              These providers are contractually bound to protect your data and use it only for specified services.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Anonymized Research</h4>
            <p className="text-slate-300">
              We may use aggregated, anonymized data for research into mental performance training effectiveness. 
              No individual user data is ever identifiable in research studies or publications.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Legal Requirements</h4>
            <p className="text-slate-300">
              We may disclose information when required by law, court order, or to protect the rights and safety of our users and platform. 
              We will notify users of such requests unless prohibited by law.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 bg-blue-950/30 border-blue-800/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-blue-100 mb-4">Contact Us About Privacy</h3>
          <p className="text-blue-200 mb-4">
            If you have questions about this Privacy Policy or how we handle your data, please contact our Privacy Officer:
          </p>
          <div className="space-y-2 text-blue-300">
            <p><strong>Email:</strong> privacy@red2blue.com</p>
            <p><strong>Address:</strong> Red2Blue Privacy Officer, Melbourne, Australia</p>
            <p><strong>Response Time:</strong> We respond to privacy inquiries within 72 hours</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 space-y-2">
        <p>This Privacy Policy is effective as of June 5, 2025 and applies to all users of the Red2Blue platform.</p>
        <p>We may update this policy periodically and will notify users of significant changes.</p>
        <p>Continued use of the platform after policy updates constitutes acceptance of the revised terms.</p>
      </div>
    </div>
      <Footer />
    </div>
  );
}