import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  Search,
  MessageCircle,
  Target,
  TrendingUp,
  Zap,
  Users,
  Star,
  CreditCard,
  Shield,
  Book,
  ArrowLeft
} from "lucide-react";
import { CerosityLogo } from "@/components/cerosity-logo";
import { Footer } from "@/components/footer";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: "1",
    question: "What is the Red2Blue mindset coaching platform?",
    answer: "Red2Blue is an AI-powered mental performance coaching platform designed specifically for elite athletes and performers. It helps you transition from 'Red Head' stress states to 'Blue Head' calm performance states through personalized coaching, assessment tools, and proven mental techniques.",
    category: "getting-started",
    tags: ["basics", "overview", "mental-game"]
  },
  {
    id: "2",
    question: "How do I get started with the platform?",
    answer: "After creating your account, start with the Mental Skills X-Check assessment to establish your baseline. Then explore the techniques library, set up your daily mood tracking, and begin chatting with Flo, your AI coach. The platform will generate personalized recommendations based on your usage patterns.",
    category: "getting-started",
    tags: ["onboarding", "first-steps", "assessment"]
  },
  {
    id: "3",
    question: "What's the difference between Red Head and Blue Head states?",
    answer: "Red Head represents stress, tension, and reactive thinking that hurts performance. Blue Head represents calm, focused, and controlled thinking that enhances performance. The platform helps you recognize Red Head indicators and apply Blue Head techniques to maintain optimal mental state during competition.",
    category: "getting-started",
    tags: ["red-head", "blue-head", "mental-states"]
  },

  // Flo AI Coach
  {
    id: "4",
    question: "Who is Flo and how does the AI coaching work?",
    answer: "Flo is your personal AI mental performance coach, powered by advanced AI technology. Flo analyzes your assessments, mood patterns, and chat interactions to provide personalized coaching advice, technique recommendations, and performance insights tailored specifically to your mental game needs.",
    category: "ai-coach",
    tags: ["flo", "ai", "coaching", "personalized"]
  },
  {
    id: "5",
    question: "How many messages can I send to Flo?",
    answer: "Free tier users get 1 message and response to try the platform. Premium ($590) and Ultimate ($2,290) subscribers get unlimited access to Flo's coaching guidance, allowing for ongoing conversations and deeper mental game development.",
    category: "ai-coach",
    tags: ["limits", "premium", "messages", "subscription"]
  },
  {
    id: "6",
    question: "What can I talk to Flo about?",
    answer: "Discuss any mental game challenges: pre-performance anxiety, pressure situations, confidence issues, focus problems, tournament nerves, or specific competition scenarios. Flo can provide techniques, analyze your mental patterns, and create personalized practice plans for your unique situations.",
    category: "ai-coach",
    tags: ["topics", "mental-game", "performance", "anxiety"]
  },

  // Assessments & Tools
  {
    id: "7",
    question: "What is the Mental Skills X-Check assessment?",
    answer: "This comprehensive assessment evaluates four key mental performance areas: Intensity Management, Decision Making, Diversions Control, and Execution Focus. It provides detailed scoring, identifies strengths and weaknesses, and generates specific recommendations for improvement.",
    category: "assessments",
    tags: ["x-check", "mental-skills", "assessment", "scoring"]
  },
  {
    id: "8",
    question: "How do Control Circles work?",
    answer: "Control Circles help you categorize thoughts and situations into three areas: Can't Control (let go), Can Control (take action), and Can Influence (apply strategic effort). This tool builds mental clarity and reduces anxiety by focusing energy on actionable elements.",
    category: "assessments",
    tags: ["control-circles", "focus", "anxiety", "clarity"]
  },
  {
    id: "9",
    question: "What does my mood tracker data do?",
    answer: "Your daily mood scores (0-100) are correlated with assessment performance to identify patterns. This data helps Flo understand how your emotional state affects your mental game and provides insights like 'your best performance happens when morning mood is above 70.'",
    category: "assessments",
    tags: ["mood", "tracking", "correlation", "patterns"]
  },

  // Techniques & Practice
  {
    id: "10",
    question: "How do I practice the mental techniques?",
    answer: "Each technique includes step-by-step instructions and practice exercises. Use the 'Practice Now' feature to log sessions, which tracks your engagement and builds your mental fitness profile. Regular practice with diverse techniques creates a robust mental game toolkit.",
    category: "techniques",
    tags: ["practice", "techniques", "mental-fitness", "tracking"]
  },
  {
    id: "11",
    question: "Can I share my own techniques with the community?",
    answer: "Yes! Use the 'Share Your Technique' feature to contribute ideas that work for you. Your submissions go directly to Flo for review and potential integration into the coaching system, plus they're added anonymously to the community collection for other athletes and performers to benefit from.",
    category: "techniques",
    tags: ["sharing", "community", "contribution", "techniques"]
  },
  {
    id: "12",
    question: "What is Emergency Relief and when should I use it?",
    answer: "Emergency Relief is a rapid calming technique for high-stress moments during competition. Use it when you feel overwhelming pressure, after a setback, or when anxiety is affecting your performance. It's designed to quickly shift you from Red Head back to Blue Head state.",
    category: "techniques",
    tags: ["emergency", "pressure", "anxiety", "rapid-relief"]
  },

  // Progress & Insights
  {
    id: "13",
    question: "How does the recommendation engine work?",
    answer: "The AI analyzes your assessment results, chat history, mood patterns, and engagement metrics to generate personalized recommendations. It identifies your specific mental game needs and suggests targeted techniques, practice routines, or conversation topics with Flo.",
    category: "progress",
    tags: ["recommendations", "ai", "personalized", "analysis"]
  },
  {
    id: "14",
    question: "What insights can I expect to receive?",
    answer: "The platform generates insights about your mental performance patterns, mood-performance correlations, technique effectiveness, progress trends, and areas for improvement. These data-driven insights help you understand what works best for your specific mental game needs.",
    category: "progress",
    tags: ["insights", "patterns", "performance", "data"]
  },
  {
    id: "15",
    question: "How is my progress tracked?",
    answer: "Progress tracking includes assessment score improvements, technique practice frequency, mood trend analysis, chat engagement levels, and recommendation follow-through. The system builds a comprehensive picture of your mental game development over time.",
    category: "progress",
    tags: ["tracking", "improvement", "metrics", "development"]
  },

  // Subscription & Pricing
  {
    id: "16",
    question: "What's included in the Premium ($590) subscription?",
    answer: "Premium includes unlimited Flo conversations, full access to all assessment tools, comprehensive progress tracking, personalized recommendations, all mental techniques, mood correlation analysis, and priority customer support.",
    category: "subscription",
    tags: ["premium", "pricing", "features", "unlimited"]
  },
  {
    id: "17",
    question: "What additional benefits does Ultimate ($2,290) include?",
    answer: "Ultimate adds advanced analytics, detailed performance insights, priority AI processing for faster responses, exclusive advanced techniques, direct coach consultation scheduling, and early access to new platform features and tools.",
    category: "subscription",
    tags: ["ultimate", "advanced", "analytics", "exclusive"]
  },
  {
    id: "18",
    question: "Can I try the platform before subscribing?",
    answer: "Yes! The free tier includes one complete conversation with Flo, access to basic assessment tools, technique browsing, and mood tracking. This gives you a solid understanding of the platform's value before upgrading.",
    category: "subscription",
    tags: ["free-tier", "trial", "before-buying"]
  },

  // Privacy & Security
  {
    id: "19",
    question: "How is my personal data protected?",
    answer: "All personal data, assessments, and conversations are encrypted and stored securely. Your shared techniques are anonymized before community sharing. We never share identifiable personal information or mental performance data with third parties.",
    category: "privacy",
    tags: ["security", "privacy", "data-protection", "encryption"]
  },
  {
    id: "20",
    question: "Who can see my assessment results and conversations?",
    answer: "Only you can access your complete assessment results and Flo conversations. Aggregated, anonymized data may be used to improve AI coaching effectiveness, but no individual user data is ever identifiable or shared.",
    category: "privacy",
    tags: ["confidentiality", "assessments", "conversations", "privacy"]
  }
];

