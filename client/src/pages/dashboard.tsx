import { useQuery } from "@tanstack/react-query";
import { Brain, Users, TrendingUp, Target, Flame, Crosshair, Eye, AlertTriangle, ClipboardCheck, Zap, Wrench, Lightbulb, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BulletproofAIChat as AIChat } from "@/components/bulletproof-ai-chat";
import { AssessmentCard } from "@/components/assessment-card";
import { TechniqueCard } from "@/components/technique-card";
import { ProgressChart } from "@/components/progress-chart";
import { MoodTracker } from "@/components/mood-tracker";
import { Link } from "wouter";

const mockUserId = 1; // In a real app, this would come from authentication

export default function Dashboard() {
  const { data: latestAssessment } = useQuery({
    queryKey: [`/api/assessments/latest/${mockUserId}`],
  });

  const { data: techniques } = useQuery({
    queryKey: ["/api/techniques"],
  });

  const { data: scenarios } = useQuery({
    queryKey: ["/api/scenarios"],
  });

  const { data: progress } = useQuery({
    queryKey: [`/api/progress/${mockUserId}?days=7`],
  });

  const totalScore = latestAssessment?.totalScore || 0;
  const maxScore = 400;
  const scorePercentage = (totalScore / maxScore) * 100;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "gradient-blue-deep";
    if (score >= 60) return "gradient-coral-blue";
    return "gradient-red-coral";
  };

  const getOverallState = () => {
    if (scorePercentage >= 80) return { state: "Blue Head", color: "bg-blue-primary", text: "text-white" };
    if (scorePercentage >= 60) return { state: "Transitional", color: "bg-coral", text: "text-white" };
    return { state: "Red Head", color: "bg-red-primary", text: "text-white" };
  };

  const overallState = getOverallState();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Choose what you'd like to work on today</p>
      </div>

      {/* Clean Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* Curriculum Card */}
        <Link href="/learn">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-blue-300 hover:border-blue-500 bg-blue-50/40">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <BookOpen className="mx-auto text-blue-primary group-hover:text-blue-600" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Red2Blue Curriculum</h3>
              <p className="text-gray-600 text-sm">Work through the full Red2Blue method, lesson by lesson, and earn your Foundation certificate</p>
            </CardContent>
          </Card>
        </Link>

        {/* Assessment Card */}
        <Link href="/assessment">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-blue-200 hover:border-blue-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <ClipboardCheck className="mx-auto text-blue-primary group-hover:text-blue-600" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mental Skills Assessment</h3>
              <p className="text-gray-600 text-sm">Evaluate your current performance state across all four mental skill areas</p>
            </CardContent>
          </Card>
        </Link>

        {/* Techniques Card */}
        <Link href="/techniques">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-green-200 hover:border-green-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Zap className="mx-auto text-green-600 group-hover:text-green-700" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Breathing & Techniques</h3>
              <p className="text-gray-600 text-sm">Practice emergency relief and guided mental performance techniques</p>
            </CardContent>
          </Card>
        </Link>

        {/* R2B Tools Card */}
        <Link href="/tools">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-purple-200 hover:border-purple-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Wrench className="mx-auto text-purple-600 group-hover:text-purple-700" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Red2Blue Tools</h3>
              <p className="text-gray-600 text-sm">Control circles, recognition tools, and advanced mental training</p>
            </CardContent>
          </Card>
        </Link>

        {/* AI Recommendations Card */}
        <Link href="/recommendations">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-orange-200 hover:border-orange-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Lightbulb className="mx-auto text-orange-500 group-hover:text-orange-600" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Recommendations</h3>
              <p className="text-gray-600 text-sm">Personalized coaching suggestions based on your performance data</p>
            </CardContent>
          </Card>
        </Link>

        {/* Goals Card */}
        <Link href="/goals">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-red-200 hover:border-red-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Target className="mx-auto text-red-primary group-hover:text-red-600" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mental Goals</h3>
              <p className="text-gray-600 text-sm">Set, track, and achieve your mental performance objectives</p>
            </CardContent>
          </Card>
        </Link>

        {/* Community Card */}
        <Link href="/community">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-yellow-200 hover:border-yellow-400">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Users className="mx-auto text-yellow-600 group-hover:text-yellow-700" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600 text-sm">Connect with other athletes and track your progress on the leaderboard</p>
            </CardContent>
          </Card>
        </Link>

      </div>
    </div>
  );
}
