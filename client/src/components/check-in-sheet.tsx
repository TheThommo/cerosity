import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MOOD_FACTORS, type MoodContext, type MoodFactor } from "@shared/mood-entry";
import type { MoodEntry } from "@shared/schema";

/** What the athlete sees for each stored context. Order is the button order. */
export const CHECK_IN_CONTEXT_LABELS: Record<MoodContext, string> = {
  pre_event: "Pre-round",
  practice: "Practice",
  post_event: "Post-round",
  check_in: "Check-in",
};

export const FACTOR_LABELS: Record<MoodFactor, string> = {
  confidence: "Confidence",
  focus: "Focus",
  energy: "Energy",
  stress: "Stress",
  motivation: "Motivation",
};

const DEFAULT_FACTOR_VALUE = 50;

export function moodEntriesQueryKey(userId: number | undefined) {
  return [`/api/mood-entries/${userId}`];
}

type Factors = Record<MoodFactor, number>;

function factorsFrom(entry: MoodEntry | undefined): Factors {
  const factors = {} as Factors;
  for (const factor of MOOD_FACTORS) {
    factors[factor] = entry ? entry[factor] : DEFAULT_FACTOR_VALUE;
  }
  return factors;
}

interface CheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext?: MoodContext;
}

/**
 * Five sliders, pre-filled from the athlete's last check-in (or 50), saved to
 * /api/mood-entries. The sheet only closes once the server has the entry; a
 * failed save stays open with the error and a retry.
 */
export function CheckInSheet({ open, onOpenChange, initialContext = "check_in" }: CheckInSheetProps) {
  const { user } = useAuth();
  const { data: entries } = useQuery<MoodEntry[]>({
    queryKey: moodEntriesQueryKey(user?.id),
    enabled: !!user?.id,
  });
  const latest = entries?.[0];

  const [context, setContext] = useState<MoodContext>(initialContext);
  const [factors, setFactors] = useState<Factors>(() => factorsFrom(latest));

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mood-entries/${user!.id}`, { context, ...factors });
      return (await res.json()) as MoodEntry;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: moodEntriesQueryKey(user?.id) });
      onOpenChange(false);
    },
  });

  // Re-seed each time the sheet opens, so it always starts from the newest entry.
  useEffect(() => {
    if (open) {
      setContext(initialContext);
      setFactors(factorsFrom(latest));
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialContext, latest?.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>How are you right now?</SheetTitle>
          <SheetDescription>Rate each one. Takes about 15 seconds.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="When is this check-in?">
          {(Object.keys(CHECK_IN_CONTEXT_LABELS) as MoodContext[]).map((value) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={context === value}
              variant={context === value ? "default" : "outline"}
              className="min-h-[44px]"
              onClick={() => setContext(value)}
            >
              {CHECK_IN_CONTEXT_LABELS[value]}
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          {MOOD_FACTORS.map((factor) => (
            <div key={factor}>
              <div className="flex items-center justify-between text-sm">
                <span id={`check-in-${factor}`} className="font-medium">
                  {FACTOR_LABELS[factor]}
                </span>
                <span className="tabular-nums text-muted-foreground" data-testid={`check-in-value-${factor}`}>
                  {factors[factor]}
                </span>
              </div>
              <Slider
                aria-labelledby={`check-in-${factor}`}
                className="min-h-[44px]"
                min={0}
                max={100}
                step={1}
                value={[factors[factor]]}
                onValueChange={([value]) => setFactors((prev) => ({ ...prev, [factor]: value }))}
              />
            </div>
          ))}
        </div>

        {save.isError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Not saved — {(save.error as Error).message}. Your ratings are still here; tap Retry.
          </p>
        )}

        <Button
          type="button"
          className="mt-6 min-h-[44px] w-full"
          disabled={!user?.id || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : save.isError ? "Retry" : "Save check-in"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