const categories = [
  { id: "getting-started", name: "Getting Started", icon: Book },
  { id: "ai-coach", name: "AI Coach", icon: MessageCircle },
  { id: "assessments", name: "Assessments & Tools", icon: Target },
  { id: "techniques", name: "Techniques & Practice", icon: Zap },
  { id: "progress", name: "Progress & Insights", icon: TrendingUp },
  { id: "subscription", name: "Subscription & Pricing", icon: CreditCard },
  { id: "privacy", name: "Privacy & Security", icon: Shield }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleItem = (itemId: string) => {
    setOpenItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Back to Home */}
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </Link>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <CerosityLogo size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white">Help & Support</h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about using the Red2Blue mental performance coaching platform effectively.
          </p>
        </div>

        {/* Search */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                placeholder="Search for help topics, features, or questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-slate-800">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="text-xs hidden md:flex"
              >
                <category.icon className="h-3 w-3 mr-1" />
                {category.name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {filteredFAQs.map(faq => (
                <Card key={faq.id} className="bg-slate-900 border-slate-800">
                  <Collapsible
                    open={openItems.includes(faq.id)}
                    onOpenChange={() => toggleItem(faq.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                {categories.find(c => c.id === faq.category)?.name}
                              </Badge>
                            </div>
                            <CardTitle className="text-left text-base font-medium text-white">
                              {faq.question}
                            </CardTitle>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openItems.includes(faq.id) ? 'transform rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <p className="text-slate-300 leading-relaxed mb-3">
                          {faq.answer}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {faq.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs bg-slate-800 text-slate-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </TabsContent>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <category.icon className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                </div>
                {filteredFAQs.filter(faq => faq.category === category.id).map(faq => (
                  <Card key={faq.id} className="bg-slate-900 border-slate-800">
                    <Collapsible
                      open={openItems.includes(faq.id)}
                      onOpenChange={() => toggleItem(faq.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-left text-base font-medium text-white">
                              {faq.question}
                            </CardTitle>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openItems.includes(faq.id) ? 'transform rotate-180' : ''}`} />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <p className="text-slate-300 leading-relaxed mb-3">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {faq.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-slate-800 text-slate-400">
                                {tag}
                              </Badge>
                          ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Links */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Zap className="h-5 w-5 mr-2 text-blue-400" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full border-slate-700 hover:bg-slate-800">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-slate-300">Chat with Flo</span>
                </Button>
              </Link>
              <Link href="/assessment">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full border-slate-700 hover:bg-slate-800">
                  <Target className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-slate-300">Take Assessment</span>
                </Button>
              </Link>
              <Link href="/techniques">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full border-slate-700 hover:bg-slate-800">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <span className="text-sm text-slate-300">Browse Techniques</span>
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full border-slate-700 hover:bg-slate-800">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm text-slate-300">View Features</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-blue-950/30 border-blue-800/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Still Need Help?</h3>
            <p className="text-slate-300 mb-4">
              Can't find what you're looking for? Our support team is here to help you maximize your mental performance training.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                Contact Support
              </Button>
              <Button variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-950/50">
                Schedule Consultation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center text-white">
                <Book className="h-4 w-4 mr-2" />
                Getting Started Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-3">
                Step-by-step walkthrough for new users to maximize platform benefits.
              </p>
              <Link href="/features">
                <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-slate-300">View Guide</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center text-white">
                <Users className="h-4 w-4 mr-2" />
                Community Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-3">
                Learn from other athletes and performers' shared techniques and success stories.
              </p>
              <Link href="/community">
                <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-slate-300">Browse Community</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-3">
                Advanced strategies for elite mental performance development.
              </p>
              <Link href="/recommendations">
                <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-slate-300">Read Tips</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    </div>
  );
}
