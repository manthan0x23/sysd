export const ROLES = ["Student", "Engineer", "Founder", "Designer or PM", "Other"] as const;
export const PURPOSES = ["Learning system design", "Interview prep", "Estimating a real project", "Teaching or content", "Just exploring"] as const;
export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const CLOUDS = ["AWS", "Google Cloud", "Azure", "Cloudflare", "Vercel", "DigitalOcean", "Hetzner", "Self-hosted"] as const;

/** What someone tells us on the welcome screen. All of it is optional and only used as context for the AI agent. */
export interface Profile {
  role?: (typeof ROLES)[number];
  purpose?: (typeof PURPOSES)[number];
  level?: (typeof LEVELS)[number];
  clouds?: (typeof CLOUDS)[number][];
  company?: string;
}
