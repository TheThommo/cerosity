import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, FileText, MessageCircle, Star, ArrowRight, Lock, TrendingUp, Calendar, CheckCircle, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LandingChatStableV2 } from "@/components/landing-chat-stable-v2";
import { FloVoicePTT } from "@/components/flo-voice-ptt";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function FreeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showAssessmentSuccess, setShowAssessmentSuccess] = useState(false);

  // Check if user just completed assessment
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    if (params.get('assessment') === 'completed') {
      setShowAssessmentSuccess(true);
      // Clean up URL without page refresh
      window.history.replaceState({}, '', '/');
      // Hide success message after 8 seconds
      setTimeout(() => setShowAssessmentSuccess(false), 8000);
    }
  }, [location]);

  // Fetch user's assessment data
  const { data: latestAssessment } = useQuery<{
    id: number;
    userId: number;
    intensityScore: number;
    decisionMakingScore: number;
    diversionsScore: number;
    executionScore: number;
    createdAt: string;
  }>({
    queryKey: ["/api/assessments/latest", user?.id],
    enabled: !!user?.id,
  });

  // Fetch user's progress data
  const { data: progressData } = useQuery({
    queryKey: ["/api/progress", user?.id],
    enabled: !!user?.id,
  });

  const handleUpgrade = async (tier: 'premium' | 'ultimate') => {
    setIsUpgrading(true);
    try {
      const amount = tier === 'premium' ? 490 : 2190;
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        tier,
        amount,
        success_url: `${window.location.origin}/dashboard?upgrade=success&tier=${tier}`,
        cancel_url: `${window.location.origin}/dashboard?upgrade=cancelled`
      });
      
      const result = await response.json();
      
      if (result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: "There was an error starting the upgrade process. Please try again.",
        variant: "destructive",
      });
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 gradient-red-blue rounded-full flex items-center justify-center">
              <Brain className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Red2Blue, {user?.firstName}!
          </h1>
          <div className="text-lg text-gray-600 mb-4">
            You're on the <Badge variant="outline">Free Plan</Badge>
          </div>
          <p className="text-gray-600">
            Get started with your mental performance journey using our basic tools
          </p>
        </div>

        {/* Assessment Completion Success Message */}
        {showAssessmentSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Assessment Complete!</strong> Great job completing your mental skills evaluation. 
              Your results are now displayed below. Scroll down to see your detailed performance breakdown and personalized recommendations.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Results Section - Show if user has completed assessment */}
        {latestAssessment && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Your Assessment Results
                </h2>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Calendar className="w-3 h-3 mr-1" />
                  Completed {new Date(latestAssessment.createdAt).toLocaleDateString()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Intensity Score */}
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Intensity Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-900">{latestAssessment.intensityScore}</span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <Progress value={latestAssessment.intensityScore * 10} className="h-2" />
                  </CardContent>
                </Card>

                {/* Decision Making Score */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Decision Making</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-900">{latestAssessment.decisionMakingScore}</span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <Progress value={latestAssessment.decisionMakingScore * 10} className="h-2" />
                  </CardContent>
                </Card>

                {/* Diversions Score */}
                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Diversion Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-900">{latestAssessment.diversionsScore}</span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <Progress value={latestAssessment.diversionsScore * 10} className="h-2" />
                  </CardContent>
                </Card>

                {/* Execution Score */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Execution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-900">{latestAssessment.executionScore}</span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <Progress value={latestAssessment.executionScore * 10} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Overall Score */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Overall Mental Performance Score</h3>
                    <p className="text-sm text-gray-600">Based on your Red2Blue assessment</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">
                      {Math.round((latestAssessment.intensityScore + latestAssessment.decisionMakingScore + latestAssessment.diversionsScore + latestAssessment.executionScore) / 4 * 10)}%
                    </div>
                    <p className="text-sm text-gray-500">Performance Level</p>
                  </div>
                </div>
              </div>

              {/* Recommendations Preview */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🎯 Key Improvement Areas</h4>
                <p className="text-sm text-gray-700 mb-3">
                  Based on your assessment, we recommend focusing on areas where you scored below 7/10.
                </p>
                <div className="flex flex-wrap gap-2">
                  {latestAssessment.intensityScore < 7 && (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      Intensity Management
                    </Badge>
                  )}
                  {latestAssessment.decisionMakingScore < 7 && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      Decision Making
                    </Badge>
                  )}
                  {latestAssessment.diversionsScore < 7 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                      Diversion Control
                    </Badge>
                  )}
                  {latestAssessment.executionScore < 7 && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      Execution
                    </Badge>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Upgrade to Premium</strong> to get personalized coaching, detailed recommendations, and access to advanced training techniques.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Basic Assessment */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Brain className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-600">Available</Badge>
              </div>
              <CardTitle className="text-lg">Basic Assessment</CardTitle>
              <CardDescription>
                Take your first mental skills evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Discover your current mental performance baseline with our core assessment tool.
              </p>
              <Link href="/assessment">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  {latestAssessment ? "Retake Assessment" : "Take Assessment"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Red2Blue Curriculum preview */}
          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                <Badge className="bg-indigo-600">Free Preview</Badge>
              </div>
              <CardTitle className="text-lg">Red2Blue Curriculum</CardTitle>
              <CardDescription>
                Start the Red2Blue learning path
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Try the first lessons free. Upgrade to unlock all three sessions, every tool, and your Foundation certificate.
              </p>
              <Link href="/learn">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Start Learning
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Limited Chat with Flo */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <MessageCircle className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-600">5 Messages/Day</Badge>
              </div>
              <CardTitle className="text-lg">Chat with Flo</CardTitle>
              <CardDescription>
                Limited AI coaching conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Get basic mental performance advice from Flo, your AI coach.
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => setShowChat(true)}
              >
                Start Chatting
              </Button>
            </CardContent>
          </Card>

          {/* PDF Resources */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-purple-600" />
                <Badge className="bg-purple-600">3 PDFs</Badge>
              </div>
              <CardTitle className="text-lg">PDF Resources</CardTitle>
              <CardDescription>
                Essential mental performance guides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <FileText className="w-4 h-4 text-purple-600 mr-2" />
                  Master Your Moment
                </div>
                <div className="flex items-center text-sm">
                  <FileText className="w-4 h-4 text-purple-600 mr-2" />
                  Ability to Focus
                </div>
                <div className="flex items-center text-sm">
                  <FileText className="w-4 h-4 text-purple-600 mr-2" />
                  Mental Toughness
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                  onClick={() => window.open('/downloads/Master Your Moment by Cero Golf.pdf', '_blank')}
                >
                  Download: Master Your Moment
                </Button>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                  onClick={() => window.open('/downloads/Ability to Focus - Book.pdf', '_blank')}
                >
                  Download: Ability to Focus
                </Button>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                  onClick={() => window.open('/downloads/Mental Toughness - Book.pdf', '_blank')}
                >
                  Download: Mental Toughness
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upgrade Prompt */}
        <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Star className="w-8 h-8 text-yellow-600" />
              <div>
                <CardTitle className="text-xl">Unlock Your Full Potential</CardTitle>
                <CardDescription className="text-base">
                  Upgrade for complete access to the Red2Blue methodology
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Premium Features */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Premium Features You're Missing:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Unlimited AI coaching conversations
                  </li>
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Advanced assessment tools
                  </li>
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Personalized training techniques
                  </li>
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Progress tracking & analytics
                  </li>
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Goal setting & achievement system
                  </li>
                  <li className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    Community challenges & leaderboard
                  </li>
                </ul>
              </div>

              {/* Premium Pricing */}
              <div className="text-center">
                <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-blue-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Premium Access</h4>
                  <div className="text-3xl font-bold text-blue-600 mb-2">$490</div>
                  <p className="text-sm text-gray-500 mb-4">One-time payment • Lifetime access</p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 mb-3"
                    onClick={() => handleUpgrade('premium')}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? 'Processing...' : 'Upgrade to Premium'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-gray-500">
                    30-day money-back guarantee
                  </p>
                </div>
              </div>

              {/* Ultimate Pricing */}
              <div className="text-center">
                <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-purple-300 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600">Human Coaching</Badge>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2 mt-2">Ultimate Access</h4>
                  <div className="text-3xl font-bold text-purple-600 mb-2">$2190</div>
                  <p className="text-sm text-gray-500 mb-3">One-time payment • Lifetime access</p>
                  <div className="bg-purple-50 p-3 rounded-lg mb-4">
                    <p className="text-xs font-medium text-purple-800 mb-2">Everything in Premium plus:</p>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>• 1-on-1 private coaching sessions</li>
                      <li>• Personal human coach matching</li>
                      <li>• Custom training programs</li>
                      <li>• VIP priority support</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 mb-3"
                    onClick={() => handleUpgrade('ultimate')}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? 'Processing...' : 'Upgrade to Ultimate'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-gray-500">
                    30-day money-back guarantee
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            Ready to start your mental performance journey?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Take Your First Assessment
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setShowChat(true)}
            >
              Chat with Flo
            </Button>
          </div>
          

        </div>
      </div>

      {/* Chat with Flo - Shows when user clicks Start Chatting */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-white">
              <h3 className="text-lg font-semibold">Chat with Flo</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="px-4 pt-3">
              <FloVoicePTT compact />
            </div>
            <div className="flex-1 min-h-0">
              <LandingChatStableV2 isInlineWidget={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}