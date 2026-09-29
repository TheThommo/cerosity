import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Brain, Heart, History, Target, Zap } from "lucide-react";
import {
  CheckInSheet,
  CHECK_IN_CONTEXT_LABELS,
  FACTOR_LABELS,
  moodEntriesQueryKey,
} from "@/components/check-in-sheet";
import { MOOD_FACTORS, MOOD_ENTRIES_FOR_TREND, type MoodContext, type MoodFactor } from "@shared/mood-entry";
import type { MoodEntry } from "@shared/schema";

const FACTOR_ICONS: Record<MoodFactor, JSX.Element> = {
  confidence: <Target className="w-4 h-4" />,
  focus: <Brain className="w-4 h-4" />,
  energy: <Zap className="w-4 h-4" />,
  stress: <Activity className="w-4 h-4" />,
  motivation: <Heart className="w-4 h-4" />,
};

function formatWhen(timestamp: string | Date) {
  return new Date(timestamp).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Dashboard "Performance Mood" card. Shows the athlete's real check-ins from
 * /api/mood-entries — each factor as they rated it — and opens the check-in
 * sheet to log a new one. No insight is drawn until there are enough entries
 * to compare.
 */
export function MoodIndicator() {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetContext, setSheetContext] = useState<MoodContext>("check_in");

  const { data: entries, isLoading, isError, error, refetch } = useQuery<MoodEntry[]>({
    queryKey: moodEntriesQueryKey(user?.id),
    enabled: !!user?.id,
  });
  const latest = entries?.[0];

  const openCheckIn = (context: MoodContext) => {
    setSheetContext(context);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Mood</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-gray-600">Loading your check-ins…</p>}

          {isError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              Couldn't load your check-ins: {(error as Error).message}
              <Button variant="outline" size="sm" className="ml-3 min-h-[44px]" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && !latest && (
            <p className="text-sm text-gray-600">
              No check-ins yet. Rate how you feel — it takes about 15 seconds.
            </p>
          )}

          {latest && (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Last check-in: {CHECK_IN_CONTEXT_LABELS[latest.context]} · {formatWhen(latest.occurredAt)}
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {MOOD_FACTORS.map((factor) => (
                  <div key={factor} className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-gray-600">
                      {FACTOR_ICONS[factor]}
                      {FACTOR_LABELS[factor]}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">{latest[factor]}</div>
                    <Progress value={latest[factor]} className="mt-1 h-1" />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(CHECK_IN_CONTEXT_LABELS) as MoodContext[]).map((context) => (
              <Button
                key={context}
                variant="outline"
                className="min-h-[44px]"
                disabled={!user?.id}
                onClick={() => openCheckIn(context)}
              >
                {CHECK_IN_CONTEXT_LABELS[context]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {entries && entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Recent check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length < MOOD_ENTRIES_FOR_TREND && (
              <p className="mb-4 text-sm text-gray-600">
                Keep logging — {entries.length} of {MOOD_ENTRIES_FOR_TREND} check-ins so far. Patterns
                only show up once there's enough to compare.
              </p>
            )}
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{CHECK_IN_CONTEXT_LABELS[entry.context]}</span>
                    <span className="text-sm text-gray-600">{formatWhen(entry.occurredAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums text-gray-700">
                    {MOOD_FACTORS.map((factor) => (
                      <span key={factor}>
                        {FACTOR_LABELS[factor]} {entry[factor]}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CheckInSheet open={sheetOpen} onOpenChange={setSheetOpen} initialContext={sheetContext} />
    </div>
  );
}
