import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, MessageCircle, Video, Clock, User, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { hasFeatureAccess, TIER_PRICING } from "@shared/entitlements";
import { PRIMARY_HUMAN_COACH } from "@shared/human-coach";

export default function HumanCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [reviewRequest, setReviewRequest] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  /** Every request to the coach fails the same way, so it is reported the same way. */
  const reportFailure = (error: unknown) => {
    toast({
      title: "Not sent",
      description:
        error instanceof Error && error.message
          ? error.message
          : "That didn't reach your coach. Please try again.",
      variant: "destructive",
    });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/human-coaching/message", { message });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: `${PRIMARY_HUMAN_COACH.name} has your message. ${PRIMARY_HUMAN_COACH.responseTarget}.`,
      });
      setMessageText("");
    },
    onError: reportFailure,
  });

  const reviewRequestMutation = useMutation({
    mutationFn: async (request: string) => {
      return apiRequest("POST", "/api/human-coaching/progress-review", { request });
    },
    onSuccess: () => {
      toast({
        title: "Review requested",
        description: `${PRIMARY_HUMAN_COACH.name} will come back to you with feedback. ${PRIMARY_HUMAN_COACH.responseTarget}.`,
      });
      setReviewRequest("");
    },
    onError: reportFailure,
  });

  // No calendar is consulted and no time is held — the copy says so on the
  // button and in the toast, because a booking that did not happen is worse
  // than no booking button at all.
  const scheduleSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/human-coaching/schedule-request", {});
    },
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: `${PRIMARY_HUMAN_COACH.name} will follow up directly to agree a time.`,
      });
    },
    onError: reportFailure,
  });

  // Same rule the server applies (requireUltimate): the ultimate tier, or an
  // admin/coach role. Reading it from entitlements rather than comparing tier
  // strings here keeps the two from drifting apart.
  const entitled = hasFeatureAccess(
    (user?.subscriptionTier as any) ?? "free",
    user?.role,
    "humanCoaching"
  );

  /** The same checkout the free dashboard uses. Price comes from TIER_PRICING. */
  const startUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        tier: "ultimate",
        success_url: `${window.location.origin}/human-coaching?upgrade=success`,
        cancel_url: `${window.location.origin}/human-coaching?upgrade=cancelled`,
      });
      const result = await response.json();
      if (!result.url) throw new Error("No checkout URL received");
      window.location.href = result.url;
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: "We couldn't start checkout. Please try again.",
        variant: "destructive",
      });
      setIsUpgrading(false);
    }
  };

  if (!entitled) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center p-8">
          <CardContent>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Human Coaching Access</h1>
            <p className="text-gray-600 mb-2">
              Human coaching is part of {TIER_PRICING.ultimate.name} — a certified Red2Blue coach
              reading your work and answering you directly.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {TIER_PRICING.ultimate.name} — ${TIER_PRICING.ultimate.price}
            </p>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={startUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading ? "Starting checkout..." : `Upgrade to ${TIER_PRICING.ultimate.name}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Back Button */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
            <User className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Human Coaching Center</h1>
            <p className="text-gray-600">Send your certified Red2Blue coach a message or a request</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-purple-100 text-purple-800">{TIER_PRICING.ultimate.name}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Coach Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2" size={20} />
              Your Coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{PRIMARY_HUMAN_COACH.initials}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{PRIMARY_HUMAN_COACH.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{PRIMARY_HUMAN_COACH.title}</p>
                <p className="text-sm text-gray-700">{PRIMARY_HUMAN_COACH.bio}</p>
              </div>
            </div>

            {/* Stated facts only. The star row and "150+ golfers coached" that
                used to sit here were invented, and nobody could have sourced them. */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-semibold text-blue-700">Specialty</div>
                <div className="text-sm text-gray-600">{PRIMARY_HUMAN_COACH.specialty}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-semibold text-green-700">Aims to reply</div>
                <div className="text-sm text-gray-600">{PRIMARY_HUMAN_COACH.responseTarget}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2" size={20} />
              Coaching Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              onClick={() => scheduleSessionMutation.mutate()}
              disabled={scheduleSessionMutation.isPending}
            >
              <Video className="mr-3" size={18} />
              {scheduleSessionMutation.isPending ? "Sending..." : "Request a 1-on-1 session"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => document.getElementById('message-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <MessageCircle className="mr-3" size={18} />
              Send Message to Coach
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <CheckCircle className="mr-3" size={18} />
              Request Progress Review
            </Button>

            <p className="text-sm text-gray-600">
              Requests go straight to {PRIMARY_HUMAN_COACH.name} by email. No time is held until
              you have agreed one together.
            </p>
          </CardContent>
        </Card>

        {/* Send Message */}
        <Card id="message-section">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2" size={20} />
              Message Your Coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Ask about specific techniques, share your challenges, or discuss your mental game progress..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
              />
              <Button
                onClick={() => sendMessageMutation.mutate(messageText)}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
              <p className="text-sm text-gray-600">
                {PRIMARY_HUMAN_COACH.responseTarget}, on working days.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Review Request */}
        <Card id="review-section">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2" size={20} />
              Request Progress Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="What specific areas would you like your coach to review? (assessments, technique practice, tournament preparation, etc.)"
                value={reviewRequest}
                onChange={(e) => setReviewRequest(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => reviewRequestMutation.mutate(reviewRequest)}
                disabled={!reviewRequest.trim() || reviewRequestMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {reviewRequestMutation.isPending ? "Requesting..." : "Request Review"}
              </Button>
              <p className="text-sm text-gray-600">
                {PRIMARY_HUMAN_COACH.name} reads what you have logged before replying.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2" size={20} />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cerosity does not host the coach conversation yet — replies land
                in the athlete's own inbox — so there is nothing to list here.
                Said plainly rather than filled with a placeholder timeline. */}
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="mx-auto mb-4 text-gray-300" size={48} />
              <p>Your coach replies by email for now, so sent requests won't appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
