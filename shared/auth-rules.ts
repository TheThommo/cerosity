/**
 * Rules about credentials that the server and the client have to agree on.
 *
 * The minimum lived as a bare 8 in four places — the reset endpoint, the change
 * endpoint, the admin temp-password threshold, and two client forms — while
 * registration had no minimum at all. An athlete could sign up with a
 * three-character password and then be refused that same password when trying
 * to change it.
 */

/** Shortest password the platform accepts, anywhere it accepts one. */
export const MIN_PASSWORD_LENGTH = 8;

/** One sentence, so the API and every form say the same thing. */
export const passwordTooShortMessage = `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
