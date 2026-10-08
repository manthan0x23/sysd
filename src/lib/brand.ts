/** Product name; change here only. */
export const APP_NAME = "Sysd";

/** What each plan is called on screen. The database still stores "free"; only the label changes. */
export const PLAN_LABEL = { free: "Starter", pro: "Pro" } as const;

/** Public contact address shown on the legal pages. Set NEXT_PUBLIC_CONTACT_EMAIL; nothing is shown as a link until it is. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
export const LEGAL_UPDATED = "October 8, 2026";
