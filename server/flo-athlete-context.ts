import type { User, AthleteProfile, UserGoal } from "@shared/schema";

export function formatAthleteContextForPrompt(
  user: User,
  profile: AthleteProfile | undefined,
  goals: UserGoal[]
): string {
  const sections: string[] = [];

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (name) sections.push(`ATHLETE: ${name}`);
  if (user.sport) sections.push(`SPORT: ${user.sport}`);

  if (user.bio) {
    sections.push(`BIO: ${user.bio}`);
  }

  if (profile) {
    const achievements = profile.achievements as any[];
    if (achievements?.length) {
      const list = achievements
        .map((a: any) => `- ${a.title}${a.year ? ` (${a.year})` : ""}${a.description ? `: ${a.description}` : ""}`)
        .join("\n");
      sections.push(`ACHIEVEMENTS:\n${list}`);
    }

    const challenges = profile.challenges as any[];
    if (challenges?.length) {
      const list = challenges
        .map((c: any) => `- ${c.title}${c.description ? `: ${c.description}` : ""}${c.priority ? ` [priority ${c.priority}/5]` : ""}`)
        .join("\n");
      sections.push(`CHALLENGES (what FLO should help with):\n${list}`);
    }
  }

  if (goals.length) {
    const grouped: Record<string, UserGoal[]> = {};
    for (const g of goals) {
      const cat = g.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(g);
    }

    const goalLines: string[] = [];
    for (const [cat, items] of Object.entries(grouped)) {
      const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      goalLines.push(`${label}:`);
      for (const g of items) {
        const status = g.isCompleted ? " [DONE]" : "";
        goalLines.push(`  - ${g.goalText}${status}`);
      }
    }
    sections.push(`GOALS:\n${goalLines.join("\n")}`);
  }

  if (sections.length === 0) return "";
  return `ATHLETE PROFILE:\n${sections.join("\n\n")}`;
}
