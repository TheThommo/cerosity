import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";
import { MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "@shared/auth-rules";

interface StableSignUpFormProps {
  onBack: () => void;
  isPaidUser?: boolean;
}

const inputClass = "w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-300 mb-1";

export function StableSignUpForm({ onBack, isPaidUser = false }: StableSignUpFormProps) {
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

      if (formData.password.length < MIN_PASSWORD_LENGTH) {
        setError(passwordTooShortMessage);
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
          // No tier is sent. Registration always creates a free account
          // server-side; the server ignores tier fields anyway (audit A3).
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Registration failed');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      // Straight into the curriculum — that is the product, not the dashboard.
      setTimeout(() => { window.location.href = '/learn'; }, 2000);
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
            {/* Google SSO is deliberately absent for the MVP — see landing.tsx */}
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
