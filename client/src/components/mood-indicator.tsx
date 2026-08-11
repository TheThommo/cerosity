import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  Heart, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Brain,
  Target,
  Smile,
  Meh,
  Frown
} from "lucide-react";

interface MoodData {
  overall: number;
  confidence: number;
  focus: number;
  energy: number;
  stress: number;
  motivation: number;
  timestamp: string;
}

interface MoodHistory {
  id: string;
  mood: number;
  factors: {
    confidence: number;
    focus: number;
    energy: number;
    stress: number;
    motivation: number;
  };
  context: string;
  timestamp: string;
}

export function MoodIndicator() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch actual user mood data from database
  const { data: todayMood } = useQuery({
    queryKey: [`/api/daily-mood/${user?.id}/${today}`],
    enabled: !!user?.id,
  });

  // Derived from the athlete's logged mood score, deterministically. These were
  // previously jittered with Math.random(), so the same mood produced different
  // numbers on every render — an athlete watching their own "focus" score move
  // while they sat still was watching noise (audit C2).
  const calculateMoodFactors = (moodScore: number) => {
    const clamp = (n: number) => Math.max(10, Math.min(90, n));
    const baseConfidence = clamp(moodScore);
    const baseFocus = clamp(moodScore);
    const baseEnergy = clamp(moodScore);
    const baseStress = clamp(100 - moodScore); // inverse of mood
    const baseMotivation = clamp(moodScore);

    return {
      confidence: Math.round(baseConfidence),
      focus: Math.round(baseFocus),
      energy: Math.round(baseEnergy),
      stress: Math.round(baseStress),
      motivation: Math.round(baseMotivation)
    };
  };

  const [currentMood, setCurrentMood] = useState<MoodData>({
    overall: (todayMood as any)?.moodScore || 50,
    confidence: 50,
    focus: 50,
    energy: 50,
    stress: 50,
    motivation: 50,
    timestamp: new Date().toISOString()
  });

  const [moodHistory, setMoodHistory] = useState<MoodHistory[]>([]);

  // Update mood when database data loads
  useEffect(() => {
    if (todayMood) {
      const factors = calculateMoodFactors((todayMood as any).moodScore);
      setCurrentMood({
        overall: (todayMood as any).moodScore,
        ...factors,
        timestamp: new Date().toISOString()
      });
    }
  }, [todayMood]);

  const getMoodColor = (value: number) => {
    if (value >= 80) return "rgb(59, 130, 246)"; // Blue
    if (value >= 70) return "rgb(96, 165, 250)"; // Light blue
    if (value >= 60) return "rgb(139, 92, 246)"; // Light purple
    if (value >= 50) return "rgb(147, 51, 234)"; // Purple
    if (value >= 40) return "rgb(236, 72, 153)"; // Pink-red transition
    return "rgb(239, 68, 68)"; // Red
  };

  const getMoodGradient = (value: number) => {
    const color1 = getMoodColor(value);
    const color2 = getMoodColor(Math.min(100, value + 10));
    return `linear-gradient(135deg, ${color1}, ${color2})`;
  };

  const getMoodLabel = (value: number) => {
    if (value >= 85) return "Excellent";
    if (value >= 75) return "Great";
    if (value >= 65) return "Good";
    if (value >= 55) return "Fair";
    if (value >= 45) return "Challenging";
    return "Needs Attention";
  };

  const getMoodIcon = (value: number) => {
    if (value >= 70) return <Smile className="w-5 h-5" />;
    if (value >= 50) return <Meh className="w-5 h-5" />;
    return <Frown className="w-5 h-5" />;
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case "confidence": return <Target className="w-4 h-4" />;
      case "focus": return <Brain className="w-4 h-4" />;
      case "energy": return <Zap className="w-4 h-4" />;
      case "stress": return <Activity className="w-4 h-4" />;
      case "motivation": return <Heart className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Calculate dynamic mood insights
  const getMoodInsights = () => {
    const factors = {
      confidence: currentMood.confidence,
      focus: currentMood.focus,
      energy: currentMood.energy,
      stress: currentMood.stress,
      motivation: currentMood.motivation
    };

    // Find strongest factor (highest score)
    // For stress, we invert it since lower stress is better
    const adjustedFactors = {
      ...factors,
      stress: 100 - factors.stress // Invert stress for comparison
    };

    const strongest = Object.entries(adjustedFactors).reduce((max, [key, value]) => 
      value > max.value ? { key, value: factors[key as keyof typeof factors] } : max,
      { key: '', value: 0 }
    );

    // Find weakest factor (lowest score) 
    const weakest = Object.entries(factors).reduce((min, [key, value]) => 
      value < min.value ? { key, value } : min,
      { key: '', value: 100 }
    );

    // Generate insights based on scores
    const getInsightMessage = (factor: string, score: number, isStrongest: boolean) => {
      const messages = {
        confidence: {
          strong: "Your self-belief is solid and supporting your performance",
          weak: "Building confidence could unlock better performance"
        },
        focus: {
          strong: "Your concentration levels are helping you stay on task",
          weak: "Improving focus could help you maintain better attention"
        },
        energy: {
          strong: "Your energy levels are fueling strong performance",
          weak: "Boosting energy could improve your overall performance"
        },
        stress: {
          strong: "Your stress management is working well",
          weak: "Managing stress better could improve your mental clarity"
        },
        motivation: {
          strong: "Your drive and enthusiasm are clearly supporting you",
          weak: "Finding ways to boost motivation could help your progress"
        }
      };
      
      const factorMessages = messages[factor as keyof typeof messages];
      return isStrongest ? factorMessages.strong : factorMessages.weak;
    };

    return {
      strongest: {
        factor: strongest.key,
        score: strongest.value,
        message: getInsightMessage(strongest.key, strongest.value, true)
      },
      weakest: {
        factor: weakest.key,
        score: weakest.value,
        message: getInsightMessage(weakest.key, weakest.value, false)
      }
    };
  };

  const insights = getMoodInsights();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const addMoodEntry = (context: string) => {
    const newEntry: MoodHistory = {
      id: Date.now().toString(),
      mood: currentMood.overall,
      factors: {
        confidence: currentMood.confidence,
        focus: currentMood.focus,
        energy: currentMood.energy,
        stress: currentMood.stress,
        motivation: currentMood.motivation
      },
      context,
      timestamp: new Date().toISOString()
    };

    setMoodHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
  };

  return (
    <div className="space-y-6">
      {/* Main Mood Display */}
      <Card className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{ background: getMoodGradient(currentMood.overall) }}
        />
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ background: getMoodColor(currentMood.overall) }}
              >
                {getMoodIcon(currentMood.overall)}
              </div>
              Performance Mood
            </div>
            <Badge 
              className="text-white border-none"
              style={{ background: getMoodColor(currentMood.overall) }}
            >
              {getMoodLabel(currentMood.overall)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center mb-6">
            <div 
              className="text-6xl font-bold mb-2"
              style={{ color: getMoodColor(currentMood.overall) }}
            >
              {Math.round(currentMood.overall)}
            </div>
            <div className="text-gray-600">Current Mood Score</div>
            <div className="text-sm text-gray-500">
              Updated {formatTime(currentMood.timestamp)}
            </div>
          </div>

          {/* Mood Factors */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(currentMood).filter(([key]) => 
              ['confidence', 'focus', 'energy', 'stress', 'motivation'].includes(key)
            ).map(([factor, value]) => (
              <div key={factor} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white mb-1"
                    style={{ background: getMoodColor(value as number) }}
                  >
                    {getFactorIcon(factor)}
                  </div>
                </div>
                <div 
                  className="text-lg font-semibold"
                  style={{ color: getMoodColor(value as number) }}
                >
                  {Math.round(value as number)}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {factor}
                </div>
                <Progress 
                  value={value as number} 
                  className="h-1 mt-1"
                />
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => addMoodEntry("After practice session")}
            >
              Log Practice
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => addMoodEntry("Pre-round preparation")}
            >
              Pre-Round
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => addMoodEntry("Post-round reflection")}
            >
              Post-Round
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => addMoodEntry("General check-in")}
            >
              Check-In
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mood Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Recent Mood History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moodHistory.map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: getMoodColor(entry.mood) }}
                  >
                    {Math.round(entry.mood)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{entry.context}</div>
                    <div className="text-sm text-gray-600">
                      {formatTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <div className="flex items-center gap-1">
                      {entry.mood > moodHistory[index - 1]?.mood ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : entry.mood < moodHistory[index - 1]?.mood ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {getMoodLabel(entry.mood)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mood Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Mood Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Strongest Factor</h4>
              <div className="flex items-center gap-2">
                {getFactorIcon(insights.strongest.factor)}
                <span className="text-blue-800 capitalize">
                  {insights.strongest.factor} ({Math.round(insights.strongest.score)}%)
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {insights.strongest.message}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Area to Focus</h4>
              <div className="flex items-center gap-2">
                {getFactorIcon(insights.weakest.factor)}
                <span className="text-orange-800 capitalize">
                  {insights.weakest.factor} ({Math.round(insights.weakest.score)}%)
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                {insights.weakest.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}