import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Lock, Wrench, Quote as QuoteIcon,
  Lightbulb, Info, ListChecks, Award,
} from "lucide-react";

const COURSE_SLUG = "red2blue-foundation";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "keyPoints"; title?: string; items: string[] }
  | { type: "callout"; variant?: "info" | "blue" | "red" | "tip"; title?: string; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "scenarioPrompts"; scenario: string; prompts: string[] }
  | { type: "toolEmbed"; toolKey: string; label?: string };

type LessonResponse = {
  lesson: {
    id: number;
    slug: string;
    title: string;
    lessonType: string;
    summary: string | null;
    estimatedMinutes: number | null;
    toolKey: string | null;
    content: Block[];
    isFreePreview: boolean;
  };
  course: { slug: string; title: string } | null;
  module: { slug: string; title: string } | null;
  hasAccess: boolean;
  locked: boolean;
  status: "not_started" | "in_progress" | "completed";
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

const calloutStyles: Record<string, { box: string; icon: any; iconColor: string }> = {
  info: { box: "bg-gray-50 border-gray-200", icon: Info, iconColor: "text-gray-500" },
  blue: { box: "bg-blue-50 border-blue-200", icon: Info, iconColor: "text-blue-600" },
  red: { box: "bg-red-50 border-red-200", icon: Info, iconColor: "text-red-500" },
  tip: { box: "bg-amber-50 border-amber-200", icon: Lightbulb, iconColor: "text-amber-600" },
};

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-2xl font-bold text-gray-900 mt-2">{block.text}</h2>;
    case "paragraph":
      return <p className="text-gray-700 leading-relaxed">{block.text}</p>;
    case "list":
      return block.ordered ? (
        <ol className="list-decimal pl-6 space-y-1 text-gray-700">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      ) : (
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "keyPoints":
      return (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-5">
          {block.title && (
            <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
              <ListChecks size={18} />{block.title}
            </div>
          )}
          <ul className="space-y-2">
            {block.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "steps":
      return (
        <div className="rounded-lg border border-gray-200 p-5">
          {block.title && <p className="font-semibold text-gray-900 mb-3">{block.title}</p>}
          <ol className="space-y-3">
            {block.items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="mt-0.5">{it}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "callout": {
      const style = calloutStyles[block.variant || "info"] || calloutStyles.info;
      const Icon = style.icon;
      return (
        <div className={`rounded-lg border p-4 ${style.box}`}>
          <div className="flex items-start gap-3">
            <Icon size={20} className={`${style.iconColor} mt-0.5 flex-shrink-0`} />
            <div>
              {block.title && <p className="font-semibold text-gray-900">{block.title}</p>}
              <p className="text-gray-700 text-sm mt-0.5">{block.text}</p>
            </div>
          </div>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-blue-400 pl-4 py-1 italic text-gray-700">
          <div className="flex items-start gap-2">
            <QuoteIcon size={18} className="text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <p>{block.text}</p>
              {block.attribution && <footer className="text-sm text-gray-500 mt-1">{block.attribution}</footer>}
            </div>
          </div>
        </blockquote>
      );
    case "scenarioPrompts":
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900 text-slate-100 p-5 leading-relaxed">
            {block.scenario}
          </div>
          <ul className="space-y-2">
            {block.prompts.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-800">
                <span className="text-blue-600 font-semibold">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "toolEmbed":
      return (
        <Link href="/coaching-tools">
          <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-5 flex items-center justify-between hover:border-blue-400 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Wrench className="text-blue-600" size={22} />
              <span className="font-medium text-blue-900">{block.label || "Open the tool"}</span>
            </div>
            <ArrowRight className="text-blue-600" size={18} />
          </div>
        </Link>
      );
    default:
      return null;
  }
}

export default function Lesson({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<LessonResponse>({
    queryKey: [`/api/learn/lessons/${slug}`],
  });

  const progressMutation = useMutation({
    mutationFn: async (status: "in_progress" | "completed") => {
      if (!data) return null;
      const res = await apiRequest("POST", `/api/learn/lessons/${data.lesson.id}/progress`, { status });
      return res.json();
    },
    onSuccess: (result, status) => {
      queryClient.invalidateQueries({ queryKey: [`/api/learn/lessons/${slug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/learn/courses/${COURSE_SLUG}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/learn/me"] });
      if (status === "completed") {
        if (result?.certificate) {
          toast({
            title: "Course complete",
            description: "You have earned your Red2Blue Foundation certificate.",
          });
        } else {
          toast({ title: "Lesson complete", description: "Nice work. On to the next one." });
        }
      }
    },
  });

  // Mark the lesson as in_progress the first time it is opened (if accessible).
  useEffect(() => {
    if (data && !data.locked && data.status === "not_started") {
      progressMutation.mutate("in_progress");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.lesson.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading lesson...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">We could not load this lesson. Please try again.</p>
      </div>
    );
  }

  const { lesson, locked, status, prev, next } = data;
  // Locked for two different reasons: no entitlement (sell the upgrade), or the
  // previous lesson in the sequence is not finished yet (no upsell, just guidance).
  const lockedBySequence = locked && data.hasAccess;
  const completed = status === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Breadcrumb */}
          <Link href="/learn">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 mb-4 -ml-2">
              <ArrowLeft size={18} className="mr-2" />
              Back to curriculum
            </Button>
          </Link>

          <div className="flex items-center gap-2 mb-2">
            {data.module && <Badge variant="outline" className="text-xs">{data.module.title}</Badge>}
            {completed && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                <CheckCircle2 size={12} className="mr-1" />Completed
              </Badge>
            )}
          </div>

          {locked ? (
            <Card className="border-amber-200">
              <CardContent className="py-10 text-center">
                <Lock className="mx-auto text-amber-500 mb-4" size={40} />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                {lockedBySequence ? (
                  <>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      Complete the previous lesson to unlock this one. The curriculum runs in order so
                      each session builds on the one before it.
                    </p>
                    {prev && (
                      <Link href={`/learn/lesson/${prev.slug}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Go to {prev.title}
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      This lesson is part of the full Red2Blue curriculum. Upgrade to Premium to unlock
                      every session, all the tools, and your Foundation certificate.
                    </p>
                    <Link href="/">
                      <Button className="bg-blue-600 hover:bg-blue-700">Unlock the full curriculum</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">{lesson.title}</h1>

              <article className="space-y-5">
                {lesson.content.map((block, i) => (
                  <BlockView key={i} block={block} />
                ))}
              </article>

              {/* Mark complete */}
              <div className="mt-8 pt-6 border-t">
                {completed ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle2 size={20} />
                    Lesson completed
                  </div>
                ) : (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={progressMutation.isPending}
                    onClick={() => progressMutation.mutate("completed")}
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    {progressMutation.isPending ? "Saving..." : "Mark as complete"}
                  </Button>
                )}
              </div>

              {/* Prev / Next */}
              <div className="mt-8 flex items-center justify-between gap-4">
                {prev ? (
                  <Button variant="outline" onClick={() => setLocation(`/learn/lesson/${prev.slug}`)}>
                    <ArrowLeft size={16} className="mr-2" />
                    Previous
                  </Button>
                ) : <span />}
                {next ? (
                  <Button onClick={() => setLocation(`/learn/lesson/${next.slug}`)}>
                    Next lesson
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Link href="/learn">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Award size={16} className="mr-2" />
                      Finish
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
