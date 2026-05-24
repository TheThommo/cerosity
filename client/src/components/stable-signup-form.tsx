import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";

interface StableSignUpFormProps {
  onBack: () => void;
  selectedTier?: string;
  isPaidUser?: boolean;
}

const inputClass = "w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-300 mb-1";

export function StableSignUpForm({ onBack, selectedTier = 'free', isPaidUser = false }: StableSignUpFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    goals: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          goals: formData.goals,
          bio: formData.bio,
          subscriptionTier: selectedTier,
          isSubscribed: selectedTier !== 'free'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Registration failed');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch {
      setError('Network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl shadow-blue-950/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <CerosityLogo size={64} />
                </div>
              </div>
              <CardTitle className="text-3xl text-green-400">Welcome!</CardTitle>
              <CardDescription className="text-lg text-slate-400">
                Account created. Redirecting to your dashboard...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card className="bg-slate-900 border-slate-800 shadow-2xl shadow-blue-950/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <CerosityLogo size={64} />
              </div>
            </div>
            <CardTitle className="text-3xl text-white">Create Your Account</CardTitle>
            <CardDescription className="text-lg text-slate-400">
              Join the Cerosity mental performance community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google SSO */}
            <button
              type="button"
              onClick={() => { window.location.href = '/api/auth/google'; }}
              className="w-full mb-4 px-4 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign up with Google
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-slate-900 px-2 text-slate-500">or sign up with email</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" required value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={inputClass} placeholder="First name" disabled={isLoading} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" required value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={inputClass} placeholder="Last name" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email Address *</label>
                <input type="email" required value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClass} placeholder="your@email.com" disabled={isLoading} />
              </div>

              <div>
                <label className={labelClass}>Password *</label>
                <input type="password" required value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={inputClass} placeholder="Create a strong password" disabled={isLoading} />
              </div>

              <div>
                <label className={labelClass}>Confirm Password *</label>
                <input type="password" required value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={inputClass} placeholder="Confirm your password" disabled={isLoading} />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-lg font-medium text-white mb-3">Personal Information</h3>

                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={inputClass} disabled={isLoading} />
                </div>

                <div className="mt-4">
                  <label className={labelClass}>Gender</label>
                  <select value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className={inputClass} disabled={isLoading}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-lg font-medium text-white mb-3">Performance Information</h3>

                <div>
                  <label className={labelClass}>Goals</label>
                  <textarea value={formData.goals}
                    onChange={(e) => handleInputChange('goals', e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="What are your main performance goals?"
                    rows={3} disabled={isLoading} />
                </div>

                <div className="mt-4">
                  <label className={labelClass}>About You</label>
                  <textarea value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell us about your background and competitive experience..."
                    rows={3} disabled={isLoading} />
                </div>
              </div>

              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Your data is encrypted and never shared. By creating an account you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
