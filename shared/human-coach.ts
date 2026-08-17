/**
 * The human coach an entitled athlete actually reaches.
 *
 * This exists because the page used to name "Mark Croxford" in JSX — a
 * placeholder nobody assigned, backed by no row and no inbox. A coach's name is
 * a promise about who answers, so it belongs in one declared place that the
 * notification address is read from too. Change the person here and the profile
 * card, the initials and the recipient all move together.
 *
 * There is exactly one coach for the MVP. A marketplace — geography, language,
 * athlete preference — is a later problem, and modelling it now would mean
 * inventing coaches who do not exist.
 */
export interface HumanCoachProfile {
  name: string;
  /** Avatar monogram. Kept explicit so it cannot drift from the name silently. */
  initials: string;
  title: string;
  bio: string;
  specialty: string;
  /** What the athlete is told to expect. A target, not a measured average. */
  responseTarget: string;
  /** Where coaching requests are delivered. */
  notifyEmail: string;
  /** The coach's own Cerosity account, when they have one. Andrew is user 2. */
  userId: number | null;
}

export const PRIMARY_HUMAN_COACH: HumanCoachProfile = {
  name: "Andrew Hurt",
  initials: "AH",
  title: "Certified Red2Blue Master Coach",
  bio:
    "Works with golfers on the mental side of scoring: recognising a red state early, " +
    "resetting between shots, and holding a routine together when the round stops going to plan.",
  specialty: "Pressure performance and pre-shot routine",
  responseTarget: "Within 2 business days",
  notifyEmail: "andrew.hurt5@gmail.com",
  userId: 2,
};
