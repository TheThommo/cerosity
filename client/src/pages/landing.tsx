import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Users, Shield, Check, Star, Mic, Zap, Award, BookOpen, Crosshair, GraduationCap, Building2, Trophy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FloChat } from "@/components/flo-chat";
import { Footer } from "@/components/footer";
import { StableSignUpForm } from "@/components/stable-signup-form";
import { CerosityLogo } from "@/components/cerosity-logo";
import Checkout from "./checkout";

// initialView lets /login and /signup open straight onto the right form, so
// both are bookmarkable and linkable from email (audit A5).
export default function Landing({ initialView }: { initialView?: "signin" | "signup" }) {
  const [, setLocation] = useLocation();
  const [showSignUp, setShowSignUp] = useState(initialView === "signup");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('free');
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [showSignIn, setShowSignIn] = useState(initialView === "signin");

  // DISABLED: IntersectionObserver to prevent memory leaks and crashes
  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     ([entry]) => {
  //       // Show floating chat when main widget is not visible
  //       setShowFloatingChat(!entry.isIntersecting);
  //     },
  //     { threshold: 0.1 }
  //   );

  //   const mainWidget = document.getElementById('main-chat-widget');
  //   if (mainWidget) {
  //     observer.observe(mainWidget);
  //   }

  //   return () => observer.disconnect();
  // }, []);

  if (showCheckout) {
    return <Checkout tier={selectedTier} onBack={() => setShowCheckout(false)} />;
  }

  if (showSignUp) {
    return <StableSignUpForm onBack={() => setShowSignUp(false)} />;
  }

  if (showSignIn) {
    return <SignInForm onBack={() => setShowSignIn(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <nav className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <CerosityLogo size={36} />
              <div>
                <h1 className="text-xl font-bold text-white">Cerosity</h1>
                <p className="text-xs text-slate-400">AI Mental Performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setShowSignIn(true)} className="text-slate-300 hover:text-white">
                Sign In
              </Button>
              <Button onClick={() => {
                const pricingSection = document.getElementById('pricing-section');
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: 'smooth' });
                }
              }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — Copy | FLO Cutout | Chat */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* Ambient background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-slate-950 to-slate-950" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-2xl" />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop: 3 columns — copy | FLO | chat */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-6 items-center">
            {/* Left — Copy */}
            <div className="text-center lg:text-left order-1">
              <Badge className="mb-6 bg-blue-500/10 text-blue-300 border-blue-500/20 px-4 py-1">
                Agentic AI Coaching — Voice + Chat
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                Meet <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">FLO</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-4 max-w-sm mx-auto lg:mx-0 font-light">
                Your AI mental performance coach.
              </p>
              <p className="text-base text-slate-400 mb-8 max-w-sm mx-auto lg:mx-0">
                Stern when you need it. Empathetic always. Talk to her — right now.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => {
                    const pricingSection = document.getElementById('pricing-section');
                    if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8"
                >
                  Get Started Free
                </Button>
              </div>
            </div>

            {/* Center — FLO transparent cutout */}
            <div className="order-2 flex justify-center">
              <img
                src="/flo/flo-hero.png"
                alt="FLO — AI Mental Performance Coach"
                className="w-[220px] md:w-[280px] lg:w-[320px] object-contain drop-shadow-2xl select-none pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Right — Chat widget */}
            <div id="main-chat-widget" className="order-3">
              <FloChat
                isInlineWidget
                onSignupRequest={() => {
                  window.scrollTo(0, 0);
                  setSelectedTier('free');
                  setShowSignUp(true);
                }}
              />
            </div>
          </div>
        </div>
      </section>



      {/* What Makes FLO Different */}
      <section className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Not another chatbot. A <span className="text-blue-400">real coach</span>.
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              FLO uses the Red2Blue methodology — proven sports psychology trusted by elite athletes worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-blue-800 transition-colors">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Red Head → Blue Head</h3>
              <p className="text-slate-400 leading-relaxed">
                Reactive stress, doubt, "I can't" thinking — FLO recognizes when you're in Red Head and shifts you to focused, confident Blue Head state.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-indigo-800 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5">
                <Mic className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Voice-First Coaching</h3>
              <p className="text-slate-400 leading-relaxed">
                Talk to FLO like you'd talk to a real coach. She listens, responds in real-time, and gives you techniques you can use immediately.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-purple-800 transition-colors">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Performance Equation</h3>
              <p className="text-slate-400 leading-relaxed">
                Structure + Skillset + Mindset = Performance. FLO works across all three pillars to build complete mental resilience.
              </p>
            </div>
          </div>

          {/* Red2Blue Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img
                src="/mindset-map.png"
                alt="Red2Blue Mindset Map"
                className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>
            <div className="space-y-6">
              <div className="bg-red-950/30 rounded-xl p-6 border border-red-900/30">
                <h3 className="text-lg font-semibold text-red-300 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold text-sm">R</span>
                  Red Head
                </h3>
                <p className="text-red-200/70">Reactive. Stressed. "I can't." Doubt spirals and overthinking that kill performance.</p>
              </div>
              <div className="flex justify-center">
                <div className="text-lg font-bold text-slate-600 flex items-center gap-2">
                  <span className="w-8 h-px bg-gradient-to-r from-red-500 to-blue-500" />
                  FLO transforms you
                  <span className="w-8 h-px bg-gradient-to-r from-red-500 to-blue-500" />
                </div>
              </div>
              <div className="bg-blue-950/30 rounded-xl p-6 border border-blue-900/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm">B</span>
                  Blue Head
                </h3>
                <p className="text-blue-200/70">Focused. Confident. "Do it." Clear intent, trust your training, execute.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Built for performers who refuse to settle</h2>
            <p className="text-slate-400">FLO coaches across every high-performance domain.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: Target, label: "Individual Athletes", desc: "Golfers, tennis players, runners — own your mental game" },
              { icon: Award, label: "Team Athletes", desc: "Football, rugby, cricket — perform under team pressure" },
              { icon: Users, label: "Coaches", desc: "Amplify your 1-on-1 and group coaching impact" },
              { icon: Trophy, label: "Academies", desc: "Sport academies building mentally resilient athletes" },
              { icon: GraduationCap, label: "Schools & Universities", desc: "Student-athlete mental performance programmes" },
              { icon: Building2, label: "Clubs", desc: "Golf clubs, sports clubs — member mental performance" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  window.scrollTo(0, 0);
                  setSelectedTier('free');
                  setShowSignUp(true);
                }}
                className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-600 transition-colors cursor-pointer"
              >
                <item.icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-1">{item.label}</h4>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-16 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-widest text-slate-500 mb-3">Trusted across sport, business, military & healthcare</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Powered by <span className="text-blue-400">Gazing Red2Blue</span> methodology
            </h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 max-w-5xl mx-auto">
            {[
              "AWS", "British Army", "All Blacks", "England Rugby", "NHS",
              "Lloyds Banking Group", "Xerox", "Sage", "UPS", "OpenText",
              "Ascential", "D2L", "Diebold Nixdorf", "Knoll"
            ].map((name) => (
              <span key={name} className="text-slate-500 font-semibold text-sm md:text-base tracking-wide hover:text-slate-300 transition-colors">
                {name}
              </span>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 mt-8 max-w-2xl mx-auto">
            Gazing concepts delivered across Business, Sport, Education, Healthcare, Military and Police sectors worldwide.
          </p>
        </div>
      </section>

      {/* Endorsements */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Endorsed by <span className="text-blue-400">elite performers</span>
            </h2>
            <p className="text-lg text-slate-400">Coaches, athletes, and leaders who trust Red2Blue methodology</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Brian Ashton", role: "England & Ireland Rugby Head Coach", desc: "English Rugby Union coach and former player. Head coach of England and Ireland national teams.", img: "/endorsers/brian-ashton.png" },
              { name: "Ashley Giles MBE", role: "England Cricketer & Red2Blue Coach", desc: "Former English first-class cricketer. Current Red2Blue coach.", img: "/endorsers/ashley-giles.png" },
              { name: "Alice Powell", role: "Professional Racing Driver", desc: "Trailblazing professional racing driver, currently racing in the W Series and the Jaguar I Pace eTrophy.", img: "/endorsers/alice-powell.png" },
              { name: "Vicki Anstey", role: "Adventurer & Entrepreneur", desc: "Mid-Pacific ocean rower and entrepreneur.", img: "/endorsers/vicki-anstey.png" },
              { name: "Imogen Hall", role: "Elite Golfer, Faldo Series & WAGR", desc: "Dubai-based elite golfer committed to GCU. Faldo Series WAGR winner and top 10 finisher in the English Amateur.", img: "/endorsers/imogen-hall.png" },
              { name: "James Newman", role: "Head Teacher, Epsom & Ewell High School", desc: "Head teacher of a co-educational academy for children from ages 11-18.", img: "/endorsers/james-newman.png" },
              { name: "Kerry Inscker", role: "Deputy CEO, Shaw Education Trust", desc: "Leads and manages academies in all phases, sectors and communities.", img: "/endorsers/kerry-inscker.png" },
              { name: "Stuart Lancaster", role: "England Rugby Union Head Coach", desc: "Rugby Union coach. Head coach of the English National Rugby Union team from 2011 to 2015.", img: "/endorsers/stuart-lancaster.png" },
              { name: "Adrian Larsson", role: "Elite Golfer & R2B Coach", desc: "Signed to DePaul Men's Golf. GEM Amateur Open and Junior Masters Invitational winner.", img: "/endorsers/adrian-larsson.png" },
            ].map((person) => (
              <div key={person.name} className="bg-slate-950 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <img src={person.img} alt={person.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">{person.name}</h4>
                    <p className="text-xs text-blue-400">{person.role}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{person.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Programmes</h2>
            <p className="text-lg text-slate-400">Three pathways to mental performance mastery</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-700 transition-colors">
              <img src="/programmes/athlete.png" alt="Red2Blue Coach certification" className="w-full h-48 object-cover" />
              <div className="p-8">
                <Badge className="mb-4 bg-blue-500/10 text-blue-300 border-blue-500/20">For Coaches</Badge>
                <h3 className="text-xl font-bold text-white mb-3">Become a Red2Blue Coach</h3>
                <p className="text-slate-400 leading-relaxed">
                  Certification programme tailored for sports coaches, performance coaches, business coaches, executive coaches, life coaches and teachers.
                </p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-700 transition-colors">
              <img src="/programmes/coach.png" alt="Red2Blue Athlete programme" className="w-full h-48 object-cover" />
              <div className="p-8">
                <Badge className="mb-4 bg-indigo-500/10 text-indigo-300 border-indigo-500/20">For Athletes</Badge>
                <h3 className="text-xl font-bold text-white mb-3">Become a Red2Blue Athlete</h3>
                <p className="text-slate-400 leading-relaxed">
                  Work with the Red2Blue framework to develop mental skills needed to perform under pressure at critical moments. For individuals across all sports.
                </p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-700 transition-colors">
              <img src="/programmes/academy.png" alt="Red2Blue Academy programme" className="w-full h-48 object-cover" />
              <div className="p-8">
                <Badge className="mb-4 bg-purple-500/10 text-purple-300 border-purple-500/20">For Organizations</Badge>
                <h3 className="text-xl font-bold text-white mb-3">Become a Red2Blue Academy</h3>
                <p className="text-slate-400 leading-relaxed">
                  Companies, community groups, and sports teams adopt Red2Blue techniques to harness mental resilience and perform to their ability across sectors.
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">
            Booklets, lesson plans, mindset maps & tools included with all programmes.
          </p>
        </div>
      </section>

      {/* Free Downloads CTA */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-500/10 text-green-300 border-green-500/20 px-4 py-1">Free Resources</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Download Free Red2Blue Tools
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Get started with proven mental performance resources. Mindset maps, recognition templates, lesson plans and more — free with your account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <button onClick={() => { window.scrollTo(0, 0); setSelectedTier('free'); setShowSignUp(true); }} className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-center hover:border-blue-600 transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Crosshair className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-semibold text-white mb-2">Ability to Focus</h4>
              <p className="text-sm text-slate-400">Complete guide to building unshakeable concentration under pressure. Techniques used by elite athletes worldwide.</p>
            </button>
            <button onClick={() => { window.scrollTo(0, 0); setSelectedTier('free'); setShowSignUp(true); }} className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-center hover:border-indigo-600 transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Target className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="font-semibold text-white mb-2">Master Your Moment</h4>
              <p className="text-sm text-slate-400">By Cero Golf — how to own the critical moments that define performance. Mental tools for when it matters most.</p>
            </button>
            <button onClick={() => { window.scrollTo(0, 0); setSelectedTier('free'); setShowSignUp(true); }} className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-center hover:border-purple-600 transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="font-semibold text-white mb-2">Pre-Shot Routine</h4>
              <p className="text-sm text-slate-400">Mindset for the Moment — a structured pre-performance routine to lock in focus and execute with confidence.</p>
            </button>
            <button onClick={() => { window.scrollTo(0, 0); setSelectedTier('free'); setShowSignUp(true); }} className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-center hover:border-green-600 transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                <BookOpen className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-semibold text-white mb-2">Motivation & Inspiration</h4>
              <p className="text-sm text-slate-400">Stories, frameworks, and practical exercises to build lasting motivation and find your competitive drive.</p>
            </button>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => {
                window.scrollTo(0, 0);
                setSelectedTier('free');
                setShowSignUp(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-6 text-lg"
            >
              Create Free Account to Download
            </Button>
            <p className="text-sm text-slate-500 mt-4">No credit card required. Instant access to all free resources.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Choose Your Training Level
            </h2>
            <p className="text-lg text-slate-400">
              Professional mental performance coaching for every level
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Tier 1: Free */}
            <Card className="border border-slate-800 bg-slate-900">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2 border-slate-600 text-slate-300">Start Free</Badge>
                <CardTitle className="text-xl text-white">Free</CardTitle>
                <CardDescription className="text-sm text-slate-400">Try FLO and experience AI mental performance coaching.</CardDescription>
                <div className="text-3xl font-bold mt-4 text-white">$0</div>
                <p className="text-sm text-slate-500 mt-1">No credit card required</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>6 FLO messages per session</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Basic mental state assessment</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Red2Blue concept overview</span></li>
                </ul>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => {
                  window.scrollTo(0, 0);
                  setSelectedTier('free');
                  setShowSignUp(true);
                }}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Tier 2: FLO Subscription */}
            <Card className="border border-blue-800 bg-slate-900">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2 border-blue-500 text-blue-300">AI Coach</Badge>
                <CardTitle className="text-xl text-white">FLO</CardTitle>
                <CardDescription className="text-sm text-slate-400">Unlimited AI mental performance coaching with memory.</CardDescription>
                <div className="flex items-baseline space-x-1 mt-4">
                  <span className="text-3xl font-bold text-white">$30</span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
                <p className="text-xs text-green-400 font-medium mt-1">$25/mo annually — save 17%</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Unlimited FLO conversations</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Personalized coaching memory</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Voice & chat sessions</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Daily mood tracking & analytics</span></li>
                </ul>
                <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={() => {
                  setLocation('/checkout?tier=flo');
                }}>
                  Subscribe to FLO
                </Button>
              </CardContent>
            </Card>

            {/* Tier 3: Elite Digital Coaching - BEST VALUE */}
            <Card className="border-2 border-indigo-500 bg-slate-900 relative shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-indigo-600 text-white px-4 py-1 text-sm font-bold">BEST VALUE</Badge>
              </div>
              <CardHeader className="pt-6">
                <Badge variant="outline" className="w-fit mb-2 border-indigo-500 text-indigo-300">Digital Mastery</Badge>
                <CardTitle className="text-xl text-white">Elite Digital</CardTitle>
                <CardDescription className="text-sm text-slate-400">Complete mindset transformation with certification and analytics.</CardDescription>
                <div className="flex items-baseline space-x-1 mt-4">
                  <span className="text-3xl font-bold text-white">$590</span>
                  <span className="text-sm text-slate-500">one-time</span>
                </div>
                <p className="text-xs text-indigo-400 font-medium mt-1">Lifetime access + $99/yr renewal after Year 1</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-800/30">
                  <p className="text-xs font-medium text-indigo-300">Everything in FLO, plus:</p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Red2Blue Certification Track</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Advanced performance analytics</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Custom AI training programs</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Priority support</span></li>
                </ul>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={() => {
                  setLocation('/checkout?tier=premium');
                }}>
                  Get Elite Digital
                </Button>
              </CardContent>
            </Card>

            {/* Tier 4: Master Human Coaching */}
            <Card className="border border-purple-800 bg-slate-900">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2 border-purple-500 text-purple-300">Elite Partnership</Badge>
                <CardTitle className="text-xl text-white">Master</CardTitle>
                <CardDescription className="text-sm text-slate-400">AI + dedicated 1-on-1 human coaching for fastest results.</CardDescription>
                <div className="flex items-baseline space-x-1 mt-4">
                  <span className="text-3xl font-bold text-white">$2,290</span>
                  <span className="text-sm text-slate-500">one-time</span>
                </div>
                <p className="text-xs text-purple-400 font-medium mt-1">Lifetime access + $99/yr renewal after Year 1</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-950/50 p-2 rounded-lg border border-purple-800/30">
                  <p className="text-xs font-medium text-purple-300">Everything in Elite Digital, plus:</p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Dedicated Master R2B Coach</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>5x private 1-on-1 sessions</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>VIP direct communication</span></li>
                  <li className="flex items-start text-sm text-slate-300"><Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" /><span>Official Athlete Certification</span></li>
                </ul>
                <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={() => {
                  setLocation('/checkout?tier=ultimate');
                }}>
                  Get Master Coaching
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Enterprise CTA Block */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="border border-slate-700 bg-slate-900">
              <CardContent className="text-center py-12 px-6">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">
                  Need a Bespoke Solution for your Team or Organization?
                </h3>
                <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
                  Companies, schools, and sports academies — contact our Partnerships Team for custom institutional licensing.
                </p>
                <Button
                  size="lg"
                  className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-3"
                  onClick={() => {
                    window.location.href = 'mailto:partnerships@cerosity.com?subject=Enterprise Inquiry';
                  }}
                >
                  Contact Us for Enterprise
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-16 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Your Privacy is Protected</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Enterprise-grade encryption. Your performance data is never shared.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center max-w-md mx-auto">
            <div>
              <Shield className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Encrypted</p>
            </div>
            <div>
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Private</p>
            </div>
            <div>
              <Check className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">GDPR</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      

    </div>
  );
}

function SignUpForm({ onBack }: { onBack: () => void }) {
  try {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <Card className="shadow-2xl shadow-blue-950/20 bg-slate-900 border-slate-800">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <CerosityLogo size={48} />
                <div>
                  <h1 className="text-2xl font-bold text-white">Cerosity</h1>
                  <p className="text-sm text-slate-400">AI Mental Performance</p>
                </div>
              </div>
              <CardTitle className="text-3xl text-white">Create Your Account</CardTitle>
              <CardDescription className="text-lg text-slate-400">
                Join the Cerosity mental performance community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SignUpFormFields onBack={onBack} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('SignUpForm error:', error);
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <Card className="shadow-2xl bg-slate-900 border-slate-800">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-red-400">Something went wrong</CardTitle>
              <CardDescription className="text-lg text-slate-400">
                Please refresh the page and try again
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500">
                Refresh Page
              </Button>
              <Button variant="outline" onClick={onBack} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Back to Landing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}

function SignUpFormFields({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    dexterity: '',
    gender: '',
    golfHandicap: '',
    golfExperience: '',
    goals: '',
    bio: ''
  });

  // Add error boundary for this component
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-400">Registration form encountered an error</p>
        <Button onClick={() => {
          setHasError(false);
          window.location.reload();
        }} className="bg-blue-600 hover:bg-blue-700">
          Try Again
        </Button>
        <Button variant="outline" onClick={onBack}>
          Back to Landing
        </Button>
      </div>
    );
  }

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      try {
        console.log('Starting registration request with data:', data);
        const requestData = {
          ...data,
          username: `${data.firstName.toLowerCase()}${data.lastName.toLowerCase()}`
        };
        const response = await apiRequest("POST", "/api/auth/register", requestData);
        const result = await response.json();
        console.log('Registration response:', result);
        return result;
      } catch (error) {
        console.error('Registration mutation error:', error);
        setHasError(true);
        throw error;
      }
    },
    onSuccess: (user) => {
      try {
        console.log('Registration successful for user:', user);
        // Invalidate auth queries to refresh user state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        // Show success message
        toast({
          title: "Account Created Successfully!",
          description: `Welcome to Cerosity, ${user?.username || 'User'}! Your AI profile is being generated.`,
        });
        // Redirect will happen automatically via useAuth hook
      } catch (error) {
        console.error('Registration success handler error:', error);
        setHasError(true);
      }
    },
    onError: (error: any) => {
      try {
        console.error('Registration error:', error);
        toast({
          title: "Registration Failed",
          description: error?.message || "An error occurred during registration",
          variant: "destructive",
        });
      } catch (toastError) {
        console.error('Toast error:', toastError);
        setHasError(true);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      console.log('Form submission started');
      
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      console.log('Registration data:', formData);
      registerMutation.mutate(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setHasError(true);
    }
  };

  if (showSignIn) {
    return <SignInFormContent onBack={() => setShowSignIn(false)} onBackToLanding={onBack} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Create a strong password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Confirm your password"
          />
        </div>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Dexterity</label>
          <select
            value={formData.dexterity}
            onChange={(e) => setFormData({ ...formData, dexterity: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          >
            <option value="">Select</option>
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Golf Handicap (optional)
          </label>
          <input
            type="number"
            min="0"
            max="54"
            value={formData.golfHandicap}
            onChange={(e) => setFormData({ ...formData, golfHandicap: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Enter your golf handicap"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Golf Experience</label>
          <select
            value={formData.golfExperience}
            onChange={(e) => setFormData({ ...formData, golfExperience: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          >
            <option value="">Select experience level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
            <option value="professional">Professional</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Goals</label>
        <input
          type="text"
          value={formData.goals}
          onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          placeholder="What do you want to achieve? (e.g., improve putting, manage pressure, build confidence)"
        />
      </div>

      {/* Bio Section */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Tell us about yourself
        </label>
        <p className="text-sm text-slate-400 mb-3">
          Share your background, goals, and why you're here. Our AI will create a personalized profile to enhance your coaching experience.
        </p>
        <textarea
          rows={6}
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          placeholder="Tell us about your athletic background, mental performance goals, challenges you face, and what you hope to achieve with AI coaching..."
        />
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900/30">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-300 mb-1">Privacy Protected</p>
            <p className="text-blue-200/70">
              Your personal information is encrypted and secure. We never share your data with third parties.
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Back to Landing
        </Button>
        <Button
          type="submit"
          disabled={registerMutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {registerMutation.isPending ? "Creating Account..." : "Create Account & Generate AI Profile"}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </form>
  );
}

function SignInFormContent({ onBack, onBackToLanding }: { onBack: () => void; onBackToLanding: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
        <input
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          placeholder="Enter your password"
        />
        <div className="mt-2 text-right">
          <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Back to Sign Up
        </Button>
        <Button
          type="submit"
          disabled={loginMutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loginMutation.isPending ? "Signing In..." : "Sign In"}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Create one here
          </button>
        </p>
      </div>
    </form>
  );
}

function SignInForm({ onBack }: { onBack: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: "Taking you to your curriculum...",
      });
      setTimeout(() => { setLocation('/learn'); }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl shadow-blue-950/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <CerosityLogo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-white">Cerosity</h1>
              <p className="text-sm text-slate-400">AI Mental Performance</p>
            </div>
          </div>
          <CardTitle className="text-white">Welcome Back</CardTitle>
          <CardDescription className="text-slate-400">Sign in to continue your performance journey</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google SSO is deliberately absent for the MVP. The server routes
              still exist, but OAuth is not configured, so the button only ever
              led to a 501. Email and password is the way in. */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={loginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white">
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>

            <div className="flex justify-between items-center">
              <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-300">
                ← Back
              </button>
              <p className="text-sm text-slate-500">
                No account?{" "}
                <button type="button" onClick={onBack} className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}