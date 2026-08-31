/**
 * LMS access rules — pure functions, no DB access, so they can be unit tested.
 *
 * Free (no "curriculum" entitlement): only lessons flagged isFreePreview.
 * Entitled: sequential unlock over the course's sortOrder — the first lesson is
 * always open, and every later lesson opens once its predecessor is completed.
 * isFreePreview does not bypass the sequence for entitled users.
 */
import { hasFeatureAccess, type SubscriptionTier } from "./entitlements";

export interface AccessUser {
  subscriptionTier?: string | null;
  role?: string | null;
}

export interface AccessLesson {
  id: number;
  isFreePreview: boolean;
}

export function hasCurriculumEntitlement(user: AccessUser): boolean {
  return hasFeatureAccess((user.subscriptionTier as SubscriptionTier) ?? "free", user.role, "curriculum");
}

/**
 * Ids of every lesson the user may open right now.
 * `orderedLessons` must already be in sortOrder (storage.getLessonsForCourse).
 */
export function computeAccessibleLessonIds(
  user: AccessUser,
  orderedLessons: AccessLesson[],
  completedLessonIds: Iterable<number>
): Set<number> {
  const completed = new Set(completedLessonIds);

  if (!hasCurriculumEntitlement(user)) {
    return new Set(orderedLessons.filter((l) => l.isFreePreview).map((l) => l.id));
  }

  const open = new Set<number>();
  orderedLessons.forEach((lesson, index) => {
    // Already-completed lessons stay open so historical progress is never taken away.
    if (index === 0 || completed.has(lesson.id) || completed.has(orderedLessons[index - 1].id)) {
      open.add(lesson.id);
    }
  });
  return open;
}

export function isLessonAccessible(
  user: AccessUser,
  orderedLessons: AccessLesson[],
  completedLessonIds: Iterable<number>,
  lessonId: number
): boolean {
  return computeAccessibleLessonIds(user, orderedLessons, completedLessonIds).has(lessonId);
}

/** Certificate rule: entitled AND every lesson in the course completed. */
export function hasCompletedCourse(
  user: AccessUser,
  orderedLessons: AccessLesson[],
  completedLessonIds: Iterable<number>
): boolean {
  if (!hasCurriculumEntitlement(user)) return false;
  if (orderedLessons.length === 0) return false;
  const completed = new Set(completedLessonIds);
  return orderedLessons.every((l) => completed.has(l.id));
}
