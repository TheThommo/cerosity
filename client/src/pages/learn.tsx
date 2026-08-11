import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CheckCircle2, Circle, Lock, Wrench, Brain, Target,
  PlayCircle, Award, ArrowRight, Clock,
} from "lucide-react";

const COURSE_SLUG = "red2blue-foundation";

type LessonItem = {
  id: number;
  slug: string;
  title: string;
  lessonType: string;
  summary: string | null;
  estimatedMinutes: number | null;
  toolKey: string | null;
  isFreePreview: boolean;
  locked: boolean;
  status: "not_started" | "in_progress" | "completed";
};

type ModuleItem = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  lessons: LessonItem[];
};

type CourseResponse = {
  course: { slug: string; title: string; subtitle: string | null; description: string | null };
  hasAccess: boolean;
  modules: ModuleItem[];
  progress: { total: number; completed: number; percent: number };
  certificate: { certificateCode: string; issuedAt: string } | null;
};

function typeIcon(type: string) {
  if (type === "tool") return Wrench;
  if (type === "exercise") return Brain;
  if (type === "scenario") return Target;
  if (type === "assessment") return Award;
  if (type === "intro") return PlayCircle;
  return BookOpen;
}

export default function Learn() {
  const { data, isLoading, error } = useQuery<CourseResponse>({
    queryKey: [`/api/learn/courses/${COURSE_SLUG}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <p className="text-gray-500">Loading the curriculum...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <p className="text-gray-500">We could not load the curriculum right now. Please try again shortly.</p>
      </div>
    );
  }

  const allLessons = data.modules.flatMap((m) => m.lessons);
  const continueLesson =
    allLessons.find((l) => !l.locked && l.status !== "completed") ||
    allLessons.find((l) => !l.locked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <BookOpen size={20} />
              <span className="text-sm font-semibold uppercase tracking-wide">Learning Curriculum</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{data.course.title}</h1>
            {data.course.subtitle && (
              <p className="text-lg text-gray-600 mt-2">{data.course.subtitle}</p>
            )}
          </div>

          {/* Progress + Continue */}
          <Card className="mb-6 border-blue-100">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Your progress</span>
                    <span className="text-sm text-gray-500">
                      {data.progress.completed} of {data.progress.total} lessons
                    </span>
                  </div>
                  <Progress value={data.progress.percent} className="h-2" />
                </div>
                {continueLesson && (
                  <Link href={`/learn/lesson/${continueLesson.slug}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                      {data.progress.completed > 0 ? "Continue" : "Start course"}
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificate earned */}
          {data.certificate && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="py-5 flex items-center gap-3">
                <Award className="text-green-600" size={28} />
                <div>
                  <p className="font-semibold text-green-800">Red2Blue Foundation complete</p>
                  <p className="text-sm text-green-700">
                    Certificate {data.certificate.certificateCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade banner for users without full access */}
          {!data.hasAccess && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Lock className="text-amber-600 mt-0.5" size={22} />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">You are on a free preview</p>
                    <p className="text-sm text-amber-800 mt-1">
                      A couple of lessons are open so you can try the curriculum. Upgrade to Premium to
                      unlock all three sessions, every tool, and your Foundation certificate.
                    </p>
                    <Link href="/">
                      <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700">
                        Unlock the full curriculum
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modules */}
          <div className="space-y-6">
            {data.modules.map((module) => (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl text-gray-900">{module.title}</CardTitle>
                  {module.summary && (
                    <p className="text-sm text-gray-600 mt-1">{module.summary}</p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {module.lessons.map((lesson) => {
                      const Icon = typeIcon(lesson.lessonType);
                      const done = lesson.status === "completed";
                      return (
                        <li key={lesson.id}>
                          <Link href={`/learn/lesson/${lesson.slug}`}>
                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors cursor-pointer">
                              <div className="flex-shrink-0">
                                {done ? (
                                  <CheckCircle2 className="text-green-600" size={22} />
                                ) : lesson.locked ? (
                                  <Lock className="text-gray-400" size={20} />
                                ) : (
                                  <Circle className="text-gray-300" size={22} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${lesson.locked ? "text-gray-400" : "text-gray-900"}`}>
                                    {lesson.title}
                                  </span>
                                  {lesson.isFreePreview && (
                                    <Badge variant="secondary" className="text-xs">Free</Badge>
                                  )}
                                  {lesson.lessonType === "tool" && (
                                    <Badge variant="outline" className="text-xs">Tool</Badge>
                                  )}
                                </div>
                                {lesson.summary && (
                                  <p className="text-sm text-gray-500 truncate mt-0.5">{lesson.summary}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                                <Icon size={14} />
                                {lesson.estimatedMinutes ? (
                                  <span className="flex items-center gap-1 ml-1">
                                    <Clock size={12} />{lesson.estimatedMinutes}m
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
