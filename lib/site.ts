// Site-wide settings. Change these in one place.

export const SITE_NAME = "Track My Stack";
export const SITE_DOMAIN = "trackmystack.org";
export const SITE_URL = "https://trackmystack.org";

// Where people can reach you about privacy, account or support questions.
// Make sure this address actually receives mail (e.g. set up forwarding in GoDaddy).
export const CONTACT_EMAIL = "support@trackmystack.org";

// Date the privacy policy and terms took effect (update when you change them)
export const POLICY_DATE = "October 29, 2026";

// Dealer affiliate links. Add them as environment variables in Vercel
// (Settings -> Environment Variables), then redeploy. A dealer without a link stays hidden.
export const DEALERS = [
  { id: "jmbullion", name: "JM Bullion", url: process.env.NEXT_PUBLIC_DEALER_JMBULLION_URL },
  { id: "apmex", name: "APMEX", url: process.env.NEXT_PUBLIC_DEALER_APMEX_URL },
  { id: "sdbullion", name: "SD Bullion", url: process.env.NEXT_PUBLIC_DEALER_SDBULLION_URL },
].filter((d): d is { id: string; name: string; url: string } => typeof d.url === "string" && d.url.startsWith("https://"));

export const DISCLOSURE_SHORT =
  "Some dealer links are affiliate links: we may earn a commission if you buy through them, at no extra cost to you.";
