import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { VisualProgressTracker } from "@/components/visual-progress-tracker";
import { CoachingAnimations } from "@/components/coaching-animations";
import { Users, Trophy, TrendingUp, Calendar, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { CerosityLogo } from "@/components/cerosity-logo";

interface CommunityProps {
  userId: number;
}

export default function Community({ userId }: CommunityProps) {
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back Button */}
        <div className="mb-6">
          <Link href={userId ? "/dashboard" : "/"}>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft size={18} className="mr-2" />
              {userId ? "Back to Dashboard" : "Back to Home"}
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Red2Blue Community
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Connect with fellow elite performers, track your progress, and stay motivated
            through friendly competition and shared mindset excellence.
          </p>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>My Progress</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <CommunityLeaderboard userId={userId} />

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span>Daily Mindset Challenge</span>
                </CardTitle>
                <CardDescription>
                  Join thousands of performers practicing 5 minutes of mindset training daily
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Today's Focus: Pressure Response</h3>
                  <p className="text-slate-400 mb-4">
                    Practice the box breathing technique before a challenging shot or situation.
                    Visualize yourself staying calm and executing perfectly under pressure.
                  </p>
                  <div className="bg-slate-800 rounded-lg p-4 border border-blue-800/30">
                    <p className="text-sm text-blue-200 font-medium">
                      "The mind is everything. What you think you become." - Buddha
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <VisualProgressTracker userId={userId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Coaching Animations */}
      {showWelcomeAnimation && (
        <CoachingAnimations
          context="welcome"
          onComplete={() => setShowWelcomeAnimation(false)}
        />
      )}

      <Footer />
    </div>
  );
}
