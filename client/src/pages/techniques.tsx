import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Zap, 
  AlertTriangle, 
  PlayCircle, 
  Heart, 
  Share2, 
  Target, 
  Compass,
  Anchor,
  Brain
} from "lucide-react";

export default function Techniques() {
  const { data: techniques, isLoading } = useQuery({
    queryKey: ["/api/techniques"],
  });
  
  const { toast } = useToast();
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<any>(null);
  const [emergencyStep, setEmergencyStep] = useState(0);
  const [ideaText, setIdeaText] = useState("");
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [practiceStep, setPracticeStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [activeCategory, setActiveCategory] = useState("breathing");

  // Emergency Relief mutation
  const emergencyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/emergency-relief", {});
    },
    onSuccess: () => {
      toast({
        title: "Emergency Relief Completed",
        description: "Great job! You've successfully completed the emergency breathing technique.",
      });
    }
  });
  
  // Practice Now mutation
  const practiceMutation = useMutation({
    mutationFn: async (techniqueId: number) => {
      await apiRequest("POST", "/api/practice-technique", { techniqueId });
    },
    onSuccess: () => {
      toast({
        title: "Practice Completed",
        description: "Great work! Your practice session has been completed and logged.",
      });
      setPracticeDialogOpen(false);
      setPracticeStep(0);
    }
  });
  
  // Idea sharing mutation
  const ideaMutation = useMutation({
    mutationFn: async (idea: string) => {
      await apiRequest("POST", "/api/share-idea", { idea });
    },
    onSuccess: () => {
      toast({
        title: "Idea Shared Successfully",
        description: "Your technique has been shared with Flo and the community. Thank you!",
      });
      setIdeaText("");
      setIdeaDialogOpen(false);
    }
  });

  // Auto-advance timer for emergency relief
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isAutoAdvancing && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isAutoAdvancing && countdown === 0) {
      // Auto advance to next step
      if (emergencyStep === 1) {
        setEmergencyStep(2);
        setCountdown(4); // Hold for 4 seconds
      } else if (emergencyStep === 2) {
        setEmergencyStep(3);
        setCountdown(6); // Exhale for 6 seconds
      } else if (emergencyStep === 3) {
        setEmergencyStep(4);
        setIsAutoAdvancing(false);
      }
    }
    
    return () => clearTimeout(timer);
  }, [isAutoAdvancing, countdown, emergencyStep]);

  const categories = [
    { 
      id: "breathing", 
      name: "Breathing", 
      icon: <Zap className="text-blue-primary" size={20} />,
      description: "Calm your nervous system instantly"
    },
    { 
      id: "focus", 
      name: "Focus", 
      icon: <Compass className="text-indigo-600" size={20} />,
      description: "Regain concentration after distractions"
    },
    { 
      id: "pressure", 
      name: "Pressure", 
      icon: <Target className="text-teal-600" size={20} />,
      description: "Turn pressure into performance"
    },
    { 
      id: "anchor", 
      name: "Anchoring", 
      icon: <Anchor className="text-purple-600" size={20} />,
      description: "Access your best mental state on demand"
    },
  ];

  const getTechniquesByCategory = (categoryId: string) => {
    return techniques?.filter((technique: any) => technique.category === categoryId) || [];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mental Techniques</h1>
                <p className="text-gray-600">Master proven techniques to enhance your mental game</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Emergency Relief Card */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Relief</h3>
                  <p className="text-gray-600">Instant stress relief technique for pressure moments</p>
                </div>
              </div>
              <Button 
                onClick={() => setEmergencyDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                Use Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Technique Categories */}
        <div className="space-y-8">
          
          {/* The technique library is empty in production. Four category tabs
              over nothing reads as a broken page, so the browser is hidden until
              there is something in it and the shortfall is stated. Emergency
              Relief above is self-contained and still works. */}
          {(!techniques || (techniques as any[]).length === 0) ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                The technique library is being built
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Guided techniques aren't published yet. Emergency Relief above works now, and
                FLO can talk you through any Red2Blue technique in the meantime.
              </p>
            </div>
          ) : (
          <>
          {/* Category Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  activeCategory === category.id 
                    ? 'ring-2 ring-blue-primary bg-blue-light border-blue-primary' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setActiveCategory(category.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activeCategory === category.id ? 'bg-blue-primary text-white' : 'bg-gray-100'
                    }`}>
                      {category.icon}
                    </div>
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active Category Content */}
          <div className="space-y-6">
            {/* Category Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                {categories.find(cat => cat.id === activeCategory)?.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{categories.find(cat => cat.id === activeCategory)?.name} Techniques</h2>
              <p className="text-gray-600">{categories.find(cat => cat.id === activeCategory)?.description}</p>
            </div>

            {/* Techniques Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getTechniquesByCategory(activeCategory).map((technique: any, index: number) => (
                <Card key={technique.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold">{technique.name}</CardTitle>
                      <Badge className={getDifficultyColor(technique.difficulty)}>
                        {technique.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">{technique.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 mb-2">Instructions:</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          {Array.isArray(technique.instructions) 
                            ? technique.instructions.map((instruction: string, i: number) => (
                                <div key={i} className="flex items-start space-x-2">
                                  <span className="text-blue-primary font-bold mt-0.5">{i + 1}.</span>
                                  <span>{instruction}</span>
                                </div>
                              ))
                            : technique.instructions && (
                                <div className="flex items-start space-x-2">
                                  <span className="text-blue-primary font-bold mt-0.5">1.</span>
                                  <span>{technique.instructions}</span>
                                </div>
                              )
                          }
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedTechnique(technique);
                            setPracticeDialogOpen(true);
                          }}
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Practice
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Technique Added to Favorites",
                              description: `${technique.name} has been saved to your collection.`,
                            });
                          }}
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add New Technique Placeholder */}
              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-primary transition-colors">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">+</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Suggest a Technique</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Have a technique that works for you? Share it with Flo.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIdeaDialogOpen(true)}
                  >
                    Submit Idea
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
          )}
        </div>



        {/* Technique Usage Tips */}
        <Card className="mt-8 bg-gradient-to-r from-blue-light to-white">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Maximizing Technique Effectiveness</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Before the Round</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Practice 2-3 techniques during warm-up</li>
                  <li>• Choose your "go-to" technique for pressure moments</li>
                  <li>• Set a mental cue to remind yourself to use techniques</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">During the Round</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use techniques between shots, not during setup</li>
                  <li>• Keep techniques simple and repeatable</li>
                  <li>• Trust your preparation and commit to the shot</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs remain the same... */}
      
      {/* Emergency Relief Dialog */}
      <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="text-red-600" size={20} />
              <span>Emergency Relief</span>
            </DialogTitle>
            <DialogDescription>
              Follow the breathing pattern to calm your nervous system instantly
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {emergencyStep === 0 && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="text-red-600" size={32} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Box Breathing Emergency Protocol</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This technique will help you regain control in 30 seconds
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        setEmergencyStep(1);
                        setCountdown(4);
                        setIsAutoAdvancing(true);
                      }}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Start Guided Breathing
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEmergencyStep(1);
                        setCountdown(4);
                        setIsAutoAdvancing(false);
                      }}
                      className="w-full"
                    >
                      Manual Control
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {emergencyStep === 1 && (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-blue-600">{countdown}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-600">Breathe In</h3>
                  <p className="text-gray-600">Fill your lungs slowly and deeply</p>
                </div>
                {!isAutoAdvancing && (
                  <Button 
                    onClick={() => {
                      setEmergencyStep(2);
                      setCountdown(4);
                    }}
                    className="w-full"
                  >
                    Next: Hold
                  </Button>
                )}
              </div>
            )}

            {emergencyStep === 2 && (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-yellow-600">{countdown}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-yellow-600">Hold</h3>
                  <p className="text-gray-600">Keep the air in your lungs</p>
                </div>
                {!isAutoAdvancing && (
                  <Button 
                    onClick={() => {
                      setEmergencyStep(3);
                      setCountdown(6);
                    }}
                    className="w-full"
                  >
                    Next: Exhale
                  </Button>
                )}
              </div>
            )}

            {emergencyStep === 3 && (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-green-600">{countdown}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-600">Exhale</h3>
                  <p className="text-gray-600">Release all the air slowly</p>
                </div>
                {!isAutoAdvancing && (
                  <Button 
                    onClick={() => setEmergencyStep(4)}
                    className="w-full"
                  >
                    Complete
                  </Button>
                )}
              </div>
            )}

            {emergencyStep === 4 && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Well Done!</h3>
                  <p className="text-gray-600 mb-4">You've completed the emergency relief technique</p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        emergencyMutation.mutate();
                        setEmergencyDialogOpen(false);
                        setEmergencyStep(0);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={emergencyMutation.isPending}
                    >
                      {emergencyMutation.isPending ? "Saving..." : "Complete Session"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEmergencyStep(1);
                        setCountdown(4);
                      }}
                      className="w-full"
                    >
                      Repeat Cycle
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Practice Dialog */}
      <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PlayCircle className="text-blue-primary" size={20} />
              <span>Practice: {selectedTechnique?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Follow the guided practice session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {practiceStep === 0 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayCircle className="text-blue-primary" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedTechnique?.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{selectedTechnique?.description}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Array.isArray(selectedTechnique?.instructions) 
                      ? selectedTechnique.instructions.map((instruction: string, i: number) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="text-blue-primary font-bold mt-0.5">{i + 1}.</span>
                            <span>{instruction}</span>
                          </div>
                        ))
                      : selectedTechnique?.instructions && (
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-primary font-bold mt-0.5">1.</span>
                            <span>{selectedTechnique.instructions}</span>
                          </div>
                        )
                    }
                  </div>
                </div>
                
                <Button 
                  onClick={() => setPracticeStep(1)}
                  className="w-full"
                >
                  Start Practice
                </Button>
              </div>
            )}

            {practiceStep === 1 && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <PlayCircle className="text-blue-primary" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Practice in Progress</h3>
                  <p className="text-gray-600 mb-4">Take your time to practice the technique</p>
                  <p className="text-sm text-gray-500 mb-6">Click when you've completed the practice</p>
                  <Button 
                    onClick={() => {
                      practiceMutation.mutate(selectedTechnique.id);
                    }}
                    className="w-full"
                    disabled={practiceMutation.isPending}
                  >
                    {practiceMutation.isPending ? "Saving..." : "Complete Practice"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Idea Dialog */}
      <Dialog open={ideaDialogOpen} onOpenChange={setIdeaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Share2 className="text-blue-primary" size={20} />
              <span>Share Your Technique</span>
            </DialogTitle>
            <DialogDescription>
              Help other golfers by sharing a technique that works for you
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your technique or idea
              </label>
              <Textarea
                placeholder="Share the technique, when to use it, and why it works for you..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => {
                  if (ideaText.trim()) {
                    ideaMutation.mutate(ideaText);
                  }
                }}
                disabled={!ideaText.trim() || ideaMutation.isPending}
                className="flex-1"
              >
                {ideaMutation.isPending ? "Sharing..." : "Share with Flo"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setIdeaDialogOpen(false);
                  setIdeaText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}